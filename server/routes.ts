import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { db } from "./db";
import { api } from "@shared/routes";
import { z } from "zod";
import { sql, and, gte, lt, eq } from "drizzle-orm";
import { HBIM_BUILDING_TYPES, type BuildingType, timeLogs, expenses, missionLogs, evidenceVault, insertEvidenceVaultSchema, marketingPosts } from "@shared/schema";
import { generateUniversalProjectId, generateClientCode, generateUPID, validateUPID } from "@shared/utils/projectId";
import { setupAuth, registerAuthRoutes, isAuthenticated, requireRole } from "./replit_integrations/auth";
import { registerChatRoutes } from "./replit_integrations/chat";
import { registerImageRoutes } from "./replit_integrations/image";
import OpenAI from "openai";
import { getTimeEntries, isAirtableConfigured, getAirtableOverview, getAirtableAnalytics, AIRTABLE_WRITE_ENABLED, syncProjectToAirtable } from "./airtable";
import { applyStalenessPenalties, getStalenessStatus } from "./staleness";
import { calculateProbability, recalculateAllProbabilities, getWinLossAnalytics, getStageSpecificStaleness } from "./probability";
import { getGmailClient, getCalendarClient, getDriveClient } from "./google-clients";
import { quickbooksClient } from "./quickbooks-client";
import { createProjectFolder, isGoogleDriveConnected, uploadFileToDrive } from "./googleDrive";
import { calculateTravelDistance, validateShiftGate, createScanCalendarEvent, getTechnicianAvailability, determineTravelScenario } from "./travel-scheduling";
import { enrichLeadWithGoogleIntel, refreshGoogleIntel } from "./google-intel";
import { generateProposalPDF, generateProposalFilename } from "./services/pdfGenerator";
import * as hubspotServiceTop from "./services/hubspot";
import * as ghlService from "./services/gohighlevel";
import multer from "multer";
import fs from "fs";
import crypto from "crypto";
import { nanoid } from "nanoid";
// Parse PDF using pdfjs-dist
async function parsePdf(dataBuffer: Buffer): Promise<{ text: string }> {
  const pdfjsLib = await import("pdfjs-dist/legacy/build/pdf.mjs");
  
  const uint8Array = new Uint8Array(dataBuffer);
  const loadingTask = pdfjsLib.getDocument({ data: uint8Array });
  const pdf = await loadingTask.promise;
  
  let fullText = "";
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const pageText = textContent.items
      .map((item: any) => item.str)
      .join(" ");
    fullText += pageText + "\n";
  }
  
  return { text: fullText };
}

const upload = multer({ dest: "/tmp/uploads/" });

// Initialize OpenAI for Field Note Translation
const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

