import type { Express } from "express";
import { storage } from "../storage";
import { isAuthenticated, requireRole } from "../replit_integrations/auth";
import { asyncHandler } from "../middleware/errorHandler";
import { z } from "zod";
import { generateUPID } from "@shared/utils/projectId";
import { nanoid } from "nanoid";
import { log } from "../lib/logger";

export async function registerCpqRoutes(app: Express): Promise<void> {
  const CPQ_API_KEY = process.env.CPQ_API_KEY;
  const CRM_API_KEY = process.env.CRM_API_KEY;
  
  // Middleware for internal CPQ calls (CRM → CPQ direction)
  const verifyCpqAuth = (req: any, res: any, next: any) => {
    if (!CPQ_API_KEY) {
      log("WARN: CPQ_API_KEY not configured - CPQ endpoints disabled");
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
  
  // Middleware for external CPQ app calls (CPQ → CRM direction)
  const verifyCrmApiKey = (req: any, res: any, next: any) => {
    if (!CRM_API_KEY) {
      log("WARN: CRM_API_KEY not configured - external CPQ integration disabled");
      return res.status(503).json({ 
        message: "CRM API integration not configured. Set CRM_API_KEY environment variable." 
      });
    }
    
    // Support both x-api-key header and Authorization Bearer
    const apiKey = req.headers["x-api-key"] || 
                   (req.headers.authorization?.startsWith("Bearer ") 
                     ? req.headers.authorization.substring(7) 
                     : null);
    
    if (!apiKey) {
      return res.status(401).json({ 
        message: "Missing API key. Use x-api-key header or Authorization: Bearer <CRM_API_KEY>" 
      });
    }
    
    if (apiKey !== CRM_API_KEY) {
      return res.status(403).json({ message: "Invalid API key" });
    }
    
    next();
  };

  // Helper function to normalize quote data before saving
  // - Converts travel.dispatchLocation to uppercase for legacy system compatibility
  // - Backfills areas[].kind based on buildingType (14-15 = landscape, others = standard)
  const normalizeQuoteData = (data: any): any => {
    const normalized = { ...data };
    
    // Normalize travel.dispatchLocation to uppercase (with type guard)
    if (normalized.travel && typeof normalized.travel.dispatchLocation === 'string') {
      normalized.travel = {
        ...normalized.travel,
        dispatchLocation: normalized.travel.dispatchLocation.toUpperCase(),
      };
    }
    
    // Also normalize top-level dispatchLocation if present (with type guard)
    if (typeof normalized.dispatchLocation === 'string') {
      normalized.dispatchLocation = normalized.dispatchLocation.toUpperCase();
    }
    
    // Backfill areas[].kind based on buildingType
    if (Array.isArray(normalized.areas)) {
      normalized.areas = normalized.areas.map((area: any) => {
        const buildingType = String(area.buildingType || '');
        // Building types 14 and 15 are landscape types
        const isLandscape = buildingType === '14' || buildingType === '15' || 
                           buildingType === 'landscape_built' || buildingType === 'landscape_natural';
        return {
          ...area,
          kind: area.kind || (isLandscape ? 'landscape' : 'standard'),
        };
      });
    }
    
    return normalized;
  };

  const cpqSyncSchema = z.object({
    value: z.number().optional(),
    dealStage: z.enum(["Leads", "Contacted", "Proposal", "Negotiation", "On Hold", "Closed Won", "Closed Lost"]).optional(),
    quoteUrl: z.string().url().optional(),
    quoteNumber: z.string().optional(),
    quoteVersion: z.number().int().positive().optional(),
  });

  app.post("/api/cpq/sync/:leadId", verifyCpqAuth, asyncHandler(async (req, res) => {
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

      const isClosingWon = input.dealStage === "Closed Won" && lead.dealStage !== "Closed Won";

      const updates: Record<string, any> = {};
      if (input.value !== undefined) updates.value = input.value;
      if (input.dealStage !== undefined) updates.dealStage = input.dealStage;
      if (input.quoteUrl !== undefined) updates.quoteUrl = input.quoteUrl;
      if (input.quoteNumber !== undefined) updates.quoteNumber = input.quoteNumber;
      if (input.quoteVersion !== undefined) updates.quoteVersion = input.quoteVersion;

      const updatedLead = await storage.updateLead(leadId, updates);

      let projectCreated = false;
      if (isClosingWon) {
        const existingProject = await storage.getProjectByLeadId(leadId);
        if (!existingProject) {
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
            status: "Scheduling",
            priority: "Medium",
            progress: 0,
          } as any);
          projectCreated = true;
          log(`Auto-created production project via CPQ for lead ${leadId} (${updatedLead.clientName}) with UPID: ${universalProjectId}`);
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
      log("ERROR: CPQ sync error - " + (err as any)?.message);
      return res.status(500).json({ message: "Failed to sync with CPQ" });
    }
  }));

  app.get("/api/cpq/lead/:leadId", verifyCpqAuth, asyncHandler(async (req, res) => {
    const leadId = Number(req.params.leadId);
    const lead = await storage.getLead(leadId);
    if (!lead) {
      return res.status(404).json({ message: "Lead not found" });
    }
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
  }));

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

  app.post("/api/cpq/integrity/:leadId", verifyCpqAuth, asyncHandler(async (req, res) => {
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

      log(`CPQ Integrity Audit received for lead ${leadId}: ${input.status}`);
      res.json({ 
        success: true, 
        lead: updatedLead,
        message: `Integrity status updated to ${input.status}`
      });
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      log("ERROR: CPQ integrity sync error - " + (err as any)?.message);
      return res.status(500).json({ message: "Failed to sync integrity audit" });
    }
  }));

  app.post("/api/leads/:id/request-override", isAuthenticated, requireRole("ceo", "sales"), asyncHandler(async (req, res) => {
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

      log(`Override requested for lead ${leadId}: ${justification}`);
      
      res.json({ 
        success: true, 
        message: "Override request submitted. Awaiting CEO approval.",
        leadId,
        justification,
      });
    } catch (err) {
      log("ERROR: Override request error - " + (err as any)?.message);
      return res.status(500).json({ message: "Failed to submit override request" });
    }
  }));

  app.post("/api/cpq/quotes", isAuthenticated, requireRole("ceo", "sales"), asyncHandler(async (req, res) => {
    try {
      const user = req.user as any;
      const normalizedData = normalizeQuoteData(req.body);
      const quote = await storage.createCpqQuote({
        ...normalizedData,
        createdBy: user?.claims?.email || user?.username || "unknown",
      });
      res.status(201).json(quote);
    } catch (error) {
      log("ERROR: Error creating CPQ quote - " + (error as any)?.message);
      res.status(500).json({ message: "Failed to create quote" });
    }
  }));

  app.get("/api/cpq/quotes/:id", isAuthenticated, requireRole("ceo", "sales"), asyncHandler(async (req, res) => {
    try {
      const quoteId = Number(req.params.id);
      const quote = await storage.getCpqQuote(quoteId);
      if (!quote) return res.status(404).json({ message: "Quote not found" });
      res.json(quote);
    } catch (error) {
      log("ERROR: Error fetching CPQ quote - " + (error as any)?.message);
      res.status(500).json({ message: "Failed to fetch quote" });
    }
  }));

  app.patch("/api/cpq/quotes/:id", isAuthenticated, requireRole("ceo", "sales"), asyncHandler(async (req, res) => {
    try {
      const quoteId = Number(req.params.id);
      const normalizedData = normalizeQuoteData(req.body);
      const quote = await storage.updateCpqQuote(quoteId, normalizedData);
      if (!quote) return res.status(404).json({ message: "Quote not found" });
      res.json(quote);
    } catch (error) {
      log("ERROR: Error updating CPQ quote - " + (error as any)?.message);
      res.status(500).json({ message: "Failed to update quote" });
    }
  }));

  app.post("/api/leads/:id/cpq-quotes", isAuthenticated, requireRole("ceo", "sales"), asyncHandler(async (req, res) => {
    try {
      const leadId = Number(req.params.id);
      log(`[CPQ Quote Create] LeadId: ${leadId}, Body keys: ${Object.keys(req.body)}`);
      
      const lead = await storage.getLead(leadId);
      if (!lead) {
        log(`[CPQ Quote Create] Lead not found: ${leadId}`);
        return res.status(404).json({ message: "Lead not found" });
      }

      const user = req.user as any;
      
      // Normalize quote data (uppercase dispatch locations, backfill area kinds)
      const normalizedData = normalizeQuoteData(req.body);
      
      const projectName = normalizedData.projectName || lead.projectName || lead.clientName || `Project-${leadId}`;
      const projectAddress = normalizedData.projectAddress || lead.projectAddress || "Address not specified";
      const typeOfBuilding = normalizedData.typeOfBuilding || lead.buildingType || "1";
      // Use normalized travel.dispatchLocation or fall back to lead's dispatch location (also uppercase)
      const dispatchLocation = normalizedData.travel?.dispatchLocation || 
                              normalizedData.dispatchLocation || 
                              normalizedData.requestData?.dispatchLocation ||
                              (lead.dispatchLocation ? lead.dispatchLocation.toUpperCase() : "WOODSTOCK");
      
      // Extract areas from requestData if not at top level (frontend sends it nested)
      const areas = normalizedData.areas || normalizedData.requestData?.areas || [];
      
      const quote = await storage.createCpqQuote({
        ...normalizedData,
        leadId,
        projectName,
        projectAddress,
        typeOfBuilding,
        dispatchLocation,
        areas,
        createdBy: user?.claims?.email || user?.username || "unknown",
      });
      log(`[CPQ Quote Create] Success, quoteId: ${quote.id}, dispatchLocation: ${dispatchLocation}`);
      res.status(201).json(quote);
    } catch (error: any) {
      log("ERROR: [CPQ Quote Create] - " + (error?.message || error));
      res.status(500).json({ message: error?.message || "Failed to create quote" });
    }
  }));

  app.get("/api/leads/:id/cpq-quotes", isAuthenticated, requireRole("ceo", "sales"), asyncHandler(async (req, res) => {
    try {
      const leadId = Number(req.params.id);
      const quotes = await storage.getCpqQuotesByLead(leadId);
      res.json(quotes);
    } catch (error) {
      log("ERROR: Error fetching CPQ quotes - " + (error as any)?.message);
      res.status(500).json({ message: "Failed to fetch quotes" });
    }
  }));

  app.get("/api/cpq-quotes/:id", isAuthenticated, requireRole("ceo", "sales"), asyncHandler(async (req, res) => {
    try {
      const quoteId = Number(req.params.id);
      const quote = await storage.getCpqQuote(quoteId);
      if (!quote) return res.status(404).json({ message: "Quote not found" });
      res.json(quote);
    } catch (error) {
      log("ERROR: Error fetching CPQ quote - " + (error as any)?.message);
      res.status(500).json({ message: "Failed to fetch quote" });
    }
  }));

  app.patch("/api/cpq-quotes/:id", isAuthenticated, requireRole("ceo", "sales"), asyncHandler(async (req, res) => {
    try {
      const quoteId = Number(req.params.id);
      const normalizedData = normalizeQuoteData(req.body);
      const quote = await storage.updateCpqQuote(quoteId, normalizedData);
      if (!quote) return res.status(404).json({ message: "Quote not found" });
      res.json(quote);
    } catch (error) {
      log("ERROR: Error updating CPQ quote - " + (error as any)?.message);
      res.status(500).json({ message: "Failed to update quote" });
    }
  }));

  app.delete("/api/cpq-quotes/:id", isAuthenticated, requireRole("ceo", "sales"), asyncHandler(async (req, res) => {
    try {
      const quoteId = Number(req.params.id);
      const quote = await storage.getCpqQuote(quoteId);
      if (!quote) return res.status(404).json({ message: "Quote not found" });
      await storage.deleteCpqQuote(quoteId);
      res.status(204).send();
    } catch (error) {
      log("ERROR: Error deleting CPQ quote - " + (error as any)?.message);
      res.status(500).json({ message: "Failed to delete quote" });
    }
  }));

  app.post("/api/cpq-quotes/:id/versions", isAuthenticated, requireRole("ceo", "sales"), asyncHandler(async (req, res) => {
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
      log("ERROR: Error creating CPQ quote version - " + (error as any)?.message);
      res.status(500).json({ message: "Failed to create quote version" });
    }
  }));

  app.post("/api/cpq/calculate-distance", isAuthenticated, requireRole("ceo", "sales"), asyncHandler(async (req, res) => {
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
      log("ERROR: Error calculating distance - " + (error as any)?.message);
      res.status(500).json({ error: "Failed to calculate distance" });
    }
  }));

  app.post("/api/cpq-quotes/:id/generate-link", isAuthenticated, requireRole("ceo", "sales"), asyncHandler(async (req, res) => {
    try {
      const quoteId = Number(req.params.id);
      const token = nanoid(12);
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      
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
      log("ERROR: Error generating client link - " + (error as any)?.message);
      res.status(500).json({ message: "Failed to generate link" });
    }
  }));

  app.get("/api/public/quote/:token", asyncHandler(async (req, res) => {
    try {
      const { token } = req.params;
      const quote = await storage.getCpqQuoteByToken(token);
      
      if (!quote) {
        return res.status(404).json({ message: "Link expired or invalid" });
      }
      
      if (quote.clientTokenExpiresAt && new Date() > new Date(quote.clientTokenExpiresAt)) {
        return res.status(410).json({ 
          message: "This link has expired. Please contact your sales representative for a new link.",
          expired: true
        });
      }
      
      res.json({
        id: quote.id,
        projectName: quote.projectName,
        clientName: quote.clientName,
        clientStatus: quote.clientStatus,
        unknowns: {
          siteStatus: quote.siteStatus === "ask_client",
          mepScope: quote.mepScope === "ask_client",
          actScanning: quote.actScanning === "ask_client",
          scanningOnly: quote.scanningOnly === "ask_client",
        }
      });
    } catch (error) {
      log("ERROR: Error fetching public quote - " + (error as any)?.message);
      res.status(500).json({ message: "Failed to load project details" });
    }
  }));

  app.post("/api/public/quote/:token", asyncHandler(async (req, res) => {
    try {
      const { token } = req.params;
      const { answers } = req.body;
      
      const quote = await storage.getCpqQuoteByToken(token);
      if (!quote) {
        return res.status(404).json({ message: "Link expired or invalid" });
      }
      
      if (quote.clientTokenExpiresAt && new Date() > new Date(quote.clientTokenExpiresAt)) {
        return res.status(410).json({ 
          message: "This link has expired. Please contact your sales representative for a new link.",
          expired: true
        });
      }
      
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
      
      await storage.updateCpqQuote(quote.id, {
        ...sanitizedAnswers,
        clientStatus: "answered"
      });
      
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
          log(`Notification sent to rep ${lead.ownerId} for quote ${quote.id}`);
        }
      }
      
      log(`Client input received for quote ${quote.id}. Ready for recalculation.`);
      
      res.json({ success: true });
    } catch (error) {
      log("ERROR: Error submitting client answers - " + (error as any)?.message);
      res.status(500).json({ message: "Failed to submit answers" });
    }
  }));

  // ============================================
  // EXTERNAL CPQ APP INTEGRATION ENDPOINTS
  // These endpoints allow an external CPQ application to:
  // 1. Fetch lead details for pre-filling quotes
  // 2. POST completed quotes back to the CRM
  // ============================================

  // GET /api/cpq/leads/:leadId - External CPQ fetches lead details
  app.get("/api/cpq/leads/:leadId", verifyCrmApiKey, asyncHandler(async (req, res) => {
    try {
      const leadId = Number(req.params.leadId);
      if (isNaN(leadId)) {
        return res.status(400).json({ message: "Invalid lead ID" });
      }
      
      const lead = await storage.getLead(leadId);
      if (!lead) {
        return res.status(404).json({ message: "Lead not found" });
      }
      
      // Return full lead data for CPQ pre-fill
      res.json({
        leadId: lead.id,
        company: lead.clientName,
        contactName: lead.contactName,
        contactEmail: lead.contactEmail,
        contactPhone: lead.contactPhone,
        projectName: lead.projectName,
        projectAddress: lead.projectAddress,
        buildingType: lead.buildingType,
        estimatedSqft: lead.sqft,
        scope: lead.scope,
        disciplines: lead.disciplines,
        bimDeliverable: lead.bimDeliverable,
        dispatchLocation: lead.dispatchLocation,
        paymentTerms: lead.paymentTerms,
        timeline: lead.timeline,
        notes: lead.notes,
        dealStage: lead.dealStage,
        value: lead.value,
        // CRM metadata
        crmLeadId: lead.id,
        crmQuoteNumber: lead.quoteNumber,
        crmQuoteVersion: lead.quoteVersion,
      });
    } catch (error) {
      log("ERROR: External CPQ lead fetch error - " + (error as any)?.message);
      res.status(500).json({ message: "Failed to fetch lead" });
    }
  }));

  // Zod schema for incoming quotes from external CPQ
  const externalQuoteSchema = z.object({
    leadId: z.number(),
    quoteNumber: z.string(),
    version: z.number().optional().default(1),
    clientName: z.string(),
    projectName: z.string(),
    projectAddress: z.string().optional(),
    totalPrice: z.number(),
    typeOfBuilding: z.string().optional(), // Numeric building type ID from CPQ
    areas: z.array(z.object({
      name: z.string(),
      buildingType: z.string(),
      squareFeet: z.number(),
      scope: z.string(),
      lod: z.string(),
      disciplines: z.array(z.string()),
    })).optional(),
    pricingBreakdown: z.object({
      items: z.array(z.object({
        label: z.string(),
        value: z.number(),
      })).optional(),
      subtotal: z.number().optional(),
      totalClientPrice: z.number(),
    }).optional(),
    travel: z.object({
      distance: z.number(),
      cost: z.number(),
    }).optional(),
    paymentTerms: z.string().optional(),
    margin: z.number().optional(),
    status: z.enum(["draft", "sent", "accepted", "rejected"]).optional(),
    externalQuoteId: z.string().optional(), // ID from the external CPQ system
    externalQuoteUrl: z.string().optional(), // URL to view quote in external CPQ
  });

  // POST /api/cpq/quotes/webhook - External CPQ sends completed quote
  app.post("/api/cpq/quotes/webhook", verifyCrmApiKey, asyncHandler(async (req, res) => {
    try {
      const input = externalQuoteSchema.parse(req.body);
      
      const lead = await storage.getLead(input.leadId);
      if (!lead) {
        return res.status(404).json({ message: "Lead not found" });
      }
      
      // Create a quote in the CRM from external CPQ data
      // Provide defaults for required cpqQuotes fields
      // typeOfBuilding: prefer CPQ payload, then lead if numeric, else default "1"
      const buildingTypeId = input.typeOfBuilding 
        || (/^\d+$/.test(lead.buildingType || '') ? lead.buildingType : "1");
      
      // Normalize dispatch location to uppercase
      const dispatchLocation = (lead.dispatchLocation || "WOODSTOCK").toUpperCase();
      
      // Build quote data and normalize it
      const quoteData = normalizeQuoteData({
        leadId: input.leadId,
        quoteNumber: input.quoteNumber,
        versionNumber: input.version,
        clientName: input.clientName,
        projectName: input.projectName,
        projectAddress: input.projectAddress || lead.projectAddress || "Not specified",
        typeOfBuilding: buildingTypeId,
        dispatchLocation,
        totalPrice: String(input.totalPrice),
        areas: input.areas || [],
        risks: [],
        services: {},
        scopingMode: false,
        pricingBreakdown: input.pricingBreakdown || { totalClientPrice: input.totalPrice },
        travel: input.travel,
        paymentTerms: input.paymentTerms || "standard",
        margin: input.margin,
        createdBy: "external-cpq",
        externalCpqId: input.externalQuoteId,
        externalCpqUrl: input.externalQuoteUrl,
      });
      
      const quote = await storage.createCpqQuote(quoteData as any);
      
      // Update lead with quote info
      await storage.updateLead(input.leadId, {
        quoteNumber: input.quoteNumber,
        quoteVersion: input.version,
        value: input.totalPrice,
        quoteUrl: input.externalQuoteUrl,
      });
      
      log(`External CPQ quote received for lead ${input.leadId}: ${input.quoteNumber} v${input.version} - $${input.totalPrice}`);
      
      res.status(201).json({
        success: true,
        quoteId: quote.id,
        leadId: input.leadId,
        message: "Quote received and linked to lead",
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Invalid quote data", 
          errors: error.errors 
        });
      }
      log("ERROR: External CPQ quote webhook error - " + (error as any)?.message);
      res.status(500).json({ message: "Failed to process quote" });
    }
  }));

  // GET /api/cpq/config - Returns CRM configuration for external CPQ
  app.get("/api/cpq/config", verifyCrmApiKey, asyncHandler(async (req, res) => {
    res.json({
      crmName: "Scan2Plan OS",
      version: "1.0",
      endpoints: {
        getLeadDetails: "/api/cpq/leads/:leadId",
        postQuote: "/api/cpq/quotes/webhook",
      },
      supportedFields: {
        lead: ["leadId", "company", "contactName", "contactEmail", "contactPhone", "projectName", "projectAddress", "buildingType", "estimatedSqft", "scope", "disciplines"],
        quote: ["leadId", "quoteNumber", "version", "clientName", "projectName", "projectAddress", "totalPrice", "areas", "pricingBreakdown", "travel", "paymentTerms", "margin"],
      },
    });
  }));

  // Send quote for signature via PandaDoc
  app.post("/api/cpq-quotes/:id/send-pandadoc", isAuthenticated, requireRole("ceo", "sales"), asyncHandler(async (req, res) => {
    if (!process.env.PANDADOC_API_KEY) {
      return res.status(503).json({ error: "PandaDoc integration not configured. Add PANDADOC_API_KEY to secrets." });
    }

    const quoteId = parseInt(req.params.id);
    const { message, subject } = req.body;

    const quote = await storage.getCpqQuote(quoteId);
    if (!quote) {
      return res.status(404).json({ error: "Quote not found" });
    }

    const lead = quote.leadId ? await storage.getLead(quote.leadId) : null;
    
    const recipientEmail = lead?.contactEmail || req.body.recipientEmail;
    const recipientName = lead?.contactName || req.body.recipientName;

    if (!recipientEmail || !recipientName) {
      return res.status(400).json({ error: "Recipient email and name required. Add contact info to the lead first." });
    }

    try {
      const { createDocumentFromPdf, sendDocument, waitForDocumentReady } = await import("../pandadoc");
      const { generateEstimatePDF } = await import("../pdf-generator");

      if (!lead) {
        return res.status(400).json({ error: "Quote must be associated with a lead to generate proposal" });
      }

      const doc = generateEstimatePDF({ lead });
      
      const chunks: Buffer[] = [];
      await new Promise<void>((resolve, reject) => {
        doc.on('data', (chunk: Buffer) => chunks.push(chunk));
        doc.on('end', () => resolve());
        doc.on('error', reject);
        doc.end();
      });
      const pdfBuffer = Buffer.concat(chunks);

      const documentName = `Proposal - ${quote.projectName || lead.projectName || 'Quote'} - ${quote.quoteNumber}`;
      const pandaDocDocument = await createDocumentFromPdf({
        name: documentName,
        pdfBuffer,
        recipientEmail,
        recipientName,
      });

      await waitForDocumentReady(pandaDocDocument.id);

      await sendDocument(
        pandaDocDocument.id, 
        message || 'Please review and sign the attached proposal.',
        subject || `Proposal: ${quote.projectName || lead.projectName}`
      );

      await storage.updateCpqQuote(quoteId, {
        pandadocDocumentId: pandaDocDocument.id,
        pandadocStatus: 'sent',
        pandadocSentAt: new Date(),
      });

      if (lead && lead.dealStage !== 'Proposal' && lead.dealStage !== 'Negotiation') {
        await storage.updateLead(lead.id, {
          dealStage: 'Proposal',
          lastContactDate: new Date(),
        });
      }

      log(`[PandaDoc] Proposal sent for quote ${quoteId} to ${recipientEmail}`);

      res.json({ 
        success: true, 
        documentId: pandaDocDocument.id,
        message: 'Proposal sent via PandaDoc for signature' 
      });
    } catch (error) {
      log("ERROR: PandaDoc send error - " + (error as any)?.message);
      res.status(500).json({ error: (error as any)?.message || 'Failed to send via PandaDoc' });
    }
  }));
}
