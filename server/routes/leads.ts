import type { Express } from "express";
import { storage } from "../storage";
import { isAuthenticated, requireRole } from "../replit_integrations/auth";
import { asyncHandler } from "../middleware/errorHandler";
import { validateBody } from "../middleware/validation";
import { api } from "@shared/routes";
import { z } from "zod";
import { generateUniversalProjectId, generateClientCode, generateUPID } from "@shared/utils/projectId";
import { enrichLeadWithGoogleIntel } from "../google-intel";
import { isGoogleDriveConnected, createProjectFolder, uploadFileToDrive } from "../googleDrive";
import path from "path";
import { log } from "../lib/logger";
import { getAutoTierAUpdate, checkAttributionGate } from "../lib/profitabilityGates";
import { TIER_A_THRESHOLD, CPQ_BUILDING_TYPES, projectEmbeddings, TOUCHPOINT_OPTIONS } from "@shared/schema";

const DEAL_STAGES = ["Leads", "Contacted", "Proposal", "Negotiation", "On Hold", "Closed Won", "Closed Lost"] as const;

const attributionSchema = z.object({
  touchpoint: z.enum(TOUCHPOINT_OPTIONS.map(t => t.value) as [string, ...string[]]),
});

const bulkUpdateStageSchema = z.object({
  leadIds: z.array(z.number().int().positive()).min(1).max(100),
  dealStage: z.enum(DEAL_STAGES),
});

const stageUpdateSchema = z.object({
  dealStage: z.enum(DEAL_STAGES),
});

const personaUpdateSchema = z.object({
  personaCode: z.string().min(1).max(50),
});
import multer from "multer";
import fs from "fs";
import { db } from "../db";
import { eq } from "drizzle-orm";
import { aiClient, createProjectSummary } from "../services/ai";
import { analyzeOutcome } from "../services/personaLearning";

async function precomputeEmbedding(lead: any) {
  if (!aiClient.isConfigured()) return;
  
  try {
    const summary = createProjectSummary(lead);
    const embeddingResult = await aiClient.embed(summary);
    
    if (!embeddingResult) return;
    
    const [existing] = await db.select().from(projectEmbeddings).where(eq(projectEmbeddings.leadId, lead.id));
    
    if (existing) {
      await db.update(projectEmbeddings)
        .set({
          embedding: JSON.stringify(embeddingResult.embedding),
          projectSummary: summary,
          updatedAt: new Date(),
        })
        .where(eq(projectEmbeddings.id, existing.id));
    } else {
      await db.insert(projectEmbeddings).values({
        leadId: lead.id,
        embedding: JSON.stringify(embeddingResult.embedding),
        projectSummary: summary,
      });
    }
    
    log(`[Embedding] Pre-computed embedding for lead ${lead.id}`);
  } catch (err: any) {
    log(`[Embedding] Pre-computation failed for lead ${lead.id}: ${err.message}`);
  }
}

const ALLOWED_IMPORT_TYPES = [
  "text/csv",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
];

const upload = multer({
  dest: "/tmp/uploads/",
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max for imports
    files: 1,
  },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_IMPORT_TYPES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`File type ${file.mimetype} is not allowed. Allowed: CSV, Excel`));
    }
  },
});

