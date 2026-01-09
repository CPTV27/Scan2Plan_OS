import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { db } from "./db";
import { desc } from "drizzle-orm";
import { missionLogs } from "@shared/schema";
import { setupAuth, registerAuthRoutes, isAuthenticated, requireRole } from "./replit_integrations/auth";
import { asyncHandler } from "./middleware/errorHandler";
import { registerChatRoutes } from "./replit_integrations/chat";
import { registerImageRoutes } from "./replit_integrations/image";
import OpenAI from "openai";
import { applyStalenessPenalties, getStalenessStatus } from "./staleness";
import { calculateProbability, recalculateAllProbabilities, getStageSpecificStaleness } from "./probability";
import multer from "multer";
import fs from "fs";
import { log } from "./lib/logger";

import { registerUserRoutes } from "./routes/users";
import { registerLeadRoutes } from "./routes/leads";
import { registerCpqRoutes } from "./routes/cpq";
import { registerHubspotRoutes } from "./routes/hubspot";
import { registerGHLRoutes } from "./routes/ghl";
import { registerGoogleRoutes } from "./routes/google";
import { registerAnalyticsRoutes } from "./routes/analytics";
import { registerProjectRoutes } from "./routes/projects";
import { registerMarketingRoutes } from "./routes/marketing";
import { registerTimeLogRoutes } from "./routes/timeLogs";
import { registerWebhookRoutes } from "./routes/webhooks";
import { registerQuickbooksRoutes } from "./routes/quickbooks";
import { registerInvoiceRoutes } from "./routes/invoices";
import { registerAirtableRoutes } from "./routes/airtable";
import { registerAIRoutes } from "./routes/ai";
import pandaDocRoutes from "./routes/pandadoc";
import brandEngineRoutes from "./routes/brandEngine";
import intelligenceRoutes from "./routes/intelligence";

const upload = multer({ dest: "/tmp/uploads/" });

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

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

