import type { Express } from "express";
import { storage } from "../storage";
import { isAuthenticated, requireRole } from "../replit_integrations/auth";
import { z } from "zod";
import { generateUPID } from "@shared/utils/projectId";
import { nanoid } from "nanoid";
import { log } from "../lib/logger";

export async function registerCpqRoutes(app: Express): Promise<void> {
  const CPQ_API_KEY = process.env.CPQ_API_KEY;
  
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

  const cpqSyncSchema = z.object({
    value: z.number().optional(),
    dealStage: z.enum(["Leads", "Contacted", "Proposal", "Negotiation", "On Hold", "Closed Won", "Closed Lost"]).optional(),
    quoteUrl: z.string().url().optional(),
    quoteNumber: z.string().optional(),
    quoteVersion: z.number().int().positive().optional(),
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
  });

  app.get("/api/cpq/lead/:leadId", verifyCpqAuth, async (req, res) => {
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
  });

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
  });

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
  });

  app.get("/api/cpq/pricing-matrix", isAuthenticated, requireRole("ceo", "sales"), async (req, res) => {
    log("WARN: [DEPRECATED] /api/cpq/pricing-matrix - use client-side pricing instead");
    try {
      const rates = await storage.getCpqPricingMatrix();
      res.json(rates);
    } catch (error) {
      log("ERROR: Error fetching CPQ pricing matrix - " + (error as any)?.message);
      res.status(500).json({ message: "Failed to fetch pricing matrix" });
    }
  });

  app.post("/api/cpq/quotes", isAuthenticated, requireRole("ceo", "sales"), async (req, res) => {
    try {
      const user = req.user as any;
      const quote = await storage.createCpqQuote({
        ...req.body,
        createdBy: user?.claims?.email || user?.username || "unknown",
      });
      res.status(201).json(quote);
    } catch (error) {
      log("ERROR: Error creating CPQ quote - " + (error as any)?.message);
      res.status(500).json({ message: "Failed to create quote" });
    }
  });

  app.get("/api/cpq/quotes/:id", isAuthenticated, requireRole("ceo", "sales"), async (req, res) => {
    try {
      const quoteId = Number(req.params.id);
      const quote = await storage.getCpqQuote(quoteId);
      if (!quote) return res.status(404).json({ message: "Quote not found" });
      res.json(quote);
    } catch (error) {
      log("ERROR: Error fetching CPQ quote - " + (error as any)?.message);
      res.status(500).json({ message: "Failed to fetch quote" });
    }
  });

  app.patch("/api/cpq/quotes/:id", isAuthenticated, requireRole("ceo", "sales"), async (req, res) => {
    try {
      const quoteId = Number(req.params.id);
      const quote = await storage.updateCpqQuote(quoteId, req.body);
      if (!quote) return res.status(404).json({ message: "Quote not found" });
      res.json(quote);
    } catch (error) {
      log("ERROR: Error updating CPQ quote - " + (error as any)?.message);
      res.status(500).json({ message: "Failed to update quote" });
    }
  });

  app.post("/api/leads/:id/cpq-quotes", isAuthenticated, requireRole("ceo", "sales"), async (req, res) => {
    try {
      const leadId = Number(req.params.id);
      log(`[CPQ Quote Create] LeadId: ${leadId}, Body keys: ${Object.keys(req.body)}`);
      
      const lead = await storage.getLead(leadId);
      if (!lead) {
        log(`[CPQ Quote Create] Lead not found: ${leadId}`);
        return res.status(404).json({ message: "Lead not found" });
      }

      const user = req.user as any;
      
      const projectName = req.body.projectName || lead.projectName || lead.clientName || `Project-${leadId}`;
      const projectAddress = req.body.projectAddress || lead.projectAddress || "Address not specified";
      const typeOfBuilding = req.body.typeOfBuilding || lead.buildingType || "1";
      const dispatchLocation = req.body.dispatchLocation || lead.dispatchLocation || "WOODSTOCK";
      
      const quote = await storage.createCpqQuote({
        ...req.body,
        leadId,
        projectName,
        projectAddress,
        typeOfBuilding,
        dispatchLocation,
        createdBy: user?.claims?.email || user?.username || "unknown",
      });
      log(`[CPQ Quote Create] Success, quoteId: ${quote.id}`);
      res.status(201).json(quote);
    } catch (error: any) {
      log("ERROR: [CPQ Quote Create] - " + (error?.message || error));
      res.status(500).json({ message: error?.message || "Failed to create quote" });
    }
  });

  app.get("/api/leads/:id/cpq-quotes", isAuthenticated, requireRole("ceo", "sales"), async (req, res) => {
    try {
      const leadId = Number(req.params.id);
      const quotes = await storage.getCpqQuotesByLead(leadId);
      res.json(quotes);
    } catch (error) {
      log("ERROR: Error fetching CPQ quotes - " + (error as any)?.message);
      res.status(500).json({ message: "Failed to fetch quotes" });
    }
  });

  app.get("/api/cpq-quotes/:id", isAuthenticated, requireRole("ceo", "sales"), async (req, res) => {
    try {
      const quoteId = Number(req.params.id);
      const quote = await storage.getCpqQuote(quoteId);
      if (!quote) return res.status(404).json({ message: "Quote not found" });
      res.json(quote);
    } catch (error) {
      log("ERROR: Error fetching CPQ quote - " + (error as any)?.message);
      res.status(500).json({ message: "Failed to fetch quote" });
    }
  });

  app.patch("/api/cpq-quotes/:id", isAuthenticated, requireRole("ceo", "sales"), async (req, res) => {
    try {
      const quoteId = Number(req.params.id);
      const quote = await storage.updateCpqQuote(quoteId, req.body);
      if (!quote) return res.status(404).json({ message: "Quote not found" });
      res.json(quote);
    } catch (error) {
      log("ERROR: Error updating CPQ quote - " + (error as any)?.message);
      res.status(500).json({ message: "Failed to update quote" });
    }
  });

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
      log("ERROR: Error creating CPQ quote version - " + (error as any)?.message);
      res.status(500).json({ message: "Failed to create quote version" });
    }
  });

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
  });

  app.post("/api/cpq-quotes/:id/generate-link", isAuthenticated, requireRole("ceo", "sales"), async (req, res) => {
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
  });

  app.get("/api/public/quote/:token", async (req, res) => {
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
  });

  app.post("/api/public/quote/:token", async (req, res) => {
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
  });
}