function generateScopeSummary(lead: any): string {
  const areas = lead.cpqAreas || [];
  if (areas.length === 0) return "No areas configured";

  const totalSqft = areas.reduce((sum: number, area: any) => sum + (parseInt(area.squareFeet) || 0), 0);
  const disciplines = [...new Set(areas.flatMap((a: any) => a.disciplines || []))];
  const buildingTypes = [...new Set(areas.map((a: any) => {
    const typeId = a.buildingType?.toString();
    return (CPQ_BUILDING_TYPES as any)[typeId] || `Type ${typeId}`;
  }))];

  const parts: string[] = [];
  
  if (areas.length === 1) {
    parts.push(`${totalSqft.toLocaleString()} sqft ${buildingTypes[0] || 'building'}`);
  } else {
    parts.push(`${areas.length} areas totaling ${totalSqft.toLocaleString()} sqft`);
  }

  if (disciplines.length > 0) {
    const disciplineNames = (disciplines as string[]).map(d => {
      const map: Record<string, string> = {
        arch: 'Architecture',
        struct: 'Structure', 
        mech: 'Mechanical',
        elec: 'Electrical',
        plumb: 'Plumbing',
        site: 'Site'
      };
      return map[d] || d;
    });
    parts.push(disciplineNames.join(', '));
  }

  const allLods: number[] = [];
  for (const area of areas) {
    if (area.mixedInteriorLod) allLods.push(parseInt(area.mixedInteriorLod) || 200);
    if (area.mixedExteriorLod) allLods.push(parseInt(area.mixedExteriorLod) || 200);
    if (area.disciplineLods) {
      for (const lod of Object.values(area.disciplineLods)) {
        allLods.push(parseInt(lod as string) || 200);
      }
    }
  }
  if (allLods.length > 0) {
    const maxLod = Math.max(...allLods);
    parts.push(`LOD ${maxLod}`);
  }

  const risksArray = Array.isArray(lead.cpqRisks) ? lead.cpqRisks : [];
  if (risksArray.length > 0) {
    const riskNames = risksArray.map((r: string) => {
      const map: Record<string, string> = {
        remote: 'Remote',
        fastTrack: 'Fast Track',
        occupied: 'Occupied',
        hazardous: 'Hazardous',
        noPower: 'No Power/HVAC'
      };
      return map[r] || r;
    });
    parts.push(`Risk: ${riskNames.join(', ')}`);
  }

  if (lead.dispatchLocation) {
    parts.push(`Dispatch: ${lead.dispatchLocation}`);
    if (lead.distance) {
      parts.push(`${lead.distance} mi`);
    }
  }

  return parts.join(' • ');
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

export async function registerLeadRoutes(app: Express): Promise<void> {
  const hubspotService = await import('../services/hubspot');

  app.get(api.leads.list.path, isAuthenticated, requireRole("ceo", "sales"), asyncHandler(async (req, res) => {
    const leads = await storage.getLeads();
    res.json(leads);
  }));

  app.get(api.leads.get.path, isAuthenticated, requireRole("ceo", "sales"), asyncHandler(async (req, res) => {
    const lead = await storage.getLead(Number(req.params.id));
    if (!lead) return res.status(404).json({ message: "Lead not found" });
    
    if (lead.projectAddress && !lead.googleIntel && process.env.GOOGLE_MAPS_API_KEY) {
      enrichLeadWithGoogleIntel(lead.projectAddress, lead.dispatchLocation || undefined)
        .then(async (googleIntel) => {
          if (googleIntel.buildingInsights?.available || googleIntel.travelInsights?.available) {
            await storage.updateLead(lead.id, { googleIntel } as any);
            log(`[Google Intel] Lazy-enriched lead ${lead.id} with Google data`);
          }
        })
        .catch(err => {
          log(`[Google Intel] Lazy enrichment failed for lead ${lead.id}: ${err.message}`);
        });
    }
    
    res.json(lead);
  }));

  // Lead Research endpoint
  app.get("/api/leads/:id/research", isAuthenticated, requireRole("ceo", "sales"), asyncHandler(async (req, res) => {
    const leadId = Number(req.params.id);
    const research = await storage.getLeadResearch(leadId);
    res.json(research);
  }));

  // Deal Attributions (Marketing Influence Tracker)
  app.get("/api/leads/:id/attributions", isAuthenticated, requireRole("ceo", "sales"), asyncHandler(async (req, res) => {
    const leadId = Number(req.params.id);
    const attributions = await storage.getDealAttributions(leadId);
    res.json(attributions);
  }));

  app.post("/api/leads/:id/attributions", isAuthenticated, requireRole("ceo", "sales"), validateBody(attributionSchema), asyncHandler(async (req, res) => {
    const leadId = Number(req.params.id);
    const { touchpoint } = req.body;
    const attribution = await storage.createDealAttribution({
      leadId,
      touchpoint,
      recordedAt: new Date(),
    });
    res.status(201).json(attribution);
  }));

  app.delete("/api/leads/:id/attributions/:attrId", isAuthenticated, requireRole("ceo", "sales"), asyncHandler(async (req, res) => {
    const attrId = Number(req.params.attrId);
    await storage.deleteDealAttribution(attrId);
    res.status(204).send();
  }));

  app.post(api.leads.create.path, isAuthenticated, requireRole("ceo", "sales"), asyncHandler(async (req, res) => {
    try {
      log("[Lead Create] Request body: " + JSON.stringify(req.body, null, 2).slice(0, 1000));
      const input = api.leads.create.input.parse(req.body);
      
      // Auto Tier A flagging based on sqft
      const tierAUpdate = getAutoTierAUpdate(input.sqft);
      
      const leadData = {
        ...input,
        ownerId: input.ownerId || (req.user as any)?.id || null,
        leadScore: 0,
        ...(tierAUpdate || {}),
      };
      
      if (tierAUpdate) {
        log(`[Auto Tier A] Lead flagged as Tier A (${input.sqft?.toLocaleString()} sqft >= ${TIER_A_THRESHOLD.toLocaleString()})`);
      }
      
      const lead = await storage.createLead(leadData);
      log("[Lead Create] Success, lead ID: " + lead.id);
      
      // Pre-compute embedding for project matching (background)
      precomputeEmbedding(lead).catch(() => {});
      
      if (lead.projectAddress && process.env.GOOGLE_MAPS_API_KEY) {
        enrichLeadWithGoogleIntel(lead.projectAddress)
          .then(async (googleIntel) => {
            if (googleIntel.buildingInsights?.available || googleIntel.travelInsights?.available) {
              await storage.updateLead(lead.id, { googleIntel } as any);
              log(`[Google Intel] Enriched lead ${lead.id} with Google data`);
            }
          })
          .catch(err => {
            log(`[Google Intel] Enrichment failed for lead ${lead.id}: ${err.message}`);
          });
      }
      
      if (lead.buyerPersona) {
        (async () => {
          try {
            const connected = await hubspotService.isHubSpotConnected();
            if (connected) {
              const personaList = await hubspotService.getPersonas();
              const persona = personaList.find(p => p.code === lead.buyerPersona);
              if (persona) {
                const result = await hubspotService.syncLead(lead, persona);
                log(`[HubSpot] Auto-synced new lead ${lead.id}: ${result.success ? 'success' : result.error}`);
              }
            }
          } catch (err: any) {
            log(`[HubSpot] Auto-sync failed for lead ${lead.id}: ${err.message}`);
          }
        })();
      }
      
      res.status(201).json(lead);
    } catch (err: any) {
      log("ERROR: [Lead Create] - " + (err.message || err));
      if (err instanceof z.ZodError) {
        const errorMessage = err.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
        log("ERROR: [Lead Create] Validation errors - " + errorMessage);
        return res.status(400).json({ message: errorMessage });
      }
      res.status(500).json({ message: err.message || "Failed to create lead" });
    }
  }));

  app.put(api.leads.update.path, isAuthenticated, requireRole("ceo", "sales"), asyncHandler(async (req, res) => {
    try {
      const leadId = Number(req.params.id);
      const input = api.leads.update.input.parse(req.body);
      
      const previousLead = await storage.getLead(leadId);
      if (!previousLead) {
        return res.status(404).json({ message: "Lead not found" });
      }
      
      const isClosingWon = input.dealStage === "Closed Won" && previousLead.dealStage !== "Closed Won";
      const isEnteringProposal = input.dealStage === "Proposal" && previousLead.dealStage !== "Proposal";
      const addressChanged = input.projectAddress && input.projectAddress !== previousLead.projectAddress;
      
      // Attribution gate - required for Closed Won
      if (isClosingWon) {
        const leadWithUpdates = { ...previousLead, ...input } as any;
        const attributionCheck = checkAttributionGate(leadWithUpdates, true);
        if (!attributionCheck.passed) {
          log(`[Attribution Gate] Blocked Closed Won for lead ${leadId}: ${attributionCheck.message}`);
          return res.status(403).json({
            error: attributionCheck.code,
            message: attributionCheck.message,
            details: attributionCheck.details,
          });
        }
      }
      
      const updateData: any = { ...input };
      
      // Auto Tier A flagging based on sqft change
      const newSqft = input.sqft ?? previousLead.sqft;
      const wasNotTierA = previousLead.abmTier !== "Tier A";
      const tierAUpdate = getAutoTierAUpdate(newSqft);
      if (tierAUpdate && wasNotTierA) {
        updateData.abmTier = tierAUpdate.abmTier;
        updateData.leadPriority = tierAUpdate.leadPriority;
        log(`[Auto Tier A] Lead ${leadId} upgraded to Tier A (${newSqft?.toLocaleString()} sqft)`);
      }
      if (isEnteringProposal && !previousLead?.projectCode) {
        const allLeads = await storage.getLeads();
        const currentYear = new Date().getFullYear();
        const yearLeads = allLeads.filter(l => l.createdAt && new Date(l.createdAt).getFullYear() === currentYear);
        const sequenceNumber = yearLeads.length + 1;
        
        const clientCode = generateClientCode(previousLead?.clientName || input.clientName || "UNKN");
        const projectCode = generateUniversalProjectId({
          clientCode,
          projectNumber: sequenceNumber,
          creationDate: new Date(),
        });
        updateData.projectCode = projectCode;
        log(`Auto-generated Project Code for lead ${leadId}: ${projectCode}`);
      }
      
      const lead = await storage.updateLead(leadId, updateData);
      
      // Re-compute embedding if key fields changed (background)
      // Only check fields that were actually provided in the update
      const embeddingRelevantFieldsChanged = addressChanged || 
        (input.projectName !== undefined && input.projectName !== previousLead.projectName) ||
        (input.buildingType !== undefined && input.buildingType !== previousLead.buildingType) ||
        (input.sqft !== undefined && input.sqft !== previousLead.sqft) ||
        (input.scope !== undefined && input.scope !== previousLead.scope) ||
        (input.disciplines !== undefined && JSON.stringify(input.disciplines) !== JSON.stringify(previousLead.disciplines));
      
      if (embeddingRelevantFieldsChanged) {
        precomputeEmbedding(lead).catch(() => {});
      }
      
      if (addressChanged && process.env.GOOGLE_MAPS_API_KEY) {
        enrichLeadWithGoogleIntel(input.projectAddress!)
          .then(async (googleIntel) => {
            if (googleIntel.buildingInsights?.available || googleIntel.travelInsights?.available) {
              await storage.updateLead(leadId, { googleIntel } as any);
              log(`[Google Intel] Refreshed lead ${leadId} with new address data`);
            }
          })
          .catch(err => {
            log(`[Google Intel] Refresh failed for lead ${leadId}: ${err.message}`);
          });
      }
      
      if (isClosingWon) {
        const existingProject = await storage.getProjectByLeadId(leadId);
        if (!existingProject) {
          let universalProjectId = lead.projectCode;
          
          if (!universalProjectId) {
            universalProjectId = generateUPID({
              clientName: lead.clientName,
              projectName: lead.projectName || lead.projectAddress || 'Project',
              closedWonDate: new Date(),
              leadSource: lead.leadSource,
            });
            log(`Generated UPID for lead ${leadId} (source: ${lead.leadSource || 'unknown'}): ${universalProjectId}`);
            await storage.updateLead(leadId, { projectCode: universalProjectId } as any);
          }
          
          let driveFolderId: string | undefined;
          let driveFolderUrl: string | undefined;
          let driveSubfolders: any = undefined;
          let driveFolderStatus = "pending";
          
          try {
            const driveConnected = await isGoogleDriveConnected();
            if (driveConnected) {
              const folderResult = await createProjectFolder(universalProjectId);
              driveFolderId = folderResult.folderId;
              driveFolderUrl = folderResult.folderUrl;
              driveSubfolders = folderResult.subfolders;
              driveFolderStatus = "success";
              log(`Created Google Drive folder for project ${universalProjectId}: ${driveFolderUrl}`);
            }
          } catch (err) {
            driveFolderStatus = "failed";
            log("WARN: Google Drive folder creation failed (non-blocking): " + (err as any)?.message);
          }
          
          const scopeSummaryPut = generateScopeSummary(lead);
          
          await storage.createProject({
            name: `${lead.clientName} - ${lead.projectAddress || 'Project'}`,
            leadId: leadId,
            universalProjectId,
            status: "Scheduling",
            priority: "Medium",
            progress: 0,
            driveFolderId,
            driveFolderUrl,
            driveFolderStatus,
            driveSubfolders,
            quotedPrice: lead.value?.toString(),
            quotedMargin: lead.grossMarginPercent?.toString(),
            quotedAreas: lead.cpqAreas || [],
            quotedRisks: lead.cpqRisks || {},
            quotedTravel: lead.cpqTravel || {},
            quotedServices: lead.cpqServices || {},
            siteReadiness: lead.siteReadiness || {},
            clientName: lead.clientName,
            clientContact: lead.contactName,
            clientEmail: lead.contactEmail,
            clientPhone: lead.contactPhone,
            projectAddress: lead.projectAddress,
            dispatchLocation: lead.dispatchLocation,
            distance: lead.distance,
            scopeSummary: scopeSummaryPut,
          } as any);
          
          log(`Auto-created production project for lead ${leadId} (${lead.clientName}) with UPID: ${universalProjectId}`);
        }
        
        // Trigger persona learning loop for won deals
        if (lead.buyerPersona) {
          const cycleDays = previousLead.createdAt 
            ? Math.floor((Date.now() - new Date(previousLead.createdAt).getTime()) / (1000 * 60 * 60 * 24))
            : undefined;
          
          analyzeOutcome({
            leadId: leadId,
            personaCode: lead.buyerPersona,
            buyingMode: undefined, // Could be stored on lead if tracked
            outcome: 'won',
            dealValue: lead.value || undefined,
            cycleLengthDays: cycleDays,
            stageAtClose: 'Closed Won',
            projectType: lead.projectType || undefined,
            notes: lead.notes || undefined,
          }).catch(err => {
            log(`[Persona Learning] Analysis failed for won lead ${leadId}: ${err.message}`);
          });
        }
      }
      
      // Trigger persona learning loop for lost deals  
      const isClosingLost = input.dealStage === "Closed Lost" && previousLead.dealStage !== "Closed Lost";
      if (isClosingLost && lead.buyerPersona) {
        const cycleDays = previousLead.createdAt 
          ? Math.floor((Date.now() - new Date(previousLead.createdAt).getTime()) / (1000 * 60 * 60 * 24))
          : undefined;
        
        analyzeOutcome({
          leadId: leadId,
          personaCode: lead.buyerPersona,
          outcome: 'lost',
          dealValue: lead.value || undefined,
          cycleLengthDays: cycleDays,
          stageAtClose: 'Closed Lost',
          projectType: lead.projectType || undefined,
          notes: lead.notes || undefined,
        }).catch(err => {
          log(`[Persona Learning] Analysis failed for lost lead ${leadId}: ${err.message}`);
        });
      }
      
      res.json(lead);
    } catch (err) {
      return res.status(400).json({ message: "Invalid update data" });
    }
  }));

  // Partial update (PATCH) for safe lightweight field updates only
  // Restricted to buyerPersona and other non-critical fields that don't require business rule validation
  const safePatchFieldsSchema = z.object({
    buyerPersona: z.string().optional(),
    leadPriority: z.number().min(1).max(5).optional(),
    notes: z.string().optional(),
  }).strict();
  
  app.patch("/api/leads/:id", isAuthenticated, requireRole("ceo", "sales"), asyncHandler(async (req, res) => {
    try {
      const leadId = Number(req.params.id);
      
      // Validate only safe fields are being updated
      const updates = safePatchFieldsSchema.parse(req.body);
      
      if (Object.keys(updates).length === 0) {
        return res.status(400).json({ message: "No valid fields to update" });
      }
      
      const previousLead = await storage.getLead(leadId);
      if (!previousLead) {
        return res.status(404).json({ message: "Lead not found" });
      }
      
      const lead = await storage.updateLead(leadId, updates);
      res.json(lead);
    } catch (err: any) {
      log("ERROR: [Lead PATCH] - " + (err.message || err));
      if (err instanceof z.ZodError) {
        const errorMessage = err.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
        return res.status(400).json({ message: `Invalid fields: ${errorMessage}. Use PUT for full updates.` });
      }
      return res.status(400).json({ message: err.message || "Invalid update data" });
    }
  }));

  // Soft delete a lead (moves to trash for 60 days)
  app.delete(api.leads.delete.path, isAuthenticated, requireRole("ceo", "sales"), asyncHandler(async (req, res) => {
    const user = req.user as any;
    const lead = await storage.softDeleteLead(Number(req.params.id), user?.id);
    res.json(lead);
  }));

  // Get trash (soft-deleted leads)
  app.get("/api/leads/trash", isAuthenticated, requireRole("ceo", "sales"), asyncHandler(async (_req, res) => {
    const deletedLeads = await storage.getDeletedLeads();
    res.json(deletedLeads);
  }));

  // Restore a soft-deleted lead
  app.patch("/api/leads/:id/restore", isAuthenticated, requireRole("ceo", "sales"), asyncHandler(async (req, res) => {
    const lead = await storage.restoreLead(Number(req.params.id));
    res.json(lead);
  }));

  // Permanently delete a lead (for trash cleanup)
  app.delete("/api/leads/:id/permanent", isAuthenticated, requireRole("ceo", "sales"), asyncHandler(async (req, res) => {
    await storage.deleteLead(Number(req.params.id));
    res.status(204).send();
  }));

  // Bulk update stage for multiple leads
  app.post("/api/leads/bulk-update-stage", isAuthenticated, requireRole("ceo", "sales"), validateBody(bulkUpdateStageSchema), asyncHandler(async (req, res) => {
    const { leadIds, dealStage } = req.body;
    
    // Map stage to probability
    const stageProbability: Record<string, number> = {
      "Leads": 10,
      "Contacted": 20,
      "Proposal": 50,
      "Negotiation": 75,
      "On Hold": 50,
      "Closed Won": 100,
      "Closed Lost": 0,
    };
    
    let updated = 0;
    const errors: string[] = [];
    
    for (const id of leadIds) {
      try {
        await storage.updateLead(Number(id), { 
          dealStage, 
          probability: stageProbability[dealStage] || 50 
        });
        updated++;
      } catch (err: any) {
        errors.push(`Lead ${id}: ${err.message}`);
      }
    }
    
    res.json({ 
      success: true, 
      updated, 
      errors: errors.length > 0 ? errors : undefined,
      message: `Updated ${updated} leads to ${dealStage}${errors.length > 0 ? `, ${errors.length} errors` : ''}`
    });
  }));

  app.patch("/api/leads/:id/stage", isAuthenticated, requireRole("ceo", "sales"), validateBody(stageUpdateSchema), asyncHandler(async (req, res) => {
    try {
      const leadId = Number(req.params.id);
      const { dealStage } = req.body;
      
      const previousLead = await storage.getLead(leadId);
      if (!previousLead) {
        return res.status(404).json({ message: "Lead not found" });
      }
      
      const isClosingWon = dealStage === "Closed Won" && previousLead.dealStage !== "Closed Won";
      const isEnteringProposal = dealStage === "Proposal" && previousLead.dealStage !== "Proposal";
      
      const updateData: Record<string, any> = { dealStage };
      
      if (isEnteringProposal && !previousLead.projectCode) {
        const allLeads = await storage.getLeads();
        const currentYear = new Date().getFullYear();
        const yearLeads = allLeads.filter(l => l.createdAt && new Date(l.createdAt).getFullYear() === currentYear);
        const sequenceNumber = yearLeads.length + 1;
        
        const clientCode = generateClientCode(previousLead.clientName);
        const projectCode = generateUniversalProjectId({
          clientCode,
          projectNumber: sequenceNumber,
          creationDate: new Date(),
        });
        updateData.projectCode = projectCode;
        log(`Auto-generated Project Code for lead ${leadId}: ${projectCode}`);
      }
      
      const lead = await storage.updateLead(leadId, updateData);
      
      if (isClosingWon) {
        const existingProject = await storage.getProjectByLeadId(leadId);
        if (!existingProject) {
          let universalProjectId = lead.projectCode;
          
          if (!universalProjectId) {
            universalProjectId = generateUPID({
              clientName: lead.clientName,
              projectName: lead.projectName || lead.projectAddress || 'Project',
              closedWonDate: new Date(),
              leadSource: lead.leadSource,
            });
            log(`Generated UPID for lead ${leadId} (source: ${lead.leadSource || 'unknown'}): ${universalProjectId}`);
            await storage.updateLead(leadId, { projectCode: universalProjectId } as any);
          }
          
          let driveFolderId: string | undefined;
          let driveFolderUrl: string | undefined;
          let driveSubfolders: any = undefined;
          let driveFolderStatus = "pending";
          
          try {
            const driveConnected = await isGoogleDriveConnected();
            if (driveConnected) {
              const folderResult = await createProjectFolder(universalProjectId);
              driveFolderId = folderResult.folderId;
              driveFolderUrl = folderResult.folderUrl;
              driveSubfolders = folderResult.subfolders;
              driveFolderStatus = "success";
              log(`Created Google Drive folder for project ${universalProjectId}: ${driveFolderUrl}`);
            }
          } catch (err) {
            driveFolderStatus = "failed";
            log("WARN: Google Drive folder creation failed: " + (err as any)?.message);
          }
          
          const scopeSummaryStage = generateScopeSummary(lead);
          
          await storage.createProject({
            name: `${lead.clientName} - ${lead.projectAddress || 'Project'}`,
            leadId: leadId,
            universalProjectId,
            status: "Scheduling",
            priority: "Medium",
            progress: 0,
            driveFolderId,
            driveFolderUrl,
            driveFolderStatus,
            driveSubfolders,
            quotedPrice: lead.value?.toString(),
            quotedMargin: lead.grossMarginPercent?.toString(),
            quotedAreas: lead.cpqAreas || [],
            quotedRisks: lead.cpqRisks || {},
            quotedTravel: lead.cpqTravel || {},
            quotedServices: lead.cpqServices || {},
            siteReadiness: lead.siteReadiness || {},
            clientName: lead.clientName,
            clientContact: lead.contactName,
            clientEmail: lead.contactEmail,
            clientPhone: lead.contactPhone,
            projectAddress: lead.projectAddress,
            dispatchLocation: lead.dispatchLocation,
            distance: lead.distance,
            scopeSummary: scopeSummaryStage,
          } as any);
          
          log(`Auto-created production project for lead ${leadId} (${lead.clientName}) with UPID: ${universalProjectId}, scope: ${scopeSummaryStage}`);
          
          // Migrate lead documents to Google Drive "Additional Documents" folder
          if (driveFolderStatus === "success" && driveSubfolders?.additionalDocuments) {
            try {
              const documents = await storage.getLeadDocuments(leadId);
              for (const doc of documents) {
                if (!doc.movedToDriveAt && doc.storageKey) {
                  try {
                    const storagePath = path.join(process.cwd(), doc.storageKey);
                    if (fs.existsSync(storagePath)) {
                      const fileBuffer = fs.readFileSync(storagePath);
                      const driveResult = await uploadFileToDrive(
                        driveSubfolders.additionalDocuments,
                        doc.originalName,
                        doc.mimeType,
                        fileBuffer
                      );
                      
                      await storage.updateLeadDocument(doc.id, {
                        movedToDriveAt: new Date(),
                        driveFileId: driveResult.fileId,
                        driveFileUrl: driveResult.webViewLink,
                      });
                      
                      log(`Migrated document "${doc.originalName}" to Google Drive for lead ${leadId}`);
                    }
                  } catch (docErr) {
                    log(`WARN: Failed to migrate document ${doc.id}: ${(docErr as any)?.message}`);
                  }
                }
              }
            } catch (migrationErr) {
              log(`WARN: Document migration failed for lead ${leadId}: ${(migrationErr as any)?.message}`);
            }
          }
        }
      }
      
      res.json(lead);
    } catch (err) {
      log("ERROR: Stage update error - " + (err as any)?.message);
      return res.status(500).json({ message: "Failed to update stage" });
    }
  }));

  app.post("/api/leads/import", isAuthenticated, requireRole("ceo", "sales"), upload.single("file"), asyncHandler(async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      const content = fs.readFileSync(req.file.path, "utf-8");
      fs.unlinkSync(req.file.path);

      const lines = content.split(/\r?\n/).filter(line => line.trim());
      if (lines.length < 2) {
        return res.status(400).json({ message: "CSV must have a header row and at least one data row" });
      }

      const headerLine = lines[0];
      const headers = parseCSVLine(headerLine).map(h => h.toLowerCase().trim());

      const fieldMapping: Record<string, string> = {
        "client": "clientName",
        "client name": "clientName",
        "clientname": "clientName",
        "company": "clientName",
        "business name": "clientName",
        "project": "projectName",
        "project name": "projectName",
        "address": "projectAddress",
        "project address": "projectAddress",
        "value": "value",
        "deal value": "value",
        "amount": "value",
        "probability": "probability",
        "stage": "dealStage",
        "deal stage": "dealStage",
        "notes": "notes",
        "contact": "contactName",
        "contact name": "contactName",
        "name": "contactName",
        "first name": "_firstName",
        "last name": "_lastName",
        "email": "contactEmail",
        "phone": "contactPhone",
        "source": "leadSource",
        "priority": "leadPriority",
        "building type": "buildingType",
        "sqft": "sqft",
        "scope": "scope",
      };

      const columnMap: Record<number, string> = {};
      headers.forEach((header, idx) => {
        const mapped = fieldMapping[header];
        if (mapped) {
          columnMap[idx] = mapped;
        }
      });

      const hasClientName = Object.values(columnMap).includes("clientName");
      const hasContactName = Object.values(columnMap).includes("contactName");
      const hasFirstName = Object.values(columnMap).includes("_firstName");
      const hasEmail = Object.values(columnMap).includes("contactEmail");
      
      if (!hasClientName && !hasContactName && !hasFirstName && !hasEmail) {
        return res.status(400).json({ 
          message: "CSV must have at least one of: 'Client Name', 'Business Name', 'Contact Name', 'First Name', or 'Email'. Found headers: " + headers.join(", ") 
        });
      }

      const results = { imported: 0, errors: [] as string[] };

      for (let i = 1; i < lines.length; i++) {
        const values = parseCSVLine(lines[i]);
        if (values.length === 0 || values.every(v => !v.trim())) continue;

        try {
          const leadData: Record<string, any> = {
            dealStage: "Leads",
            probability: 50,
            value: 0,
            leadPriority: 3,
          };

          let firstName = "";
          let lastName = "";
          
          Object.entries(columnMap).forEach(([colIdx, field]) => {
            const val = values[Number(colIdx)]?.trim();
            if (val) {
              if (field === "_firstName") {
                firstName = val;
              } else if (field === "_lastName") {
                lastName = val;
              } else if (field === "value" || field === "probability" || field === "sqft" || field === "leadPriority") {
                const num = parseFloat(val.replace(/[$,]/g, ""));
                if (!isNaN(num)) leadData[field] = num;
              } else {
                leadData[field] = val;
              }
            }
          });

          if ((firstName || lastName) && !leadData.contactName) {
            leadData.contactName = [firstName, lastName].filter(Boolean).join(" ");
          }

          if (!leadData.clientName) {
            if (leadData.contactName) {
              leadData.clientName = leadData.contactName;
            } else if (leadData.contactEmail) {
              const domain = leadData.contactEmail.split("@")[1];
              if (domain && !domain.includes("gmail") && !domain.includes("yahoo")) {
                leadData.clientName = domain.split(".")[0].charAt(0).toUpperCase() + domain.split(".")[0].slice(1);
              } else {
                leadData.clientName = leadData.contactEmail;
              }
            } else {
              results.errors.push(`Row ${i + 1}: No client name or contact info found`);
              continue;
            }
          }

          await storage.createLead(leadData as any);
          results.imported++;
        } catch (err: any) {
          results.errors.push(`Row ${i + 1}: ${err.message || "Invalid data"}`);
        }
      }

      res.json({
        message: `Imported ${results.imported} leads successfully`,
        imported: results.imported,
        errors: results.errors.slice(0, 10),
        totalErrors: results.errors.length,
      });
    } catch (err: any) {
      log("ERROR: CSV Import error - " + (err?.message || err));
      res.status(500).json({ message: err.message || "Failed to import CSV" });
    }
  }));

  app.post("/api/leads/:id/generate-upid", isAuthenticated, requireRole("ceo", "sales"), asyncHandler(async (req, res) => {
    try {
      const leadId = Number(req.params.id);
      const lead = await storage.getLead(leadId);
      if (!lead) {
        return res.status(404).json({ message: "Lead not found" });
      }

      if (lead.projectCode) {
        return res.json({ 
          success: true, 
          upid: lead.projectCode,
          driveFolderUrl: null,
          message: "UPID already exists for this lead",
          alreadyExists: true,
        });
      }

      if (!lead.clientName) {
        return res.status(400).json({ message: "Client name is required to generate UPID" });
      }

      const universalProjectId = generateUPID({
        clientName: lead.clientName,
        projectName: lead.projectName || lead.projectAddress || 'Project',
        closedWonDate: new Date(),
        leadSource: lead.leadSource,
      });
      log(`[Early Binding] Generated UPID for lead ${leadId}: ${universalProjectId}`);

      let driveFolderUrl: string | null = null;
      let driveFolderId: string | null = null;
      
      try {
        const driveConnected = await isGoogleDriveConnected();
        if (driveConnected) {
          const folderResult = await createProjectFolder(universalProjectId);
          driveFolderId = folderResult.folderId;
          driveFolderUrl = folderResult.folderUrl;
          log(`[Early Binding] Created Google Drive folder for ${universalProjectId}: ${driveFolderUrl}`);
        }
      } catch (err) {
        log("WARN: [Early Binding] Google Drive folder creation failed: " + (err as any)?.message);
      }

      await storage.updateLead(leadId, { 
        projectCode: universalProjectId,
        driveFolderId: driveFolderId || undefined,
        driveFolderUrl: driveFolderUrl || undefined,
      } as any);

      res.json({ 
        success: true, 
        upid: universalProjectId,
        driveFolderUrl,
        driveFolderId,
        message: `UPID generated: ${universalProjectId}`,
        alreadyExists: false,
      });
    } catch (err) {
      log("ERROR: Generate UPID error - " + (err as any)?.message);
      return res.status(500).json({ message: "Failed to generate UPID" });
    }
  }));

  app.get("/api/leads/:id/estimate-pdf", isAuthenticated, requireRole("ceo", "sales"), asyncHandler(async (req, res) => {
    try {
      const leadId = Number(req.params.id);
      const lead = await storage.getLead(leadId);
      
      if (!lead) {
        return res.status(404).json({ message: "Lead not found" });
      }

      const { generateEstimatePDF } = await import("../pdf-generator");
      const doc = generateEstimatePDF({ lead });
      
      const filename = `Estimate-${lead.projectCode || lead.id}-${lead.clientName.replace(/[^a-zA-Z0-9]/g, "_")}.pdf`;
      
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
      
      doc.pipe(res);
      doc.end();
    } catch (err) {
      log("ERROR: PDF generation error - " + (err as any)?.message);
      return res.status(500).json({ message: "Failed to generate PDF estimate" });
    }
  }));

  app.post("/api/leads/:id/hubspot-sync", isAuthenticated, requireRole("ceo", "sales"), asyncHandler(async (req, res) => {
    const leadId = Number(req.params.id);
    const { personaCode } = req.body;
    
    const lead = await storage.getLead(leadId);
    if (!lead) return res.status(404).json({ message: "Lead not found" });

    const personaList = await hubspotService.getPersonas();
    const persona = personaList.find(p => p.code === (personaCode || lead.buyerPersona || 'BP1'));
    if (!persona) return res.status(400).json({ message: "Persona not found" });

    const result = await hubspotService.syncLead(lead, persona);
    res.json(result);
  }));

  app.get("/api/leads/:id/expenses", isAuthenticated, requireRole("ceo"), asyncHandler(async (req, res) => {
    try {
      const { quickbooksClient } = await import("../quickbooks-client");
      const leadId = parseInt(req.params.id);
      const expenses = await quickbooksClient.getExpensesByLead(leadId);
      const summary = await quickbooksClient.getExpenseSummaryByLead(leadId);
      res.json({ expenses, summary });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  }));

  app.get("/api/leads/:id/outstanding-balance", isAuthenticated, asyncHandler(async (req, res) => {
    try {
      const leadId = Number(req.params.id);
      const leadInvoices = await storage.getInvoicesByLead(leadId);
      
      const outstandingBalance = leadInvoices.reduce((sum, inv) => {
        if (inv.status !== "Paid" && inv.status !== "Written Off") {
          return sum + Number(inv.amount || 0);
        }
        return sum;
      }, 0);

      res.json({
        leadId,
        outstandingBalance,
        invoiceCount: leadInvoices.filter(i => i.status !== "Paid").length
      });
    } catch (error) {
      log("ERROR: Outstanding balance check error - " + (error as any)?.message);
      res.status(500).json({ message: "Failed to check outstanding balance" });
    }
  }));

  // Site Readiness Magic Link - Generate link for client to fill out
  app.post("/api/leads/:id/site-readiness-link", isAuthenticated, requireRole("ceo", "sales"), asyncHandler(async (req, res) => {
    const leadId = Number(req.params.id);
    const { questionIds, siteReadiness } = req.body;

    const lead = await storage.getLead(leadId);
    if (!lead) return res.status(404).json({ message: "Lead not found" });

    const crypto = await import("crypto");
    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    // Store CEO answers in internal segment, client answers stay empty until client submits
    const existingAnswers = (lead.siteReadiness as { internal?: Record<string, any>; client?: Record<string, any> }) || {};
    const structuredAnswers = {
      internal: { ...(existingAnswers.internal || {}), ...(siteReadiness || {}) }, // CEO-provided answers with safe defaults
      client: existingAnswers.client || {}, // Client-submitted answers (preserved if already exists)
    };

    await storage.updateLead(leadId, {
      clientToken: token,
      clientTokenExpiresAt: expiresAt,
      siteReadinessStatus: "sent",
      siteReadinessSentAt: new Date(),
      siteReadinessQuestionsSent: questionIds,
      siteReadiness: structuredAnswers,
    } as any);

    const appUrl = process.env.REPLIT_DEPLOYMENT_URL || process.env.REPLIT_DEV_DOMAIN 
      ? `https://${process.env.REPLIT_DEV_DOMAIN}` 
      : "http://localhost:5000";
    const magicLink = `${appUrl}/site-readiness/${token}`;

    log(`[Site Readiness] Generated magic link for lead ${leadId} with ${questionIds.length} questions`);

    res.json({ 
      success: true, 
      magicLink, 
      expiresAt,
      questionsCount: questionIds.length,
    });
  }));

  // Public endpoint - Get site readiness form by token (no auth required)
  app.get("/api/public/site-readiness/:token", asyncHandler(async (req, res) => {
    const { token } = req.params;

    const lead = await storage.getLeadByClientToken(token);
    if (!lead) return res.status(404).json({ message: "Invalid or expired link" });

    if (lead.clientTokenExpiresAt && new Date(lead.clientTokenExpiresAt) < new Date()) {
      return res.status(410).json({ message: "This link has expired" });
    }

    const sentQuestionIds = (lead.siteReadinessQuestionsSent as string[]) || [];
    const structuredAnswers = (lead.siteReadiness as { internal?: Record<string, any>; client?: Record<string, any> }) || {};
    
    // ONLY return client-submitted answers - NEVER expose internal/CEO answers
    const clientAnswers = structuredAnswers.client || {};
    
    // Filter to only sent questions
    const filteredClientAnswers: Record<string, any> = {};
    for (const qId of sentQuestionIds) {
      if (clientAnswers[qId] !== undefined) {
        filteredClientAnswers[qId] = clientAnswers[qId];
      }
    }

    res.json({
      projectName: lead.projectName || lead.clientName,
      questionIds: sentQuestionIds,
      existingAnswers: filteredClientAnswers, // ONLY client-submitted answers
      status: lead.siteReadinessStatus,
    });
  }));

  // Public endpoint - Submit site readiness answers (no auth required)
  app.post("/api/public/site-readiness/:token", asyncHandler(async (req, res) => {
    const { token } = req.params;
    const { answers } = req.body;

    const lead = await storage.getLeadByClientToken(token);
    if (!lead) return res.status(404).json({ message: "Invalid or expired link" });

    if (lead.clientTokenExpiresAt && new Date(lead.clientTokenExpiresAt) < new Date()) {
      return res.status(410).json({ message: "This link has expired" });
    }

    // Get existing structured answers
    const existingAnswers = (lead.siteReadiness as { internal?: Record<string, any>; client?: Record<string, any> }) || {};
    
    // Update ONLY the client segment, preserving internal/CEO answers
    const updatedAnswers = {
      internal: existingAnswers.internal || {},
      client: { ...(existingAnswers.client || {}), ...answers },
    };

    await storage.updateLead(lead.id, {
      siteReadiness: updatedAnswers,
      siteReadinessStatus: "completed",
      siteReadinessCompletedAt: new Date(),
    } as any);

    log(`[Site Readiness] Client submitted answers for lead ${lead.id}`);

    res.json({ 
      success: true, 
      message: "Thank you! Your answers have been submitted." 
    });
  }));
}