Also identify any important proposal fields that don't map to the above categories and list them in "unmappedFields" as {field, value} pairs.

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
    log("ERROR: AI extraction error - " + (error?.message || error));
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

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  await setupAuth(app);
  registerAuthRoutes(app);

  registerChatRoutes(app);
  registerImageRoutes(app);

  registerUserRoutes(app);
  await registerLeadRoutes(app);
  await registerCpqRoutes(app);
  await registerHubspotRoutes(app);
  registerGHLRoutes(app);
  await registerGoogleRoutes(app);
  registerAnalyticsRoutes(app);
  registerProjectRoutes(app);
  registerMarketingRoutes(app);
  registerTimeLogRoutes(app);
  await registerWebhookRoutes(app);
  registerQuickbooksRoutes(app);
  registerInvoiceRoutes(app);
  registerAirtableRoutes(app);
  registerAIRoutes(app);
  app.use("/api/pandadoc", pandaDocRoutes);
  app.use("/api/brand", brandEngineRoutes);
  app.use("/api/intelligence", intelligenceRoutes);

  app.post("/api/leads/import-pdf", isAuthenticated, requireRole("ceo", "sales"), upload.single("file"), asyncHandler(async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      const buffer = fs.readFileSync(req.file.path);
      fs.unlinkSync(req.file.path);

      const { text } = await parsePdf(buffer);
      
      if (!text || text.trim().length < 50) {
        return res.status(400).json({ message: "Could not extract text from PDF. File may be image-based or corrupted." });
      }

      const extracted = await extractDealFromPDF(text, req.file.originalname);

      const leadData = {
        ...extracted,
        dealStage: "Leads" as const,
        probability: 50,
        leadPriority: 3,
        notes: extracted.notes 
          ? `${extracted.notes}\n\n[Imported from PDF: ${req.file.originalname}]`
          : `[Imported from PDF: ${req.file.originalname}]`,
      };

      const lead = await storage.createLead(leadData);

      res.status(201).json({
        lead,
        extracted,
        message: `Successfully imported lead from "${req.file.originalname}"`,
        hasUnmappedFields: extracted.unmappedFields.length > 0,
      });
    } catch (err: any) {
      log("ERROR: PDF import error - " + (err?.message || err));
      res.status(500).json({ message: err.message || "Failed to import PDF" });
    }
  }));

  app.get("/api/staleness/status", isAuthenticated, requireRole("ceo", "sales"), asyncHandler(async (req, res) => {
    const leads = await storage.getLeads();
    const status = getStalenessStatus(leads);
    res.json(status);
  }));

  app.post("/api/staleness/apply", isAuthenticated, requireRole("ceo"), asyncHandler(async (req, res) => {
    const leads = await storage.getLeads();
    const results = applyStalenessPenalties(leads);
    res.json(results);
  }));

  app.post("/api/probability/recalculate", isAuthenticated, requireRole("ceo"), asyncHandler(async (req, res) => {
    const results = await recalculateAllProbabilities();
    res.json(results);
  }));

  app.get("/api/leads/:id/probability-factors", isAuthenticated, requireRole("ceo", "sales"), asyncHandler(async (req, res) => {
    const leadId = Number(req.params.id);
    const lead = await storage.getLead(leadId);
    if (!lead) return res.status(404).json({ message: "Lead not found" });
    
    const factors = calculateProbability(lead);
    const staleness = getStageSpecificStaleness(lead);
    
    res.json({
      currentProbability: lead.probability,
      calculatedProbability: factors.finalScore,
      factors,
      staleness,
      lastContactDate: lead.lastContactDate,
      dealStage: lead.dealStage,
    });
  }));

  app.get("/api/mission-logs", isAuthenticated, requireRole("ceo", "production"), asyncHandler(async (req, res) => {
    try {
      const logs = await db.select().from(missionLogs).orderBy(desc(missionLogs.missionDate)).limit(100);
      res.json(logs);
    } catch (error: any) {
      log("ERROR: Error fetching mission logs - " + (error?.message || error));
      res.status(500).json({ message: error.message });
    }
  }));

  app.post("/api/mission-logs", isAuthenticated, requireRole("ceo", "production"), asyncHandler(async (req, res) => {
    try {
      const { projectId, techId, notes } = req.body;
      
      const [newLog] = await db.insert(missionLogs).values({
        projectId: Number(projectId),
        techId: techId?.toString() || (req.user as any)?.id?.toString() || "",
        notes: notes || null,
        missionDate: new Date(),
      }).returning();
      
      res.status(201).json(newLog);
    } catch (error: any) {
      log("ERROR: Error creating mission log - " + (error?.message || error));
      res.status(500).json({ message: error.message });
    }
  }));

  app.post("/api/projects/:projectId/completion-checklist", isAuthenticated, requireRole("ceo", "production"), asyncHandler(async (req, res) => {
    try {
      const projectId = Number(req.params.projectId);
      const project = await storage.getProject(projectId);
      
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      const items = req.body.items || [];
      const allComplete = items.length > 0 && items.every((item: any) => item.completed);
      
      await storage.updateProject(projectId, {
        status: allComplete ? "Complete" : project.status,
      } as any);

      res.json({ success: true, allComplete });
    } catch (error: any) {
      log("ERROR: Error updating completion checklist - " + (error?.message || error));
      res.status(500).json({ message: error.message });
    }
  }));

  app.get("/api/field-translation/status", isAuthenticated, asyncHandler(async (req, res) => {
    const hasOpenAI = !!process.env.AI_INTEGRATIONS_OPENAI_API_KEY;
    res.json({ enabled: hasOpenAI });
  }));

  app.post("/api/field-translation/translate", isAuthenticated, asyncHandler(async (req, res) => {
    try {
      const { rawNote, projectId } = req.body;
      
      if (!rawNote || typeof rawNote !== "string") {
        return res.status(400).json({ message: "rawNote is required" });
      }

      if (!process.env.AI_INTEGRATIONS_OPENAI_API_KEY) {
        return res.status(503).json({ message: "AI translation service not configured" });
      }

      const systemPrompt = `You are a technical documentation assistant for a laser scanning and BIM company.

Transform messy field notes from technicians into:
1. A clear, professional summary suitable for client communication
2. Structured data extraction

Return ONLY valid JSON:
{
  "professionalSummary": "Polished version suitable for client emails",
  "technicalNotes": "Technical details for internal use",
  "extractedData": {
    "sqftScanned": number or null,
    "roomsScanned": number or null,
    "issuesFound": ["array of issues"],
    "equipmentUsed": ["array of equipment"],
    "durationEstimate": "estimated time spent"
  },
  "actionItems": ["any follow-up actions needed"],
  "clientReady": true/false
}`;

      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Transform these field notes:\n\n${rawNote}` }
        ],
        temperature: 0.3,
        response_format: { type: "json_object" }
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error("No response from AI");
      }

      const translation = JSON.parse(content);

      if (projectId) {
        await db.insert(missionLogs).values({
          projectId: Number(projectId),
          techId: (req.user as any)?.id?.toString() || "system",
          notes: translation.professionalSummary,
          missionDate: new Date(),
        });
      }

      res.json(translation);
    } catch (error: any) {
      log("ERROR: Field translation error - " + (error?.message || error));
      res.status(500).json({ message: error.message || "Translation failed" });
    }
  }));

  app.get("/api/daily-summary", isAuthenticated, requireRole("ceo"), asyncHandler(async (req, res) => {
    try {
      const leads = await storage.getLeads();
      const projects = await storage.getProjects();
      
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const pipelineValue = leads
        .filter(l => l.dealStage !== "Closed Won" && l.dealStage !== "Closed Lost")
        .reduce((sum, l) => sum + Number(l.value || 0), 0);
      
      const weightedValue = leads
        .filter(l => l.dealStage !== "Closed Won" && l.dealStage !== "Closed Lost")
        .reduce((sum, l) => sum + (Number(l.value || 0) * Number(l.probability || 0) / 100), 0);
      
      const activeProjects = projects.filter(p => 
        p.status !== "Complete" && p.status !== "Cancelled"
      ).length;
      
      res.json({
        pipelineValue,
        weightedValue,
        activeLeads: leads.filter(l => l.dealStage !== "Closed Won" && l.dealStage !== "Closed Lost").length,
        activeProjects,
        staleLeads: leads.filter(l => {
          if (!l.lastContactDate) return true;
          const daysSince = (Date.now() - new Date(l.lastContactDate).getTime()) / (1000 * 60 * 60 * 24);
          return daysSince > 14;
        }).length,
        generatedAt: new Date().toISOString(),
      });
    } catch (error: any) {
      log("ERROR: Daily summary error - " + (error?.message || error));
      res.status(500).json({ message: error.message });
    }
  }));

  return httpServer;
}