// AI-powered extraction of deal data from PDF text
async function extractDealFromPDF(pdfText: string, filename: string): Promise<{
  clientName: string;
  projectName: string | null;
  projectAddress: string | null;
  value: number;
  buildingType: string | null;
  sqft: number | null;
  scope: string | null;
  disciplines: string | null;
  bimDeliverable: string | null;
  contactName: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  notes: string | null;
  unmappedFields: { field: string; value: string }[];
}> {
  const systemPrompt = `You are an expert at extracting structured data from PandaDoc proposals for a laser scanning and BIM company.

Extract the following fields from the proposal text. Return ONLY valid JSON, no explanation.

Fields to extract:
- clientName: Company or client name (required)
- projectName: Project title or name
- projectAddress: Site address or location
- value: Total proposal value/price as a number (no $ or commas)
- buildingType: Type of building (Commercial, Industrial, Residential, Healthcare, Education, Retail, Mixed Use, etc.)
- sqft: Square footage as a number
- scope: Scope of work (Full Building, Interior Only, Exterior Only, MEP Systems Only, etc.)
- disciplines: BIM disciplines mentioned (Architecture, Structural, MEPF, etc. with LOD levels if specified)
- bimDeliverable: Deliverable format (Revit, AutoCAD, Point Cloud, etc.)
- contactName: Primary contact person name
- contactEmail: Contact email address
- contactPhone: Contact phone number
- notes: Key details, special requirements, or important notes from the proposal

Also identify any important proposal fields that don't map to the above categories and list them in "unmappedFields" as {field, value} pairs. This helps identify enhancements needed for the CRM.

Return format:
{
  "clientName": "...",
  "projectName": "...",
  "projectAddress": "...",
  "value": 12500,
  "buildingType": "...",
  "sqft": 50000,
  "scope": "...",
  "disciplines": "...",
  "bimDeliverable": "...",
  "contactName": "...",
  "contactEmail": "...",
  "contactPhone": "...",
  "notes": "...",
  "unmappedFields": [{"field": "...", "value": "..."}]
}`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Extract deal data from this proposal (filename: ${filename}):\n\n${pdfText.substring(0, 15000)}` }
      ],
      temperature: 0.1,
      response_format: { type: "json_object" }
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error("No response from AI");
    }

    const parsed = JSON.parse(content);
    return {
      clientName: parsed.clientName || "Unknown Client",
      projectName: parsed.projectName || null,
      projectAddress: parsed.projectAddress || null,
      value: typeof parsed.value === 'number' ? parsed.value : parseFloat(parsed.value) || 0,
      buildingType: parsed.buildingType || null,
      sqft: typeof parsed.sqft === 'number' ? parsed.sqft : parseInt(parsed.sqft) || null,
      scope: parsed.scope || null,
      disciplines: parsed.disciplines || null,
      bimDeliverable: parsed.bimDeliverable || null,
      contactName: parsed.contactName || null,
      contactEmail: parsed.contactEmail || null,
      contactPhone: parsed.contactPhone || null,
      notes: parsed.notes || null,
      unmappedFields: Array.isArray(parsed.unmappedFields) ? parsed.unmappedFields : []
    };
  } catch (error: any) {
    console.error("AI extraction error:", error);
    // Return a basic extraction using regex fallbacks
    const clientMatch = pdfText.match(/(?:prepared for|client|company)[:\s]+([A-Z][A-Za-z0-9\s&.,]+)/i);
    const valueMatch = pdfText.match(/\$\s*([\d,]+(?:\.\d{2})?)/);
    const emailMatch = pdfText.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
    const phoneMatch = pdfText.match(/(?:\+1\s?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/);

    return {
      clientName: clientMatch?.[1]?.trim() || filename.replace(/\.pdf$/i, ""),
      projectName: null,
      projectAddress: null,
      value: valueMatch ? parseFloat(valueMatch[1].replace(/,/g, "")) : 0,
      buildingType: null,
      sqft: null,
      scope: null,
      disciplines: null,
      bimDeliverable: null,
      contactName: null,
      contactEmail: emailMatch?.[0] || null,
      contactPhone: phoneMatch?.[0] || null,
      notes: `AI extraction failed: ${error.message}. Manual review recommended.`,
      unmappedFields: []
    };
  }
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // === AUTHENTICATION ===
  await setupAuth(app);
  registerAuthRoutes(app);

  // === AI CHAT & IMAGE ===
  registerChatRoutes(app);
  registerImageRoutes(app);

  // === PUBLIC CLIENT INPUT PORTAL (Magic Links) ===
  // Generate a magic link token for a quote (expires in 7 days)
  app.post("/api/cpq-quotes/:id/generate-link", isAuthenticated, requireRole("ceo", "sales"), async (req, res) => {
    try {
      const quoteId = Number(req.params.id);
      const token = nanoid(12); // Generate secure 12-char token
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
      
      const quote = await storage.updateCpqQuote(quoteId, { 
        clientToken: token,
        clientTokenExpiresAt: expiresAt,
        clientStatus: "pending"
      });
      
      if (!quote) {
        return res.status(404).json({ message: "Quote not found" });
      }
      
      res.json({ 
        token,
        link: `/client-input/${token}`,
        expiresAt: expiresAt.toISOString()
      });
    } catch (error) {
      console.error("Error generating client link:", error);
      res.status(500).json({ message: "Failed to generate link" });
    }
  });

  // PUBLIC: Get quote questions for client (no auth required)
  app.get("/api/public/quote/:token", async (req, res) => {
    try {
      const { token } = req.params;
      const quote = await storage.getCpqQuoteByToken(token);
      
      if (!quote) {
        return res.status(404).json({ message: "Link expired or invalid" });
      }
      
      // Check token expiration
      if (quote.clientTokenExpiresAt && new Date() > new Date(quote.clientTokenExpiresAt)) {
        return res.status(410).json({ 
          message: "This link has expired. Please contact your sales representative for a new link.",
          expired: true
        });
      }
      
      // Only send what's needed for the client form (security)
      res.json({
        id: quote.id,
        projectName: quote.projectName,
        clientName: quote.clientName,
        clientStatus: quote.clientStatus,
        // Identify which fields need client input
        unknowns: {
          siteStatus: quote.siteStatus === "ask_client",
          mepScope: quote.mepScope === "ask_client",
          actScanning: quote.actScanning === "ask_client",
          scanningOnly: quote.scanningOnly === "ask_client",
        }
      });
    } catch (error) {
      console.error("Error fetching public quote:", error);
      res.status(500).json({ message: "Failed to load project details" });
    }
  });

  // PUBLIC: Submit client answers (no auth required)
  app.post("/api/public/quote/:token", async (req, res) => {
    try {
      const { token } = req.params;
      const { answers } = req.body;
      
      const quote = await storage.getCpqQuoteByToken(token);
      if (!quote) {
        return res.status(404).json({ message: "Link expired or invalid" });
      }
      
      // Check token expiration
      if (quote.clientTokenExpiresAt && new Date() > new Date(quote.clientTokenExpiresAt)) {
        return res.status(410).json({ 
          message: "This link has expired. Please contact your sales representative for a new link.",
          expired: true
        });
      }
      
      // Only allow specific RFI fields to be updated (security)
      // Values must match the schema enums in the Quote Builder
      const allowedFields = ["siteStatus", "mepScope", "actScanning", "scanningOnly"];
      const allowedValues: Record<string, string[]> = {
        siteStatus: ["vacant", "occupied", "construction"],
        mepScope: ["full", "partial", "none"],
        actScanning: ["yes", "no", "other"],
        scanningOnly: ["none", "full_day", "half_day"],
      };
      
      const sanitizedAnswers: Record<string, string> = {};
      for (const [key, value] of Object.entries(answers)) {
        if (allowedFields.includes(key) && typeof value === "string") {
          const allowed = allowedValues[key];
          if (allowed && allowed.includes(value)) {
            sanitizedAnswers[key] = value;
          }
        }
      }
      
      if (Object.keys(sanitizedAnswers).length === 0) {
        return res.status(400).json({ message: "No valid answers provided" });
      }
      
      // Update the quote with validated client answers
      const updatedQuote = await storage.updateCpqQuote(quote.id, {
        ...sanitizedAnswers,
        clientStatus: "answered"
      });
      
      // Create notification for the sales rep
      if (quote.leadId) {
        const lead = await storage.getLead(quote.leadId);
        if (lead?.ownerId) {
          await storage.createNotification({
            userId: lead.ownerId,
            type: "client_input",
            title: "Client Answered Questions",
            quoteId: quote.id,
            leadId: quote.leadId,
            message: `${quote.clientName || lead.clientName || "Client"} has answered the scope questions for ${quote.projectName || "your project"}. The quote is ready for recalculation.`,
            read: false
          });
          console.log(`📧 Notification sent to rep ${lead.ownerId} for quote ${quote.id}`);
        }
      }
      
      // Note: Recalculation will happen when the rep opens the quote builder
      console.log(`✅ Client input received for quote ${quote.id}. Ready for recalculation.`);
      
      res.json({ success: true });
    } catch (error) {
      console.error("Error submitting client answers:", error);
      res.status(500).json({ message: "Failed to submit answers" });
    }
  });

  // === GOOGLE CHAT WEBHOOK (for Chat API configuration) ===
  // This endpoint handles incoming events from Google Chat
  app.post("/api/google-chat/webhook", async (req, res) => {
    const event = req.body;
    console.log("Google Chat webhook received:", event.type || "unknown event");
    
    // Handle different event types
    switch (event.type) {
      case "ADDED_TO_SPACE":
        console.log("Bot added to space:", event.space?.displayName);
        res.json({ text: "Scan2Plan Concierge is now active in this space." });
        break;
      case "REMOVED_FROM_SPACE":
        console.log("Bot removed from space:", event.space?.displayName);
        res.json({});
        break;
      case "MESSAGE":
        console.log("Message received:", event.message?.text);
        res.json({ text: "Scan2Plan Concierge received your message. This space is managed automatically." });
        break;
      default:
        res.json({ text: "Event received" });
    }
  });

  // === USER MANAGEMENT (CEO Only) ===
  // List all users (for role management)
  app.get("/api/users", isAuthenticated, requireRole("ceo"), async (req, res) => {
    try {
      const allUsers = await storage.getAllUsers();
      res.json(allUsers);
    } catch (error: any) {
      console.error("Error fetching users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  // Update user role (CEO only)
  app.patch("/api/users/:id/role", isAuthenticated, requireRole("ceo"), async (req, res) => {
    try {
      const { role } = req.body;
      const validRoles = ["ceo", "sales", "production", "accounting"];
      
      if (!role || !validRoles.includes(role)) {
        return res.status(400).json({ 
          message: "Invalid role. Must be one of: ceo, sales, production, accounting" 
        });
      }
      
      const updatedUser = await storage.updateUserRole(req.params.id, role);
      if (!updatedUser) {
        return res.status(404).json({ message: "User not found" });
      }
      
      res.json(updatedUser);
    } catch (error: any) {
      console.error("Error updating user role:", error);
      res.status(500).json({ message: "Failed to update user role" });
    }
  });

  // === LEADS ROUTES (CEO + Sales) ===
  app.get(api.leads.list.path, isAuthenticated, requireRole("ceo", "sales"), async (req, res) => {
    const leads = await storage.getLeads();
    res.json(leads);
  });

  app.get(api.leads.get.path, isAuthenticated, requireRole("ceo", "sales"), async (req, res) => {
    const lead = await storage.getLead(Number(req.params.id));
    if (!lead) return res.status(404).json({ message: "Lead not found" });
    
    // Lazy enrichment: trigger Google Intel if lead has address but no intel
    if (lead.projectAddress && !lead.googleIntel && process.env.GOOGLE_MAPS_API_KEY) {
      enrichLeadWithGoogleIntel(lead.projectAddress, lead.dispatchLocation || undefined)
        .then(async (googleIntel) => {
          if (googleIntel.buildingInsights?.available || googleIntel.travelInsights?.available) {
            await storage.updateLead(lead.id, { googleIntel } as any);
            console.log(`[Google Intel] Lazy-enriched lead ${lead.id} with Google data`);
          }
        })
        .catch(err => {
          console.log(`[Google Intel] Lazy enrichment failed for lead ${lead.id}:`, err.message);
        });
    }
    
    res.json(lead);
  });

  app.post(api.leads.create.path, isAuthenticated, requireRole("ceo", "sales"), async (req, res) => {
    try {
      console.log("[Lead Create] Request body:", JSON.stringify(req.body, null, 2).slice(0, 1000));
      const input = api.leads.create.input.parse(req.body);
      
      // Auto-assign owner to current user if not specified
      const leadData = {
        ...input,
        ownerId: input.ownerId || (req.user as any)?.id || null,
        leadScore: 0,
      };
      
      const lead = await storage.createLead(leadData);
      console.log("[Lead Create] Success, lead ID:", lead.id);
      
      // Trigger auto-research in background (non-blocking)
      if (process.env.AI_INTEGRATIONS_OPENAI_API_KEY && process.env.AI_INTEGRATIONS_OPENAI_BASE_URL) {
        triggerAutoResearch(lead.id, lead.clientName).catch(err => {
          console.log(`Auto-research failed for lead ${lead.id}:`, err.message);
        });
      }
      
      // Trigger Google Intel enrichment in background (non-blocking)
      if (lead.projectAddress && process.env.GOOGLE_MAPS_API_KEY) {
        enrichLeadWithGoogleIntel(lead.projectAddress)
          .then(async (googleIntel) => {
            if (googleIntel.buildingInsights?.available || googleIntel.travelInsights?.available) {
              await storage.updateLead(lead.id, { googleIntel } as any);
              console.log(`[Google Intel] Enriched lead ${lead.id} with Google data`);
            }
          })
          .catch(err => {
            console.log(`[Google Intel] Enrichment failed for lead ${lead.id}:`, err.message);
          });
      }
      
      // Fire-and-forget HubSpot sync (Growth Engine trigger)
      if (lead.buyerPersona) {
        (async () => {
          try {
            const connected = await hubspotServiceTop.isHubSpotConnected();
            if (connected) {
              const personaList = await hubspotServiceTop.getPersonas();
              const persona = personaList.find(p => p.code === lead.buyerPersona);
              if (persona) {
                const result = await hubspotServiceTop.syncLead(lead, persona);
                console.log(`[HubSpot] Auto-synced new lead ${lead.id}: ${result.success ? 'success' : result.error}`);
              }
            }
          } catch (err: any) {
            console.log(`[HubSpot] Auto-sync failed for lead ${lead.id}:`, err.message);
          }
        })();
      }
      
      res.status(201).json(lead);
    } catch (err: any) {
      console.error("[Lead Create] Error:", err.message || err);
      if (err instanceof z.ZodError) {
        const errorMessage = err.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
        console.error("[Lead Create] Validation errors:", errorMessage);
        return res.status(400).json({ message: errorMessage });
      }
      res.status(500).json({ message: err.message || "Failed to create lead" });
    }
  });

  app.put(api.leads.update.path, isAuthenticated, requireRole("ceo", "sales"), async (req, res) => {
    try {
      const leadId = Number(req.params.id);
      const input = api.leads.update.input.parse(req.body);
      
      // Check if we're transitioning to "Closed Won" or "Proposal" or marking retainer as paid
      const previousLead = await storage.getLead(leadId);
      const isClosingWon = input.dealStage === "Closed Won" && previousLead?.dealStage !== "Closed Won";
      const isEnteringProposal = input.dealStage === "Proposal" && previousLead?.dealStage !== "Proposal";
      const isRetainerJustPaid = input.retainerPaid === true && previousLead?.retainerPaid !== true;
      
      // Check if address changed (needs Google Intel refresh)
      const addressChanged = input.projectAddress && input.projectAddress !== previousLead?.projectAddress;
      
      // Auto-generate Project Code when entering Proposal stage
      const updateData: any = { ...input };
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
        console.log(`Auto-generated Project Code for lead ${leadId}: ${projectCode}`);
      }
      
      const lead = await storage.updateLead(leadId, updateData);
      
      // Trigger Google Intel refresh if address changed (non-blocking)
      if (addressChanged && process.env.GOOGLE_MAPS_API_KEY) {
        enrichLeadWithGoogleIntel(input.projectAddress!)
          .then(async (googleIntel) => {
            if (googleIntel.buildingInsights?.available || googleIntel.travelInsights?.available) {
              await storage.updateLead(leadId, { googleIntel } as any);
              console.log(`[Google Intel] Refreshed lead ${leadId} with new address data`);
            }
          })
          .catch(err => {
            console.log(`[Google Intel] Refresh failed for lead ${leadId}:`, err.message);
          });
      }
      
      // Auto-create production project when deal closes as won
      if (isClosingWon) {
        const existingProject = await storage.getProjectByLeadId(leadId);
        if (!existingProject) {
          // Early Binding Safety Check: Use existing UPID if already generated (via early binding)
          let universalProjectId = lead.projectCode;
          
          if (!universalProjectId) {
            // Generate Universal Project ID per Nomenclature Standards: [REFERRAL]-[CLIENT_CODE]-[PROJ_CODE]-[YYYYMMDD]
            universalProjectId = generateUPID({
              clientName: lead.clientName,
              projectName: lead.projectName || lead.projectAddress || 'Project',
              closedWonDate: new Date(),
              leadSource: lead.leadSource,
            });
            console.log(`Generated UPID for lead ${leadId} (source: ${lead.leadSource || 'unknown'}): ${universalProjectId}`);
            
            // Persist UPID back to lead record as projectCode
            await storage.updateLead(leadId, { projectCode: universalProjectId } as any);
          } else {
            console.log(`Using existing UPID for lead ${leadId} (early binding): ${universalProjectId}`);
          }
          
          // Create Google Drive folder with subfolders and share with team
          let driveFolderId: string | undefined;
          let driveFolderUrl: string | undefined;
          let driveSubfolders: any = undefined;
          let driveFolderStatus = "pending";
          
          // Hybrid Storage: Enable for new projects via ENABLE_HYBRID_GCS env var
          const useHybridStorage = process.env.ENABLE_HYBRID_GCS === "true";
          const gcsBucket = useHybridStorage ? "s2p-active" : undefined;
          const gcsPath = useHybridStorage ? `${universalProjectId}/` : undefined;
          const storageMode = useHybridStorage ? "hybrid_gcs" : "legacy_drive";
          
          if (useHybridStorage) {
            console.log(`[Hybrid Storage] New project will use GCS: gs://${gcsBucket}/${gcsPath}`);
          }
          
          try {
            const driveConnected = await isGoogleDriveConnected();
            if (driveConnected) {
              const folderResult = await createProjectFolder(universalProjectId);
              driveFolderId = folderResult.folderId;
              driveFolderUrl = folderResult.folderUrl;
              driveSubfolders = folderResult.subfolders;
              driveFolderStatus = "success";
              console.log(`Created Google Drive folder for project ${universalProjectId}: ${driveFolderUrl}`);
            }
          } catch (err) {
            driveFolderStatus = "failed";
            console.warn("Google Drive folder creation failed (non-blocking):", err);
          }
          
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
            storageMode,
            gcsBucket,
            gcsPath,
          } as any);
          
          // Also update lead with storage mode
          await storage.updateLead(leadId, { storageMode, gcsBucket, gcsPath } as any);
          
          console.log(`Auto-created production project for lead ${leadId} (${lead.clientName}) with UPID: ${universalProjectId} [${storageMode}]`);
          
          // Send Google Chat notification for Closed Won (Sales Space)
          try {
            const { notifyClosedWon } = await import("./services/googleChat");
            const baseUrl = `https://${req.headers.host}`;
            await notifyClosedWon({
              id: leadId,
              name: lead.projectName || lead.clientName,
              value: lead.value || "0",
              ownerName: lead.ownerName || undefined
            }, baseUrl);
          } catch (err) {
            console.warn("[GoogleChat] Closed Won notification failed (non-blocking):", err);
          }
        } else if (existingProject && !existingProject.driveFolderId && !existingProject.driveFolderUrl) {
          // Idempotency: Create folder for existing project that lacks one (check both ID and URL)
          const universalProjectId = lead.projectCode || existingProject.universalProjectId || `PROJ-${leadId}`;
          try {
            const driveConnected = await isGoogleDriveConnected();
            if (driveConnected) {
              const folderResult = await createProjectFolder(universalProjectId);
              await storage.updateProject(existingProject.id, {
                driveFolderId: folderResult.folderId,
                driveFolderUrl: folderResult.folderUrl,
                driveFolderStatus: "success",
                driveSubfolders: folderResult.subfolders,
              } as any);
              console.log(`Created Google Drive folder for existing project ${universalProjectId}: ${folderResult.folderUrl}`);
            }
          } catch (err) {
            await storage.updateProject(existingProject.id, { driveFolderStatus: "failed" } as any);
            console.warn("Google Drive folder creation failed (non-blocking):", err);
          }
        }
      }
      
      // Create Google Chat space when retainer is marked as paid (Project Concierge)
      if (isRetainerJustPaid) {
        const project = await storage.getProjectByLeadId(leadId);
        if (project && !project.chatSpaceId) {
          try {
            const { createProjectSpace, isGoogleChatConfigured } = await import("./google-chat");
            if (isGoogleChatConfigured()) {
              const universalProjectId = lead.projectCode || project.universalProjectId || `PROJ-${leadId}`;
              const spaceResult = await createProjectSpace({
                universalProjectId,
                clientName: lead.clientName,
                driveFolderUrl: project.driveFolderUrl || null,
                scopeOfWork: lead.scope || null,
                memberEmails: [
                  "ceo@scan2plan.dev",
                  "accounting@scan2plan.dev",
                  "production@scan2plan.dev",
                ],
              });
              
              if (spaceResult.success && spaceResult.spaceName) {
                await storage.updateProject(project.id, {
                  chatSpaceId: spaceResult.spaceName,
                  chatSpaceUrl: spaceResult.spaceUrl,
                } as any);
                console.log(`Created Chat space for project ${universalProjectId}: ${spaceResult.spaceUrl}`);
              }
            }
          } catch (err) {
            console.warn("Google Chat space creation failed (non-blocking):", err);
          }
        }
      }
      
      // Fire-and-forget HubSpot sync on lead update (Growth Engine trigger)
      const personaChanged = input.buyerPersona && input.buyerPersona !== previousLead?.buyerPersona;
      if (personaChanged || (lead.buyerPersona && !lead.hubspotId)) {
        (async () => {
          try {
            const connected = await hubspotServiceTop.isHubSpotConnected();
            if (connected) {
              const personaList = await hubspotServiceTop.getPersonas();
              const persona = personaList.find(p => p.code === lead.buyerPersona);
              if (persona) {
                const result = await hubspotServiceTop.syncLead(lead, persona);
                console.log(`[HubSpot] Auto-synced updated lead ${leadId}: ${result.success ? 'success' : result.error}`);
              }
            }
          } catch (err: any) {
            console.log(`[HubSpot] Auto-sync failed for lead ${leadId}:`, err.message);
          }
        })();
      }
      
      res.json(lead);
    } catch (err) {
      return res.status(400).json({ message: "Invalid update data" });
    }
  });

  app.delete(api.leads.delete.path, isAuthenticated, requireRole("ceo", "sales"), async (req, res) => {
    await storage.deleteLead(Number(req.params.id));
    res.status(204).send();
  });

  // Quick stage update endpoint for moving deals in the pipeline
  app.patch("/api/leads/:id/stage", isAuthenticated, requireRole("ceo", "sales"), async (req, res) => {
    try {
      const leadId = Number(req.params.id);
      const { dealStage } = req.body;
      
      if (!dealStage) {
        return res.status(400).json({ message: "dealStage is required" });
      }
      
      const previousLead = await storage.getLead(leadId);
      if (!previousLead) {
        return res.status(404).json({ message: "Lead not found" });
      }
      
      const isClosingWon = dealStage === "Closed Won" && previousLead.dealStage !== "Closed Won";
      const isEnteringProposal = dealStage === "Proposal" && previousLead.dealStage !== "Proposal";
      
      // Build update object
      const updateData: Record<string, any> = { dealStage };
      
      // Auto-generate Project Code (Universal Project ID) when entering Proposal stage
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
        console.log(`Auto-generated Project Code for lead ${leadId}: ${projectCode}`);
      }
      
      const lead = await storage.updateLead(leadId, updateData);
      
      // Auto-create production project when deal closes as won
      if (isClosingWon) {
        const existingProject = await storage.getProjectByLeadId(leadId);
        if (!existingProject) {
          // Early Binding Safety Check: Use existing UPID if already generated (via early binding)
          let universalProjectId = lead.projectCode;
          
          if (!universalProjectId) {
            // Generate Universal Project ID per Nomenclature Standards: [REFERRAL]-[CLIENT_CODE]-[PROJ_CODE]-[YYYYMMDD]
            universalProjectId = generateUPID({
              clientName: lead.clientName,
              projectName: lead.projectName || lead.projectAddress || 'Project',
              closedWonDate: new Date(),
              leadSource: lead.leadSource,
            });
            console.log(`Generated UPID for lead ${leadId} (source: ${lead.leadSource || 'unknown'}): ${universalProjectId}`);
            
            // Persist UPID back to lead record as projectCode
            await storage.updateLead(leadId, { projectCode: universalProjectId } as any);
          } else {
            console.log(`Using existing UPID for lead ${leadId} (early binding): ${universalProjectId}`);
          }
          
          // Create Google Drive folder with subfolders and share with team
          let driveFolderId: string | undefined;
          let driveFolderUrl: string | undefined;
          let driveSubfolders: any = undefined;
          let driveFolderStatus = "pending";
          
          // Hybrid Storage: Enable for new projects via ENABLE_HYBRID_GCS env var
          const useHybridStorage = process.env.ENABLE_HYBRID_GCS === "true";
          const gcsBucket = useHybridStorage ? "s2p-active" : undefined;
          const gcsPath = useHybridStorage ? `${universalProjectId}/` : undefined;
          const storageMode = useHybridStorage ? "hybrid_gcs" : "legacy_drive";
          
          if (useHybridStorage) {
            console.log(`[Hybrid Storage] New project will use GCS: gs://${gcsBucket}/${gcsPath}`);
          }
          
          try {
            const driveConnected = await isGoogleDriveConnected();
            if (driveConnected) {
              const folderResult = await createProjectFolder(universalProjectId);
              driveFolderId = folderResult.folderId;
              driveFolderUrl = folderResult.folderUrl;
              driveSubfolders = folderResult.subfolders;
              driveFolderStatus = "success";
              console.log(`Created Google Drive folder for project ${universalProjectId}: ${driveFolderUrl}`);
            }
          } catch (err) {
            driveFolderStatus = "failed";
            console.warn("Google Drive folder creation failed (non-blocking):", err);
          }
          
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
            storageMode,
            gcsBucket,
            gcsPath,
          } as any);
          
          // Also update lead with storage mode
          await storage.updateLead(leadId, { storageMode, gcsBucket, gcsPath } as any);
          
          console.log(`Auto-created production project for lead ${leadId} (${lead.clientName}) with UPID: ${universalProjectId} [${storageMode}]`);
        } else if (existingProject && !existingProject.driveFolderId && !existingProject.driveFolderUrl) {
          // Idempotency: Create folder for existing project that lacks one (check both ID and URL)
          const universalProjectId = lead.projectCode || existingProject.universalProjectId || `PROJ-${leadId}`;
          try {
            const driveConnected = await isGoogleDriveConnected();
            if (driveConnected) {
              const folderResult = await createProjectFolder(universalProjectId);
              await storage.updateProject(existingProject.id, {
                driveFolderId: folderResult.folderId,
                driveFolderUrl: folderResult.folderUrl,
                driveFolderStatus: "success",
                driveSubfolders: folderResult.subfolders,
              } as any);
              console.log(`Created Google Drive folder for existing project ${universalProjectId}: ${folderResult.folderUrl}`);
            }
          } catch (err) {
            await storage.updateProject(existingProject.id, { driveFolderStatus: "failed" } as any);
            console.warn("Google Drive folder creation failed (non-blocking):", err);
          }
        }
      }
      
      res.json(lead);
    } catch (err) {
      console.error("Stage update error:", err);
      return res.status(500).json({ message: "Failed to update stage" });
    }
  });

  // === GENERATE PDF ESTIMATE ===
  app.get("/api/leads/:id/estimate-pdf", isAuthenticated, requireRole("ceo", "sales"), async (req, res) => {
    try {
      const leadId = Number(req.params.id);
      const lead = await storage.getLead(leadId);
      
      if (!lead) {
        return res.status(404).json({ message: "Lead not found" });
      }

      const { generateEstimatePDF } = await import("./pdf-generator");
      const doc = generateEstimatePDF({ lead });
      
      const filename = `Estimate-${lead.projectCode || lead.id}-${lead.clientName.replace(/[^a-zA-Z0-9]/g, "_")}.pdf`;
      
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
      
      doc.pipe(res);
      doc.end();
    } catch (err) {
      console.error("PDF generation error:", err);
      return res.status(500).json({ message: "Failed to generate PDF estimate" });
    }
  });

  // === GO HIGH LEVEL INTEGRATION ===
  app.get("/api/ghl/status", isAuthenticated, requireRole("ceo", "sales"), async (req, res) => {
    try {
      const { testGHLConnection } = await import("./gohighlevel");
      const status = await testGHLConnection();
      res.json(status);
    } catch (err: any) {
      res.json({ connected: false, message: err.message });
    }
  });

  app.get("/api/ghl/contacts", isAuthenticated, requireRole("ceo", "sales"), async (req, res) => {
    try {
      const { getGHLContacts } = await import("./gohighlevel");
      const contacts = await getGHLContacts(100);
      res.json(contacts);
    } catch (err: any) {
      console.error("GHL contacts error:", err);
      res.status(500).json({ message: err.message || "Failed to fetch GHL contacts" });
    }
  });

  app.get("/api/ghl/sync", isAuthenticated, requireRole("ceo", "sales"), async (req, res) => {
    try {
      const { syncGHLOpportunities } = await import("./gohighlevel");
      const result = await syncGHLOpportunities();
      res.json(result);
    } catch (err: any) {
      console.error("GHL sync error:", err);
      res.status(500).json({ message: err.message || "Failed to sync GHL opportunities" });
    }
  });

  app.post("/api/ghl/import", isAuthenticated, requireRole("ceo", "sales"), async (req, res) => {
    try {
      const { syncGHLOpportunities } = await import("./gohighlevel");
      const syncResult = await syncGHLOpportunities();
      
      let imported = 0;
      const errors: string[] = [...syncResult.errors];
      
      const existingLeads = await storage.getLeads();
      
      for (const opp of syncResult.opportunities) {
        try {
          const alreadyExists = existingLeads.some(l => 
            (l.notes && l.notes.includes(`Go High Level (ID: ${opp.ghlId})`)) ||
            (l.contactEmail && opp.contact?.email && l.contactEmail === opp.contact.email)
          );
          
          if (alreadyExists) {
            continue;
          }
          
          await storage.createLead({
            clientName: opp.contact?.name || opp.name,
            projectName: opp.name,
            value: opp.amount,
            dealStage: opp.stage,
            probability: opp.stage === 'Closed Won' ? 100 : opp.stage === 'Closed Lost' ? 0 : 50,
            contactName: opp.contact?.name || null,
            contactEmail: opp.contact?.email || null,
            contactPhone: opp.contact?.phone || null,
            notes: `Imported from Go High Level (ID: ${opp.ghlId})`,
            leadPriority: 3,
          });
          imported++;
        } catch (importErr: any) {
          errors.push(`Import ${opp.name}: ${importErr.message}`);
        }
      }
      
      res.json({ 
        imported, 
        total: syncResult.opportunities.length, 
        errors,
        message: `Imported ${imported} opportunities from Go High Level` 
      });
    } catch (err: any) {
      console.error("GHL import error:", err);
      res.status(500).json({ message: err.message || "Failed to import GHL opportunities" });
    }
  });

  // === HUBSPOT INTEGRATION ===
  app.get("/api/hubspot/status", isAuthenticated, requireRole("ceo", "sales"), async (req, res) => {
    try {
      const { testHubSpotConnection } = await import("./hubspot");
      const status = await testHubSpotConnection();
      res.json(status);
    } catch (err: any) {
      res.json({ connected: false, message: err.message });
    }
  });

  app.get("/api/hubspot/contacts", isAuthenticated, requireRole("ceo", "sales"), async (req, res) => {
    try {
      const { getHubSpotContacts } = await import("./hubspot");
      const contacts = await getHubSpotContacts(100);
      res.json(contacts);
    } catch (err: any) {
      console.error("HubSpot contacts error:", err);
      res.status(500).json({ message: err.message || "Failed to fetch HubSpot contacts" });
    }
  });

  app.get("/api/hubspot/deals", isAuthenticated, requireRole("ceo", "sales"), async (req, res) => {
    try {
      const { getHubSpotDeals } = await import("./hubspot");
      const deals = await getHubSpotDeals(100);
      res.json(deals);
    } catch (err: any) {
      console.error("HubSpot deals error:", err);
      res.status(500).json({ message: err.message || "Failed to fetch HubSpot deals" });
    }
  });

  app.get("/api/hubspot/companies", isAuthenticated, requireRole("ceo", "sales"), async (req, res) => {
    try {
      const { getHubSpotCompanies } = await import("./hubspot");
      const companies = await getHubSpotCompanies(100);
      res.json(companies);
    } catch (err: any) {
      console.error("HubSpot companies error:", err);
      res.status(500).json({ message: err.message || "Failed to fetch HubSpot companies" });
    }
  });

  app.post("/api/hubspot/sync", isAuthenticated, requireRole("ceo", "sales"), async (req, res) => {
    try {
      const { syncDealsToLeads } = await import("./hubspot");
      const result = await syncDealsToLeads();
      res.json(result);
    } catch (err: any) {
      console.error("HubSpot sync error:", err);
      res.status(500).json({ message: err.message || "Failed to sync HubSpot deals" });
    }
  });

  app.post("/api/hubspot/import", isAuthenticated, requireRole("ceo", "sales"), async (req, res) => {
    try {
      const { syncDealsToLeads } = await import("./hubspot");
      const syncResult = await syncDealsToLeads();
      
      let imported = 0;
      const errors: string[] = [...syncResult.errors];
      
      const existingLeads = await storage.getLeads();
      
      for (const deal of syncResult.deals) {
        try {
          const alreadyExists = existingLeads.some(l => 
            (l.notes && l.notes.includes(`HubSpot (Deal ID: ${deal.hubspotId})`)) ||
            (l.contactEmail && deal.contact?.email && l.contactEmail === deal.contact.email)
          );
          
          if (alreadyExists) {
            continue;
          }
          
          await storage.createLead({
            clientName: deal.company?.name || deal.dealName,
            projectName: deal.dealName,
            projectAddress: deal.company?.address || null,
            value: deal.amount,
            dealStage: deal.stage,
            probability: deal.stage === 'Closed Won' ? 100 : deal.stage === 'Closed Lost' ? 0 : 50,
            contactName: deal.contact?.name || null,
            contactEmail: deal.contact?.email || null,
            contactPhone: deal.contact?.phone || null,
            notes: `Imported from HubSpot (Deal ID: ${deal.hubspotId})`,
            leadPriority: 3,
          });
          imported++;
        } catch (importErr: any) {
          errors.push(`Import ${deal.dealName}: ${importErr.message}`);
        }
      }
      
      res.json({ 
        imported, 
        total: syncResult.deals.length, 
        errors,
        message: `Imported ${imported} deals from HubSpot` 
      });
    } catch (err: any) {
      console.error("HubSpot import error:", err);
      res.status(500).json({ message: err.message || "Failed to import HubSpot deals" });
    }
  });

  // === BULK IMPORT LEADS FROM CSV ===
  app.post("/api/leads/import", isAuthenticated, requireRole("ceo", "sales"), upload.single("file"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      const content = fs.readFileSync(req.file.path, "utf-8");
      fs.unlinkSync(req.file.path); // Clean up temp file

      // Parse CSV (simple parser - handles basic CSV format)
      const lines = content.split(/\r?\n/).filter(line => line.trim());
      if (lines.length < 2) {
        return res.status(400).json({ message: "CSV must have a header row and at least one data row" });
      }

      const headerLine = lines[0];
      const headers = parseCSVLine(headerLine).map(h => h.toLowerCase().trim());

      // Map CSV headers to lead fields
      const fieldMapping: Record<string, string> = {
        "client": "clientName",
        "client name": "clientName",
        "clientname": "clientName",
        "company": "clientName",
        "business name": "clientName",
        "businessname": "clientName",
        "inferred business name": "clientName",
        "project": "projectName",
        "project name": "projectName",
        "projectname": "projectName",
        "address": "projectAddress",
        "project address": "projectAddress",
        "projectaddress": "projectAddress",
        "value": "value",
        "deal value": "value",
        "amount": "value",
        "probability": "probability",
        "prob": "probability",
        "stage": "dealStage",
        "deal stage": "dealStage",
        "dealstage": "dealStage",
        "status": "dealStage",
        "notes": "notes",
        "note": "notes",
        "contact": "contactName",
        "contact name": "contactName",
        "contactname": "contactName",
        "name": "contactName",
        "first name": "_firstName",
        "firstname": "_firstName",
        "last name": "_lastName",
        "lastname": "_lastName",
        "email": "contactEmail",
        "contact email": "contactEmail",
        "phone": "contactPhone",
        "contact phone": "contactPhone",
        "source": "leadSource",
        "lead source": "leadSource",
        "leadsource": "leadSource",
        "priority": "leadPriority",
        "lead priority": "leadPriority",
        "building type": "buildingType",
        "buildingtype": "buildingType",
        "sqft": "sqft",
        "square feet": "sqft",
        "scope": "scope",
        "disciplines": "disciplines",
        "deliverable": "bimDeliverable",
        "bim deliverable": "bimDeliverable",
        "timeline": "timeline",
        "dispatch": "dispatchLocation",
        "dispatch location": "dispatchLocation",
        "distance": "distance",
      };

      // Find which columns map to which fields
      const columnMap: Record<number, string> = {};
      headers.forEach((header, idx) => {
        const mapped = fieldMapping[header];
        if (mapped) {
          columnMap[idx] = mapped;
        }
      });

      // Require at least some way to identify the lead (client name, business name, or contact info)
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
              } else if (field === "value" || field === "probability" || field === "sqft" || field === "distance" || field === "leadPriority") {
                const num = parseFloat(val.replace(/[$,]/g, ""));
                if (!isNaN(num)) leadData[field] = num;
              } else {
                leadData[field] = val;
              }
            }
          });

          // Combine first and last name into contactName if not already set
          if ((firstName || lastName) && !leadData.contactName) {
            leadData.contactName = [firstName, lastName].filter(Boolean).join(" ");
          }

          // If no clientName, try to use business name fallbacks or generate from contact
          if (!leadData.clientName) {
            if (leadData.contactName) {
              leadData.clientName = leadData.contactName;
            } else if (leadData.contactEmail) {
              // Use email domain as company name
              const domain = leadData.contactEmail.split("@")[1];
              if (domain && !domain.includes("gmail") && !domain.includes("yahoo") && !domain.includes("hotmail")) {
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
        errors: results.errors.slice(0, 10), // Limit error messages
        totalErrors: results.errors.length,
      });
    } catch (err: any) {
      console.error("CSV Import error:", err);
      res.status(500).json({ message: err.message || "Failed to import CSV" });
    }
  });

  // Helper function to parse CSV line (handles quoted values with commas)
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

  // === CPQ INTEGRATION ENDPOINT ===
  // Bi-directional sync: allows CPQ tool to update deal value, status, and quote URL
  // Protected by API key validation - CPQ_API_KEY MUST be set for these endpoints to work
  const CPQ_API_KEY = process.env.CPQ_API_KEY;
  
  const verifyCpqAuth = (req: any, res: any, next: any) => {
    // Require valid API key - no fallback to session auth
    if (!CPQ_API_KEY) {
      console.warn("CPQ_API_KEY not configured - CPQ endpoints disabled");
      return res.status(503).json({ 
        message: "CPQ integration not configured. Set CPQ_API_KEY environment variable." 
      });
    }
    
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ 
        message: "Missing Authorization header. Use: Bearer <CPQ_API_KEY>" 
      });
    }
    
    const token = authHeader.substring(7);
    if (token !== CPQ_API_KEY) {
      return res.status(403).json({ message: "Invalid API key" });
    }
    
    next();
  };

  const cpqSyncSchema = z.object({
    value: z.number().optional(),
    dealStage: z.enum(["Leads", "Contacted", "Proposal", "Negotiation", "On Hold", "Closed Won", "Closed Lost"]).optional(),
    quoteUrl: z.string().url().optional(),
    quoteNumber: z.string().optional(),
    quoteVersion: z.number().int().positive().optional(), // Version number from CPQ (1, 2, 3, etc.)
  });

  app.post("/api/cpq/sync/:leadId", verifyCpqAuth, async (req, res) => {
    try {
      const leadId = Number(req.params.leadId);
      const lead = await storage.getLead(leadId);
      if (!lead) {
        return res.status(404).json({ message: "Lead not found" });
      }

      const input = cpqSyncSchema.parse(req.body);
      
      if (Object.keys(input).length === 0) {
        return res.status(400).json({ message: "No fields to update" });
      }

      // Check if we're transitioning to "Closed Won"
      const isClosingWon = input.dealStage === "Closed Won" && lead.dealStage !== "Closed Won";

      // Build partial update object explicitly to avoid spread issues
      const updates: Record<string, any> = {};
      if (input.value !== undefined) updates.value = input.value;
      if (input.dealStage !== undefined) updates.dealStage = input.dealStage;
      if (input.quoteUrl !== undefined) updates.quoteUrl = input.quoteUrl;
      if (input.quoteNumber !== undefined) updates.quoteNumber = input.quoteNumber;
      if (input.quoteVersion !== undefined) updates.quoteVersion = input.quoteVersion;

      // Use storage layer for proper type handling
      const updatedLead = await storage.updateLead(leadId, updates);

      // Auto-create production project when deal closes as won (same as UI path)
      let projectCreated = false;
      if (isClosingWon) {
        const existingProject = await storage.getProjectByLeadId(leadId);
        if (!existingProject) {
          // Early Binding Safety Check: Use existing UPID if already generated
          let universalProjectId = updatedLead.projectCode;
          
          if (!universalProjectId) {
            universalProjectId = generateUPID({
              clientName: updatedLead.clientName,
              projectName: updatedLead.projectName || updatedLead.projectAddress || 'Project',
              closedWonDate: new Date(),
              leadSource: updatedLead.leadSource,
            });
            await storage.updateLead(leadId, { projectCode: universalProjectId } as any);
          }
          
          await storage.createProject({
            name: `${updatedLead.clientName} - ${updatedLead.projectAddress || 'Project'}`,
            leadId: leadId,
            universalProjectId,
            status: "Scheduling",
            priority: "Medium",
            progress: 0,
          });
          projectCreated = true;
          console.log(`Auto-created production project via CPQ for lead ${leadId} (${updatedLead.clientName}) with UPID: ${universalProjectId}`);
        }
      }

      res.json({ 
        success: true, 
        lead: updatedLead,
        projectCreated,
        message: projectCreated ? "Lead updated from CPQ with new project" : "Lead updated from CPQ"
      });
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      console.error("CPQ sync error:", err);
      return res.status(500).json({ message: "Failed to sync with CPQ" });
    }
  });

  // GET endpoint for CPQ to fetch lead details
  app.get("/api/cpq/lead/:leadId", verifyCpqAuth, async (req, res) => {
    const leadId = Number(req.params.leadId);
    const lead = await storage.getLead(leadId);
    if (!lead) {
      return res.status(404).json({ message: "Lead not found" });
    }
    // Return relevant fields for CPQ
    res.json({
      id: lead.id,
      clientName: lead.clientName,
      projectName: lead.projectName,
      projectAddress: lead.projectAddress,
      value: lead.value,
      dealStage: lead.dealStage,
      sqft: lead.sqft,
      buildingType: lead.buildingType,
      scope: lead.scope,
      disciplines: lead.disciplines,
      bimDeliverable: lead.bimDeliverable,
      quoteNumber: lead.quoteNumber,
      quoteUrl: lead.quoteUrl,
      quoteVersion: lead.quoteVersion,
      contactName: lead.contactName,
      contactEmail: lead.contactEmail,
    });
  });

  // === CPQ INTEGRITY AUDITOR WEBHOOK ===
  // Receives audit results from CPQ when a quote is validated
  const integrityAuditSchema = z.object({
    status: z.enum(["pass", "warning", "blocked"]),
    flags: z.array(z.object({
      code: z.string(),
      severity: z.enum(["warning", "error"]),
      message: z.string(),
      details: z.record(z.any()).optional(),
    })).optional(),
    requiresOverride: z.boolean().optional(),
    overrideApproved: z.boolean().optional(),
    overrideApprovedBy: z.string().optional(),
    overrideApprovedAt: z.string().optional(),
  });

  app.post("/api/cpq/integrity/:leadId", verifyCpqAuth, async (req, res) => {
    try {
      const leadId = Number(req.params.leadId);
      const lead = await storage.getLead(leadId);
      if (!lead) {
        return res.status(404).json({ message: "Lead not found" });
      }

      const input = integrityAuditSchema.parse(req.body);
      
      const updatedLead = await storage.updateLead(leadId, {
        integrityStatus: input.status,
        integrityFlags: input.flags || [],
        requiresOverride: input.requiresOverride || false,
        overrideApproved: input.overrideApproved || false,
        overrideApprovedBy: input.overrideApprovedBy || null,
        overrideApprovedAt: input.overrideApprovedAt ? new Date(input.overrideApprovedAt) : null,
      });

      console.log(`CPQ Integrity Audit received for lead ${leadId}: ${input.status}`);
      res.json({ 
        success: true, 
        lead: updatedLead,
        message: `Integrity status updated to ${input.status}`
      });
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      console.error("CPQ integrity sync error:", err);
      return res.status(500).json({ message: "Failed to sync integrity audit" });
    }
  });

  // Request override from CRM (forwards to CPQ conceptually, but stores locally)
  app.post("/api/leads/:id/request-override", isAuthenticated, requireRole("ceo", "sales"), async (req, res) => {
    try {
      const leadId = Number(req.params.id);
      const lead = await storage.getLead(leadId);
      if (!lead) {
        return res.status(404).json({ message: "Lead not found" });
      }

      const { justification } = req.body;
      if (!justification || typeof justification !== "string") {
        return res.status(400).json({ message: "Justification is required" });
      }

      // In a full implementation, this would call the CPQ API to create an override request
      // For now, we log and return a success message
      console.log(`Override requested for lead ${leadId}: ${justification}`);
      
      res.json({ 
        success: true, 
        message: "Override request submitted. Awaiting CEO approval.",
        leadId,
        justification,
      });
    } catch (err) {
      console.error("Override request error:", err);
      return res.status(500).json({ message: "Failed to submit override request" });
    }
  });

  // === EARLY BINDING: Generate UPID before Closed Won ===
  // Allows UPID generation for Proposal creation and scoping file organization
  app.post("/api/leads/:id/generate-upid", isAuthenticated, requireRole("ceo", "sales"), async (req, res) => {
    try {
      const leadId = Number(req.params.id);
      const lead = await storage.getLead(leadId);
      if (!lead) {
        return res.status(404).json({ message: "Lead not found" });
      }

      // Check if UPID already exists
      if (lead.projectCode) {
        return res.json({ 
          success: true, 
          upid: lead.projectCode,
          driveFolderUrl: null,
          message: "UPID already exists for this lead",
          alreadyExists: true,
        });
      }

      // Validate required fields for UPID generation
      if (!lead.clientName) {
        return res.status(400).json({ message: "Client name is required to generate UPID" });
      }

      // Generate UPID using existing logic
      const universalProjectId = generateUPID({
        clientName: lead.clientName,
        projectName: lead.projectName || lead.projectAddress || 'Project',
        closedWonDate: new Date(),
        leadSource: lead.leadSource,
      });
      console.log(`[Early Binding] Generated UPID for lead ${leadId}: ${universalProjectId}`);

      // Create Google Drive folder immediately
      let driveFolderUrl: string | null = null;
      let driveFolderId: string | null = null;
      
      try {
        const driveConnected = await isGoogleDriveConnected();
        if (driveConnected) {
          const folderResult = await createProjectFolder(universalProjectId);
          driveFolderId = folderResult.folderId;
          driveFolderUrl = folderResult.folderUrl;
          console.log(`[Early Binding] Created Google Drive folder for ${universalProjectId}: ${driveFolderUrl}`);
        }
      } catch (err) {
        console.warn("[Early Binding] Google Drive folder creation failed (non-blocking):", err);
      }

      // Persist UPID and Drive folder info to lead record
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
      console.error("Generate UPID error:", err);
      return res.status(500).json({ message: "Failed to generate UPID" });
    }
  });

  // === CPQ INTERNAL PRICING & QUOTES ===
  // NOTE: Pricing calculations now happen client-side in client/src/features/cpq/pricing.ts
  // These pricing matrix routes are DEPRECATED and will be removed in a future release.
  // They remain for backwards compatibility but pricing data is now embedded in the client.
  
  // @DEPRECATED - Pricing now calculated client-side with static config
  app.get("/api/cpq/pricing-matrix", isAuthenticated, requireRole("ceo", "sales"), async (req, res) => {
    console.warn("[DEPRECATED] /api/cpq/pricing-matrix - use client-side pricing instead");
    try {
      const rates = await storage.getCpqPricingMatrix();
      res.json(rates);
    } catch (error) {
      console.error("Error fetching CPQ pricing matrix:", error);
      res.status(500).json({ message: "Failed to fetch pricing matrix" });
    }
  });

  // @DEPRECATED - Pricing now calculated client-side with static config
  app.get("/api/cpq/upteam-pricing-matrix", isAuthenticated, requireRole("ceo", "sales"), async (req, res) => {
    console.warn("[DEPRECATED] /api/cpq/upteam-pricing-matrix - use client-side pricing instead");
    try {
      const rates = await storage.getCpqUpteamPricingMatrix();
      res.json(rates);
    } catch (error) {
      console.error("Error fetching CPQ upteam pricing matrix:", error);
      res.status(500).json({ message: "Failed to fetch upteam pricing matrix" });
    }
  });

  // @DEPRECATED - Pricing now calculated client-side with static config
  app.get("/api/cpq/cad-pricing-matrix", isAuthenticated, requireRole("ceo", "sales"), async (req, res) => {
    console.warn("[DEPRECATED] /api/cpq/cad-pricing-matrix - use client-side pricing instead");
    try {
      const rates = await storage.getCpqCadPricingMatrix();
      res.json(rates);
    } catch (error) {
      console.error("Error fetching CPQ CAD pricing matrix:", error);
      res.status(500).json({ message: "Failed to fetch CAD pricing matrix" });
    }
  });

  // @DEPRECATED - Pricing now calculated client-side with static config
  app.get("/api/cpq/pricing-parameters", isAuthenticated, requireRole("ceo", "sales"), async (req, res) => {
    console.warn("[DEPRECATED] /api/cpq/pricing-parameters - use client-side pricing instead");
    try {
      const params = await storage.getCpqPricingParameters();
      res.json(params);
    } catch (error) {
      console.error("Error fetching CPQ pricing parameters:", error);
      res.status(500).json({ message: "Failed to fetch pricing parameters" });
    }
  });

  // Create standalone CPQ quote (without lead)
  app.post("/api/cpq/quotes", isAuthenticated, requireRole("ceo", "sales"), async (req, res) => {
    try {
      const user = req.user as any;
      const quote = await storage.createCpqQuote({
        ...req.body,
        createdBy: user?.claims?.email || user?.username || "unknown",
      });
      res.status(201).json(quote);
    } catch (error) {
      console.error("Error creating CPQ quote:", error);
      res.status(500).json({ message: "Failed to create quote" });
    }
  });

  // Get specific CPQ quote by ID (alternate path for consistency)
  app.get("/api/cpq/quotes/:id", isAuthenticated, requireRole("ceo", "sales"), async (req, res) => {
    try {
      const quoteId = Number(req.params.id);
      const quote = await storage.getCpqQuote(quoteId);
      if (!quote) return res.status(404).json({ message: "Quote not found" });
      res.json(quote);
    } catch (error) {
      console.error("Error fetching CPQ quote:", error);
      res.status(500).json({ message: "Failed to fetch quote" });
    }
  });

  // Update a CPQ quote (alternate path for consistency)
  app.patch("/api/cpq/quotes/:id", isAuthenticated, requireRole("ceo", "sales"), async (req, res) => {
    try {
      const quoteId = Number(req.params.id);
      const quote = await storage.updateCpqQuote(quoteId, req.body);
      if (!quote) return res.status(404).json({ message: "Quote not found" });
      res.json(quote);
    } catch (error) {
      console.error("Error updating CPQ quote:", error);
      res.status(500).json({ message: "Failed to update quote" });
    }
  });

  // Create a new CPQ quote for a lead
  app.post("/api/leads/:id/cpq-quotes", isAuthenticated, requireRole("ceo", "sales"), async (req, res) => {
    try {
      const leadId = Number(req.params.id);
      console.log(`[CPQ Quote Create] LeadId: ${leadId}, Body keys:`, Object.keys(req.body));
      
      const lead = await storage.getLead(leadId);
      if (!lead) {
        console.log(`[CPQ Quote Create] Lead not found: ${leadId}`);
        return res.status(404).json({ message: "Lead not found" });
      }

      const user = req.user as any;
      
      // Derive required fields from lead data
      const projectName = req.body.projectName || lead.projectName || lead.clientName || `Project-${leadId}`;
      const projectAddress = req.body.projectAddress || lead.projectAddress || "Address not specified";
      const typeOfBuilding = req.body.typeOfBuilding || lead.buildingType || "1"; // Default to Commercial Office
      const dispatchLocation = req.body.dispatchLocation || lead.dispatchLocation || "WOODSTOCK"; // Default to Woodstock dispatch
      
      const quote = await storage.createCpqQuote({
        ...req.body,
        leadId,
        projectName,
        projectAddress,
        typeOfBuilding,
        dispatchLocation,
        createdBy: user?.claims?.email || user?.username || "unknown",
      });
      console.log(`[CPQ Quote Create] Success, quoteId: ${quote.id}`);
      res.status(201).json(quote);
    } catch (error: any) {
      console.error("[CPQ Quote Create] Error:", error?.message || error);
      if (error?.stack) console.error("[CPQ Quote Create] Stack:", error.stack);
      res.status(500).json({ message: error?.message || "Failed to create quote" });
    }
  });

  // Get all CPQ quotes for a lead
  app.get("/api/leads/:id/cpq-quotes", isAuthenticated, requireRole("ceo", "sales"), async (req, res) => {
    try {
      const leadId = Number(req.params.id);
      const quotes = await storage.getCpqQuotesByLead(leadId);
      res.json(quotes);
    } catch (error) {
      console.error("Error fetching CPQ quotes:", error);
      res.status(500).json({ message: "Failed to fetch quotes" });
    }
  });

  // Get a specific CPQ quote
  app.get("/api/cpq-quotes/:id", isAuthenticated, requireRole("ceo", "sales"), async (req, res) => {
    try {
      const quoteId = Number(req.params.id);
      const quote = await storage.getCpqQuote(quoteId);
      if (!quote) return res.status(404).json({ message: "Quote not found" });
      res.json(quote);
    } catch (error) {
      console.error("Error fetching CPQ quote:", error);
      res.status(500).json({ message: "Failed to fetch quote" });
    }
  });

  // Update a CPQ quote
  app.patch("/api/cpq-quotes/:id", isAuthenticated, requireRole("ceo", "sales"), async (req, res) => {
    try {
      const quoteId = Number(req.params.id);
      const quote = await storage.updateCpqQuote(quoteId, req.body);
      if (!quote) return res.status(404).json({ message: "Quote not found" });
      res.json(quote);
    } catch (error) {
      console.error("Error updating CPQ quote:", error);
      res.status(500).json({ message: "Failed to update quote" });
    }
  });

  // Create a new version of a CPQ quote
  app.post("/api/cpq-quotes/:id/versions", isAuthenticated, requireRole("ceo", "sales"), async (req, res) => {
    try {
      const sourceQuoteId = Number(req.params.id);
      const { versionName } = req.body;
      const user = req.user as any;
      
      const newVersion = await storage.createCpqQuoteVersion(
        sourceQuoteId, 
        versionName,
        user?.claims?.email || user?.username || "unknown"
      );
      res.status(201).json(newVersion);
    } catch (error) {
      console.error("Error creating CPQ quote version:", error);
      res.status(500).json({ message: "Failed to create quote version" });
    }
  });

  // Calculate distance for travel pricing
  app.post("/api/cpq/calculate-distance", isAuthenticated, requireRole("ceo", "sales"), async (req, res) => {
    try {
      const { origin, destination } = req.body;
      
      if (!origin || !destination) {
        return res.status(400).json({ error: "Origin and destination are required" });
      }

      const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY;
      if (!GOOGLE_MAPS_API_KEY) {
        return res.status(500).json({ error: "Google Maps API key not configured" });
      }

      const DISPATCH_COORDS: Record<string, { lat: number; lng: number }> = {
        troy: { lat: 42.7284, lng: -73.6918 },
        woodstock: { lat: 42.0409, lng: -74.1182 },
        brooklyn: { lat: 40.6782, lng: -73.9442 },
      };

      const originCoords = DISPATCH_COORDS[origin.toLowerCase()];
      if (!originCoords) {
        return res.status(400).json({ error: "Invalid dispatch location" });
      }

      // Use Google Distance Matrix API
      const url = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${originCoords.lat},${originCoords.lng}&destinations=${encodeURIComponent(destination)}&units=imperial&key=${GOOGLE_MAPS_API_KEY}`;
      const response = await fetch(url);
      const data = await response.json();

      if (data.status !== "OK" || !data.rows?.[0]?.elements?.[0]) {
        return res.status(404).json({ error: "Could not calculate distance" });
      }

      const element = data.rows[0].elements[0];
      if (element.status !== "OK") {
        return res.status(404).json({ error: "Route not found" });
      }

      const distanceMeters = element.distance.value;
      const distanceMiles = Math.round(distanceMeters / 1609.34);

      res.json({ 
        distance: distanceMiles,
        origin,
        destination,
        formattedAddress: data.destination_addresses?.[0] || destination,
      });
    } catch (error) {
      console.error("Error calculating distance:", error);
      res.status(500).json({ error: "Failed to calculate distance" });
    }
  });

  // === CASE STUDIES (Proof Vault) ROUTES ===
  app.get("/api/case-studies", isAuthenticated, requireRole("ceo", "sales"), async (req, res) => {
    try {
      const studies = await storage.getCaseStudies();
      res.json(studies);
    } catch (error) {
      console.error("Error fetching case studies:", error);
      res.status(500).json({ message: "Failed to fetch case studies" });
    }
  });

  app.get("/api/case-studies/match", isAuthenticated, requireRole("ceo", "sales"), async (req, res) => {
    try {
      const tags = (req.query.tags as string)?.split(",").filter(Boolean) || [];
      const studies = await storage.getCaseStudiesByTags(tags);
      res.json(studies);
    } catch (error) {
      console.error("Error matching case studies:", error);
      res.status(500).json({ message: "Failed to match case studies" });
    }
  });

  app.get("/api/case-studies/:id", isAuthenticated, requireRole("ceo", "sales"), async (req, res) => {
    try {
      const study = await storage.getCaseStudy(Number(req.params.id));
      if (!study) return res.status(404).json({ message: "Case study not found" });
      res.json(study);
    } catch (error) {
      console.error("Error fetching case study:", error);
      res.status(500).json({ message: "Failed to fetch case study" });
    }
  });

  app.post("/api/case-studies", isAuthenticated, requireRole("ceo"), async (req, res) => {
    try {
      const study = await storage.createCaseStudy(req.body);
      res.status(201).json(study);
    } catch (error) {
      console.error("Error creating case study:", error);
      res.status(500).json({ message: "Failed to create case study" });
    }
  });

  app.patch("/api/case-studies/:id", isAuthenticated, requireRole("ceo"), async (req, res) => {
    try {
      const study = await storage.updateCaseStudy(Number(req.params.id), req.body);
      if (!study) return res.status(404).json({ message: "Case study not found" });
      res.json(study);
    } catch (error) {
      console.error("Error updating case study:", error);
      res.status(500).json({ message: "Failed to update case study" });
    }
  });

  // === PROPOSAL PDF GENERATION ===
  app.post("/api/proposals/:leadId/generate-pdf", isAuthenticated, requireRole("ceo", "sales"), async (req, res) => {
    try {
      const leadId = Number(req.params.leadId);
      const { caseStudyIds = [] } = req.body;

      const lead = await storage.getLead(leadId);
      if (!lead) return res.status(404).json({ message: "Lead not found" });

      const quote = await storage.getLatestCpqQuoteForLead(leadId);
      
      let caseStudies: any[] = [];
      if (caseStudyIds.length > 0) {
        const allStudies = await storage.getCaseStudies();
        caseStudies = allStudies.filter(s => caseStudyIds.includes(s.id));
      }

      const pdfBuffer = await generateProposalPDF({ lead, quote: quote || null, caseStudies });
      const filename = generateProposalFilename(lead);

      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
      res.send(pdfBuffer);
    } catch (error) {
      console.error("Error generating proposal PDF:", error);
      res.status(500).json({ message: "Failed to generate PDF" });
    }
  });

  // Send proposal (PDF + PandaDoc + QuickBooks)
  const pandadocService = await import('./services/pandadoc');
  
  app.post("/api/proposals/:leadId/send", isAuthenticated, requireRole("ceo", "sales"), async (req, res) => {
    try {
      const leadId = Number(req.params.leadId);
      const { caseStudyIds = [], syncToQuickBooks = true } = req.body;

      const lead = await storage.getLead(leadId);
      if (!lead) return res.status(404).json({ message: "Lead not found" });

      const quote = await storage.getLatestCpqQuoteForLead(leadId);
      if (!quote) return res.status(400).json({ message: "No quote found for this lead" });

      let caseStudies: any[] = [];
      if (caseStudyIds.length > 0) {
        const allStudies = await storage.getCaseStudies();
        caseStudies = allStudies.filter(s => caseStudyIds.includes(s.id));
      }

      const pdfBuffer = await generateProposalPDF({ lead, quote, caseStudies });
      const filename = generateProposalFilename(lead);

      // Upload to PandaDoc for e-signature
      let pandadocResult: { status: string; documentId?: string; error?: string } = { 
        status: "skipped" 
      };
      
      if (pandadocService.isPandaDocConfigured() && lead.contactEmail) {
        try {
          const documentName = `Proposal - ${lead.projectName || lead.clientName}`;
          const [firstName, ...lastNameParts] = (lead.contactName || 'Client').split(' ');
          const lastName = lastNameParts.join(' ') || firstName;
          
          const uploadResult = await pandadocService.uploadPdfDocument(
            pdfBuffer,
            filename,
            documentName,
            {
              email: lead.contactEmail,
              firstName: firstName,
              lastName: lastName
            }
          );
          
          if (uploadResult.success && uploadResult.documentId) {
            // Store PandaDoc document ID on lead
            await storage.updateLead(leadId, {
              pandaDocId: uploadResult.documentId,
              pandaDocStatus: 'document.draft'
            });
            
            pandadocResult = {
              status: "uploaded",
              documentId: uploadResult.documentId
            };
            console.log(`[PandaDoc] Uploaded proposal for lead ${leadId}: ${uploadResult.documentId}`);
          } else {
            pandadocResult = { status: "error", error: uploadResult.error };
          }
        } catch (pdError: any) {
          console.error("[PandaDoc] Upload failed:", pdError);
          pandadocResult = { status: "error", error: pdError.message };
        }
      } else if (!lead.contactEmail) {
        pandadocResult = { status: "skipped", error: "No contact email on lead" };
      }
      
      // QuickBooks Estimate Sync
      let qboResult: { status: string; estimateId?: string; estimateNumber?: string; error?: string } = { 
        status: "skipped" 
      };
      
      // QBO discipline to service item mapping
      const DISCIPLINE_TO_QBO_SERVICE: Record<string, string> = {
        architecture: "Architecture",
        mep: "MEP",
        structural: "Structural",
        site: "Scanning",
        travel: "Scanning",
        services: "Architecture",  // CAD, Matterport → Architecture
        risk: "Architecture",      // Risk premiums → Architecture
      };
      
      if (syncToQuickBooks) {
        try {
          const isConnected = await quickbooksClient.isConnected();
          if (isConnected) {
            // Access pricingBreakdown from the quote (stored as jsonb in cpq_quotes table)
            const pricingBreakdown = quote.pricingBreakdown as any;
            const lineItems: Array<{ description: string; quantity: number; unitPrice: number; amount: number; discipline?: string }> = [];
            
            // Use deterministic discipline totals from CPQ pricing result
            const disciplineTotals = pricingBreakdown?.disciplineTotals as {
              architecture?: number;
              mep?: number;
              structural?: number;
              site?: number;
              travel?: number;
              services?: number;
              risk?: number;
            } | undefined;
            
            if (disciplineTotals) {
              // Build line items from authoritative discipline totals
              const projectName = lead.projectName || lead.clientName;
              
              // Architecture (base discipline)
              if (disciplineTotals.architecture && disciplineTotals.architecture > 0) {
                lineItems.push({
                  description: `Architecture Services - ${projectName}`,
                  quantity: 1,
                  unitPrice: disciplineTotals.architecture,
                  amount: disciplineTotals.architecture,
                  discipline: "Architecture",
                });
              }
              
              // MEP
              if (disciplineTotals.mep && disciplineTotals.mep > 0) {
                lineItems.push({
                  description: `MEP Services - ${projectName}`,
                  quantity: 1,
                  unitPrice: disciplineTotals.mep,
                  amount: disciplineTotals.mep,
                  discipline: "MEP",
                });
              }
              
              // Structural
              if (disciplineTotals.structural && disciplineTotals.structural > 0) {
                lineItems.push({
                  description: `Structural Services - ${projectName}`,
                  quantity: 1,
                  unitPrice: disciplineTotals.structural,
                  amount: disciplineTotals.structural,
                  discipline: "Structural",
                });
              }
              
              // Site (maps to Scanning)
              if (disciplineTotals.site && disciplineTotals.site > 0) {
                lineItems.push({
                  description: `Site Scanning - ${projectName}`,
                  quantity: 1,
                  unitPrice: disciplineTotals.site,
                  amount: disciplineTotals.site,
                  discipline: "Scanning",
                });
              }
              
              // Travel (maps to Scanning)
              if (disciplineTotals.travel && disciplineTotals.travel > 0) {
                lineItems.push({
                  description: `Travel/Dispatch - ${projectName}`,
                  quantity: 1,
                  unitPrice: disciplineTotals.travel,
                  amount: disciplineTotals.travel,
                  discipline: "Scanning",
                });
              }
              
              // Services (CAD, Matterport → Architecture)
              if (disciplineTotals.services && disciplineTotals.services > 0) {
                lineItems.push({
                  description: `Additional Services - ${projectName}`,
                  quantity: 1,
                  unitPrice: disciplineTotals.services,
                  amount: disciplineTotals.services,
                  discipline: "Architecture",
                });
              }
              
              // Risk premiums (→ Architecture)
              if (disciplineTotals.risk && disciplineTotals.risk > 0) {
                lineItems.push({
                  description: `Risk Premium - ${projectName}`,
                  quantity: 1,
                  unitPrice: disciplineTotals.risk,
                  amount: disciplineTotals.risk,
                  discipline: "Architecture",
                });
              }
            }
            
            // Validate line item total matches quote total
            const lineItemTotal = lineItems.reduce((sum, item) => sum + item.amount, 0);
            const expectedTotal = pricingBreakdown?.totalClientPrice || 
                                  parseFloat(quote.totalPrice?.toString() || "0");
            
            // Block QBO sync when discipline totals aren't available (legacy quotes)
            // This prevents incorrect single-line estimates from reaching QuickBooks
            if (lineItems.length === 0) {
              console.warn(`[QBO] Lead ${leadId}: No disciplineTotals found - quote must be re-saved with updated CPQ calculator to enable QBO sync`);
              qboResult = { status: "skipped", error: "Quote must be re-saved to enable QBO sync" };
              // Don't proceed with estimate creation
            }
            
            // Fail fast if line items don't match expected total (allow 1% variance for rounding)
            if (lineItems.length > 0 && expectedTotal > 0) {
              const variance = Math.abs(lineItemTotal - expectedTotal) / expectedTotal;
              if (variance > 0.01) {
                const msg = `Line item total $${lineItemTotal.toFixed(2)} differs from quote total $${expectedTotal.toFixed(2)} (${(variance * 100).toFixed(1)}% variance)`;
                console.error(`[QBO] Lead ${leadId}: ${msg}`);
                throw new Error(`QBO sync blocked: ${msg}`);
              }
            }
            
            if (lineItems.length > 0) {
              const estimate = await quickbooksClient.createEstimateFromQuote(
                leadId,
                lead.clientName,
                lead.projectName || lead.clientName,
                lineItems,
                lead.contactEmail || undefined
              );
              
              // Update lead with QBO estimate data atomically
              await storage.updateLead(leadId, {
                qboEstimateId: estimate.estimateId,
                qboEstimateNumber: estimate.estimateNumber,
                qboCustomerId: estimate.customerId,
                qboSyncedAt: new Date(),
              });
              
              qboResult = {
                status: "synced",
                estimateId: estimate.estimateId,
                estimateNumber: estimate.estimateNumber,
              };
              console.log(`[QBO] Created estimate ${estimate.estimateNumber} for lead ${leadId} (${lineItems.length} line items, $${lineItemTotal.toFixed(2)})`);
            } else {
              qboResult = { status: "skipped", error: "No pricing data available" };
            }
          } else {
            qboResult = { status: "not_connected" };
          }
        } catch (qboError: any) {
          console.error("[QBO] Failed to create estimate:", qboError);
          qboResult = { status: "error", error: qboError.message };
          // Do NOT update deal stage if QBO sync failed - leave lead in previous state
        }
      }

      // Update lead status to Proposal Sent
      await storage.updateLead(leadId, { dealStage: "Proposal Sent" });

      res.json({ 
        success: true, 
        message: "Proposal generated and lead status updated",
        filename,
        pdfSize: pdfBuffer.length,
        pandadoc: pandadocResult,
        quickbooks: qboResult,
      });
    } catch (error) {
      console.error("Error sending proposal:", error);
      res.status(500).json({ message: "Failed to send proposal" });
    }
  });

  // === PROJECTS ROUTES (CEO + Production) ===
  app.get(api.projects.list.path, isAuthenticated, requireRole("ceo", "production"), async (req, res) => {
    const projects = await storage.getProjects();
    res.json(projects);
  });

  app.get(api.projects.get.path, isAuthenticated, requireRole("ceo", "production"), async (req, res) => {
    const project = await storage.getProject(Number(req.params.id));
    if (!project) return res.status(404).json({ message: "Project not found" });
    res.json(project);
  });

  // === TRUE NET PROFITABILITY (Financial Service) ===
  const financialService = await import('./services/financial');

  app.get("/api/projects/:id/financials", isAuthenticated, requireRole("ceo", "production", "accounting"), async (req, res) => {
    try {
      const projectId = Number(req.params.id);
      const profitability = await financialService.calculateProjectProfitability(projectId);
      
      // Privacy filter: Only CEO can see compensation breakdown details
      // Production and other roles see the lump sum commission but not who gets what
      const user = req.user as any;
      if (user?.role !== "ceo") {
        // Strip detailed breakdown - keep only the total commission amount in costs
        const filtered = {
          ...profitability,
          compensationBreakdown: [], // Hide who gets what percentage
          salesRep: undefined // Hide legacy sales rep info too
        };
        return res.json(filtered);
      }
      
      res.json(profitability);
    } catch (error: any) {
      console.error("[Financials] Error calculating profitability:", error);
      res.status(500).json({ message: error.message || "Failed to calculate profitability" });
    }
  });

  app.get("/api/portfolio/financials", isAuthenticated, requireRole("ceo", "accounting"), async (req, res) => {
    try {
      const portfolio = await financialService.calculatePortfolioProfitability();
      res.json(portfolio);
    } catch (error: any) {
      console.error("[Financials] Portfolio error:", error);
      res.status(500).json({ message: error.message || "Failed to calculate portfolio profitability" });
    }
  });

  app.get("/api/settings/financial", isAuthenticated, requireRole("ceo", "accounting"), async (req, res) => {
    const settings = await financialService.getSystemSettings();
    res.json(settings);
  });

  app.put("/api/settings/financial", isAuthenticated, requireRole("ceo"), async (req, res) => {
    try {
      const { overheadRate, targetNetMargin } = req.body;
      await financialService.updateSystemSettings(
        parseFloat(overheadRate) || 15,
        parseFloat(targetNetMargin) || 20
      );
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // === COMPENSATION SPLITS (Stakeholder Percentage Management) ===
  const { compensationSplits, insertCompensationSplitSchema } = await import('@shared/schema');

  app.get("/api/compensation-splits", isAuthenticated, requireRole("ceo", "accounting"), async (req, res) => {
    try {
      const splits = await db.select().from(compensationSplits).orderBy(compensationSplits.name);
      res.json(splits);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/compensation-splits", isAuthenticated, requireRole("ceo"), async (req, res) => {
    try {
      const data = insertCompensationSplitSchema.parse(req.body);
      const [created] = await db.insert(compensationSplits).values(data).returning();
      res.json(created);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.put("/api/compensation-splits/:id", isAuthenticated, requireRole("ceo"), async (req, res) => {
    try {
      const id = Number(req.params.id);
      const { name, role, type, defaultRate, isActive } = req.body;
      const [updated] = await db.update(compensationSplits)
        .set({
          name,
          role,
          type,
          defaultRate: defaultRate?.toString(),
          isActive
        })
        .where(eq(compensationSplits.id, id))
        .returning();
      res.json(updated);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.delete("/api/compensation-splits/:id", isAuthenticated, requireRole("ceo"), async (req, res) => {
    try {
      const id = Number(req.params.id);
      await db.delete(compensationSplits).where(eq(compensationSplits.id, id));
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Get project by Universal Project ID (for Field Hub deep links)
  app.get("/api/projects/by-upid/:upid", isAuthenticated, requireRole("ceo", "production"), async (req, res) => {
    try {
      const upid = req.params.upid;
      const allProjects = await storage.getProjects();
      const project = allProjects.find(p => p.universalProjectId === upid);
      
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      // Get linked lead for address and scoping details
      let lead = null;
      if (project.leadId) {
        lead = await storage.getLead(project.leadId);
      }

      // Return project with enriched lead data
      res.json({
        ...project,
        lead: lead ? {
          clientName: lead.clientName,
          projectName: lead.projectName,
          projectAddress: lead.projectAddress,
          buildingType: lead.buildingType,
          sqft: lead.sqft,
          scope: lead.scope,
          disciplines: lead.disciplines,
          bimDeliverable: lead.bimDeliverable,
          notes: lead.notes,
          contactName: lead.contactName,
          contactPhone: lead.contactPhone,
        } : null,
      });
    } catch (error) {
      console.error("Error fetching project by UPID:", error);
      res.status(500).json({ message: "Failed to fetch project" });
    }
  });

  app.post(api.projects.create.path, isAuthenticated, requireRole("ceo", "production"), async (req, res) => {
    try {
      const input = api.projects.create.input.parse(req.body);
      
      // HBIM Auto-Defaults: Auto-set LOD 350 for heritage/complex building types
      let projectData: Record<string, any> = { ...input };
      let clientName = "S2P"; // Default client code
      
      if (input.leadId) {
        const lead = await storage.getLead(input.leadId);
        if (lead) {
          clientName = lead.clientName;
          if (!input.targetLoD && lead.buildingType && HBIM_BUILDING_TYPES.includes(lead.buildingType as BuildingType)) {
            projectData.targetLoD = "LOD 350";
          }
        }
      }
      
      // Generate Universal Project ID: [ClientCode]-[YYMMDD]-[Seq]
      // This ID links QuickBooks accounting with production data
      const existingProjects = await storage.getProjects();
      const today = new Date();
      const todayStr = today.toISOString().slice(2, 10).replace(/-/g, "");
      const todayProjects = existingProjects.filter(p => 
        p.universalProjectId?.includes(`-${todayStr}-`)
      );
      const sequenceNumber = todayProjects.length + 1;
      
      const universalProjectId = generateUniversalProjectId({
        clientCode: generateClientCode(clientName),
        projectNumber: sequenceNumber,
        creationDate: today,
      });
      
      const project = await storage.createProject({
        ...input,
        targetLoD: projectData.targetLoD,
        universalProjectId,
      } as any);
      res.status(201).json(project);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      throw err;
    }
  });

  app.put(api.projects.update.path, isAuthenticated, requireRole("ceo", "production"), async (req, res) => {
    // Parse input with dedicated error handling
    let input;
    try {
      input = api.projects.update.input.parse(req.body);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      return res.status(400).json({ message: "Invalid update data" });
    }

    const projectId = Number(req.params.id);
    const existingProject = await storage.getProject(projectId);
    
    if (!existingProject) {
      return res.status(404).json({ message: "Project not found" });
    }

    // HARD GATE: Block transition to Scanning without retainer payment
    if (input.status === "Scanning" && existingProject.status !== "Scanning") {
      if (existingProject.leadId) {
        const lead = await storage.getLead(existingProject.leadId);
        if (lead && !lead.retainerPaid) {
          return res.status(403).json({ 
            message: "Cannot move to Scanning: Retainer payment has not been received. Please mark the retainer as paid on the associated deal first.",
            gateType: "RETAINER_REQUIRED"
          });
        }
      }
    }

    // HARD GATE: Block transition to Delivered without full payment
    if (input.status === "Delivered" && existingProject.status !== "Delivered") {
      if (existingProject.leadId) {
        const invoices = await storage.getInvoicesByLead(existingProject.leadId);
        const unpaidBalance = invoices
          .filter(inv => inv.status !== 'paid')
          .reduce((sum, inv) => sum + Number(inv.totalAmount || 0), 0);
        
        if (unpaidBalance > 0) {
          return res.status(403).json({ 
            message: `Cannot mark as Delivered: Outstanding balance of $${unpaidBalance.toLocaleString()}. Collect payment before delivery.`,
            gateType: "PAYMENT_REQUIRED",
            outstandingBalance: unpaidBalance
          });
        }
      }
      
      // HARD GATE: SQUARE FOOT AUDIT - Block Delivered if variance >10% without billing adjustment approval
      const sqftVariance = input.sqftVariance ?? existingProject.sqftVariance;
      const billingAdjustmentApproved = input.billingAdjustmentApproved ?? existingProject.billingAdjustmentApproved;
      
      if (sqftVariance && Math.abs(Number(sqftVariance)) > 10 && !billingAdjustmentApproved) {
        return res.status(403).json({ 
          message: `Cannot mark as Delivered: Square Foot Audit required. Scanned area deviates from estimate by ${sqftVariance}%. Billing adjustment must be approved before delivery.`,
          gateType: "SQFT_AUDIT_REQUIRED",
          variancePercent: sqftVariance,
          estimatedSqft: existingProject.estimatedSqft,
          actualSqft: existingProject.actualSqft
        });
      }
    }

    // HARD GATE: Block ANY transition to Modeling without B-Validation AND C-Validation
    // QC 3-Stage Enforcement: Registration must pass before modeling work begins
    // B-Validation = Cross-scan overlap alignment (required)
    // C-Validation = Control point alignment (required for LoA 40 compliance)
    // LoA 40 = 0-1/8" measured accuracy per USIBD specification
    if (input.status === "Modeling" && existingProject.status !== "Modeling") {
      const bValidation = input.bValidationStatus ?? existingProject.bValidationStatus;
      const cValidation = input.cValidationStatus ?? existingProject.cValidationStatus;
      const registrationRms = input.registrationRms ?? existingProject.registrationRms;
      
      // Check B-Validation (overlap alignment)
      if (bValidation !== "passed" && bValidation !== "waived") {
        return res.status(403).json({ 
          message: "Cannot move to Modeling: B-Validation (cross-scan overlap alignment) has not passed. Complete registration QC to verify scan-to-scan alignment.",
          gateType: "QC_VALIDATION_REQUIRED",
          requiredValidation: "B-Validation",
          currentStatus: bValidation
        });
      }
      
      // Check C-Validation (control point alignment)
      if (cValidation !== "passed" && cValidation !== "waived") {
        return res.status(403).json({ 
          message: "Cannot move to Modeling: C-Validation (control point alignment) has not passed. Verify survey control targets are within tolerance for LoA 40 compliance.",
          gateType: "QC_VALIDATION_REQUIRED",
          requiredValidation: "C-Validation",
          currentStatus: cValidation
        });
      }
      
      // Check RMS threshold for LoA 40 compliance (0-1/8" = 0.125" max)
      if (registrationRms && Number(registrationRms) > 0.125) {
        return res.status(403).json({ 
          message: `Cannot move to Modeling: Registration RMS of ${registrationRms}" exceeds LoA 40 threshold of 0.125" (0-1/8"). Improve scan registration or waive with justification.`,
          gateType: "QC_RMS_EXCEEDED",
          currentRms: registrationRms,
          requiredRms: "≤0.125"
        });
      }
      
      // HARD GATE: SQUARE FOOT AUDIT - Block transition to Modeling if variance >10% without billing adjustment approval
      const sqftVariance = input.sqftVariance ?? existingProject.sqftVariance;
      const billingAdjustmentApproved = input.billingAdjustmentApproved ?? existingProject.billingAdjustmentApproved;
      
      if (sqftVariance && Math.abs(Number(sqftVariance)) > 10 && !billingAdjustmentApproved) {
        return res.status(403).json({ 
          message: `Cannot move to Modeling: Square Foot Audit required. Scanned area exceeds estimate by ${sqftVariance}%. Billing adjustment must be approved by Sales or Accounting before proceeding.`,
          gateType: "SQFT_AUDIT_REQUIRED",
          variancePercent: sqftVariance,
          estimatedSqft: existingProject.estimatedSqft,
          actualSqft: existingProject.actualSqft
        });
      }
    }

    // SQUARE FOOT AUDIT: Auto-calculate sqftVariance when actualSqft is provided
    const estimatedSqft = input.estimatedSqft ?? existingProject.estimatedSqft;
    const actualSqft = input.actualSqft ?? existingProject.actualSqft;
    
    if (estimatedSqft && actualSqft && estimatedSqft > 0) {
      const variance = ((actualSqft - estimatedSqft) / estimatedSqft) * 100;
      (input as any).sqftVariance = variance.toFixed(2);
      
      // Square Foot Audit 10% Tolerance Rule:
      // - Auto-mark complete if variance ≤10%
      // - Force incomplete if variance >10% (requires billing adjustment)
      if (Math.abs(variance) <= 10) {
        (input as any).sqftAuditComplete = true;
      } else {
        (input as any).sqftAuditComplete = false;
      }
    }

    const project = await storage.updateProject(projectId, input);
    
    // Real-Time Margin Tracking: Recalculate margin on sqft or lead value changes
    if (input.actualSqft !== undefined || input.estimatedSqft !== undefined || input.leadId !== undefined) {
      try {
        const { updateProjectMargin } = await import("./services/marginCalculator");
        await updateProjectMargin(projectId);
      } catch (err) {
        console.error("Failed to update project margin:", err);
      }
    }
    
    // Include variance alert info in response if exceeds 10% tolerance
    const responseProject = { ...project };
    if (project.sqftVariance && Math.abs(Number(project.sqftVariance)) > 10) {
      (responseProject as any).sqftAuditAlert = {
        message: `Square Foot Audit Required: Variance of ${project.sqftVariance}% exceeds 10% tolerance. Billing adjustment approval required before Modeling.`,
        estimatedSqft,
        actualSqft,
        variancePercent: Number(project.sqftVariance)
      };
    }
    
    res.json(responseProject);
  });

  // === MARGIN TRACKING ROUTES ===
  // Recalculate margin for a single project
  app.post("/api/projects/:id/recalculate-margin", isAuthenticated, requireRole("ceo", "production"), async (req, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const { updateProjectMargin } = await import("./services/marginCalculator");
      const result = await updateProjectMargin(projectId);
      if (!result) {
        return res.status(400).json({ message: "Could not calculate margin - missing sqft or revenue data" });
      }
      res.json(result);
    } catch (error) {
      console.error("Margin calculation error:", error);
      res.status(500).json({ message: "Failed to calculate margin" });
    }
  });

  // Recalculate all project margins (admin batch operation)
  app.post("/api/projects/recalculate-all-margins", isAuthenticated, requireRole("ceo"), async (req, res) => {
    try {
      const { recalculateAllProjectMargins } = await import("./services/marginCalculator");
      const count = await recalculateAllProjectMargins();
      res.json({ message: `Recalculated margins for ${count} projects`, count });
    } catch (error) {
      console.error("Batch margin calculation error:", error);
      res.status(500).json({ message: "Failed to recalculate margins" });
    }
  });

  // === SCANTECHS ROUTES (CEO + Production) ===
  app.get("/api/scantechs", isAuthenticated, requireRole("ceo", "production"), async (req, res) => {
    const scantechs = await storage.getScantechs();
    res.json(scantechs);
  });

  app.get("/api/scantechs/:id", isAuthenticated, requireRole("ceo", "production"), async (req, res) => {
    const scantech = await storage.getScantech(Number(req.params.id));
    if (!scantech) return res.status(404).json({ message: "ScanTech not found" });
    res.json(scantech);
  });

  app.post("/api/scantechs", isAuthenticated, requireRole("ceo"), async (req, res) => {
    try {
      const scantech = await storage.createScantech(req.body);
      res.status(201).json(scantech);
    } catch (err) {
      return res.status(400).json({ message: "Failed to create ScanTech" });
    }
  });

  app.patch("/api/scantechs/:id", isAuthenticated, requireRole("ceo"), async (req, res) => {
    try {
      const scantech = await storage.updateScantech(Number(req.params.id), req.body);
      res.json(scantech);
    } catch (err) {
      return res.status(400).json({ message: "Failed to update ScanTech" });
    }
  });

  // === TRAVEL-AWARE SCHEDULING ROUTES ===
  
  app.post("/api/travel/calculate", isAuthenticated, requireRole("ceo", "production", "sales"), async (req, res) => {
    try {
      const { destination, origin } = req.body;
      
      console.log("[Travel Calculate] Request:", { destination, origin });
      
      if (!destination) {
        return res.status(400).json({ message: "Destination address is required" });
      }

      const result = await calculateTravelDistance(destination, origin);
      
      console.log("[Travel Calculate] Result:", result);
      
      if (!result) {
        return res.status(400).json({ message: "Could not calculate travel distance. Check the address." });
      }

      const shiftValidation = validateShiftGate(result.durationMinutes);

      res.json({
        ...result,
        shiftGate: shiftValidation,
      });
    } catch (error) {
      console.error("Travel calculation error:", error);
      res.status(500).json({ message: "Failed to calculate travel" });
    }
  });

  app.post("/api/travel/validate-shift", isAuthenticated, requireRole("ceo", "production"), async (req, res) => {
    try {
      const { travelTimeMinutes, scanDurationHours } = req.body;
      
      if (typeof travelTimeMinutes !== "number") {
        return res.status(400).json({ message: "Travel time in minutes is required" });
      }

      const validation = validateShiftGate(travelTimeMinutes, scanDurationHours);
      res.json(validation);
    } catch (error) {
      res.status(500).json({ message: "Failed to validate shift" });
    }
  });

  app.get("/api/calendar/availability/:date", isAuthenticated, requireRole("ceo", "production"), async (req, res) => {
    try {
      const date = new Date(req.params.date);
      const technicianEmail = req.query.technicianEmail as string | undefined;
      
      const availability = await getTechnicianAvailability(date, technicianEmail);
      res.json(availability);
    } catch (error) {
      console.error("Calendar availability error:", error);
      res.status(500).json({ message: "Failed to fetch calendar availability" });
    }
  });

  app.post("/api/scheduling/create-scan-event", isAuthenticated, requireRole("ceo", "production"), async (req, res) => {
    try {
      const { projectId, scanDate, startTime, endTime, technicianEmail, notes } = req.body;
      
      if (!projectId || !scanDate || !startTime || !endTime) {
        return res.status(400).json({ message: "Project ID, date, start time, and end time are required" });
      }

      const project = await storage.getProject(Number(projectId));
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      let travelInfo = null;
      let lead = null;
      
      if (project.leadId) {
        lead = await storage.getLead(project.leadId);
        if (lead?.projectAddress) {
          travelInfo = await calculateTravelDistance(lead.projectAddress);
        }
      }

      if (travelInfo) {
        const shiftCheck = validateShiftGate(travelInfo.durationMinutes);
        if (!shiftCheck.valid) {
          return res.status(400).json({ 
            message: "Shift gate violation", 
            details: shiftCheck.message,
            travelInfo,
          });
        }
      }

      const eventResult = await createScanCalendarEvent({
        projectName: project.name,
        projectAddress: lead?.projectAddress || "Address not available",
        universalProjectId: project.universalProjectId || undefined,
        scanDate: new Date(scanDate),
        startTime,
        endTime,
        technicianEmail,
        travelInfo: travelInfo || undefined,
        notes,
      });

      if (!eventResult) {
        return res.status(500).json({ message: "Failed to create calendar event" });
      }

      const projectUpdate: Record<string, any> = {
        scanDate: new Date(scanDate),
        calendarEventId: eventResult.eventId,
      };

      if (travelInfo) {
        projectUpdate.travelDistanceMiles = travelInfo.distanceMiles.toString();
        projectUpdate.travelDurationMinutes = travelInfo.durationMinutes;
        projectUpdate.travelScenario = travelInfo.scenario.type;
      }

      await storage.updateProject(project.id, projectUpdate);

      res.json({
        success: true,
        eventId: eventResult.eventId,
        calendarLink: eventResult.htmlLink,
        travelInfo,
      });
    } catch (error) {
      console.error("Create scan event error:", error);
      res.status(500).json({ message: "Failed to schedule scan" });
    }
  });

  // === SITE REALITY AUDIT ROUTES (AI-powered building analysis) ===
  app.post("/api/site-audit/:projectId", isAuthenticated, requireRole(["ceo", "production", "sales"]), async (req, res) => {
    try {
      const projectId = Number(req.params.projectId);
      const project = await storage.getProject(projectId);
      
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      const lead = project.leadId ? await storage.getLead(project.leadId) : null;
      const address = lead?.projectAddress || project.name;

      if (!address || address.length < 5) {
        return res.status(400).json({ message: "Project address is required for site audit" });
      }

      const { performSiteRealityAudit } = await import("./site-reality-audit");
      
      const auditResult = await performSiteRealityAudit({
        projectAddress: address,
        clientName: lead?.clientName || project.name,
        buildingType: lead?.buildingType || undefined,
        scopeOfWork: lead?.scope || undefined,
        sqft: lead?.sqft || undefined,
        disciplines: lead?.disciplines || undefined,
        notes: lead?.notes || undefined,
      });

      res.json(auditResult);
    } catch (error) {
      console.error("Site reality audit error:", error);
      res.status(500).json({ message: "Failed to perform site audit" });
    }
  });

  app.post("/api/site-audit/lead/:leadId", isAuthenticated, requireRole(["ceo", "production", "sales"]), async (req, res) => {
    try {
      const leadId = Number(req.params.leadId);
      const lead = await storage.getLead(leadId);
      
      if (!lead) {
        return res.status(404).json({ message: "Lead not found" });
      }

      if (!lead.projectAddress || lead.projectAddress.length < 5) {
        return res.status(400).json({ message: "Project address is required for site audit" });
      }

      const { performSiteRealityAudit } = await import("./site-reality-audit");
      
      const auditResult = await performSiteRealityAudit({
        projectAddress: lead.projectAddress,
        clientName: lead.clientName,
        buildingType: lead.buildingType || undefined,
        scopeOfWork: lead.scope || undefined,
        sqft: lead.sqft || undefined,
        disciplines: lead.disciplines || undefined,
        notes: lead.notes || undefined,
      });

      res.json(auditResult);
    } catch (error) {
      console.error("Site reality audit error:", error);
      res.status(500).json({ message: "Failed to perform site audit" });
    }
  });

  // === PREDICTIVE CASHFLOW ROUTE (CEO only) with simple caching ===
  let cashflowCache: { data: any; timestamp: number } | null = null;
  const CASHFLOW_CACHE_TTL = 5 * 60 * 1000; // 5 minutes
  
  app.get("/api/predictive-cashflow", isAuthenticated, requireRole(["ceo"]), async (req, res) => {
    try {
      // Return cached result if still valid
      if (cashflowCache && Date.now() - cashflowCache.timestamp < CASHFLOW_CACHE_TTL) {
        return res.json(cashflowCache.data);
      }
      
      const { getPredictiveCashflow } = await import("./predictive-cashflow");
      const result = await getPredictiveCashflow();
      
      // Cache the result
      cashflowCache = { data: result, timestamp: Date.now() };
      
      res.json(result);
    } catch (error) {
      console.error("Predictive cashflow error:", error);
      res.status(500).json({ message: "Failed to generate cashflow forecast" });
    }
  });

  // === FIELD NOTES ROUTES (All authenticated users) ===
  app.get(api.fieldNotes.list.path, isAuthenticated, async (req, res) => {
    const notes = await storage.getFieldNotes();
    res.json(notes);
  });

  app.post(api.fieldNotes.create.path, isAuthenticated, async (req, res) => {
    try {
      const input = api.fieldNotes.create.input.parse(req.body);
      const note = await storage.createFieldNote(input);
      res.status(201).json(note);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      throw err;
    }
  });

  // AI PROCESSING ENDPOINT - Meeting Scoping (All authenticated users)
  app.post(api.fieldNotes.process.path, isAuthenticated, async (req, res) => {
    const id = Number(req.params.id);
    const note = await storage.getFieldNote(id);
    
    if (!note) return res.status(404).json({ message: "Note not found" });
    
    // Require leadId for meeting scoping to work properly
    if (!note.leadId) {
      return res.status(400).json({ message: "Note must be linked to a deal for scope extraction" });
    }

    try {
      // Update status to processing
      await storage.updateFieldNote(id, { status: "Processing" });

      // Call OpenAI with structured extraction prompt
      const completion = await openai.chat.completions.create({
        model: "gpt-5.1",
        messages: [
          {
            role: "system",
            content: `You are a professional estimator for a laser scanning and BIM firm. Analyze client meeting notes and extract scoping details.

Return your response in two parts:

PART 1 - EXTRACTED DATA (JSON):
Extract these fields if mentioned (use null if not found):
- sqft: number (square footage of the building/area)
- buildingType: string (Warehouse, Commercial, Residential, Industrial, Healthcare, Education, Historic, Mixed-Use)
- scope: string (Interior Only, Exterior Only, Full Building, Roof/Facades, MEP Only, Site/Civil)
- disciplines: string (e.g., "Architecture LOD 300", "MEP LOD 200", "Structural LOD 300")
- bimDeliverable: string (Revit, AutoCAD, Point Cloud, Navisworks)
- timeline: string (e.g., "2 weeks", "1 month", "ASAP")
- notes: string (any other important details mentioned)

Format the JSON block like this:
\`\`\`json
{"sqft": 50000, "buildingType": "Warehouse", ...}
\`\`\`

PART 2 - PROFESSIONAL SCOPE SUMMARY:
Write a concise, professional scope of work summary based on the meeting notes.`
          },
          {
            role: "user",
            content: note.rawContent
          }
        ],
      });

      const aiResponse = completion.choices[0].message.content || "Could not generate scope.";
      
      let leadUpdated = false;
      let extractedFields: string[] = [];
      
      // Extract JSON data and update the linked lead
      if (note.leadId) {
        try {
          // Try multiple JSON extraction patterns
          let jsonStr: string | null = null;
          const fencedMatch = aiResponse.match(/```json\s*([\s\S]*?)\s*```/);
          if (fencedMatch) {
            jsonStr = fencedMatch[1];
          } else {
            // Fallback: look for raw JSON object
            const rawJsonMatch = aiResponse.match(/\{[\s\S]*?"sqft"[\s\S]*?\}/);
            if (rawJsonMatch) {
              jsonStr = rawJsonMatch[0];
            }
          }
          
          if (jsonStr) {
            const extractedData = JSON.parse(jsonStr);
            const updateFields: Record<string, any> = {};
            
            // Sanitize sqft - convert to integer, handle commas
            if (extractedData.sqft != null) {
              const sqftValue = typeof extractedData.sqft === 'string' 
                ? parseInt(extractedData.sqft.replace(/,/g, ''), 10)
                : Number(extractedData.sqft);
              if (!isNaN(sqftValue) && sqftValue > 0) {
                updateFields.sqft = sqftValue;
                extractedFields.push(`sqft: ${sqftValue}`);
              }
            }
            
            // Validate and sanitize string fields
            const stringFields = ['buildingType', 'scope', 'disciplines', 'bimDeliverable', 'timeline'] as const;
            for (const field of stringFields) {
              if (extractedData[field] && typeof extractedData[field] === 'string' && extractedData[field].trim()) {
                updateFields[field] = extractedData[field].trim();
                extractedFields.push(`${field}: ${extractedData[field].trim()}`);
              }
            }
            
            // Handle notes field - append to existing
            if (extractedData.notes && typeof extractedData.notes === 'string' && extractedData.notes.trim()) {
              const existingLead = await storage.getLead(note.leadId);
              updateFields.notes = existingLead?.notes 
                ? `${existingLead.notes}\n\n[Meeting Scope]: ${extractedData.notes.trim()}`
                : `[Meeting Scope]: ${extractedData.notes.trim()}`;
              extractedFields.push('notes');
            }
            
            if (Object.keys(updateFields).length > 0) {
              await storage.updateLead(note.leadId, updateFields);
              leadUpdated = true;
              console.log(`Updated lead ${note.leadId} with extracted scoping data:`, updateFields);
            }
          } else {
            console.warn("No JSON block found in AI response for lead update");
          }
        } catch (parseError) {
          console.warn("Could not parse AI JSON response for lead update:", parseError);
        }
      }

      // Save result
      const updated = await storage.updateFieldNote(id, {
        processedScope: aiResponse,
        status: "Completed"
      });

      res.json({
        ...updated,
        leadUpdated,
        extractedFields
      });
    } catch (error) {
      console.error("AI Processing Error:", error);
      await storage.updateFieldNote(id, { status: "Failed" });
      res.status(500).json({ message: "AI processing failed" });
    }
  });

  // === AIRTABLE INTEGRATION (CEO only) ===
  app.get("/api/integrations/airtable/status", isAuthenticated, requireRole("ceo"), async (req, res) => {
    res.json({ configured: isAirtableConfigured() });
  });

  app.post("/api/leads/:id/handoff", isAuthenticated, requireRole("ceo", "sales"), async (req, res) => {
    if (!AIRTABLE_WRITE_ENABLED) {
      return res.status(503).json({ 
        message: "Airtable write operations are disabled." 
      });
    }
    
    if (!isAirtableConfigured()) {
      return res.status(503).json({ 
        message: "Airtable is not configured. Please add API key and Base ID." 
      });
    }
    
    try {
      const id = parseInt(req.params.id);
      const lead = await storage.getLead(id);
      if (!lead) return res.status(404).json({ message: "Lead not found" });
      
      const result = await syncProjectToAirtable({
        name: lead.projectName || `${lead.clientName} - ${lead.projectAddress || 'Project'}`,
        status: "Active",
        clientName: lead.clientName,
        projectAddress: lead.projectAddress || undefined,
      });
      
      if (result.success) {
        res.json({ 
          message: "Deal synced to Airtable",
          recordId: result.recordId 
        });
      } else {
        res.status(500).json({ message: result.error || "Sync failed" });
      }
    } catch (error) {
      console.error("Handoff error:", error);
      res.status(500).json({ message: "Failed to sync to Airtable" });
    }
  });
  
  // Sync project status to Airtable
  app.post("/api/projects/:id/sync", isAuthenticated, requireRole("ceo", "production"), async (req, res) => {
    if (!AIRTABLE_WRITE_ENABLED || !isAirtableConfigured()) {
      return res.status(503).json({ message: "Airtable sync not available" });
    }
    
    try {
      const id = parseInt(req.params.id);
      const project = await storage.getProject(id);
      if (!project) return res.status(404).json({ message: "Project not found" });
      
      // Get linked lead for client info
      let clientName: string | undefined;
      let projectAddress: string | undefined;
      if (project.leadId) {
        const lead = await storage.getLead(project.leadId);
        if (lead) {
          clientName = lead.clientName;
          projectAddress = lead.projectAddress || undefined;
        }
      }
      
      const result = await syncProjectToAirtable({
        name: project.name,
        status: project.status,
        clientName,
        projectAddress,
      });
      
      if (result.success) {
        res.json({ 
          message: "Project synced to Airtable",
          recordId: result.recordId 
        });
      } else {
        res.status(500).json({ message: result.error || "Sync failed" });
      }
    } catch (error) {
      console.error("Project sync error:", error);
      res.status(500).json({ message: "Failed to sync project" });
    }
  });

  // === PROJECT ATTACHMENTS (Visual Scoping - Drive Sync) ===
  
  // Get attachments for a project
  app.get("/api/projects/:id/attachments", isAuthenticated, requireRole("ceo", "production", "sales"), async (req, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const attachments = await storage.getProjectAttachments(projectId);
      res.json(attachments);
    } catch (error) {
      console.error("Error fetching attachments:", error);
      res.status(500).json({ message: "Failed to fetch attachments" });
    }
  });

  // Get attachment count for a project (for Kanban badge)
  app.get("/api/projects/:id/attachments/count", isAuthenticated, async (req, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const count = await storage.countProjectAttachments(projectId);
      res.json({ count });
    } catch (error) {
      res.status(500).json({ message: "Failed to count attachments" });
    }
  });

  // Upload attachment to project (with Drive sync)
  const attachmentUpload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 25 * 1024 * 1024 }, // 25MB limit
    fileFilter: (req, file, cb) => {
      const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'];
      if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new Error('Only images (JPG, PNG, GIF) and PDFs are allowed'));
      }
    }
  });

  app.post("/api/projects/:id/attachments", isAuthenticated, requireRole("ceo", "production", "sales"), attachmentUpload.single('file'), async (req, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const project = await storage.getProject(projectId);
      
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      // Check if project has Drive folder
      if (!project.driveFolderId || !project.driveSubfolders) {
        return res.status(400).json({ message: "Project does not have a Google Drive folder. Close the deal first." });
      }

      const subfolders = project.driveSubfolders as { fieldCapture?: string; bimProduction?: string; accountingFinancials?: string; clientDeliverables?: string };
      const targetFolder = subfolders.fieldCapture || project.driveFolderId;

      // Generate standardized filename: [UniversalID]_Asset_[OriginalFilename]
      const universalId = project.universalProjectId || `PROJ-${projectId}`;
      const standardizedName = `${universalId}_Asset_${req.file.originalname}`;

      // Upload to Google Drive
      const driveResult = await uploadFileToDrive(
        targetFolder,
        standardizedName,
        req.file.mimetype,
        req.file.buffer
      );

      // Save attachment record
      const attachment = await storage.createAttachment({
        projectId,
        fileName: standardizedName,
        originalName: req.file.originalname,
        mimeType: req.file.mimetype,
        fileSize: req.file.size,
        driveFileId: driveResult.fileId,
        driveFileUrl: driveResult.webViewLink,
        driveDownloadUrl: driveResult.webContentLink,
        thumbnailUrl: driveResult.thumbnailLink,
        subfolder: '01_Field_Capture',
        source: 'manual',
        uploadedBy: (req as any).user?.id || 'unknown',
      });

      res.json(attachment);
    } catch (error) {
      console.error("Error uploading attachment:", error);
      res.status(500).json({ message: "Failed to upload attachment" });
    }
  });

  // Delete attachment
  app.delete("/api/attachments/:id", isAuthenticated, requireRole("ceo", "production"), async (req, res) => {
    try {
      const attachmentId = parseInt(req.params.id);
      await storage.deleteAttachment(attachmentId);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting attachment:", error);
      res.status(500).json({ message: "Failed to delete attachment" });
    }
  });

  // === HYBRID STORAGE MIGRATION (Admin/CEO only) ===
  // Migrate a legacy project from Google Drive to hybrid GCS storage
  app.post("/api/projects/:id/migrate-to-gcs", isAuthenticated, requireRole("ceo"), async (req, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const project = await storage.getProject(projectId);
      
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      if (!project.universalProjectId) {
        return res.status(400).json({ 
          message: "Project must have a Universal Project ID before migration" 
        });
      }

      // Check if already migrated
      const currentMode = (project as any).storageMode || "legacy_drive";
      if (currentMode === "hybrid_gcs" || currentMode === "gcs_native") {
        return res.status(400).json({ 
          message: `Project is already using ${currentMode} storage mode`,
          currentMode,
          gcsBucket: (project as any).gcsBucket,
          gcsPath: (project as any).gcsPath,
        });
      }

      // Generate GCS path based on UPID
      const gcsBucket = "s2p-active";
      const gcsPath = `${project.universalProjectId}/`;

      // Update project with hybrid storage settings
      await storage.updateProject(projectId, {
        storageMode: "hybrid_gcs",
        gcsBucket,
        gcsPath,
      } as any);

      // Also update linked lead if exists
      if (project.leadId) {
        await storage.updateLead(project.leadId, {
          storageMode: "hybrid_gcs",
          gcsBucket,
          gcsPath,
        } as any);
      }

      console.log(`[Migration] Project ${project.universalProjectId} migrated to hybrid_gcs: gs://${gcsBucket}/${gcsPath}`);

      res.json({
        success: true,
        message: `Project migrated to hybrid GCS storage`,
        projectId,
        universalProjectId: project.universalProjectId,
        storageMode: "hybrid_gcs",
        gcsBucket,
        gcsPath,
        gcsConsoleUrl: `https://console.cloud.google.com/storage/browser/${gcsBucket}/${gcsPath}`,
        rcloneCommand: `rclone copy "gdrive:Scan2Plan/${project.universalProjectId}" "gcs:${gcsBucket}/${gcsPath}" --progress`,
      });
    } catch (error) {
      console.error("Error migrating project to GCS:", error);
      res.status(500).json({ message: "Failed to migrate project" });
    }
  });

  // === POINT CLOUD DELIVERY (Heavy Artillery - Potree Integration) ===
  app.post("/api/projects/:id/deliver-pointcloud", isAuthenticated, requireRole("ceo", "production"), async (req, res) => {
    try {
      const { processPointCloud } = await import('./services/potree');
      const projectId = parseInt(req.params.id);
      
      const project = await storage.getProject(projectId);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      // Validate project has required data for conversion
      if (!project.driveFolderId && !project.gcsPath) {
        return res.status(400).json({ 
          message: "Project requires a Drive folder or GCS path before point cloud processing",
          prerequisite: "storage_setup"
        });
      }

      // Use GCS path if available, otherwise use project folder reference
      const sourcePath = project.gcsPath 
        ? `/tmp/uploads/${project.gcsPath}` 
        : `/tmp/uploads/${projectId}.e57`;
      
      // Fire off the processing (simulation mode will handle missing binary)
      await processPointCloud(projectId, sourcePath);

      res.status(202).json({ message: "Processing started", status: "processing" });
    } catch (error) {
      console.error("Error starting point cloud processing:", error);
      res.status(500).json({ message: "Failed to start point cloud processing" });
    }
  });

  // Legacy handoff route preserved below
  app.post("/api/leads/:id/handoff-legacy", isAuthenticated, requireRole("ceo", "sales"), async (req, res) => {
    if (!AIRTABLE_WRITE_ENABLED) {
      return res.status(503).json({ 
        message: "Airtable write operations are disabled." 
      });
    }

    const leadId = Number(req.params.id);
    const lead = await storage.getLead(leadId);
    
    if (!lead) return res.status(404).json({ message: "Lead not found" });
    
    if (!isAirtableConfigured()) {
      return res.status(400).json({ message: "Airtable not configured" });
    }

    await storage.updateLead(leadId, { dealStage: "Closed Won" });

    const project = await storage.createProject({
      name: `${lead.clientName} - ${lead.projectAddress}`,
      leadId: leadId,
      status: "Scheduling",
      priority: "Medium",
      progress: 0,
    });

    res.json({
      success: true,
      localProjectId: project.id,
      message: "Local project created. Airtable sync pending workflow approval."
    });
  });

  // === AIRTABLE ROUTES (CEO only) ===
  app.get("/api/integrations/airtable/overview", isAuthenticated, requireRole("ceo"), async (req, res) => {
    if (!isAirtableConfigured()) {
      return res.status(400).json({ message: "Airtable not configured" });
    }

    try {
      const overview = await getAirtableOverview();
      res.json(overview);
    } catch (error) {
      console.error("Airtable overview error:", error);
      res.status(500).json({ message: "Failed to fetch Airtable overview" });
    }
  });

  app.get("/api/integrations/airtable/analytics", isAuthenticated, requireRole("ceo"), async (req, res) => {
    if (!isAirtableConfigured()) {
      return res.status(400).json({ message: "Airtable not configured" });
    }

    try {
      const analytics = await getAirtableAnalytics();
      res.json(analytics);
    } catch (error) {
      console.error("Airtable analytics error:", error);
      res.status(500).json({ message: "Failed to fetch Airtable analytics" });
    }
  });

  app.get("/api/airtable/time-entries", isAuthenticated, requireRole("ceo"), async (req, res) => {
    if (!isAirtableConfigured()) {
      return res.status(400).json({ message: "Airtable not configured" });
    }

    try {
      const entries = await getTimeEntries();
      res.json(entries);
    } catch (error) {
      console.error("Airtable fetch error:", error);
      res.status(500).json({ message: "Failed to fetch time entries" });
    }
  });

  // === STALENESS ENGINE (CEO + Sales) ===
  app.post("/api/staleness/apply", isAuthenticated, requireRole("ceo", "sales"), async (req, res) => {
    try {
      const result = await applyStalenessPenalties();
      res.json(result);
    } catch (error) {
      console.error("Staleness engine error:", error);
      res.status(500).json({ message: "Failed to apply staleness penalties" });
    }
  });

  app.get("/api/leads/:id/staleness", isAuthenticated, requireRole("ceo", "sales"), async (req, res) => {
    const lead = await storage.getLead(Number(req.params.id));
    if (!lead) return res.status(404).json({ message: "Lead not found" });

    const status = getStageSpecificStaleness(lead.dealStage, lead.lastContactDate);
    res.json(status);
  });

  // === SMART PROBABILITY SCORING (CEO + Sales) ===
  app.get("/api/leads/:id/probability", isAuthenticated, requireRole("ceo", "sales"), async (req, res) => {
    const lead = await storage.getLead(Number(req.params.id));
    if (!lead) return res.status(404).json({ message: "Lead not found" });

    const factors = calculateProbability(lead);
    res.json(factors);
  });

  app.post("/api/probability/recalculate", isAuthenticated, requireRole("ceo"), async (req, res) => {
    try {
      const result = await recalculateAllProbabilities();
      res.json(result);
    } catch (error) {
      console.error("Probability recalculation error:", error);
      res.status(500).json({ message: "Failed to recalculate probabilities" });
    }
  });

  app.get("/api/analytics/win-loss", isAuthenticated, requireRole("ceo", "sales", "accounting"), async (req, res) => {
    try {
      const analytics = await getWinLossAnalytics();
      res.json(analytics);
    } catch (error) {
      console.error("Win/loss analytics error:", error);
      res.status(500).json({ message: "Failed to fetch win/loss analytics" });
    }
  });

  // === DEEP RESEARCH (OpenAI GPT-4o-mini) ===
  const VALID_RESEARCH_TYPES = ["client", "property", "competitor", "regulatory", "expansion", "persona", "vault"] as const;
  type ResearchType = typeof VALID_RESEARCH_TYPES[number];

  // Helper function to perform AI research using GPT-4o-mini
  async function performAIResearch(systemPrompt: string, userQuery: string): Promise<{ summary: string }> {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userQuery }
      ],
      max_tokens: 3000,
    });

    const summary = response.choices[0]?.message?.content || "No research results found.";
    return { summary };
  }

  // Background auto-research for new leads (non-blocking)
  async function triggerAutoResearch(leadId: number, clientName: string) {
    console.log(`Starting auto-research for lead ${leadId} (${clientName})`);
    
    const systemPrompt = `You are a strategic sales intelligence assistant for a laser scanning and BIM services company. Your goal is to help protect margins and maximize deal value by providing actionable client intelligence. Focus on information that helps with pricing strategy and sales negotiation.`;
    const userQuery = `Research the company "${clientName}" for strategic sales intelligence.

Provide a concise analysis covering:
1. **Company Overview**: Industry, size, ownership structure
2. **Financial Indicators**: Revenue tier (SMB/Mid-Market/Enterprise), growth trajectory
3. **Construction Activity**: Recent or planned building projects
4. **Pricing Strategy Insights**: Are they price shoppers or value-focused?
5. **Margin Protection Notes**: Red flags or green lights for this engagement

Be concise and actionable.`;

    try {
      const { summary } = await performAIResearch(systemPrompt, userQuery);
      
      await storage.createLeadResearch({
        leadId,
        researchType: "client",
        summary,
        citations: JSON.stringify([]),
        highlights: JSON.stringify(["Auto-generated on lead creation"]),
        rawResponse: null,
      });
      
      console.log(`Auto-research completed for lead ${leadId}`);
    } catch (error: any) {
      console.error(`Auto-research failed for lead ${leadId}:`, error.message);
    }
  }

  app.get("/api/leads/:id/research", isAuthenticated, requireRole("ceo", "sales"), async (req, res) => {
    try {
      const leadId = Number(req.params.id);
      const research = await storage.getLeadResearch(leadId);
      res.json(research);
    } catch (error) {
      console.error("Research fetch error:", error);
      res.status(500).json({ message: "Failed to fetch research" });
    }
  });

  // Deal Attributions (Marketing Influence Tracker)
  app.get("/api/leads/:id/attributions", isAuthenticated, requireRole("ceo", "sales"), async (req, res) => {
    try {
      const leadId = Number(req.params.id);
      const attributions = await storage.getDealAttributions(leadId);
      res.json(attributions);
    } catch (error) {
      console.error("Attribution fetch error:", error);
      res.status(500).json({ message: "Failed to fetch attributions" });
    }
  });

  app.post("/api/leads/:id/attributions", isAuthenticated, requireRole("ceo", "sales"), async (req, res) => {
    try {
      const leadId = Number(req.params.id);
      const { touchpoint } = req.body;
      if (!touchpoint) {
        return res.status(400).json({ message: "Touchpoint is required" });
      }
      const attribution = await storage.createDealAttribution({ leadId, touchpoint });
      res.status(201).json(attribution);
    } catch (error) {
      console.error("Attribution create error:", error);
      res.status(500).json({ message: "Failed to create attribution" });
    }
  });

  app.delete("/api/leads/:id/attributions/:attrId", isAuthenticated, requireRole("ceo", "sales"), async (req, res) => {
    try {
      const attrId = Number(req.params.attrId);
      await storage.deleteDealAttribution(attrId);
      res.status(204).send();
    } catch (error) {
      console.error("Attribution delete error:", error);
      res.status(500).json({ message: "Failed to delete attribution" });
    }
  });

  // ===== EVENTS (Education-Led Sales / CEU Strategy) =====
  app.get("/api/events", isAuthenticated, requireRole("ceo", "sales"), async (req, res) => {
    try {
      const allEvents = await storage.getEvents();
      res.json(allEvents);
    } catch (error) {
      console.error("Events fetch error:", error);
      res.status(500).json({ message: "Failed to fetch events" });
    }
  });

  app.get("/api/events/:id", isAuthenticated, requireRole("ceo", "sales"), async (req, res) => {
    try {
      const event = await storage.getEvent(Number(req.params.id));
      if (!event) return res.status(404).json({ message: "Event not found" });
      res.json(event);
    } catch (error) {
      console.error("Event fetch error:", error);
      res.status(500).json({ message: "Failed to fetch event" });
    }
  });

  app.post("/api/events", isAuthenticated, requireRole("ceo"), async (req, res) => {
    try {
      const event = await storage.createEvent(req.body);
      res.status(201).json(event);
    } catch (error) {
      console.error("Event create error:", error);
      res.status(500).json({ message: "Failed to create event" });
    }
  });

  app.patch("/api/events/:id", isAuthenticated, requireRole("ceo"), async (req, res) => {
    try {
      const updated = await storage.updateEvent(Number(req.params.id), req.body);
      res.json(updated);
    } catch (error) {
      console.error("Event update error:", error);
      res.status(500).json({ message: "Failed to update event" });
    }
  });

  app.delete("/api/events/:id", isAuthenticated, requireRole("ceo"), async (req, res) => {
    try {
      await storage.deleteEvent(Number(req.params.id));
      res.status(204).send();
    } catch (error) {
      console.error("Event delete error:", error);
      res.status(500).json({ message: "Failed to delete event" });
    }
  });

  // Event Registrations
  app.get("/api/events/:id/registrations", isAuthenticated, requireRole("ceo", "sales"), async (req, res) => {
    try {
      const registrations = await storage.getEventRegistrations(Number(req.params.id));
      res.json(registrations);
    } catch (error) {
      console.error("Registrations fetch error:", error);
      res.status(500).json({ message: "Failed to fetch registrations" });
    }
  });

  app.post("/api/events/:id/registrations", isAuthenticated, requireRole("ceo", "sales"), async (req, res) => {
    try {
      const { leadId } = req.body;
      if (!leadId) return res.status(400).json({ message: "leadId is required" });
      const registration = await storage.createEventRegistration({ 
        eventId: Number(req.params.id), 
        leadId: Number(leadId) 
      });
      res.status(201).json(registration);
    } catch (error) {
      console.error("Registration create error:", error);
      res.status(500).json({ message: "Failed to create registration" });
    }
  });

  app.patch("/api/event-registrations/:id", isAuthenticated, requireRole("ceo", "sales"), async (req, res) => {
    try {
      const { status, leadId } = req.body;
      if (!status || !leadId) return res.status(400).json({ message: "status and leadId are required" });
      const updated = await storage.updateEventRegistrationStatus(Number(req.params.id), status, Number(leadId));
      res.json(updated);
    } catch (error) {
      console.error("Registration update error:", error);
      res.status(500).json({ message: "Failed to update registration" });
    }
  });

  app.delete("/api/event-registrations/:id", isAuthenticated, requireRole("ceo", "sales"), async (req, res) => {
    try {
      await storage.deleteEventRegistration(Number(req.params.id));
      res.status(204).send();
    } catch (error) {
      console.error("Registration delete error:", error);
      res.status(500).json({ message: "Failed to delete registration" });
    }
  });

  // Lead's event registrations
  app.get("/api/leads/:id/event-registrations", isAuthenticated, requireRole("ceo", "sales"), async (req, res) => {
    try {
      const registrations = await storage.getEventRegistrationsByLead(Number(req.params.id));
      res.json(registrations);
    } catch (error) {
      console.error("Lead registrations fetch error:", error);
      res.status(500).json({ message: "Failed to fetch lead registrations" });
    }
  });

  // ===== ABM ANALYTICS =====
  app.get("/api/analytics/abm-penetration", isAuthenticated, requireRole("ceo"), async (req, res) => {
    try {
      const penetration = await storage.getTierAAccountPenetration();
      res.json(penetration);
    } catch (error) {
      console.error("ABM penetration error:", error);
      res.status(500).json({ message: "Failed to calculate ABM penetration" });
    }
  });

  // Google Intel refresh endpoint
  app.post("/api/leads/:id/google-intel", isAuthenticated, requireRole("ceo", "sales"), async (req, res) => {
    if (!process.env.GOOGLE_MAPS_API_KEY) {
      return res.status(503).json({ 
        message: "Google Maps API not configured. Please add GOOGLE_MAPS_API_KEY." 
      });
    }

    try {
      const leadId = Number(req.params.id);
      const lead = await storage.getLead(leadId);
      if (!lead) return res.status(404).json({ message: "Lead not found" });
      
      if (!lead.projectAddress) {
        return res.status(400).json({ message: "Lead has no project address" });
      }

      console.log(`[Google Intel] Manual refresh triggered for lead ${leadId}`);
      const googleIntel = await enrichLeadWithGoogleIntel(lead.projectAddress);
      
      if (googleIntel.buildingInsights?.available || googleIntel.travelInsights?.available) {
        await storage.updateLead(leadId, { googleIntel } as any);
        console.log(`[Google Intel] Refreshed lead ${leadId} with Google data`);
        res.json({ success: true, googleIntel });
      } else {
        res.json({ success: false, message: "No Google data available for this address", googleIntel });
      }
    } catch (error: any) {
      console.error("[Google Intel] Refresh error:", error);
      res.status(500).json({ message: error.message || "Failed to refresh Google Intel" });
    }
  });

  app.post("/api/leads/:id/research", isAuthenticated, requireRole("ceo", "sales"), async (req, res) => {
    if (!process.env.AI_INTEGRATIONS_OPENAI_API_KEY || !process.env.AI_INTEGRATIONS_OPENAI_BASE_URL) {
      return res.status(503).json({ 
        message: "AI research not configured. Please enable AI integrations." 
      });
    }

    try {
      const leadId = Number(req.params.id);
      const lead = await storage.getLead(leadId);
      if (!lead) return res.status(404).json({ message: "Lead not found" });

      const { researchType } = req.body as { researchType: ResearchType };
      if (!researchType || !VALID_RESEARCH_TYPES.includes(researchType)) {
        return res.status(400).json({ 
          message: `Invalid research type. Use one of: ${VALID_RESEARCH_TYPES.join(", ")}` 
        });
      }

      let systemPrompt: string;
      let userQuery: string;

      switch (researchType) {
        case "client":
          systemPrompt = `You are a strategic sales intelligence assistant for Scan2Plan. Your goal is to harvest "High-Signal Hooks" to feed the Evidence Vault. Prioritize FIRST-PERSON AUTHORED LANGUAGE (from LinkedIn posts, bios, or interviews) over third-person company claims to detect cognitive traces of values or emotional friction.`;
          userQuery = `Research "${lead.clientName}" for strategic sales intelligence. Extract first-person phrasing (e.g., 'I believe...', 'Our team struggled...') and evaluate hooks using an Emotional Weighting Matrix (1-5).

**HIGH-SIGNAL CLIENT INTELLIGENCE**

1. **Decision Maker Profile** (CRITICAL):
   - Focus on facilities/real estate roles and their specific 'Career Inflection Points'
   - Extract LinkedIn bio language, mission statements, recent posts
   - Identify professional affiliations and certifications
   - Note ANY first-person quotes - tag with VAULT_HAS_1P_QUOTES if found

2. **Revenue Tier Classification**:
   - Revenue Tier: SMB (<$50M) / Mid-Market ($50M-$500M) / Enterprise (>$500M)
   - Evidence: Revenue figures, employee count, funding rounds, public filings
   - Funding status and capital planning indicators

3. **Strategic Tone Analysis**:
   - Communication style: Assertive / Reflective / Skeptical
   - Decision drivers: Cost-focused / Value-focused / Speed-focused
   - Emotional friction points detected in language
   - Trust signals or risk aversion indicators

4. **Evidence Hooks** (for Persona Blueprint):
   - First-person quotes with emotional weighting (1-5 scale)
   - Career trajectory and inflection points
   - Values expressed in public communications
   - Pain language and aspiration language

5. **Budget & Procurement Patterns**:
   - Procurement approach (RFP, direct award, framework)
   - Premium vendor preference vs lowest-bidder approach
   - Budget cycle timing and approval thresholds

6. **Margin Protection Summary**:
   - Recommended pricing tier: Standard / Premium / Enterprise
   - Key value propositions aligned to detected priorities
   - Red flags indicating margin risk
   - Green lights indicating premium opportunity

Format with clear sections. Tag first-person quotes prominently.`;
          break;
        
        case "property":
          if (!lead.projectAddress) {
            return res.status(400).json({ message: "No project address available for property research" });
          }
          systemPrompt = `You are an expert BIM Analyst and Scanning Cost Estimator. Your task is to identify "Phantom Revenue" opportunities and technical risks. High MEP complexity or historic status triggers specific LoD 350+ (HBIM) and LEED v5 tracking requirements.`;
          userQuery = `Analyze the property at "${lead.projectAddress}" for revenue opportunities and complexity assessment.

**PROPERTY INTELLIGENCE & PHANTOM REVENUE ANALYSIS**

1. **BOMA 2024/2025 Revenue Gaps** (CRITICAL):
   - Identify 'Qualifying Unenclosed Areas' like balconies, terraces, loading docks
   - Flag outdoor spaces that can be monetized as Rentable Area under new standards
   - Estimate phantom revenue potential (typically 2-5% of total sqft)
   - Note any covered walkways, amenity decks, or rooftop spaces

2. **MEP Complexity Score**: Low / Medium / High
   - Low: Simple residential, single-story office, minimal HVAC
   - Medium: Multi-story commercial, standard HVAC/plumbing
   - High: Hospital, data center, industrial, exposed MEP, complex routing

3. **HBIM Indicator** (Historic Building Flag):
   - Is this a 'Time Capsule' building? (Historic/Religious/Museum/Pre-1940)
   - If YES: Flag for LoD 350+ modeling requirements
   - Preservation considerations affecting scan approach
   - Heritage documentation standards applicable

4. **LEED v5 Eligibility Assessment**:
   - Does structure require carbon quantification per MRp2 prerequisites?
   - Enclosure or hardscape requiring Whole-Life Carbon reporting?
   - Existing LEED certification status
   - GWP tracking requirements for embodied carbon

5. **Building Profile**:
   - Building type and approximate square footage
   - Year built (older = hidden MEP, asbestos, heritage considerations)
   - Number of floors, ceiling types, and structural system

6. **Scanning Access & Complexity Drivers**:
   - HVAC systems complexity (rooftop, central plant, VAV)
   - Plumbing density (kitchens, medical gas, fire suppression)
   - Security restrictions or scheduling constraints
   - Ceiling heights and access requirements

7. **Pricing & Scope Recommendation**:
   - Suggested LOD/LoA level based on complexity
   - HBIM premium if applicable
   - LEED documentation add-on if applicable
   - Scope risks that could impact profitability

Format with clear headers. Flag BOMA phantom revenue and HBIM triggers prominently.`;
          break;

        case "competitor":
          systemPrompt = `You are a competitive intelligence analyst for Scan2Plan. Focus on "Service Gaps" where Scan2Plan's LoA 40/30 guarantee (0-1/8" measured accuracy) provides a dominant advantage. Identify accuracy gaps, outsourcing risks, and positioning opportunities.`;
          userQuery = `Analyze the competitive landscape in ${lead.projectAddress || lead.clientName}'s region.

**COMPETITIVE INTELLIGENCE & SERVICE GAP ANALYSIS**

1. **Direct Competitors in Region**:
   - Identify 3-5 scanning/BIM providers in this geographic area
   - Company names, size, years in business, and specializations
   - Known accuracy standards or lack thereof

2. **Accuracy Gaps** (CRITICAL for Differentiation):
   - Which competitors LACK defined LoA/LoD standards?
   - Who relies on 'Drip Line' measurement methods vs true scan-to-BIM?
   - Quality control processes (or lack thereof)
   - Do they advertise measured accuracy guarantees?

3. **Outsourcing Risk Assessment**:
   - Which competitors offshore modeling work?
   - Flag security risks of foreign data handling
   - Contrast with S2P's '100% In-House' domestic security advantage
   - IP protection concerns with outsourced workflows

4. **Pricing Intelligence**:
   - Known pricing tiers (per scan, per sqft, project-based)
   - Benchmark against S2P's 3,000 sqft minimum
   - Premium vs budget positioning
   - Volume discount patterns

5. **Service Gap Identification**:
   - What services do they NOT offer that we can?
   - Technology gaps (scanner types, software, deliverables)
   - Turnaround time and rush delivery capabilities
   - Multi-site coordination experience

6. **Win Strategy Recommendations**:
   - Specific talking points against each competitor
   - Weaknesses to exploit in proposals
   - Which competitors to avoid price racing against
   - Which compete on value where we can win at premium

Format with clear sections. Focus on ACTIONABLE service gaps that justify premium pricing.`;
          break;

        case "regulatory":
          if (!lead.projectAddress) {
            return res.status(400).json({ message: "No project address available for regulatory research" });
          }
          systemPrompt = `You are a compliance expert for Scan2Plan. Research local codes and sustainability mandates that affect modeling scope. Focus on carbon disclosure requirements and LEED v5 prerequisites that expand project scope.`;
          userQuery = `Research local codes for "${lead.projectAddress}".

**REGULATORY INTELLIGENCE & SCOPE IMPACT ANALYSIS**

1. **Carbon Disclosure Mandates** (CRITICAL - New Revenue):
   - Are there regional requirements for 'Whole-Life Carbon' reporting?
   - LEED v5 prerequisites (MRp2) applicable to this building?
   - Local Building Performance Standards (NYC LL97, Boston BERDO, etc.)
   - Embodied carbon tracking requirements for renovations

2. **ADA Compliance Requirements**:
   - Is this property subject to ADA Title III requirements?
   - Required documentation for accessibility audits
   - Modeling scope additions: door clearances, ramp slopes, restroom layouts
   - Potential for accessibility violation remediation projects

3. **Seismic & Structural Requirements**:
   - Local seismic zone classification
   - Required structural documentation for retrofitting
   - Building age and seismic upgrade mandates
   - Modeling scope: structural connections, bracing, reinforcement

4. **Fire & Life Safety Codes**:
   - Local fire marshal requirements for documentation
   - Fire suppression system documentation needs
   - Egress path modeling requirements
   - Sprinkler head location documentation

5. **Jurisdictional Specifics**:
   - Which building department has authority?
   - Permit requirements for renovation projects
   - Confirm if legal language regarding Rensselaer County jurisdiction is required
   - Known regulatory challenges in this jurisdiction

6. **Scope & Pricing Impact Summary**:
   - List each regulatory requirement with severity (Low/Medium/High)
   - Carbon/sustainability requirements that expand scope
   - Additional modeling effort each requirement creates
   - Premium pricing justifications based on compliance needs

Format with clear sections. Flag carbon disclosure mandates and HIGH-RISK items prominently.`;
          break;

        case "expansion":
          systemPrompt = `You are a strategic account researcher identifying "Asset-Centric Stewardship" opportunities. Your mission is to map the client's complete property portfolio and identify BIM Core Potential for long-term data retention relationships.`;
          userQuery = `Find other properties owned by "${lead.clientName}".

**ASSET-CENTRIC STEWARDSHIP & PORTFOLIO MAPPING**

1. **Property Portfolio Mapping**:
   - List ALL known properties owned by this client
   - Property addresses, types (office, retail, industrial, residential)
   - Approximate square footage of each property
   - Age of buildings and renovation potential

2. **Corporate Structure Analysis**:
   - Parent company and subsidiaries
   - REITs or investment vehicles they operate through
   - Property management relationships
   - Recent acquisitions (last 24 months)

3. **BIM Core Potential** (CRITICAL - Long-Term Value):
   - Flag properties requiring indefinite data retention
   - 'Representation Information' needs (sensor logs, calibration logs)
   - Digital twin candidates for 50-100 year lifecycle management
   - Properties with complex MEP requiring ongoing documentation

4. **Portfolio Growth Trajectory**:
   - Announced development projects
   - Public filings indicating capital expenditure plans
   - Market expansion into new regions
   - Lease renewal timing triggering tenant improvement projects

5. **Stewardship Opportunity Assessment**:
   - Properties likely to need renovation/documentation
   - Deferred maintenance indicators
   - ESG/sustainability reporting requirements driving documentation
   - BOMA remeasurement candidates

6. **Account Development Strategy**:
   - Entry points: Which properties should we target first?
   - Expansion path: How do we grow to portfolio-wide relationship?
   - Master Service Agreement (MSA) potential
   - Estimated Total Contract Value (TCV) if we win full portfolio

Format with clear sections. Flag BIM Core candidates prominently.`;
          break;

        case "persona":
          systemPrompt = `You are a master of Deep Empathy Narrative Mapping and Symbolic Cognition. Your goal is to extract the "Shadow Logic" behind a lead's decision patterns. Generate a Persona Blueprint using symbolic traces and archetype analysis.`;
          userQuery = `Generate a Persona Blueprint for the decision-maker(s) at "${lead.clientName}".

**PERSONA BLUEPRINT - SYMBOLIC COGNITION ANALYSIS**

1. **Decision Maker Profile**:
   - Primary contact: ${lead.contactName || 'Unknown - research key decision makers'}
   - Job title, tenure, professional background
   - LinkedIn highlights and career trajectory
   - First-person language patterns (quotes, bio phrasing)
   - Personal communication style: Formal/Casual, Data-driven/Relationship-driven

2. **Symbolic Trace Analysis** (CRITICAL):
   - Use project context as proxies for psychology
   - Example: 'LoD Upgrade request' = precision anxiety
   - Example: 'Rush timeline' = deadline pressure, risk tolerance
   - Example: 'Cost focus' = budget constraint or value skepticism
   - Identify underlying emotional drivers

3. **Archetype Selection**:
   - Select primary archetype: GUARDIAN / STRATEGIST / VISIONARY / OPERATOR / IMPLEMENTER
   - GUARDIAN: Risk-averse, values security and reliability
   - STRATEGIST: Long-term thinker, values ROI and positioning
   - VISIONARY: Innovation-focused, values cutting-edge solutions
   - OPERATOR: Efficiency-focused, values speed and simplicity
   - IMPLEMENTER: Detail-oriented, values accuracy and documentation

4. **Tonal Range & Communication Strategy**:
   - 'Greenlight Phrases' that resonate with this persona
   - 'Red Flag' aversion triggers to avoid
   - Preferred communication channel and format
   - Trust-building approach specific to archetype

5. **Escalation Path** (6-Touch Sequence):
   - Touch 1: Proof (case study, accuracy demonstration)
   - Touch 2: Credibility (credentials, certifications)
   - Touch 3: Shared Friction (acknowledge their challenge)
   - Touch 4: Solution Mapping (specific proposal)
   - Touch 5: Social Proof (testimonials, references)
   - Touch 6: Urgency (timeline, incentive)

6. **Deal Strategy Recommendations**:
   - Optimal pricing approach aligned to archetype
   - Key value propositions that resonate
   - Likely objections and counter-strategies
   - Closing triggers and urgency factors

Format with clear sections. Archetype MUST be explicitly selected with supporting evidence.`;
          break;

        case "vault":
          // Evidence Vault Generator - consolidates all research into actionable intelligence
          systemPrompt = `Activate "Persona Signal Optimized Mode". You are assembling a high-signal Evidence Vault that consolidates all gathered intelligence into a strategic sales weapon. Refactor hooks to reflect emotional or frictional language and tier-rank by signal strength.`;
          userQuery = `Process all available intelligence for "${lead.clientName}" into a consolidated Evidence Vault.

**EVIDENCE VAULT GENERATOR - CONSOLIDATED INTELLIGENCE**

Based on the lead profile:
- Client: ${lead.clientName}
- Project: ${lead.projectName || 'Not specified'}
- Address: ${lead.projectAddress || 'Not specified'}
- Contact: ${lead.contactName || 'Unknown'}
- Value: $${lead.value?.toLocaleString() || 'TBD'}
- Building Type: ${lead.buildingType || 'Unknown'}
- SQFT: ${lead.sqft?.toLocaleString() || 'Unknown'}

**GENERATE STRUCTURED EVIDENCE VAULT:**

1. **Tier 1 Hooks** (Highest Signal - First-Person Quotes):
   - Extract any first-person language from client research
   - Emotional friction points with direct quotes
   - Career inflection signals
   - Tag: VAULT_HAS_1P_QUOTES if found

2. **Tier 2 Hooks** (High Signal - Verified Facts):
   - Revenue tier classification with evidence
   - Portfolio size and growth trajectory
   - Regulatory requirements affecting scope
   - BOMA/LEED opportunities identified

3. **Tier 3 Hooks** (Supporting Intelligence):
   - Competitive landscape summary
   - MEP complexity assessment
   - Expansion potential across portfolio

4. **MetaTrace Integration** (Silent Tags):
   - persona_tone: (assertive/reflective/skeptical)
   - driver_vector: (cost/value/speed/quality)
   - surface_archetype: (GUARDIAN/STRATEGIST/VISIONARY/OPERATOR/IMPLEMENTER)
   - deal_temperature: (cold/warm/hot)

5. **Refactored Hook Titles**:
   - Transform generic titles into emotional/frictional language
   - Example: "Company Mission" → "Mission Signal: Trust Anchor"
   - Example: "Budget Concerns" → "Friction Point: Value Skepticism"

6. **Action Recommendations**:
   - Recommended pricing tier based on all intelligence
   - Key talking points for next conversation
   - Objection handling strategies
   - Optimal proposal customization priorities
   - 6-touch escalation sequence starting point

Format as a structured Evidence Vault document. Prioritize ACTIONABLE intelligence that can be used immediately in sales conversations.`;
          break;
      }

      const { summary } = await performAIResearch(systemPrompt, userQuery);

      // Extract highlights based on research type
      let highlights: string[] = [];
      const leadUpdates: Record<string, any> = {};
      
      if (researchType === "property") {
        const mepMatch = summary.match(/MEP Complexity Score:\s*(Low|Medium|High)/i);
        if (mepMatch) {
          highlights.push(`MEP: ${mepMatch[1]}`);
          // Auto-extract and save complexity score to lead
          leadUpdates.complexityScore = mepMatch[1];
        }
      }
      
      if (researchType === "client") {
        // Extract client tier from revenue/size indicators
        const tierMatch = summary.match(/(?:Revenue tier|Company size|Client tier)[:\s]*(?:\()?(\bSMB\b|\bMid-Market\b|\bEnterprise\b)/i);
        if (tierMatch) {
          leadUpdates.clientTier = tierMatch[1];
          highlights.push(`Tier: ${tierMatch[1]}`);
        }
        // Fallback: infer from revenue mentions
        if (!tierMatch) {
          if (/\b(?:large|enterprise|fortune|nasdaq|nyse|billions?)\b/i.test(summary)) {
            leadUpdates.clientTier = "Enterprise";
            highlights.push("Tier: Enterprise");
          } else if (/\b(?:mid-?market|mid-?size|series [b-z]|growth stage)\b/i.test(summary)) {
            leadUpdates.clientTier = "Mid-Market";
            highlights.push("Tier: Mid-Market");
          } else if (/\b(?:small|startup|smb|seed|early stage)\b/i.test(summary)) {
            leadUpdates.clientTier = "SMB";
            highlights.push("Tier: SMB");
          }
        }
      }
      
      if (researchType === "regulatory") {
        // Extract regulatory risks from the summary
        const risks: Array<{risk: string; severity: string; source: string}> = [];
        // Look for ADA compliance mentions
        if (/\bADA\b|accessibility|wheelchair|ramp/i.test(summary)) {
          risks.push({ risk: "ADA Compliance Required", severity: "Medium", source: "ADA" });
        }
        // Look for seismic/structural requirements
        if (/seismic|earthquake|structural.*require/i.test(summary)) {
          risks.push({ risk: "Seismic Documentation", severity: "High", source: "Seismic" });
        }
        // Look for historical preservation
        if (/histori[ca]|preservation|landmark|heritage/i.test(summary)) {
          risks.push({ risk: "Historic Preservation Restrictions", severity: "High", source: "Historic" });
        }
        // Look for fire safety
        if (/fire.*code|sprinkler|fire.*suppression|fire.*safety/i.test(summary)) {
          risks.push({ risk: "Fire Code Documentation", severity: "Medium", source: "Fire Code" });
        }
        // Look for environmental concerns
        if (/asbestos|lead paint|environmental|hazardous/i.test(summary)) {
          risks.push({ risk: "Environmental Hazards", severity: "High", source: "Environmental" });
        }
        if (risks.length > 0) {
          leadUpdates.regulatoryRisks = risks;
          highlights.push(`Risks: ${risks.length} identified`);
        }
      }
      
      // Update lead with AI-extracted insights if any were found
      if (Object.keys(leadUpdates).length > 0) {
        leadUpdates.aiInsightsUpdatedAt = new Date();
        await storage.updateLead(leadId, leadUpdates);
      }

      // Save research to database
      const research = await storage.createLeadResearch({
        leadId,
        researchType,
        summary,
        citations: JSON.stringify([]),
        highlights: highlights.length > 0 ? JSON.stringify(highlights) : null,
        rawResponse: null,
      });

      res.json(research);
    } catch (error) {
      console.error("Deep research error:", error);
      res.status(500).json({ message: "Failed to perform research" });
    }
  });

  // === CPQ QUOTE VERSIONS (Version History) ===
  // Get all quote versions for a lead
  app.get("/api/leads/:id/quote-versions", isAuthenticated, requireRole("ceo", "sales"), async (req, res) => {
    try {
      const leadId = Number(req.params.id);
      const versions = await storage.getQuoteVersions(leadId);
      res.json(versions);
    } catch (error) {
      console.error("Quote versions fetch error:", error);
      res.status(500).json({ message: "Failed to fetch quote versions" });
    }
  });

  // Create a new quote version (called when starting a new version edit)
  app.post("/api/leads/:id/quote-versions", isAuthenticated, requireRole("ceo", "sales"), async (req, res) => {
    try {
      const leadId = Number(req.params.id);
      const lead = await storage.getLead(leadId);
      if (!lead) return res.status(404).json({ message: "Lead not found" });

      const nextVersion = await storage.getNextVersionNumber(leadId);
      const user = req.user as any;
      
      const version = await storage.createQuoteVersion({
        leadId,
        versionNumber: nextVersion,
        cpqQuoteId: req.body.cpqQuoteId || null,
        quoteUrl: req.body.quoteUrl || null,
        priceSnapshot: req.body.priceSnapshot || null,
        summary: req.body.summary || `Version ${nextVersion} created`,
        createdBy: user?.claims?.email || user?.username || "unknown",
      });

      // Update lead with latest version info
      await storage.updateLead(leadId, {
        quoteVersion: nextVersion,
        quoteUrl: req.body.quoteUrl || lead.quoteUrl,
      });

      res.status(201).json(version);
    } catch (error) {
      console.error("Quote version creation error:", error);
      res.status(500).json({ message: "Failed to create quote version" });
    }
  });

  // Update a quote version (called by CPQ callback with price snapshot)
  app.patch("/api/leads/:id/quote-versions/:versionId", isAuthenticated, requireRole("ceo", "sales"), async (req, res) => {
    try {
      const leadId = Number(req.params.id);
      const versionId = Number(req.params.versionId);
      
      const version = await storage.getQuoteVersion(versionId);
      if (!version || version.leadId !== leadId) {
        return res.status(404).json({ message: "Quote version not found" });
      }

      const updated = await storage.updateQuoteVersion(versionId, {
        cpqQuoteId: req.body.cpqQuoteId ?? version.cpqQuoteId,
        quoteUrl: req.body.quoteUrl ?? version.quoteUrl,
        priceSnapshot: req.body.priceSnapshot ?? version.priceSnapshot,
        summary: req.body.summary ?? version.summary,
      });

      // If this is the latest version, update lead's quoteUrl
      const lead = await storage.getLead(leadId);
      if (lead && lead.quoteVersion === version.versionNumber && req.body.quoteUrl) {
        await storage.updateLead(leadId, { quoteUrl: req.body.quoteUrl });
      }

      res.json(updated);
    } catch (error) {
      console.error("Quote version update error:", error);
      res.status(500).json({ message: "Failed to update quote version" });
    }
  });

  // === RESEARCH INSIGHTS (CEO only) - Analyze accumulated research data ===
  app.get("/api/research/insights", isAuthenticated, requireRole("ceo"), async (req, res) => {
    try {
      const allResearch = await storage.getAllResearch();
      const leads = await storage.getLeads();
      
      if (allResearch.length === 0) {
        return res.json({
          totalResearchCount: 0,
          clientsResearched: 0,
          researchByType: {
            client: 0,
            property: 0,
            competitor: 0,
            regulatory: 0,
            expansion: 0,
          },
          insights: "No research data available yet. Research will accumulate as you analyze clients and properties.",
          generatedAt: new Date().toISOString()
        });
      }

      // Build research summary for AI analysis
      const researchSummary = allResearch.slice(0, 20).map(r => {
        const lead = leads.find(l => l.id === r.leadId);
        return {
          client: lead?.clientName || "Unknown",
          type: r.researchType,
          summary: r.summary?.substring(0, 500) || ""
        };
      });

      const systemPrompt = `You are a strategic business analyst for a laser scanning and BIM services company. Analyze the accumulated client research data and provide actionable insights for the CEO.`;
      
      const userQuery = `Analyze this accumulated research data from our sales pipeline:

${JSON.stringify(researchSummary, null, 2)}

Provide:
1. **Key Patterns**: What trends do you see across clients? (industry types, company sizes, budget indicators)
2. **Pricing Insights**: Based on client profiles, where can we command premium pricing vs. where should we be cautious?
3. **Market Opportunities**: What types of clients or projects seem most promising?
4. **Risk Factors**: Any red flags or concerning patterns to watch for?
5. **Recommendations**: 3-5 actionable recommendations to improve win rates and margins.

Be specific and reference actual client data where relevant.`;

      const { summary } = await performAIResearch(systemPrompt, userQuery);

      res.json({
        totalResearchCount: allResearch.length,
        clientsResearched: new Set(allResearch.map(r => r.leadId)).size,
        researchByType: {
          client: allResearch.filter(r => r.researchType === "client").length,
          property: allResearch.filter(r => r.researchType === "property").length,
          competitor: allResearch.filter(r => r.researchType === "competitor").length,
          regulatory: allResearch.filter(r => r.researchType === "regulatory").length,
          expansion: allResearch.filter(r => r.researchType === "expansion").length,
        },
        insights: summary,
        generatedAt: new Date().toISOString()
      });
    } catch (error) {
      console.error("Research insights error:", error);
      res.status(500).json({ message: "Failed to generate insights" });
    }
  });

  // === AUDIO TRANSCRIPTION (Whisper) ===
  app.post("/api/field-notes/transcribe", upload.single("audio"), async (req, res) => {
    if (!req.file) {
      return res.status(400).json({ message: "No audio file provided" });
    }

    try {
      const audioFile = fs.createReadStream(req.file.path);
      
      const transcription = await openai.audio.transcriptions.create({
        file: audioFile,
        model: "whisper-1",
      });

      fs.unlinkSync(req.file.path);

      res.json({ transcript: transcription.text });
    } catch (error) {
      console.error("Transcription error:", error);
      if (req.file?.path) fs.unlinkSync(req.file.path);
      res.status(500).json({ message: "Failed to transcribe audio" });
    }
  });

  // === AI ASSISTANT ROUTES ===
  
  // Natural language pipeline query
  app.post("/api/ai/query", isAuthenticated, async (req, res) => {
    try {
      const { question } = req.body;
      if (!question) {
        return res.status(400).json({ message: "Question is required" });
      }

      const leads = await storage.getLeads();
      const projects = await storage.getProjects();

      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `You are an AI assistant for a laser scanning and BIM company CEO. You have access to the company's sales pipeline and project data.

Current Pipeline Data:
${JSON.stringify(leads.map(l => ({
  id: l.id,
  client: l.clientName,
  project: l.projectName,
  address: l.projectAddress,
  value: l.value,
  stage: l.dealStage,
  probability: l.probability,
  sqft: l.sqft,
  buildingType: l.buildingType,
  lastContact: l.lastContactDate,
  source: l.leadSource
})), null, 2)}

Current Projects:
${JSON.stringify(projects.map(p => ({
  id: p.id,
  name: p.name,
  status: p.status,
  priority: p.priority,
  progress: p.progress,
  dueDate: p.dueDate
})), null, 2)}

Answer questions about the pipeline, provide insights, and help with analysis. Be concise and actionable. Use specific numbers and names when relevant.`
          },
          { role: "user", content: question }
        ],
      });

      res.json({ answer: completion.choices[0].message.content });
    } catch (error) {
      console.error("AI query error:", error);
      res.status(500).json({ message: "Failed to process AI query" });
    }
  });

  // Generate quote description for a lead
  app.post("/api/ai/generate-description/:leadId", isAuthenticated, async (req, res) => {
    try {
      const lead = await storage.getLead(Number(req.params.leadId));
      if (!lead) return res.status(404).json({ message: "Lead not found" });

      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `You are a professional estimator for a laser scanning and BIM services company. Generate a concise, professional scope of work description based on the project details provided. Keep it to 2-3 sentences.`
          },
          {
            role: "user",
            content: `Generate a quote description for:
Client: ${lead.clientName}
Project: ${lead.projectName || lead.projectAddress}
Building Type: ${lead.buildingType || 'Not specified'}
Square Footage: ${lead.sqft ? lead.sqft.toLocaleString() + ' sqft' : 'Not specified'}
Scope: ${lead.scope || 'Not specified'}
Disciplines: ${lead.disciplines || 'Not specified'}
BIM Deliverable: ${lead.bimDeliverable || 'Not specified'}
Timeline: ${lead.timeline || 'Not specified'}`
          }
        ],
      });

      res.json({ description: completion.choices[0].message.content });
    } catch (error) {
      console.error("AI generate description error:", error);
      res.status(500).json({ message: "Failed to generate description" });
    }
  });

  // Suggest probability based on deal details
  app.post("/api/ai/suggest-probability/:leadId", isAuthenticated, async (req, res) => {
    try {
      const lead = await storage.getLead(Number(req.params.leadId));
      if (!lead) return res.status(404).json({ message: "Lead not found" });

      const allLeads = await storage.getLeads();
      const closedWonLeads = allLeads.filter(l => l.dealStage === 'Closed Won');

      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `You are a sales analyst. Suggest a win probability (0-100) for a deal based on its characteristics. Consider factors like:
- Deal stage (New=10%, Contacted=25%, Proposal=50%, Negotiation=75%)
- Days since last contact (stale deals have lower probability)
- Deal value (very large deals may take longer)
- Whether there's a quote attached
- Building type and scope completeness

Historical context - Past won deals:
${JSON.stringify(closedWonLeads.slice(0, 5).map(l => ({
  value: l.value,
  buildingType: l.buildingType,
  sqft: l.sqft
})))}

Return ONLY a JSON object: {"probability": <number>, "reasoning": "<brief explanation>"}`
          },
          {
            role: "user",
            content: `Analyze this deal:
Stage: ${lead.dealStage}
Value: $${Number(lead.value).toLocaleString()}
Last Contact: ${lead.lastContactDate ? new Date(lead.lastContactDate).toLocaleDateString() : 'Never'}
Has Quote: ${lead.quoteNumber ? 'Yes' : 'No'}
Building Type: ${lead.buildingType || 'Unknown'}
Square Footage: ${lead.sqft || 'Unknown'}
Scope: ${lead.scope || 'Not defined'}
Source: ${lead.leadSource || 'Unknown'}`
          }
        ],
      });

      const content = completion.choices[0].message.content || '';
      try {
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const result = JSON.parse(jsonMatch[0]);
          res.json(result);
        } else {
          res.json({ probability: lead.probability || 50, reasoning: content });
        }
      } catch {
        res.json({ probability: lead.probability || 50, reasoning: content });
      }
    } catch (error) {
      console.error("AI suggest probability error:", error);
      res.status(500).json({ message: "Failed to suggest probability" });
    }
  });

  // Draft follow-up email for stale leads
  app.post("/api/ai/draft-email/:leadId", isAuthenticated, async (req, res) => {
    try {
      const lead = await storage.getLead(Number(req.params.leadId));
      if (!lead) return res.status(404).json({ message: "Lead not found" });

      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `You are a professional salesperson for a laser scanning and BIM services company called Scan2Plan. Write a friendly, professional follow-up email to re-engage a prospect. Keep it short (3-4 sentences), personalized, and include a clear call to action.`
          },
          {
            role: "user",
            content: `Write a follow-up email for:
Contact: ${lead.contactName || 'the team'}
Company: ${lead.clientName}
Project: ${lead.projectName || lead.projectAddress}
Last Stage: ${lead.dealStage}
Value: $${Number(lead.value).toLocaleString()}
${lead.quoteNumber ? `Quote #: ${lead.quoteNumber}` : 'No quote sent yet'}
Notes: ${lead.notes || 'None'}`
          }
        ],
      });

      res.json({ email: completion.choices[0].message.content });
    } catch (error) {
      console.error("AI draft email error:", error);
      res.status(500).json({ message: "Failed to draft email" });
    }
  });

  // Predictive insights for dashboard
  app.get("/api/ai/insights", isAuthenticated, async (req, res) => {
    try {
      const leads = await storage.getLeads();
      const projects = await storage.getProjects();

      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `You are a business intelligence analyst. Analyze the sales pipeline and provide 3-4 actionable insights. Focus on:
- Deals likely to close soon
- Stale deals needing attention
- Revenue at risk
- Opportunities for growth

Return a JSON array of insights: [{"type": "opportunity|warning|info", "title": "...", "description": "...", "dealIds": [optional array of related lead IDs]}]`
          },
          {
            role: "user",
            content: `Analyze this pipeline:
Leads: ${JSON.stringify(leads.map(l => ({
  id: l.id,
  client: l.clientName,
  value: l.value,
  stage: l.dealStage,
  probability: l.probability,
  lastContact: l.lastContactDate,
  hasQuote: !!l.quoteNumber
})))}

Projects: ${JSON.stringify(projects.map(p => ({
  name: p.name,
  status: p.status,
  progress: p.progress
})))}`
          }
        ],
      });

      const content = completion.choices[0].message.content || '[]';
      try {
        const jsonMatch = content.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          res.json({ insights: JSON.parse(jsonMatch[0]) });
        } else {
          res.json({ insights: [] });
        }
      } catch {
        res.json({ insights: [] });
      }
    } catch (error) {
      console.error("AI insights error:", error);
      res.status(500).json({ message: "Failed to generate insights" });
    }
  });

  // === SETTINGS ROUTES (Protected - require authentication) ===
  app.get("/api/settings", isAuthenticated, async (req, res) => {
    const allSettings = await storage.getAllSettings();
    const settingsMap: Record<string, unknown> = {};
    for (const s of allSettings) {
      settingsMap[s.key] = s.value;
    }
    res.json(settingsMap);
  });

  app.get("/api/settings/:key", isAuthenticated, async (req, res) => {
    const setting = await storage.getSetting(req.params.key);
    if (!setting) {
      return res.status(404).json({ message: "Setting not found" });
    }
    res.json(setting.value);
  });

  app.put("/api/settings/:key", isAuthenticated, async (req, res) => {
    try {
      const { value } = req.body;
      if (value === undefined) {
        return res.status(400).json({ message: "Value is required" });
      }
      const setting = await storage.setSetting(req.params.key, value);
      res.json(setting);
    } catch (error) {
      console.error("Settings update error:", error);
      res.status(500).json({ message: "Failed to update setting" });
    }
  });

  // === INTEGRATION STATUS ENDPOINT (Protected) ===
  app.get("/api/integrations/status", isAuthenticated, async (req, res) => {
    res.json({
      airtable: {
        configured: isAirtableConfigured(),
        writeEnabled: AIRTABLE_WRITE_ENABLED,
      },
      cpq: {
        configured: !!process.env.CPQ_API_KEY,
        baseUrl: "https://cpq.scan2plan.dev",
      },
      openai: {
        configured: !!process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
      },
      google: {
        gmail: !!process.env.REPLIT_CONNECTORS_HOSTNAME,
        calendar: !!process.env.REPLIT_CONNECTORS_HOSTNAME,
        drive: !!process.env.REPLIT_CONNECTORS_HOSTNAME,
      },
    });
  });

  // === GOOGLE WORKSPACE ROUTES (Protected) ===

  // Gmail: List recent emails
  app.get("/api/google/gmail/messages", isAuthenticated, async (req, res) => {
    try {
      const gmail = await getGmailClient();
      const maxResults = Number(req.query.maxResults) || 10;
      const q = req.query.q as string || '';
      
      const response = await gmail.users.messages.list({
        userId: 'me',
        maxResults,
        q,
      });

      // Fetch full message details for each
      const messages = await Promise.all(
        (response.data.messages || []).map(async (msg) => {
          const full = await gmail.users.messages.get({
            userId: 'me',
            id: msg.id!,
            format: 'metadata',
            metadataHeaders: ['From', 'To', 'Subject', 'Date'],
          });
          const headers = full.data.payload?.headers || [];
          return {
            id: msg.id,
            threadId: msg.threadId,
            snippet: full.data.snippet,
            from: headers.find(h => h.name === 'From')?.value,
            to: headers.find(h => h.name === 'To')?.value,
            subject: headers.find(h => h.name === 'Subject')?.value,
            date: headers.find(h => h.name === 'Date')?.value,
          };
        })
      );

      res.json({ messages });
    } catch (error: any) {
      console.error("Gmail list error:", error);
      res.status(500).json({ message: error.message || "Failed to fetch emails" });
    }
  });

  // Gmail: Send email
  app.post("/api/google/gmail/send", isAuthenticated, async (req, res) => {
    try {
      const gmail = await getGmailClient();
      const { to, subject, body } = req.body;

      if (!to || !subject || !body) {
        return res.status(400).json({ message: "to, subject, and body are required" });
      }

      // Create RFC 2822 formatted email
      const email = [
        `To: ${to}`,
        `Subject: ${subject}`,
        'Content-Type: text/plain; charset=utf-8',
        '',
        body,
      ].join('\r\n');

      const encodedEmail = Buffer.from(email).toString('base64url');

      const response = await gmail.users.messages.send({
        userId: 'me',
        requestBody: { raw: encodedEmail },
      });

      res.json({ messageId: response.data.id, threadId: response.data.threadId });
    } catch (error: any) {
      console.error("Gmail send error:", error);
      res.status(500).json({ message: error.message || "Failed to send email" });
    }
  });

  // Calendar: List upcoming events
  app.get("/api/google/calendar/events", isAuthenticated, async (req, res) => {
    try {
      const calendar = await getCalendarClient();
      const maxResults = Number(req.query.maxResults) || 10;
      const timeMin = req.query.timeMin as string || new Date().toISOString();

      const response = await calendar.events.list({
        calendarId: 'primary',
        timeMin,
        maxResults,
        singleEvents: true,
        orderBy: 'startTime',
      });

      const events = (response.data.items || []).map(event => ({
        id: event.id,
        summary: event.summary,
        description: event.description,
        location: event.location,
        start: event.start?.dateTime || event.start?.date,
        end: event.end?.dateTime || event.end?.date,
        htmlLink: event.htmlLink,
      }));

      res.json({ events });
    } catch (error: any) {
      console.error("Calendar list error:", error);
      res.status(500).json({ message: error.message || "Failed to fetch calendar events" });
    }
  });

  // Calendar: Create event
  app.post("/api/google/calendar/events", isAuthenticated, async (req, res) => {
    try {
      const calendar = await getCalendarClient();
      const { summary, description, location, start, end } = req.body;

      if (!summary || !start || !end) {
        return res.status(400).json({ message: "summary, start, and end are required" });
      }

      const response = await calendar.events.insert({
        calendarId: 'primary',
        requestBody: {
          summary,
          description,
          location,
          start: { dateTime: start },
          end: { dateTime: end },
        },
      });

      res.json({
        id: response.data.id,
        summary: response.data.summary,
        htmlLink: response.data.htmlLink,
      });
    } catch (error: any) {
      console.error("Calendar create error:", error);
      res.status(500).json({ message: error.message || "Failed to create event" });
    }
  });

  // Drive: List files
  app.get("/api/google/drive/files", isAuthenticated, async (req, res) => {
    try {
      const drive = await getDriveClient();
      const pageSize = Number(req.query.pageSize) || 10;
      const q = req.query.q as string || '';

      const response = await drive.files.list({
        pageSize,
        q: q || undefined,
        fields: 'files(id, name, mimeType, modifiedTime, webViewLink, iconLink)',
      });

      res.json({ files: response.data.files || [] });
    } catch (error: any) {
      console.error("Drive list error:", error);
      res.status(500).json({ message: error.message || "Failed to list files" });
    }
  });

  // Drive: Upload file (for project documents)
  app.post("/api/google/drive/upload", isAuthenticated, upload.single("file"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file provided" });
      }

      const drive = await getDriveClient();
      const { name, folderId } = req.body;

      const response = await drive.files.create({
        requestBody: {
          name: name || req.file.originalname,
          parents: folderId ? [folderId] : undefined,
        },
        media: {
          mimeType: req.file.mimetype,
          body: fs.createReadStream(req.file.path),
        },
        fields: 'id, name, webViewLink',
      });

      // Cleanup temp file
      fs.unlinkSync(req.file.path);

      res.json({
        id: response.data.id,
        name: response.data.name,
        webViewLink: response.data.webViewLink,
      });
    } catch (error: any) {
      console.error("Drive upload error:", error);
      if (req.file?.path) fs.unlinkSync(req.file.path);
      res.status(500).json({ message: error.message || "Failed to upload file" });
    }
  });

  // === QUICKBOOKS INTEGRATION ===
  
  // Check QuickBooks connection status
  app.get("/api/quickbooks/status", isAuthenticated, requireRole("ceo"), async (req, res) => {
    try {
      const configured = quickbooksClient.isConfigured();
      const connected = configured ? await quickbooksClient.isConnected() : false;
      const config = quickbooksClient.getConfig();
      const realmId = connected ? await quickbooksClient.getRealmId() : null;
      res.json({ configured, connected, ...config, realmId });
    } catch (error: any) {
      res.json({ configured: quickbooksClient.isConfigured(), connected: false });
    }
  });

  // Get QuickBooks estimate URL for a lead
  app.get("/api/quickbooks/estimate-url/:leadId", isAuthenticated, requireRole("ceo", "sales"), async (req, res) => {
    try {
      const leadId = Number(req.params.leadId);
      const lead = await storage.getLead(leadId);
      if (!lead) return res.status(404).json({ message: "Lead not found" });
      
      // Check if QBO is connected (requires both token and realmId)
      const isConnected = await quickbooksClient.isConnected();
      const realmId = isConnected ? await quickbooksClient.getRealmId() : null;
      
      // Treat missing realmId as disconnected
      if (!isConnected || !realmId) {
        return res.json({ url: null, connected: false, estimateId: lead.qboEstimateId, estimateNumber: lead.qboEstimateNumber });
      }
      
      if (!lead.qboEstimateId) return res.json({ url: null, connected: true });
      
      const url = quickbooksClient.getEstimateUrl(lead.qboEstimateId, realmId);
      res.json({ url, connected: true, estimateId: lead.qboEstimateId, estimateNumber: lead.qboEstimateNumber });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Initiate QuickBooks OAuth flow
  app.get("/api/quickbooks/auth", isAuthenticated, requireRole("ceo"), (req, res) => {
    if (!quickbooksClient.isConfigured()) {
      return res.status(400).json({ message: "QuickBooks credentials not configured" });
    }
    const state = crypto.randomBytes(16).toString("hex");
    // Store state in session for validation
    (req.session as any).qbState = state;
    const authUrl = quickbooksClient.getAuthUrl(state);
    res.json({ authUrl });
  });

  // QuickBooks OAuth callback
  app.get("/api/quickbooks/callback", async (req, res) => {
    try {
      const { code, state, realmId } = req.query;
      
      if (!code || !realmId) {
        return res.redirect("/settings?qb_error=missing_params");
      }

      // Validate state parameter to prevent CSRF attacks
      const expectedState = (req.session as any).qbState;
      if (!state || state !== expectedState) {
        console.error("QuickBooks OAuth state mismatch - possible CSRF attempt");
        return res.redirect("/settings?qb_error=invalid_state");
      }
      
      // Clear the state from session after validation
      delete (req.session as any).qbState;

      await quickbooksClient.exchangeCodeForTokens(code as string, realmId as string);
      res.redirect("/settings?qb_connected=true");
    } catch (error: any) {
      console.error("QuickBooks callback error:", error);
      res.redirect(`/settings?qb_error=${encodeURIComponent(error.message)}`);
    }
  });

  // Disconnect QuickBooks
  app.post("/api/quickbooks/disconnect", isAuthenticated, requireRole("ceo"), async (req, res) => {
    try {
      await quickbooksClient.disconnect();
      res.json({ message: "QuickBooks disconnected" });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Sync expenses from QuickBooks
  app.post("/api/quickbooks/sync", isAuthenticated, requireRole("ceo"), async (req, res) => {
    try {
      const result = await quickbooksClient.syncExpenses();
      res.json(result);
    } catch (error: any) {
      // Check for token expiry or auth errors and provide helpful message
      const errorMessage = error.message || "Sync failed";
      if (errorMessage.includes("401") || errorMessage.includes("expired") || errorMessage.includes("not connected")) {
        res.status(401).json({ message: "QuickBooks authentication expired. Please reconnect.", needsReauth: true });
      } else {
        res.status(500).json({ message: errorMessage });
      }
    }
  });

  // Get QuickBooks accounts for "Profit First" mapping UI
  app.get("/api/quickbooks/accounts", isAuthenticated, requireRole("ceo"), async (req, res) => {
    try {
      const accounts = await quickbooksClient.getAccounts();
      const bankAccounts = accounts.filter(a => a.type === "Bank");
      const creditCardAccounts = accounts.filter(a => a.type === "Credit Card");
      const allAccounts = accounts;
      res.json({ bankAccounts, creditCardAccounts, allAccounts });
    } catch (error: any) {
      const errorMessage = error.message || "Failed to fetch accounts";
      if (errorMessage.includes("not connected")) {
        res.status(401).json({ message: "QuickBooks not connected", needsReauth: true });
      } else {
        res.status(500).json({ message: errorMessage });
      }
    }
  });

  // Get financial mapping settings
  app.get("/api/settings/financial-mapping", isAuthenticated, requireRole("ceo"), async (req, res) => {
    try {
      const result = await db.select().from(settings).where(eq(settings.key, "financial_mapping")).limit(1);
      if (result.length === 0) {
        return res.json({ operatingAccountId: null, taxAccountId: null, expenseAccountId: null });
      }
      res.json(result[0].value);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Save financial mapping settings
  const financialMappingSchema = z.object({
    operatingAccountId: z.string().min(1, "Operating account is required").nullable(),
    taxAccountId: z.string().min(1, "Tax account is required").nullable(),
    expenseAccountId: z.string().nullable().optional(),
  });

  app.post("/api/settings/financial-mapping", isAuthenticated, requireRole("ceo"), async (req, res) => {
    try {
      const parsed = financialMappingSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ 
          message: "Invalid mapping data", 
          errors: parsed.error.errors 
        });
      }

      const { operatingAccountId, taxAccountId, expenseAccountId } = parsed.data;
      const mapping = { 
        operatingAccountId: operatingAccountId || null, 
        taxAccountId: taxAccountId || null, 
        expenseAccountId: expenseAccountId || null 
      };

      const existing = await db.select().from(settings).where(eq(settings.key, "financial_mapping")).limit(1);
      
      if (existing.length > 0) {
        await db.update(settings)
          .set({ value: mapping, updatedAt: new Date() })
          .where(eq(settings.key, "financial_mapping"));
      } else {
        await db.insert(settings).values({ key: "financial_mapping", value: mapping });
      }

      res.json({ message: "Financial mapping saved", mapping });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Sync financial metrics (operating cash, tax reserve, revenue MTD)
  app.get("/api/quickbooks/financial-metrics", isAuthenticated, requireRole("ceo"), async (req, res) => {
    try {
      // Get the saved mapping
      const mappingResult = await db.select().from(settings).where(eq(settings.key, "financial_mapping")).limit(1);
      const mapping = mappingResult.length > 0 
        ? (mappingResult[0].value as { operatingAccountId?: string; taxAccountId?: string })
        : {};

      const metrics = await quickbooksClient.syncFinancialMetrics(mapping);
      res.json(metrics);
    } catch (error: any) {
      const errorMessage = error.message || "Failed to sync metrics";
      if (errorMessage.includes("not connected")) {
        res.status(401).json({ message: "QuickBooks not connected", needsReauth: true });
      } else {
        res.status(500).json({ message: errorMessage });
      }
    }
  });

  // Get all synced expenses (CEO only - financial data)
  app.get("/api/expenses", isAuthenticated, requireRole("ceo"), async (req, res) => {
    try {
      const expenses = await quickbooksClient.getExpenses();
      res.json(expenses);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Get expenses for a specific lead (CEO only - financial data)
  app.get("/api/leads/:id/expenses", isAuthenticated, requireRole("ceo"), async (req, res) => {
    try {
      const leadId = parseInt(req.params.id);
      const expenses = await quickbooksClient.getExpensesByLead(leadId);
      const summary = await quickbooksClient.getExpenseSummaryByLead(leadId);
      res.json({ expenses, summary });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Link expense to a lead (CEO only - financial data)
  app.patch("/api/expenses/:id/link", isAuthenticated, requireRole("ceo"), async (req, res) => {
    try {
      const expenseId = parseInt(req.params.id);
      const { leadId, projectId } = req.body;
      
      let expense;
      if (leadId !== undefined) {
        expense = await quickbooksClient.linkExpenseToLead(expenseId, leadId);
      }
      if (projectId !== undefined) {
        expense = await quickbooksClient.linkExpenseToProject(expenseId, projectId);
      }
      
      res.json(expense);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // === FIELD EXPENSES (Production Tech Entry) ===
  const fieldExpenseSchema = z.object({
    category: z.enum(["Parking", "Tolls", "Fuel", "Meals", "Hotel", "Equipment Rental", "Supplies", "Other"]),
    amount: z.number().positive("Amount must be positive"),
    description: z.string().optional(),
    vendorName: z.string().optional(),
  });

  // Create field expense for a project
  app.post("/api/projects/:projectId/expenses", isAuthenticated, requireRole("production", "ceo"), async (req, res) => {
    try {
      const projectId = parseInt(req.params.projectId);
      const user = req.user as any;
      
      const parsed = fieldExpenseSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: parsed.error.errors[0]?.message || "Invalid expense data" });
      }
      
      const { category, amount, description, vendorName } = parsed.data;

      const expense = await db.insert(expenses).values({
        projectId,
        techId: user.id,
        category,
        amount: amount.toString(),
        description: description || null,
        vendorName: vendorName || null,
        source: "field",
        isBillable: true,
        expenseDate: new Date(),
      }).returning();

      res.status(201).json(expense[0]);
    } catch (error: any) {
      console.error("Error creating field expense:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Get expenses for a project (for Field Hub view - today's expenses only)
  app.get("/api/projects/:projectId/expenses", isAuthenticated, async (req, res) => {
    try {
      const projectId = parseInt(req.params.projectId);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      const projectExpenses = await db.select().from(expenses).where(
        and(
          eq(expenses.projectId, projectId),
          gte(expenses.expenseDate, today),
          lt(expenses.expenseDate, tomorrow)
        )
      );
      res.json(projectExpenses);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // === MISSION LOGS (Four-Point Logistics Tracker) ===
  // Get or create today's mission log for a project
  app.get("/api/projects/:projectId/mission-log", isAuthenticated, async (req, res) => {
    try {
      const projectId = parseInt(req.params.projectId);
      const user = req.user as any;
      const techId = user?.claims?.sub || user?.id?.toString();
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      // Find today's mission log for this project and tech
      const existing = await db.select().from(missionLogs).where(
        and(
          eq(missionLogs.projectId, projectId),
          eq(missionLogs.techId, techId),
          gte(missionLogs.missionDate, today),
          lt(missionLogs.missionDate, tomorrow)
        )
      );

      if (existing.length > 0) {
        res.json(existing[0]);
      } else {
        // No mission log for today, return null
        res.json(null);
      }
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Create a new mission log (optionally with Start Travel timestamp)
  app.post("/api/projects/:projectId/mission-log", isAuthenticated, requireRole("production", "ceo"), async (req, res) => {
    try {
      const projectId = parseInt(req.params.projectId);
      const user = req.user as any;
      const techId = user?.claims?.sub || user?.id?.toString();
      const { startTravel } = req.body; // If true, also record Start Travel timestamp

      if (!techId) {
        return res.status(400).json({ message: "Unable to determine technician ID" });
      }

      const missionLog = await db.insert(missionLogs).values({
        projectId,
        techId,
        missionDate: new Date(),
        status: "in_progress",
        startTravelTime: startTravel ? new Date() : null,
        startTravelManual: startTravel ? false : null,
      }).returning();

      res.status(201).json(missionLog[0]);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Update mission log timestamp
  app.patch("/api/mission-logs/:id", isAuthenticated, requireRole("production", "ceo"), async (req, res) => {
    try {
      const missionLogId = parseInt(req.params.id);
      const { field, time, manual } = req.body;

      // Validate field name
      const validFields = ["startTravelTime", "arriveSiteTime", "leaveSiteTime", "arriveHomeTime"];
      if (!validFields.includes(field)) {
        return res.status(400).json({ message: "Invalid timestamp field" });
      }

      // Build update object
      const updateData: any = {
        [field]: time ? new Date(time) : new Date(),
        [`${field.replace("Time", "Manual")}`]: manual || false,
        updatedAt: new Date(),
      };

      // Calculate durations if we have the necessary timestamps
      const existingLog = await db.select().from(missionLogs).where(eq(missionLogs.id, missionLogId));
      if (existingLog.length > 0) {
        const log = existingLog[0];
        const updatedLog = { ...log, ...updateData };

        // Calculate travel duration (outbound + return)
        if (updatedLog.startTravelTime && updatedLog.arriveSiteTime && updatedLog.leaveSiteTime && updatedLog.arriveHomeTime) {
          const outboundMinutes = Math.floor((new Date(updatedLog.arriveSiteTime).getTime() - new Date(updatedLog.startTravelTime).getTime()) / 60000);
          const returnMinutes = Math.floor((new Date(updatedLog.arriveHomeTime).getTime() - new Date(updatedLog.leaveSiteTime).getTime()) / 60000);
          updateData.travelDurationMinutes = outboundMinutes + returnMinutes;
        }

        // Calculate scanning duration
        if (updatedLog.arriveSiteTime && updatedLog.leaveSiteTime) {
          const scanningMinutes = Math.floor((new Date(updatedLog.leaveSiteTime).getTime() - new Date(updatedLog.arriveSiteTime).getTime()) / 60000);
          updateData.scanningDurationMinutes = scanningMinutes;
        }

        // Check if all timestamps are filled to mark as completed
        if (updatedLog.startTravelTime && updatedLog.arriveSiteTime && updatedLog.leaveSiteTime && updatedLog.arriveHomeTime) {
          updateData.status = "completed";
        }
      }

      const updated = await db.update(missionLogs)
        .set(updateData)
        .where(eq(missionLogs.id, missionLogId))
        .returning();

      res.json(updated[0]);
    } catch (error: any) {
      console.error("Error updating mission log:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // === DATA HANDOVER (Multi-file Upload to Drive with PM Notification) ===
  const handoverUpload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 500 * 1024 * 1024 }, // 500MB limit for video files
  });

  app.post("/api/projects/:projectId/data-handover", isAuthenticated, requireRole("production", "ceo"), handoverUpload.array("files", 50), async (req, res) => {
    try {
      const projectId = parseInt(req.params.projectId);
      const project = await storage.getProject(projectId);
      const user = req.user as any;
      const techName = user?.firstName || user?.username || "Technician";
      
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      if (!project.driveFolderId || !project.driveSubfolders) {
        return res.status(400).json({ message: "Project does not have a Google Drive folder" });
      }

      const files = req.files as Express.Multer.File[];
      if (!files || files.length === 0) {
        return res.status(400).json({ message: "No files uploaded" });
      }

      // Parse area descriptions from form data (JSON array)
      const areaDescriptions: string[] = req.body.areaDescriptions ? 
        (typeof req.body.areaDescriptions === 'string' ? JSON.parse(req.body.areaDescriptions) : req.body.areaDescriptions) : 
        [];

      // Parse driveSubfolders if it's stored as JSON string
      const subfolders = typeof project.driveSubfolders === 'string' 
        ? JSON.parse(project.driveSubfolders) 
        : project.driveSubfolders as { fieldCapture?: string };
      const targetFolder = subfolders?.fieldCapture || project.driveFolderId;
      const universalId = project.universalProjectId || `PROJ-${projectId}`;

      // Helper to sanitize area description for safe filename
      const sanitizeFilename = (str: string): string => {
        return str.replace(/[^a-zA-Z0-9_-]/g, "_").substring(0, 50);
      };

      const uploadedFiles: any[] = [];
      const errors: { filename: string; error: string }[] = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const rawAreaDesc = areaDescriptions[i] || "Site_Capture";
        const areaDesc = sanitizeFilename(rawAreaDesc);
        const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
        const ext = file.originalname.split('.').pop() || '';
        const standardizedName = `${universalId}_${areaDesc}_${timestamp}.${ext}`;

        try {
          const driveResult = await uploadFileToDrive(
            targetFolder,
            standardizedName,
            file.mimetype,
            file.buffer
          );

          // Save attachment record
          await storage.createAttachment({
            projectId,
            fileName: standardizedName,
            originalName: file.originalname,
            mimeType: file.mimetype,
            fileSize: file.size,
            driveFileId: driveResult.fileId,
            driveFileUrl: driveResult.webViewLink,
            driveDownloadUrl: driveResult.webContentLink,
            thumbnailUrl: driveResult.thumbnailLink,
            subfolder: '01_Field_Capture',
            source: 'field_handover',
            uploadedBy: user?.id?.toString() || 'unknown',
          });

          uploadedFiles.push({
            name: standardizedName,
            driveUrl: driveResult.webViewLink,
          });
        } catch (err: any) {
          errors.push({ filename: file.originalname, error: err.message });
        }
      }

      // Get lead for SF overage check
      const lead = project.leadId ? await storage.getLead(project.leadId) : null;
      const hasSfOverage = project.sqftVariance && Math.abs(Number(project.sqftVariance)) > 10;

      // Send Google Chat notification if space exists
      if (project.chatSpaceId) {
        try {
          const { sendProjectUpdate } = await import("./google-chat");
          let message = `DATA HANDOVER COMPLETE: ${techName} has uploaded ${uploadedFiles.length} files for ${universalId}.`;
          
          if (project.driveFolderUrl) {
            message += `\nView folder: ${project.driveFolderUrl}`;
          }
          
          if (hasSfOverage) {
            message += `\n\nATTENTION: Tech flagged a potential SF overage (${project.sqftVariance}% variance). Review audit required before modeling.`;
          }

          await sendProjectUpdate(project.chatSpaceId, message);
        } catch (chatErr) {
          console.warn("Failed to send Google Chat notification:", chatErr);
        }
      }

      // Auto-advance project status from Scanning to Registration
      if (project.status === "Scanning" && uploadedFiles.length > 0) {
        await storage.updateProject(projectId, { status: "Registration" } as any);
      }

      res.json({
        success: true,
        uploadedCount: uploadedFiles.length,
        errorCount: errors.length,
        files: uploadedFiles,
        errors,
        driveFolderUrl: project.driveFolderUrl,
        statusAdvanced: project.status === "Scanning",
        sfOverageAlert: hasSfOverage,
      });
    } catch (error: any) {
      console.error("Data handover error:", error);
      res.status(500).json({ message: error.message || "Failed to complete data handover" });
    }
  });

  // Get profitability analytics
  app.get("/api/analytics/profitability", isAuthenticated, requireRole("ceo"), async (req, res) => {
    try {
      const stats = await quickbooksClient.getProfitabilityStats();
      res.json(stats);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // === PDF IMPORT (Extract proposals from PandaDoc PDFs) ===
  app.post("/api/pdf/extract", isAuthenticated, requireRole("ceo", "sales"), upload.array("pdfs", 20), async (req, res) => {
    try {
      const files = req.files as Express.Multer.File[];
      if (!files || files.length === 0) {
        return res.status(400).json({ message: "No PDF files uploaded" });
      }

      const extractedDeals: any[] = [];
      const errors: { filename: string; error: string }[] = [];

      for (const file of files) {
        try {
          const dataBuffer = fs.readFileSync(file.path);
          const pdfData = await parsePdf(dataBuffer);
          const pdfText = pdfData.text;

          const extracted = await extractDealFromPDF(pdfText, file.originalname);
          extractedDeals.push({
            ...extracted,
            sourceFile: file.originalname,
            rawTextPreview: pdfText.substring(0, 500) + "..."
          });
        } catch (err: any) {
          errors.push({ filename: file.originalname, error: err.message });
        } finally {
          fs.unlinkSync(file.path);
        }
      }

      res.json({ 
        deals: extractedDeals, 
        errors,
        totalProcessed: files.length,
        successCount: extractedDeals.length,
        errorCount: errors.length
      });
    } catch (error: any) {
      console.error("PDF extraction error:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // Create deals from extracted PDF data (batch import)
  app.post("/api/pdf/import", isAuthenticated, requireRole("ceo", "sales"), async (req, res) => {
    try {
      const { deals } = req.body;
      if (!Array.isArray(deals) || deals.length === 0) {
        return res.status(400).json({ message: "No deals provided for import" });
      }

      const createdLeads: any[] = [];
      const errors: { index: number; error: string }[] = [];

      for (let i = 0; i < deals.length; i++) {
        try {
          const deal = deals[i];
          const leadData = {
            clientName: deal.clientName || "Unknown Client",
            projectName: deal.projectName || null,
            projectAddress: deal.projectAddress || null,
            value: deal.value || 0,
            dealStage: "Proposal" as const,
            probability: 50,
            notes: deal.notes || `Imported from PDF: ${deal.sourceFile || "Unknown"}`,
            buildingType: deal.buildingType || null,
            sqft: deal.sqft || null,
            scope: deal.scope || null,
            disciplines: deal.disciplines || null,
            bimDeliverable: deal.bimDeliverable || null,
            contactName: deal.contactName || null,
            contactEmail: deal.contactEmail || null,
            contactPhone: deal.contactPhone || null,
            leadSource: "PDF Import",
            leadPriority: 3,
          };

          const lead = await storage.createLead(leadData);
          createdLeads.push(lead);
        } catch (err: any) {
          errors.push({ index: i, error: err.message });
        }
      }

      res.status(201).json({
        created: createdLeads,
        errors,
        totalImported: createdLeads.length,
        errorCount: errors.length
      });
    } catch (error: any) {
      console.error("PDF import error:", error);
      res.status(500).json({ message: error.message });
    }
  });

  // === FINANCIAL INTELLIGENCE MODULE ===

  // Profit First Accounts
  app.get("/api/accounts", isAuthenticated, requireRole("ceo"), async (req, res) => {
    try {
      const accountsList = await storage.getAccounts();
      res.json(accountsList);
    } catch (error) {
      console.error("Accounts fetch error:", error);
      res.status(500).json({ message: "Failed to fetch accounts" });
    }
  });

  app.post("/api/accounts", isAuthenticated, requireRole("ceo"), async (req, res) => {
    try {
      const account = await storage.createAccount(req.body);
      res.status(201).json(account);
    } catch (error) {
      console.error("Account creation error:", error);
      res.status(500).json({ message: "Failed to create account" });
    }
  });

  app.patch("/api/accounts/:id", isAuthenticated, requireRole("ceo"), async (req, res) => {
    try {
      const account = await storage.updateAccount(Number(req.params.id), req.body);
      res.json(account);
    } catch (error) {
      console.error("Account update error:", error);
      res.status(500).json({ message: "Failed to update account" });
    }
  });

  // Profit First Allocation Calculator
  app.post("/api/accounts/allocate", isAuthenticated, requireRole("ceo"), async (req, res) => {
    try {
      const { incomeAmount } = req.body;
      if (!incomeAmount || incomeAmount <= 0) {
        return res.status(400).json({ message: "Valid income amount required" });
      }

      // Profit First percentages: Taxes 10%, Debt 4%, Marketing 10%, Operating 76%
      const allocations = {
        Taxes: Number((incomeAmount * 0.10).toFixed(2)),
        Debt: Number((incomeAmount * 0.04).toFixed(2)),
        Marketing: Number((incomeAmount * 0.10).toFixed(2)),
        Operating: Number((incomeAmount * 0.76).toFixed(2)),
      };

      // Update virtual balances for each account
      const accounts = await storage.getAccounts();
      for (const account of accounts) {
        const allocationAmount = allocations[account.accountType as keyof typeof allocations] || 0;
        const newVirtualBalance = Number(account.virtualBalance) + allocationAmount;
        await storage.updateAccount(account.id, { virtualBalance: newVirtualBalance });
      }

      res.json({ 
        message: "Allocation complete",
        incomeAmount,
        allocations 
      });
    } catch (error) {
      console.error("Allocation error:", error);
      res.status(500).json({ message: "Failed to allocate funds" });
    }
  });

  // Invoices (AR)
  app.get("/api/invoices", isAuthenticated, requireRole("ceo"), async (req, res) => {
    try {
      const invoicesList = await storage.getInvoices();
      res.json(invoicesList);
    } catch (error) {
      console.error("Invoices fetch error:", error);
      res.status(500).json({ message: "Failed to fetch invoices" });
    }
  });

  app.get("/api/invoices/overdue", isAuthenticated, requireRole("ceo"), async (req, res) => {
    try {
      const overdueInvoices = await storage.getOverdueInvoices();
      res.json(overdueInvoices);
    } catch (error) {
      console.error("Overdue invoices fetch error:", error);
      res.status(500).json({ message: "Failed to fetch overdue invoices" });
    }
  });

  app.get("/api/invoices/:id", isAuthenticated, requireRole("ceo"), async (req, res) => {
    try {
      const invoice = await storage.getInvoice(Number(req.params.id));
      if (!invoice) return res.status(404).json({ message: "Invoice not found" });
      res.json(invoice);
    } catch (error) {
      console.error("Invoice fetch error:", error);
      res.status(500).json({ message: "Failed to fetch invoice" });
    }
  });

  app.post("/api/invoices", isAuthenticated, requireRole("ceo"), async (req, res) => {
    try {
      const invoice = await storage.createInvoice(req.body);
      res.status(201).json(invoice);
    } catch (error) {
      console.error("Invoice creation error:", error);
      res.status(500).json({ message: "Failed to create invoice" });
    }
  });

  app.patch("/api/invoices/:id", isAuthenticated, requireRole("ceo"), async (req, res) => {
    try {
      const invoice = await storage.updateInvoice(Number(req.params.id), req.body);
      res.json(invoice);
    } catch (error) {
      console.error("Invoice update error:", error);
      res.status(500).json({ message: "Failed to update invoice" });
    }
  });

  // Calculate and apply 8% monthly interest to overdue invoices
  app.post("/api/invoices/apply-interest", isAuthenticated, requireRole("ceo"), async (req, res) => {
    try {
      const overdueInvoices = await storage.getOverdueInvoices();
      const updated: any[] = [];

      for (const invoice of overdueInvoices) {
        const now = new Date();
        const dueDate = new Date(invoice.dueDate);
        const daysOverdue = Math.floor((now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
        
        // 8% monthly = approximately 0.267% daily
        const monthsOverdue = daysOverdue / 30;
        const interestRate = 0.08; // 8% monthly
        const outstandingBalance = Number(invoice.totalAmount) - Number(invoice.amountPaid);
        const newInterest = Number((outstandingBalance * interestRate * monthsOverdue).toFixed(2));
        
        // High-risk: >$50k or >60 days overdue
        const isHighRisk = outstandingBalance > 50000 || daysOverdue > 60;
        
        const updatedInvoice = await storage.updateInvoice(invoice.id, {
          daysOverdue,
          interestAccrued: newInterest.toString(),
          isHighRisk,
          status: daysOverdue > 90 ? "Collections" : "Overdue"
        });
        updated.push(updatedInvoice);
      }

      res.json({ 
        message: `Applied interest to ${updated.length} invoices`,
        updated 
      });
    } catch (error) {
      console.error("Interest calculation error:", error);
      res.status(500).json({ message: "Failed to apply interest" });
    }
  });

  // === AUTOMATED PAYMENT REMINDERS ===
  // Send payment reminders at 15, 30, and 45-day intervals with 2% monthly late fee
  app.post("/api/invoices/send-reminders", isAuthenticated, requireRole("ceo", "accounting"), async (req, res) => {
    try {
      const overdueInvoices = await storage.getOverdueInvoices();
      const reminders: any[] = [];
      const gmailClient = await getGmailClient();

      if (!gmailClient) {
        return res.status(400).json({ message: "Gmail not configured for sending reminders" });
      }

      for (const invoice of overdueInvoices) {
        const now = new Date();
        const dueDate = new Date(invoice.dueDate);
        const daysOverdue = Math.floor((now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
        
        // Determine which reminder interval we're in
        const reminderIntervals = [15, 30, 45];
        let currentInterval: number | null = null;
        for (const interval of reminderIntervals) {
          if (daysOverdue >= interval && daysOverdue < interval + 7) {
            currentInterval = interval;
            break;
          }
        }
        
        // Check if we're past 45 days but under 60 (no more reminders) or at 60+ (final notice once)
        if (daysOverdue >= 60 && daysOverdue < 67) {
          currentInterval = 60; // Final notice interval
        }
        
        if (currentInterval === null) continue;
        
        // Check if reminder was already sent for this interval by parsing notes
        const existingNotes = invoice.notes || "";
        const reminderPattern = new RegExp(`${currentInterval}-day reminder sent`, "i");
        if (reminderPattern.test(existingNotes)) {
          // Already sent reminder for this interval, skip
          continue;
        }

        // Calculate 2% monthly late fee
        const monthsOverdue = daysOverdue / 30;
        const lateFeePct = 0.02; // 2% monthly
        const outstandingBalance = Number(invoice.totalAmount) - Number(invoice.amountPaid);
        const lateFee = Number((outstandingBalance * lateFeePct * monthsOverdue).toFixed(2));
        const totalWithFee = outstandingBalance + lateFee;

        // Get lead info for email
        const lead = invoice.leadId ? await storage.getLead(invoice.leadId) : null;
        const clientEmail = lead?.contactEmail;
        const clientName = lead?.clientName || invoice.clientName;

        if (!clientEmail) continue;

        // Determine urgency level
        let urgencyLevel = "Reminder";
        let subject = `Payment Reminder - Invoice #${invoice.invoiceNumber}`;
        if (daysOverdue >= 45) {
          urgencyLevel = "FINAL NOTICE";
          subject = `FINAL NOTICE - Payment Required - Invoice #${invoice.invoiceNumber}`;
        } else if (daysOverdue >= 30) {
          urgencyLevel = "PAST DUE";
          subject = `PAST DUE - Invoice #${invoice.invoiceNumber}`;
        }

        const emailBody = `Dear ${clientName},

This is a ${urgencyLevel} regarding Invoice #${invoice.invoiceNumber}.

Original Amount: $${Number(invoice.totalAmount).toLocaleString()}
Amount Paid: $${Number(invoice.amountPaid).toLocaleString()}
Outstanding Balance: $${outstandingBalance.toLocaleString()}
Days Overdue: ${daysOverdue}
Late Fee (2% monthly): $${lateFee.toLocaleString()}
Total Amount Due: $${totalWithFee.toLocaleString()}

Per our Terms & Conditions, a 2% monthly late fee is applied to all overdue balances.

Please remit payment at your earliest convenience to avoid additional fees.

For questions, please contact accounting@scan2plan.com.

This project is governed by the laws of Rensselaer County, NY, and any legal proceedings shall be handled within said jurisdiction.

View our Terms & Conditions: https://scan2plan.com/terms

Sincerely,
Scan2Plan Accounting`;

        try {
          // Send email via Gmail
          const encodedMessage = Buffer.from(
            `To: ${clientEmail}\r\n` +
            `Subject: ${subject}\r\n` +
            `Content-Type: text/plain; charset=utf-8\r\n\r\n` +
            emailBody
          ).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

          await gmailClient.users.messages.send({
            userId: "me",
            requestBody: { raw: encodedMessage }
          });

          reminders.push({
            invoiceId: invoice.id,
            clientEmail,
            daysOverdue,
            lateFee,
            totalDue: totalWithFee,
            sentAt: new Date()
          });

          // Update invoice notes with reminder sent timestamp including interval
          const reminderNote = `${currentInterval}-day reminder sent ${new Date().toISOString().split("T")[0]}`;
          await storage.updateInvoice(invoice.id, {
            notes: existingNotes ? `${existingNotes}\n${reminderNote}` : reminderNote
          });
        } catch (emailError) {
          console.error(`Failed to send reminder for invoice ${invoice.id}:`, emailError);
        }
      }

      res.json({
        success: true,
        remindersSent: reminders.length,
        reminders
      });
    } catch (error) {
      console.error("Payment reminder error:", error);
      res.status(500).json({ message: "Failed to send payment reminders" });
    }
  });

  // Internal Loans
  app.get("/api/internal-loans", isAuthenticated, requireRole("ceo"), async (req, res) => {
    try {
      const loans = await storage.getInternalLoans();
      res.json(loans);
    } catch (error) {
      console.error("Loans fetch error:", error);
      res.status(500).json({ message: "Failed to fetch loans" });
    }
  });

  app.get("/api/internal-loans/active", isAuthenticated, requireRole("ceo"), async (req, res) => {
    try {
      const loan = await storage.getActiveLoan();
      res.json(loan || null);
    } catch (error) {
      console.error("Active loan fetch error:", error);
      res.status(500).json({ message: "Failed to fetch active loan" });
    }
  });

  app.post("/api/internal-loans", isAuthenticated, requireRole("ceo"), async (req, res) => {
    try {
      const loan = await storage.createInternalLoan(req.body);
      res.status(201).json(loan);
    } catch (error) {
      console.error("Loan creation error:", error);
      res.status(500).json({ message: "Failed to create loan" });
    }
  });

  app.patch("/api/internal-loans/:id", isAuthenticated, requireRole("ceo"), async (req, res) => {
    try {
      const loan = await storage.updateInternalLoan(Number(req.params.id), req.body);
      res.json(loan);
    } catch (error) {
      console.error("Loan update error:", error);
      res.status(500).json({ message: "Failed to update loan" });
    }
  });

  // Repay internal loan
  app.post("/api/internal-loans/:id/repay", isAuthenticated, requireRole("ceo"), async (req, res) => {
    try {
      const { amount } = req.body;
      if (!amount || amount <= 0) {
        return res.status(400).json({ message: "Valid repayment amount required" });
      }

      const loan = await storage.getInternalLoans().then(loans => loans.find(l => l.id === Number(req.params.id)));
      if (!loan) return res.status(404).json({ message: "Loan not found" });

      const newRepaid = Number(loan.amountRepaid) + amount;
      const newRemaining = Number(loan.originalAmount) - newRepaid;
      
      const updated = await storage.updateInternalLoan(loan.id, {
        amountRepaid: newRepaid.toString(),
        remainingBalance: Math.max(0, newRemaining).toString(),
        isFullyRepaid: newRemaining <= 0
      });

      res.json(updated);
    } catch (error) {
      console.error("Loan repayment error:", error);
      res.status(500).json({ message: "Failed to process repayment" });
    }
  });

  // Vendor Payables (AP)
  app.get("/api/vendor-payables", isAuthenticated, requireRole("ceo"), async (req, res) => {
    try {
      const payables = await storage.getVendorPayables();
      res.json(payables);
    } catch (error) {
      console.error("Payables fetch error:", error);
      res.status(500).json({ message: "Failed to fetch payables" });
    }
  });

  app.get("/api/vendor-payables/unpaid", isAuthenticated, requireRole("ceo"), async (req, res) => {
    try {
      const unpaid = await storage.getUnpaidPayables();
      res.json(unpaid);
    } catch (error) {
      console.error("Unpaid payables fetch error:", error);
      res.status(500).json({ message: "Failed to fetch unpaid payables" });
    }
  });

  app.post("/api/vendor-payables", isAuthenticated, requireRole("ceo"), async (req, res) => {
    try {
      const payable = await storage.createVendorPayable(req.body);
      res.status(201).json(payable);
    } catch (error) {
      console.error("Payable creation error:", error);
      res.status(500).json({ message: "Failed to create payable" });
    }
  });

  app.patch("/api/vendor-payables/:id", isAuthenticated, requireRole("ceo"), async (req, res) => {
    try {
      const payable = await storage.updateVendorPayable(Number(req.params.id), req.body);
      res.json(payable);
    } catch (error) {
      console.error("Payable update error:", error);
      res.status(500).json({ message: "Failed to update payable" });
    }
  });

  // Financial Summary Dashboard
  app.get("/api/financial/summary", isAuthenticated, requireRole("ceo"), async (req, res) => {
    try {
      const allInvoices = await storage.getInvoices();
      const overdueInvoices = await storage.getOverdueInvoices();
      const accounts = await storage.getAccounts();
      const unpaidPayables = await storage.getUnpaidPayables();
      const activeLoan = await storage.getActiveLoan();

      // Calculate totals
      const totalAR = allInvoices.reduce((sum, inv) => 
        sum + (Number(inv.totalAmount) - Number(inv.amountPaid)), 0);
      const totalOverdue = overdueInvoices.reduce((sum, inv) => 
        sum + (Number(inv.totalAmount) - Number(inv.amountPaid)), 0);
      const totalInterestOwed = overdueInvoices.reduce((sum, inv) => 
        sum + Number(inv.interestAccrued || 0), 0);
      const totalAP = unpaidPayables.reduce((sum, pay) => sum + Number(pay.amount), 0);
      
      const operatingAccount = accounts.find(a => a.accountType === "Operating");
      const currentCash = operatingAccount ? Number(operatingAccount.actualBalance) : 0;
      
      // High-risk invoices
      const highRiskInvoices = overdueInvoices.filter(inv => inv.isHighRisk);

      res.json({
        currentCash,
        totalAR,
        totalOverdue,
        totalInterestOwed,
        totalAP,
        netPosition: currentCash + totalAR - totalAP,
        accounts: accounts.map(a => ({
          type: a.accountType,
          actual: Number(a.actualBalance),
          virtual: Number(a.virtualBalance),
          variance: Number(a.virtualBalance) - Number(a.actualBalance)
        })),
        activeLoan: activeLoan ? {
          originalAmount: Number(activeLoan.originalAmount),
          repaid: Number(activeLoan.amountRepaid),
          remaining: Number(activeLoan.remainingBalance),
          percentRepaid: (Number(activeLoan.amountRepaid) / Number(activeLoan.originalAmount) * 100).toFixed(1)
        } : null,
        highRiskCount: highRiskInvoices.length,
        collectionsCount: overdueInvoices.filter(inv => inv.status === "Collections").length
      });
    } catch (error) {
      console.error("Financial summary error:", error);
      res.status(500).json({ message: "Failed to generate financial summary" });
    }
  });

  // Check if a lead has outstanding balance (for delivery blocker)
  app.get("/api/leads/:id/outstanding-balance", isAuthenticated, async (req, res) => {
    try {
      const leadId = Number(req.params.id);
      const leadInvoices = await storage.getInvoicesByLead(leadId);
      
      const outstandingBalance = leadInvoices.reduce((sum, inv) => {
        if (inv.status !== "Paid" && inv.status !== "Written Off") {
          return sum + (Number(inv.totalAmount) - Number(inv.amountPaid));
        }
        return sum;
      }, 0);

      res.json({ 
        leadId,
        outstandingBalance,
        hasOutstandingBalance: outstandingBalance > 0,
        invoiceCount: leadInvoices.filter(i => i.status !== "Paid").length
      });
    } catch (error) {
      console.error("Outstanding balance check error:", error);
      res.status(500).json({ message: "Failed to check outstanding balance" });
    }
  });

  // Get retainer payment status for a lead (Production Gate check)
  app.get("/api/leads/:id/retainer-status", isAuthenticated, async (req, res) => {
    try {
      const leadId = Number(req.params.id);
      const lead = await storage.getLead(leadId);
      
      if (!lead) {
        return res.status(404).json({ message: "Lead not found" });
      }

      res.json({ 
        retainerPaid: lead.retainerPaid || false,
        retainerAmount: lead.retainerAmount,
        retainerPaidDate: lead.retainerPaidDate
      });
    } catch (error) {
      console.error("Retainer status check error:", error);
      res.status(500).json({ message: "Failed to check retainer status" });
    }
  });

  // Google Maps Geocoding and Embed API endpoint
  app.get("/api/location/preview", async (req, res) => {
    try {
      const address = req.query.address as string;
      if (!address || address.trim().length < 5) {
        return res.status(400).json({ error: "Address is required" });
      }

      const apiKey = process.env.GOOGLE_MAPS_API_KEY;
      if (!apiKey) {
        return res.status(503).json({ 
          error: "Google Maps API key not configured",
          available: false 
        });
      }

      const encodedAddress = encodeURIComponent(address);
      
      // Geocode the address to get lat/lng for Street View
      let streetViewUrl = "";
      let lat: number | null = null;
      let lng: number | null = null;
      
      try {
        const geocodeResponse = await fetch(
          `https://maps.googleapis.com/maps/api/geocode/json?address=${encodedAddress}&key=${apiKey}`
        );
        const geocodeData = await geocodeResponse.json();
        
        if (geocodeData.status === "OK" && geocodeData.results?.[0]?.geometry?.location) {
          lat = geocodeData.results[0].geometry.location.lat;
          lng = geocodeData.results[0].geometry.location.lng;
          streetViewUrl = `https://www.google.com/maps/embed/v1/streetview?key=${apiKey}&location=${lat},${lng}&heading=0&pitch=0&fov=90`;
        }
      } catch (geocodeError) {
        console.error("Geocoding error:", geocodeError);
      }
      
      res.json({
        available: true,
        mapUrl: `https://www.google.com/maps/embed/v1/place?key=${apiKey}&q=${encodedAddress}&zoom=17&maptype=satellite`,
        streetViewUrl: streetViewUrl || null,
        staticMapUrl: `https://maps.googleapis.com/maps/api/staticmap?center=${encodedAddress}&zoom=17&size=400x300&maptype=satellite&markers=color:red%7C${encodedAddress}&key=${apiKey}`,
        coordinates: lat && lng ? { lat, lng } : null,
      });
    } catch (error) {
      console.error("Location preview error:", error);
      res.status(500).json({ error: "Failed to generate location preview" });
    }
  });

  // Google Static Maps API - Returns satellite image directly (for header thumbnail)
  app.get("/api/location/static-map", async (req, res) => {
    try {
      const address = req.query.address as string;
      const size = (req.query.size as string) || "100x100";
      const zoom = (req.query.zoom as string) || "18";
      const maptype = (req.query.maptype as string) || "satellite";
      
      if (!address || address.trim().length < 5) {
        return res.status(400).json({ error: "Address is required" });
      }

      const apiKey = process.env.GOOGLE_MAPS_API_KEY;
      if (!apiKey) {
        return res.status(503).json({ error: "Google Maps API key not configured" });
      }

      const encodedAddress = encodeURIComponent(address);
      const staticMapUrl = `https://maps.googleapis.com/maps/api/staticmap?center=${encodedAddress}&zoom=${zoom}&size=${size}&maptype=${maptype}&markers=color:red%7C${encodedAddress}&key=${apiKey}`;
      
      // Fetch the image and proxy it
      const imageResponse = await fetch(staticMapUrl);
      
      if (!imageResponse.ok) {
        return res.status(imageResponse.status).json({ error: "Failed to fetch static map" });
      }
      
      const imageBuffer = await imageResponse.arrayBuffer();
      const contentType = imageResponse.headers.get("content-type") || "image/png";
      
      res.setHeader("Content-Type", contentType);
      res.setHeader("Cache-Control", "public, max-age=86400"); // Cache for 24 hours
      res.send(Buffer.from(imageBuffer));
    } catch (error) {
      console.error("Static map error:", error);
      res.status(500).json({ error: "Failed to generate static map" });
    }
  });

  // Google Places Autocomplete API - Address suggestions
  app.get("/api/location/autocomplete", async (req, res) => {
    try {
      const input = req.query.input as string;
      if (!input || input.trim().length < 3) {
        return res.json({ predictions: [] });
      }

      const apiKey = process.env.GOOGLE_MAPS_API_KEY;
      if (!apiKey) {
        return res.status(503).json({ 
          error: "Google Maps API key not configured",
          predictions: [] 
        });
      }

      // Use Places Autocomplete API
      const url = new URL("https://maps.googleapis.com/maps/api/place/autocomplete/json");
      url.searchParams.set("input", input);
      url.searchParams.set("types", "address");
      url.searchParams.set("key", apiKey);

      const response = await fetch(url.toString());
      const data = await response.json();

      if (data.status === "OK" || data.status === "ZERO_RESULTS") {
        return res.json({
          predictions: (data.predictions || []).map((p: any) => ({
            place_id: p.place_id,
            description: p.description,
            structured_formatting: p.structured_formatting,
          })),
        });
      }

      console.error("Places Autocomplete error:", data);
      return res.json({ predictions: [] });
    } catch (error) {
      console.error("Autocomplete error:", error);
      res.status(500).json({ predictions: [] });
    }
  });

  // Google Places API - Get building details and photos
  app.get("/api/location/place-details", async (req, res) => {
    try {
      const address = req.query.address as string;
      const placeId = req.query.placeId as string;
      
      if (!address && !placeId) {
        return res.status(400).json({ error: "Address or placeId is required" });
      }
      
      if (address && address.trim().length < 5) {
        return res.status(400).json({ error: "Address is too short" });
      }

      const apiKey = process.env.GOOGLE_MAPS_API_KEY;
      if (!apiKey) {
        return res.status(503).json({ 
          error: "Google Maps API key not configured",
          available: false 
        });
      }

      // If placeId is provided, look up directly using Geocoding API
      if (placeId) {
        const geocodeUrl = `https://maps.googleapis.com/maps/api/geocode/json?place_id=${encodeURIComponent(placeId)}&key=${apiKey}`;
        const geocodeResponse = await fetch(geocodeUrl);
        const geocodeData = await geocodeResponse.json();
        
        if (geocodeData.status === "OK" && geocodeData.results?.[0]) {
          const result = geocodeData.results[0];
          return res.json({
            available: true,
            found: true,
            placeId: placeId,
            photos: [],
            businessInfo: {
              name: result.formatted_address?.split(",")[0] || "Location",
              address: result.formatted_address,
              types: result.types || [],
            },
            rawTypes: result.types || [],
          });
        }
      }

      // Fallback: Find place using Text Search with address
      const searchResponse = await fetch(
        `https://places.googleapis.com/v1/places:searchText`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Goog-Api-Key": apiKey,
            "X-Goog-FieldMask": "places.id,places.displayName,places.formattedAddress,places.types,places.photos,places.rating,places.userRatingCount,places.websiteUri,places.nationalPhoneNumber,places.regularOpeningHours,places.businessStatus,places.primaryType,places.editorialSummary"
          },
          body: JSON.stringify({ textQuery: address || placeId })
        }
      );

      if (!searchResponse.ok) {
        const errorText = await searchResponse.text();
        console.error("Places API search error:", errorText);
        return res.status(searchResponse.status).json({ 
          error: "Failed to search for place",
          details: errorText 
        });
      }

      const searchData = await searchResponse.json();
      const place = searchData.places?.[0];

      if (!place) {
        return res.json({
          available: true,
          found: false,
          message: "No place found for this address"
        });
      }

      // Step 2: Get photo URLs
      const photos: { url: string; attribution?: string }[] = [];
      if (place.photos && Array.isArray(place.photos)) {
        for (const photo of place.photos.slice(0, 5)) {
          const photoName = photo.name;
          if (photoName) {
            photos.push({
              url: `https://places.googleapis.com/v1/${photoName}/media?key=${apiKey}&maxWidthPx=800`,
              attribution: photo.authorAttributions?.[0]?.displayName
            });
          }
        }
      }

      // Extract useful business info
      const businessInfo = {
        name: place.displayName?.text,
        address: place.formattedAddress,
        types: place.types || [],
        primaryType: place.primaryType,
        rating: place.rating,
        reviewCount: place.userRatingCount,
        website: place.websiteUri,
        phone: place.nationalPhoneNumber,
        businessStatus: place.businessStatus,
        openingHours: place.regularOpeningHours?.weekdayDescriptions,
        summary: place.editorialSummary?.text,
      };

      res.json({
        available: true,
        found: true,
        placeId: place.id,
        photos,
        businessInfo,
        rawTypes: place.types,
      });
    } catch (error) {
      console.error("Place details error:", error);
      res.status(500).json({ error: "Failed to get place details" });
    }
  });

  // Flight and hotel price search endpoint
  const travelSearchSchema = z.object({
    origin: z.string().min(3, "Origin airport code is required"),
    destination: z.string().min(3, "Destination airport code is required"),
    projectAddress: z.string().optional(),
    scanDays: z.number().optional(),
  });

  app.post("/api/travel/search-prices", isAuthenticated, requireRole("ceo", "sales"), async (req, res) => {
    try {
      const parseResult = travelSearchSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({ error: parseResult.error.errors[0]?.message || "Invalid request" });
      }
      
      const { origin, destination, projectAddress, scanDays } = parseResult.data;
      
      if (!process.env.AI_INTEGRATIONS_OPENAI_API_KEY) {
        return res.status(503).json({ 
          error: "AI service not configured", 
          flightEstimate: 400, 
          hotelEstimate: 150,
          flightSearchResults: [],
          hotelSearchResults: [],
          notes: "Using default estimates - AI service unavailable"
        });
      }

      // Use OpenAI to estimate flight and hotel prices based on route
      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `You are a travel pricing assistant. Given origin and destination airports, estimate typical round-trip flight costs and hotel rates. Base your estimates on common business travel prices for the current market. Return a JSON object with:
- flightEstimate: number (round-trip flight cost per person in USD)
- hotelEstimate: number (nightly hotel rate in USD, mid-range business hotel)
- flightSearchResults: array of 3 flight options with airline, price, departure, arrival, stops
- hotelSearchResults: array of 3 hotel options with name, price, rating, address
- notes: string with any relevant travel tips

Be realistic based on typical market prices for business travelers.`
          },
          {
            role: "user",
            content: `Origin: ${origin}\nDestination: ${destination}${projectAddress ? `\nProject Address: ${projectAddress}` : ""}${scanDays ? `\nScan Days: ${scanDays}` : ""}`
          }
        ],
        response_format: { type: "json_object" }
      });

      const content = response.choices[0]?.message?.content;
      let result = {
        flightEstimate: 400,
        hotelEstimate: 150,
        flightSearchResults: [],
        hotelSearchResults: [],
        notes: ""
      };
      
      try {
        const parsed = JSON.parse(content || "{}");
        result = {
          flightEstimate: parsed.flightEstimate || 400,
          hotelEstimate: parsed.hotelEstimate || 150,
          flightSearchResults: parsed.flightSearchResults || [],
          hotelSearchResults: parsed.hotelSearchResults || [],
          notes: parsed.notes || ""
        };
      } catch {
        // Use defaults
      }

      res.json(result);
    } catch (error) {
      console.error("Travel price search error:", error);
      res.status(500).json({ error: "Failed to search travel prices" });
    }
  });

  // AI-assisted building image search endpoint
  app.post("/api/location/building-images", isAuthenticated, async (req, res) => {
    try {
      const { address, companyName, buildingType } = req.body;
      
      if (!address) {
        return res.status(400).json({ error: "Address is required" });
      }

      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `You are an assistant that helps find relevant building images. Given an address and optional context, suggest 3-5 specific search terms that would help find actual photos of this building online. Focus on the building's likely appearance, neighborhood, or distinctive features. Return only a JSON object with a "searchTerms" array of strings.`
          },
          {
            role: "user",
            content: `Address: ${address}${companyName ? `\nCompany/Owner: ${companyName}` : ""}${buildingType ? `\nBuilding Type: ${buildingType}` : ""}`
          }
        ],
        response_format: { type: "json_object" }
      });

      const content = response.choices[0]?.message?.content;
      let searchTerms: string[] = [];
      
      try {
        const parsed = JSON.parse(content || "{}");
        searchTerms = parsed.searchTerms || parsed.terms || [];
      } catch {
        searchTerms = [address];
      }

      res.json({
        address,
        searchTerms,
        note: "Use these search terms to find building images. Manual verification recommended."
      });
    } catch (error) {
      console.error("Building image search error:", error);
      res.status(500).json({ error: "Failed to generate search suggestions" });
    }
  });

  // Google Solar API - Building Insights for dimensions
  app.get("/api/location/building-insights", isAuthenticated, async (req, res) => {
    try {
      const lat = parseFloat(req.query.lat as string);
      const lng = parseFloat(req.query.lng as string);
      
      if (isNaN(lat) || isNaN(lng)) {
        return res.status(400).json({ error: "Valid latitude and longitude are required" });
      }

      const apiKey = process.env.GOOGLE_MAPS_API_KEY;
      if (!apiKey) {
        return res.status(503).json({ 
          error: "Google Maps API key not configured",
          available: false 
        });
      }

      // Call Solar API buildingInsights
      const solarResponse = await fetch(
        `https://solar.googleapis.com/v1/buildingInsights:findClosest?location.latitude=${lat}&location.longitude=${lng}&requiredQuality=HIGH&key=${apiKey}`
      );

      if (!solarResponse.ok) {
        // Try with MEDIUM quality if HIGH fails
        const fallbackResponse = await fetch(
          `https://solar.googleapis.com/v1/buildingInsights:findClosest?location.latitude=${lat}&location.longitude=${lng}&requiredQuality=MEDIUM&key=${apiKey}`
        );
        
        if (!fallbackResponse.ok) {
          const errorText = await fallbackResponse.text();
          console.error("Solar API error:", errorText);
          return res.json({
            available: false,
            error: "Building insights not available for this location",
            message: "This location may be residential or doesn't have detailed solar/building data"
          });
        }
        
        const fallbackData = await fallbackResponse.json();
        return processAndReturnBuildingData(res, fallbackData);
      }

      const solarData = await solarResponse.json();
      return processAndReturnBuildingData(res, solarData);
      
    } catch (error) {
      console.error("Building insights error:", error);
      res.status(500).json({ error: "Failed to fetch building insights" });
    }
  });

  function processAndReturnBuildingData(res: any, data: any) {
    const solarPotential = data.solarPotential;
    
    // Convert square meters to square feet
    const sqFtPerSqM = 10.7639;
    const areaMeters = solarPotential?.wholeRoofStats?.areaMeters2 || 
                       solarPotential?.maxArrayAreaMeters2 || 
                       0;
    const areaSquareFeet = Math.round(areaMeters * sqFtPerSqM);
    
    // Get building height from Solar API response
    // Try buildingHeightMeters first (direct field), then fall back to segment heights
    let buildingHeightMeters = 0;
    if (solarPotential?.buildingHeightMeters) {
      buildingHeightMeters = solarPotential.buildingHeightMeters;
    } else if (solarPotential?.roofSegmentStats?.length > 0) {
      // Find the maximum plane height from roof segments
      const heights = solarPotential.roofSegmentStats
        .map((seg: any) => seg.planeHeightAtCenterMeters || 0)
        .filter((h: number) => h > 0);
      if (heights.length > 0) {
        buildingHeightMeters = Math.max(...heights);
      }
    }
    
    // Count roof segments
    const roofSegments = solarPotential?.roofSegmentStats?.length || 0;
    
    // Building dimensions from roof stats
    const boundingBox = solarPotential?.boundingBox;
    
    res.json({
      available: true,
      buildingArea: {
        squareMeters: Math.round(areaMeters),
        squareFeet: areaSquareFeet
      },
      roofStats: {
        segments: roofSegments,
        pitchDegrees: solarPotential?.roofSegmentStats?.[0]?.pitchDegrees || null,
        azimuthDegrees: solarPotential?.roofSegmentStats?.[0]?.azimuthDegrees || null
      },
      height: {
        maxRoofHeightMeters: buildingHeightMeters,
        maxRoofHeightFeet: Math.round(buildingHeightMeters * 3.28084)
      },
      imagery: {
        date: data.imageryDate,
        quality: data.imageryQuality
      },
      center: data.center,
      boundingBox: boundingBox
    });
  }

  // Google Aerial View API - 3D Flyover videos
  app.get("/api/location/aerial-view", isAuthenticated, async (req, res) => {
    try {
      const lat = parseFloat(req.query.lat as string);
      const lng = parseFloat(req.query.lng as string);
      
      if (isNaN(lat) || isNaN(lng)) {
        return res.status(400).json({ error: "Valid latitude and longitude are required" });
      }

      const apiKey = process.env.GOOGLE_MAPS_API_KEY;
      if (!apiKey) {
        return res.status(503).json({ 
          error: "Google Maps API key not configured",
          available: false 
        });
      }

      // Check for existing video using lookupVideoMetadata
      const lookupResponse = await fetch(
        `https://aerialview.googleapis.com/v1/videos:lookupVideoMetadata?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            address: {
              latitude: lat,
              longitude: lng
            }
          })
        }
      );

      if (lookupResponse.ok) {
        const videoData = await lookupResponse.json();
        if (videoData.videoId || videoData.state === "DONE") {
          return res.json({
            available: true,
            hasVideo: true,
            videoId: videoData.videoId,
            state: videoData.state,
            videoUri: videoData.uris?.MP4_HIGH?.portraitUri || videoData.uris?.MP4_MEDIUM?.portraitUri,
            landscapeUri: videoData.uris?.MP4_HIGH?.landscapeUri || videoData.uris?.MP4_MEDIUM?.landscapeUri,
            metadata: videoData.metadata
          });
        }
      }

      // No video available
      res.json({
        available: true,
        hasVideo: false,
        message: "3D flyover video not available for this location. You can request a rendering.",
        canRequest: true
      });
      
    } catch (error) {
      console.error("Aerial view error:", error);
      res.status(500).json({ error: "Failed to fetch aerial view data" });
    }
  });

  // Request Aerial View video rendering
  app.post("/api/location/aerial-view/request", isAuthenticated, async (req, res) => {
    try {
      const { lat, lng, address } = req.body;
      
      if (!lat || !lng) {
        return res.status(400).json({ error: "Latitude and longitude are required" });
      }

      const apiKey = process.env.GOOGLE_MAPS_API_KEY;
      if (!apiKey) {
        return res.status(503).json({ error: "Google Maps API key not configured" });
      }

      // Request video rendering
      const renderResponse = await fetch(
        `https://aerialview.googleapis.com/v1/videos:renderVideo?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            address: address || `${lat},${lng}`
          })
        }
      );

      if (!renderResponse.ok) {
        const errorText = await renderResponse.text();
        console.error("Aerial View render error:", errorText);
        return res.status(renderResponse.status).json({
          error: "Failed to request video rendering",
          details: errorText
        });
      }

      const renderData = await renderResponse.json();
      res.json({
        success: true,
        state: renderData.state || "PROCESSING",
        videoId: renderData.videoId,
        message: "Video rendering requested. This may take several minutes."
      });
      
    } catch (error) {
      console.error("Aerial view render request error:", error);
      res.status(500).json({ error: "Failed to request video rendering" });
    }
  });

  // === SCAN TECH TIME LOGS ===
  
  // Get today's time logs for current technician
  app.get("/api/time-logs/today", isAuthenticated, async (req, res) => {
    try {
      const techId = (req.user as any)?.id?.toString() || "";
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const logs = await db.select().from(timeLogs).where(
        sql`${timeLogs.techId} = ${techId} AND DATE(${timeLogs.createdAt}) = DATE(${today})`
      );
      res.json(logs);
    } catch (error) {
      console.error("Error fetching time logs:", error);
      res.status(500).json({ message: "Failed to fetch time logs" });
    }
  });

  // Get active (unclosed) time log for current technician
  app.get("/api/time-logs/active", isAuthenticated, async (req, res) => {
    try {
      const techId = (req.user as any)?.id?.toString() || "";
      
      // Get most recent active log (ordered by arrival time DESC)
      const [activeLog] = await db.select().from(timeLogs)
        .where(sql`${timeLogs.techId} = ${techId} AND ${timeLogs.departureTime} IS NULL`)
        .orderBy(sql`${timeLogs.arrivalTime} DESC`)
        .limit(1);
      
      res.json(activeLog || null);
    } catch (error) {
      console.error("Error fetching active time log:", error);
      res.status(500).json({ message: "Failed to fetch active time log" });
    }
  });

  // Clock in - create new time log (supports Dual Hat tracking)
  app.post("/api/time-logs", isAuthenticated, async (req, res) => {
    try {
      const techId = (req.user as any)?.id?.toString() || "";
      const { projectId, arrivalTime, departureTime, type, latitude, longitude, notes, workType, roleType, hourlyCost, totalSiteMinutes } = req.body;
      
      // Validate required field
      if (!projectId) {
        return res.status(400).json({ message: "Project ID is required" });
      }
      
      // If departureTime is provided, this is a complete time log (not clock-in flow)
      if (!departureTime) {
        // Check if tech already has an active session
        const [existingActive] = await db.select().from(timeLogs).where(
          sql`${timeLogs.techId} = ${techId} AND ${timeLogs.departureTime} IS NULL`
        );
        
        if (existingActive) {
          return res.status(400).json({ 
            message: "You already have an active time log. Please clock out first.",
            activeLog: existingActive
          });
        }
      }
      
      const [newLog] = await db.insert(timeLogs).values({
        projectId: Number(projectId),
        techId,
        arrivalTime: arrivalTime ? new Date(arrivalTime) : new Date(),
        departureTime: departureTime ? new Date(departureTime) : null,
        totalSiteMinutes: totalSiteMinutes ? Number(totalSiteMinutes) : null,
        type: type || "Manual",
        workType: workType || "Scanning",
        roleType: roleType || "tech",
        hourlyCost: hourlyCost || null,
        latitude: latitude?.toString() || null,
        longitude: longitude?.toString() || null,
        notes: notes || null
      }).returning();
      
      res.status(201).json(newLog);
    } catch (error) {
      console.error("Error creating time log:", error);
      res.status(500).json({ message: "Failed to create time log" });
    }
  });

  // Clock out - update existing time log
  app.patch("/api/time-logs/:id", isAuthenticated, async (req, res) => {
    try {
      const techId = (req.user as any)?.id?.toString() || "";
      const { departureTime, notes } = req.body;
      const logId = Number(req.params.id);
      
      // Get the existing log and verify ownership
      const [existingLog] = await db.select().from(timeLogs).where(
        sql`${timeLogs.id} = ${logId} AND ${timeLogs.techId} = ${techId}`
      );
      
      if (!existingLog) {
        return res.status(404).json({ message: "Time log not found or not authorized" });
      }
      
      let totalMinutes = null;
      if (departureTime && existingLog.arrivalTime) {
        const arrival = new Date(existingLog.arrivalTime);
        const departure = new Date(departureTime);
        totalMinutes = Math.round((departure.getTime() - arrival.getTime()) / (1000 * 60));
      }
      
      const [updatedLog] = await db.update(timeLogs)
        .set({
          departureTime: departureTime ? new Date(departureTime) : undefined,
          totalSiteMinutes: totalMinutes,
          notes: notes ?? existingLog.notes
        })
        .where(sql`${timeLogs.id} = ${logId}`)
        .returning();
      
      res.json(updatedLog);
    } catch (error) {
      console.error("Error updating time log:", error);
      res.status(500).json({ message: "Failed to update time log" });
    }
  });

  // Scoping Call Recording - Transcribe audio
  app.post("/api/scoping/transcribe", isAuthenticated, upload.single("audio"), async (req, res) => {
    try {
      const audioFile = req.file;
      if (!audioFile) {
        return res.status(400).json({ message: "No audio file provided" });
      }

      // Create a readable stream for OpenAI
      const fileStream = fs.createReadStream(audioFile.path);
      
      // Use OpenAI Whisper for transcription with file stream
      const transcription = await openai.audio.transcriptions.create({
        file: fileStream,
        model: "whisper-1",
        response_format: "text",
      });

      // Clean up temp file
      fs.unlinkSync(audioFile.path);

      res.json({ transcription });
    } catch (error) {
      console.error("Error transcribing audio:", error);
      // Clean up temp file on error
      if (req.file?.path) {
        try { fs.unlinkSync(req.file.path); } catch (e) {}
      }
      res.status(500).json({ message: "Failed to transcribe audio" });
    }
  });

  // Scoping Call Recording - Extract scope details from transcription
  app.post("/api/scoping/extract", isAuthenticated, async (req, res) => {
    try {
      const { transcription, leadId } = req.body;
      
      if (!transcription) {
        return res.status(400).json({ message: "No transcription provided" });
      }

      // Get existing lead data for context if leadId provided
      let existingLead = null;
      if (leadId) {
        existingLead = await storage.getLead(Number(leadId));
      }

      const systemPrompt = `You are an AI assistant helping to extract project scoping details from a phone call transcription for a laser scanning and BIM company (Scan2Plan).

Extract the following details from the conversation. Return ONLY valid JSON with these fields:
- sqft: Square footage as a number (null if not mentioned)
- buildingType: Type of building (e.g., "Commercial Office", "Industrial Warehouse", "Healthcare Facility", "Residential Multi-Family", "Education", "Retail", "Historic / HBIM")
- scope: Scope of work (e.g., "Full Building", "Interior Only", "Exterior Only", "MEP Systems Only", "Existing Conditions")
- disciplines: BIM disciplines needed (e.g., "Architecture", "Structural", "MEPF", "All Disciplines")
- projectName: Name or description of the project
- projectAddress: Site address or location mentioned
- contactName: Name of the person on the call
- contactEmail: Email if mentioned
- contactPhone: Phone number if mentioned
- notes: Any other important details, special requirements, or notes
- risks: Array of potential project risks or concerns mentioned
- specialRequirements: Array of any special requirements or conditions

Be precise. Only extract information that was explicitly mentioned. Return null for fields not discussed.`;

      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { 
            role: "user", 
            content: `${existingLead ? `Context - Existing lead: ${existingLead.clientName}, ${existingLead.projectAddress || 'No address yet'}\n\n` : ''}Transcription:\n${transcription}` 
          }
        ],
        response_format: { type: "json_object" },
        temperature: 0.3,
      });

      const scopeData = JSON.parse(response.choices[0]?.message?.content || "{}");
      
      res.json({ scope: scopeData });
    } catch (error) {
      console.error("Error extracting scope:", error);
      res.status(500).json({ message: "Failed to extract scope details" });
    }
  });

  // ==================== FIELD SUPPORT API ====================
  
  const fieldSupportChatSchema = z.object({
    message: z.string().min(1, "Message is required"),
    projectId: z.number().optional(),
    universalProjectId: z.string().optional(),
  });

  const fieldSupportEscalateSchema = z.object({
    question: z.string().min(1, "Question is required"),
    projectId: z.number().optional(),
    universalProjectId: z.string().optional(),
    techName: z.string().optional(),
  });

  // Field Support Chat - AI assistant for technicians
  app.post("/api/field-support/chat", isAuthenticated, async (req, res) => {
    try {
      const parseResult = fieldSupportChatSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({ message: parseResult.error.errors[0]?.message || "Invalid request" });
      }
      const { message, projectId, universalProjectId } = parseResult.data;

      // Get project context if available
      let projectContext = "";
      if (projectId) {
        const project = await storage.getProject(Number(projectId));
        if (project) {
          projectContext = `
Current Project Context:
- Project ID: ${project.universalProjectId || project.id}
- Name: ${project.name}
- Address: ${project.address || "Not specified"}
- Status: ${project.status}
- LOD: ${project.lod || "300"}
- LoA: ${project.loa || "Standard"}
- Building Type: ${project.buildingType || "Not specified"}
- Notes: ${project.notes || "None"}
`;
        }
      }

      const systemPrompt = `You are a Field Support AI assistant for Scan2Plan, a laser scanning and BIM company.

Your job is to help field technicians with:
1. Equipment operation (Leica RTC360, Faro Focus, etc.)
2. Scanning best practices and procedures
3. LOD (Level of Detail) and LoA (Level of Accuracy) requirements
4. BOMA standards and measurement guidelines
5. Safety protocols
6. Project-specific questions

${projectContext}

Be concise and practical. Field techs are on job sites and need quick, actionable answers.
If you're unsure about something critical, recommend they escalate to a manager.
Never make up equipment specifications - if unsure, say so.`;

      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: message }
        ],
        temperature: 0.7,
        max_tokens: 500,
      });

      const aiResponse = response.choices[0]?.message?.content || "I couldn't process that request.";
      
      res.json({ response: aiResponse });
    } catch (error) {
      console.error("Field support chat error:", error);
      res.status(500).json({ message: "Failed to get AI response" });
    }
  });

  // Field Support Escalation - Send to Google Chat
  app.post("/api/field-support/escalate", isAuthenticated, async (req, res) => {
    try {
      const parseResult = fieldSupportEscalateSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({ message: parseResult.error.errors[0]?.message || "Invalid request" });
      }
      const { question, projectId, universalProjectId, techName } = parseResult.data;

      // Build escalation message
      const projectInfo = universalProjectId ? `[${universalProjectId}]` : projectId ? `[Project #${projectId}]` : "";
      const escalationMessage = `TECH ALERT: ${techName || "Technician"} ${projectInfo} needs assistance:

"${question}"

Please respond in the project's Google Chat Space.`;

      // Try to send to Google Chat if configured
      try {
        const webhookUrl = process.env.GOOGLE_CHAT_WEBHOOK_URL;
        if (webhookUrl) {
          await fetch(webhookUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              text: escalationMessage,
            }),
          });
        }
      } catch (chatError) {
        console.warn("Google Chat webhook failed:", chatError);
        // Continue even if webhook fails
      }

      // Log the escalation
      console.log("Field support escalation:", { techName, question, projectId });
      
      res.json({ 
        success: true, 
        message: "Escalation sent to management team" 
      });
    } catch (error) {
      console.error("Escalation error:", error);
      res.status(500).json({ message: "Failed to escalate" });
    }
  });

  // === PANDADOC INTEGRATION ===
  app.get("/api/integrations/pandadoc/status", isAuthenticated, requireRole("ceo", "sales"), async (req, res) => {
    const configured = pandadocService.isPandaDocConfigured();
    if (!configured) {
      return res.json({ connected: false, error: "API key not configured" });
    }
    
    const result = await pandadocService.testConnection();
    res.json({ 
      connected: result.success, 
      workspace: result.data?.membership?.workspace_name,
      email: result.data?.email,
      error: result.error 
    });
  });

  app.get("/api/integrations/pandadoc/documents", isAuthenticated, requireRole("ceo", "sales"), async (req, res) => {
    const result = await pandadocService.listDocuments(10);
    res.json(result);
  });

  // Send document for signing
  app.post("/api/leads/:id/pandadoc/send", isAuthenticated, requireRole("ceo", "sales"), async (req, res) => {
    try {
      const leadId = Number(req.params.id);
      const { subject, message } = req.body;
      
      const lead = await storage.getLead(leadId);
      if (!lead) return res.status(404).json({ message: "Lead not found" });
      
      if (!lead.pandaDocId) {
        return res.status(400).json({ message: "No PandaDoc document found. Generate a proposal first." });
      }
      
      const result = await pandadocService.sendDocument(
        lead.pandaDocId,
        message || `Please review and sign the proposal for ${lead.projectName || lead.clientName}`,
        subject || `Proposal Ready for Signature - ${lead.projectName || lead.clientName}`
      );
      
      if (result.success) {
        await storage.updateLead(leadId, {
          pandaDocStatus: 'document.sent',
          pandaDocSentAt: new Date()
        });
        
        res.json({ success: true, message: "Document sent for signature" });
      } else {
        res.status(500).json({ success: false, error: result.error });
      }
    } catch (error: any) {
      console.error("[PandaDoc] Send error:", error);
      res.status(500).json({ message: error.message || "Failed to send document" });
    }
  });

  // Get PandaDoc document status for a lead
  app.get("/api/leads/:id/pandadoc/status", isAuthenticated, requireRole("ceo", "sales"), async (req, res) => {
    try {
      const leadId = Number(req.params.id);
      const lead = await storage.getLead(leadId);
      if (!lead) return res.status(404).json({ message: "Lead not found" });
      
      if (!lead.pandaDocId) {
        return res.json({ hasDocument: false });
      }
      
      const details = await pandadocService.getDocumentDetails(lead.pandaDocId);
      res.json({
        hasDocument: true,
        documentId: lead.pandaDocId,
        status: details.status || lead.pandaDocStatus,
        name: details.name,
        sentAt: lead.pandaDocSentAt
      });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // === GROWTH ENGINE: HUBSPOT INTEGRATION ===
  const hubspotService = await import('./services/hubspot');

  app.get("/api/integrations/hubspot/status", isAuthenticated, requireRole("ceo", "sales"), async (req, res) => {
    const connected = await hubspotService.isHubSpotConnected();
    res.json({ connected });
  });

  app.get("/api/personas", isAuthenticated, requireRole("ceo", "sales"), async (req, res) => {
    const personaList = await hubspotService.getPersonas();
    res.json(personaList);
  });

  app.post("/api/leads/batch-sync", isAuthenticated, requireRole("ceo", "sales"), async (req, res) => {
    const { leadIds } = req.body;
    if (!Array.isArray(leadIds) || leadIds.length === 0) {
      return res.status(400).json({ message: "leadIds array required" });
    }

    try {
      const result = await ghlService.batchSyncLeads(leadIds);
      res.json(result);
    } catch (error: any) {
      console.error("Batch sync error:", error);
      res.status(500).json({ message: error.message || "Batch sync failed" });
    }
  });

  app.post("/api/leads/:id/hubspot-sync", isAuthenticated, requireRole("ceo", "sales"), async (req, res) => {
    const leadId = Number(req.params.id);
    const { personaCode } = req.body;
    
    const lead = await storage.getLead(leadId);
    if (!lead) return res.status(404).json({ message: "Lead not found" });

    const personaList = await hubspotService.getPersonas();
    const persona = personaList.find(p => p.code === (personaCode || lead.buyerPersona || 'BP1'));
    if (!persona) return res.status(400).json({ message: "Persona not found" });

    const result = await hubspotService.syncLead(lead, persona);
    res.json(result);
  });

  app.get("/api/track", async (req, res) => {
    const { leadId, dest } = req.query;
    
    if (!leadId || !dest) {
      return res.status(400).send("Missing parameters");
    }

    const leadIdNum = Number(leadId);
    const destUrl = decodeURIComponent(String(dest));
    const referrer = req.headers.referer || req.headers.referrer || '';

    await hubspotService.recordTrackingEvent(leadIdNum, "case_study_click", destUrl, String(referrer));
    
    res.redirect(destUrl);
  });

  app.post("/api/webhooks/hubspot/deal", async (req, res) => {
    try {
      const events = Array.isArray(req.body) ? req.body : [req.body];
      
      for (const event of events) {
        if (event.subscriptionType === 'deal.propertyChange' && event.propertyName === 'dealstage') {
          await hubspotService.updateLeadFromHubSpotDeal(event.objectId, event.propertyValue);
        }
      }
      
      res.status(200).send('OK');
    } catch (error) {
      console.error("HubSpot webhook error:", error);
      res.status(500).send('Error');
    }
  });

  // Engagement tracking webhook (email opens, clicks, replies)
  app.post("/api/webhooks/hubspot/engagement", async (req, res) => {
    try {
      const events = Array.isArray(req.body) ? req.body : [req.body];
      console.log("[HubSpot Engagement] Webhook received:", JSON.stringify(events).slice(0, 500));
      
      for (const event of events) {
        const eventType = event.subscriptionType;
        const contactId = event.objectId;
        
        // Map HubSpot events to our tracking system
        if (eventType === 'email.open' || eventType === 'email.click' || eventType === 'email.reply') {
          // Find lead by hubspotId
          const allLeads = await storage.getLeads();
          const lead = allLeads.find(l => l.hubspotId === String(contactId));
          
          if (lead) {
            // Custom score boost based on engagement type (more than default 10)
            const scoreBoost = eventType === 'email.reply' ? 25 : eventType === 'email.click' ? 15 : 5;
            const currentScore = lead.leadScore || 0;
            const newScore = currentScore + scoreBoost;
            
            // Update score directly (don't use recordTrackingEvent to avoid double counting)
            await storage.updateLead(lead.id, { leadScore: newScore } as any);
            
            // Record tracking event for history (skip the score update in recordTrackingEvent)
            const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
            const existingEvents = await db.select()
              .from(trackingEvents)
              .where(
                and(
                  eq(trackingEvents.leadId, lead.id),
                  eq(trackingEvents.eventType, eventType),
                  gte(trackingEvents.clickedAt, twentyFourHoursAgo)
                )
              );
            
            if (existingEvents.length === 0) {
              await db.insert(trackingEvents).values({
                leadId: lead.id,
                eventType,
                assetUrl: event.properties?.url || 'email',
                referrer: 'hubspot_webhook'
              });
            }
            
            console.log(`[HubSpot Engagement] ${eventType} for lead ${lead.id}, score now ${newScore}`);
          }
        }
      }
      
      res.status(200).send('OK');
    } catch (error) {
      console.error("[HubSpot Engagement] Webhook error:", error);
      res.status(500).send('Error');
    }
  });

  app.get("/api/notifications", isAuthenticated, async (req, res) => {
    const user = req.user as any;
    const userId = user?.claims?.sub || user?.id;
    const unreadOnly = req.query.unread === 'true';
    
    const notificationList = await hubspotService.getNotifications(userId, unreadOnly);
    res.json(notificationList);
  });

  app.patch("/api/notifications/:id/read", isAuthenticated, async (req, res) => {
    const notificationId = Number(req.params.id);
    await hubspotService.markNotificationRead(notificationId);
    res.json({ success: true });
  });

  app.get("/api/case-studies/ranked/:personaCode", isAuthenticated, requireRole("ceo", "sales"), async (req, res) => {
    const { personaCode } = req.params;
    const ranked = await hubspotService.rankCaseStudies(personaCode);
    res.json(ranked);
  });

  // === MARKETING POSTS API (Truth Loop Content Queue) ===
  
  // Get all marketing posts (optionally filter by status)
  app.get("/api/marketing-posts", isAuthenticated, async (req, res) => {
    try {
      const { status } = req.query;
      let query = db.select().from(marketingPosts);
      
      if (status && typeof status === "string") {
        query = query.where(eq(marketingPosts.status, status)) as any;
      }
      
      const posts = await query;
      res.json(posts);
    } catch (error) {
      console.error("Error fetching marketing posts:", error);
      res.status(500).json({ message: "Failed to fetch marketing posts" });
    }
  });
  
  // Get single marketing post
  app.get("/api/marketing-posts/:id", isAuthenticated, async (req, res) => {
    try {
      const [post] = await db.select()
        .from(marketingPosts)
        .where(eq(marketingPosts.id, Number(req.params.id)));
      
      if (!post) {
        return res.status(404).json({ message: "Marketing post not found" });
      }
      
      res.json(post);
    } catch (error) {
      console.error("Error fetching marketing post:", error);
      res.status(500).json({ message: "Failed to fetch marketing post" });
    }
  });
  
  // Update marketing post status (approve, mark as posted)
  app.patch("/api/marketing-posts/:id", isAuthenticated, async (req, res) => {
    try {
      const { status, content, platform } = req.body;
      const updateData: any = {};
      
      if (status !== undefined) updateData.status = status;
      if (content !== undefined) updateData.content = content;
      if (platform !== undefined) updateData.platform = platform;
      
      if (status === "posted") {
        updateData.postedAt = new Date();
      }
      
      const [updated] = await db.update(marketingPosts)
        .set(updateData)
        .where(eq(marketingPosts.id, Number(req.params.id)))
        .returning();
      
      if (!updated) {
        return res.status(404).json({ message: "Marketing post not found" });
      }
      
      res.json(updated);
    } catch (error) {
      console.error("Error updating marketing post:", error);
      res.status(500).json({ message: "Failed to update marketing post" });
    }
  });
  
  // Trigger Truth Loop for a project (creates marketing content)
  app.post("/api/marketing-posts/trigger/:projectId", isAuthenticated, requireRole(["ceo", "admin", "sales"]), async (req, res) => {
    try {
      const projectId = Number(req.params.projectId);
      const { variancePercent, actualSqft, costPerSqft, varianceThreshold } = req.body;
      
      if (variancePercent === undefined || !actualSqft) {
        return res.status(400).json({ message: "variancePercent and actualSqft are required" });
      }
      
      const { triggerTruthLoop } = await import("./services/marketingLoop");
      const result = await triggerTruthLoop(projectId, Number(variancePercent), Number(actualSqft), {
        costPerSqft: costPerSqft ? Number(costPerSqft) : undefined,
        varianceThreshold: varianceThreshold ? Number(varianceThreshold) : undefined
      });
      
      if (!result.success) {
        return res.status(400).json(result);
      }
      
      res.json(result);
    } catch (error) {
      console.error("Error triggering Truth Loop:", error);
      res.status(500).json({ message: "Failed to trigger Truth Loop" });
    }
  });
  
  // Delete marketing post
  app.delete("/api/marketing-posts/:id", isAuthenticated, requireRole(["admin", "ceo"]), async (req, res) => {
    try {
      const [deleted] = await db.delete(marketingPosts)
        .where(eq(marketingPosts.id, Number(req.params.id)))
        .returning();
      
      if (!deleted) {
        return res.status(404).json({ message: "Marketing post not found" });
      }
      
      res.json({ message: "Post deleted", post: deleted });
    } catch (error) {
      console.error("Error deleting marketing post:", error);
      res.status(500).json({ message: "Failed to delete marketing post" });
    }
  });

  // === EVIDENCE VAULT API (Persona-Based Marketing Hooks) ===
  
  // Get all evidence vault entries (optionally filter by persona)
  app.get("/api/evidence-vault", isAuthenticated, async (req, res) => {
    try {
      const { personaCode, minEws } = req.query;
      
      let query = db.select().from(evidenceVault);
      
      if (personaCode && typeof personaCode === "string") {
        query = query.where(eq(evidenceVault.personaCode, personaCode)) as any;
      }
      
      const entries = await query;
      
      // Filter by minimum EWS if provided
      const filtered = minEws 
        ? entries.filter(e => (e.ewsScore || 0) >= Number(minEws))
        : entries;
      
      res.json(filtered);
    } catch (error) {
      console.error("Error fetching evidence vault:", error);
      res.status(500).json({ message: "Failed to fetch evidence vault entries" });
    }
  });
  
  // Get evidence vault entry by ID
  app.get("/api/evidence-vault/:id", isAuthenticated, async (req, res) => {
    try {
      const [entry] = await db.select()
        .from(evidenceVault)
        .where(eq(evidenceVault.id, Number(req.params.id)));
      
      if (!entry) {
        return res.status(404).json({ message: "Evidence vault entry not found" });
      }
      
      res.json(entry);
    } catch (error) {
      console.error("Error fetching evidence vault entry:", error);
      res.status(500).json({ message: "Failed to fetch evidence vault entry" });
    }
  });
  
  // Create evidence vault entry
  app.post("/api/evidence-vault", isAuthenticated, async (req, res) => {
    try {
      const parsed = insertEvidenceVaultSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Invalid data", errors: parsed.error.errors });
      }
      
      const [newEntry] = await db.insert(evidenceVault)
        .values(parsed.data)
        .returning();
      
      res.status(201).json(newEntry);
    } catch (error) {
      console.error("Error creating evidence vault entry:", error);
      res.status(500).json({ message: "Failed to create evidence vault entry" });
    }
  });
  
  // Update evidence vault entry
  app.patch("/api/evidence-vault/:id", isAuthenticated, async (req, res) => {
    try {
      const { hookContent, ewsScore, sourceUrl, personaCode } = req.body;
      
      const [updated] = await db.update(evidenceVault)
        .set({
          hookContent: hookContent !== undefined ? hookContent : undefined,
          ewsScore: ewsScore !== undefined ? Number(ewsScore) : undefined,
          sourceUrl: sourceUrl !== undefined ? sourceUrl : undefined,
          personaCode: personaCode !== undefined ? personaCode : undefined,
        })
        .where(eq(evidenceVault.id, Number(req.params.id)))
        .returning();
      
      if (!updated) {
        return res.status(404).json({ message: "Evidence vault entry not found" });
      }
      
      res.json(updated);
    } catch (error) {
      console.error("Error updating evidence vault entry:", error);
      res.status(500).json({ message: "Failed to update evidence vault entry" });
    }
  });
  
  // Increment usage count (called when hook is used in a script)
  app.post("/api/evidence-vault/:id/use", isAuthenticated, async (req, res) => {
    try {
      const [entry] = await db.select()
        .from(evidenceVault)
        .where(eq(evidenceVault.id, Number(req.params.id)));
      
      if (!entry) {
        return res.status(404).json({ message: "Evidence vault entry not found" });
      }
      
      const [updated] = await db.update(evidenceVault)
        .set({ usageCount: (entry.usageCount || 0) + 1 })
        .where(eq(evidenceVault.id, Number(req.params.id)))
        .returning();
      
      res.json(updated);
    } catch (error) {
      console.error("Error incrementing usage count:", error);
      res.status(500).json({ message: "Failed to increment usage count" });
    }
  });
  
  // Delete evidence vault entry
  app.delete("/api/evidence-vault/:id", isAuthenticated, requireRole(["admin", "ceo"]), async (req, res) => {
    try {
      const [deleted] = await db.delete(evidenceVault)
        .where(eq(evidenceVault.id, Number(req.params.id)))
        .returning();
      
      if (!deleted) {
        return res.status(404).json({ message: "Evidence vault entry not found" });
      }
      
      res.json({ message: "Entry deleted", entry: deleted });
    } catch (error) {
      console.error("Error deleting evidence vault entry:", error);
      res.status(500).json({ message: "Failed to delete evidence vault entry" });
    }
  });

  // SEED DATA
  await seedDatabase();

  // Seed default settings if not present
  await seedDefaultSettings();

  // Seed default Profit First accounts
  await seedProfitFirstAccounts();

  return httpServer;
}

async function seedDefaultSettings() {
  const leadSources = await storage.getSetting("leadSources");
  if (!leadSources) {
    await storage.setSetting("leadSources", {
      sources: ["Amplifi", "Customer Referral", "Website", "Social Media", "Other"]
    });
  }

  const staleness = await storage.getSetting("staleness");
  if (!staleness) {
    await storage.setSetting("staleness", {
      warningDays: 7,
      criticalDays: 14,
      penaltyPercent: 5
    });
  }

  const businessDefaults = await storage.getSetting("businessDefaults");
  if (!businessDefaults) {
    await storage.setSetting("businessDefaults", {
      defaultTravelRate: 4.00,
      dispatchLocations: ["Brooklyn, NY", "Troy, NY", "Manhattan, NY"],
      defaultBimDeliverable: "Revit",
      defaultBimVersion: ""
    });
  }
}

async function seedProfitFirstAccounts() {
  const existingAccounts = await storage.getAccounts();
  if (existingAccounts.length === 0) {
    console.log("Seeding Profit First accounts...");
    
    // Default Profit First allocations
    await storage.createAccount({
      accountType: "Operating",
      actualBalance: 0,
      virtualBalance: 0,
      allocationPercent: 76,
      notes: "Main operating expenses"
    });
    
    await storage.createAccount({
      accountType: "Taxes",
      actualBalance: 0,
      virtualBalance: 0,
      allocationPercent: 10,
      notes: "Quarterly tax reserves"
    });
    
    await storage.createAccount({
      accountType: "Debt",
      actualBalance: 0,
      virtualBalance: 0,
      allocationPercent: 4,
      notes: "Debt paydown fund"
    });
    
    await storage.createAccount({
      accountType: "Marketing",
      actualBalance: 0,
      virtualBalance: 0,
      allocationPercent: 10,
      notes: "Marketing and growth"
    });
    
    console.log("Profit First accounts seeded.");
  }
}

async function seedDatabase() {
  const leads = await storage.getLeads();
  if (leads.length === 0) {
    console.log("Seeding database...");
    
    const lead1 = await storage.createLead({
      clientName: "Acme Corp",
      projectAddress: "123 Industrial Way",
      value: 15000,
      dealStage: "Proposal",
      probability: 60,
      notes: "Interested in high-res scanning for warehouse retrofit.",
      leadPriority: 3,
    });

    const lead2 = await storage.createLead({
      clientName: "Skyline Architects",
      projectAddress: "450 Main St (Historic)",
      value: 8500,
      dealStage: "Contacted",
      probability: 20,
      notes: "Needs exterior facade scan only.",
      leadPriority: 3,
    });

    await storage.createProject({
      name: "Acme Warehouse Phase 1",
      leadId: lead1.id,
      status: "Scheduling",
      priority: "High",
      progress: 25,
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 1 week
    });

    await storage.createFieldNote({
      leadId: lead1.id,
      rawContent: "Walked the site today. Need to scan the main boiler room, all overhead piping in sector B, and the exterior loading dock. Avoid the north wall, it's under construction. 30 scans estimated."
    });
  }
}
