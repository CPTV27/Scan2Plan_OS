import type { Express } from "express";
import { storage } from "../storage";
import { isAuthenticated, requireRole } from "../replit_integrations/auth";
import { calculateTravelDistance, validateShiftGate, createScanCalendarEvent, getTechnicianAvailability } from "../travel-scheduling";
import { log } from "../lib/logger";

export function registerProjectRoutes(app: Express): void {
  app.get("/api/projects", isAuthenticated, requireRole("ceo", "production"), async (req, res) => {
    const projects = await storage.getProjects();
    res.json(projects);
  });

  app.get("/api/projects/:id", isAuthenticated, requireRole("ceo", "production"), async (req, res) => {
    const project = await storage.getProject(Number(req.params.id));
    if (!project) return res.status(404).json({ message: "Project not found" });
    res.json(project);
  });

  app.post("/api/projects", isAuthenticated, requireRole("ceo"), async (req, res) => {
    try {
      const project = await storage.createProject(req.body);
      res.status(201).json(project);
    } catch (err) {
      return res.status(400).json({ message: "Failed to create project" });
    }
  });

  app.patch("/api/projects/:id", isAuthenticated, requireRole("ceo", "production"), async (req, res) => {
    const projectId = Number(req.params.id);
    const input = req.body;
    
    const existingProject = await storage.getProject(projectId);
    if (!existingProject) {
      return res.status(404).json({ message: "Project not found" });
    }
    
    const actualSqft = input.actualSqft ?? existingProject.actualSqft;
    const estimatedSqft = input.estimatedSqft ?? existingProject.estimatedSqft;
    
    if (actualSqft && estimatedSqft) {
      const variance = ((actualSqft - estimatedSqft) / estimatedSqft) * 100;
      (input as any).sqftVariance = variance.toFixed(2);
      
      if (Math.abs(variance) <= 10) {
        (input as any).sqftAuditComplete = true;
      } else {
        (input as any).sqftAuditComplete = false;
      }
    }

    const project = await storage.updateProject(projectId, input);
    
    if (input.actualSqft !== undefined || input.estimatedSqft !== undefined || input.leadId !== undefined) {
      try {
        const { updateProjectMargin } = await import("../services/marginCalculator");
        await updateProjectMargin(projectId);
      } catch (err) {
        log("ERROR: Failed to update project margin - " + (err as any)?.message);
      }
    }
    
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

  app.post("/api/projects/:id/recalculate-margin", isAuthenticated, requireRole("ceo", "production"), async (req, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const { updateProjectMargin } = await import("../services/marginCalculator");
      const result = await updateProjectMargin(projectId);
      if (!result) {
        return res.status(400).json({ message: "Could not calculate margin - missing sqft or revenue data" });
      }
      res.json(result);
    } catch (error) {
      log("ERROR: Margin calculation error - " + (error as any)?.message);
      res.status(500).json({ message: "Failed to calculate margin" });
    }
  });

  app.post("/api/projects/recalculate-all-margins", isAuthenticated, requireRole("ceo"), async (req, res) => {
    try {
      const { recalculateAllProjectMargins } = await import("../services/marginCalculator");
      const count = await recalculateAllProjectMargins();
      res.json({ message: `Recalculated margins for ${count} projects`, count });
    } catch (error) {
      log("ERROR: Batch margin calculation error - " + (error as any)?.message);
      res.status(500).json({ message: "Failed to recalculate margins" });
    }
  });

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

  app.post("/api/travel/calculate", isAuthenticated, requireRole("ceo", "production", "sales"), async (req, res) => {
    try {
      const { destination, origin } = req.body;
      
      log("[Travel Calculate] Request: " + JSON.stringify({ destination, origin }));
      
      if (!destination) {
        return res.status(400).json({ message: "Destination address is required" });
      }

      const result = await calculateTravelDistance(destination, origin);
      
      log("[Travel Calculate] Result: " + JSON.stringify(result));
      
      if (!result) {
        return res.status(400).json({ message: "Could not calculate travel distance. Check the address." });
      }

      const shiftValidation = validateShiftGate(result.durationMinutes);

      res.json({
        ...result,
        shiftGate: shiftValidation,
      });
    } catch (error) {
      log("ERROR: Travel calculation error - " + (error as any)?.message);
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
      log("ERROR: Calendar availability error - " + (error as any)?.message);
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
      log("ERROR: Create scan event error - " + (error as any)?.message);
      res.status(500).json({ message: "Failed to schedule scan" });
    }
  });

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

      const { performSiteRealityAudit } = await import("../site-reality-audit");
      
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
      log("ERROR: Site reality audit error - " + (error as any)?.message);
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

      const { performSiteRealityAudit } = await import("../site-reality-audit");
      
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
      log("ERROR: Site reality audit error - " + (error as any)?.message);
      res.status(500).json({ message: "Failed to perform site audit" });
    }
  });

  let cashflowCache: { data: any; timestamp: number } | null = null;
  const CASHFLOW_CACHE_TTL = 5 * 60 * 1000;
  
  app.get("/api/predictive-cashflow", isAuthenticated, requireRole(["ceo"]), async (req, res) => {
    try {
      if (cashflowCache && Date.now() - cashflowCache.timestamp < CASHFLOW_CACHE_TTL) {
        return res.json(cashflowCache.data);
      }
      
      const { getPredictiveCashflow } = await import("../predictive-cashflow");
      const result = await getPredictiveCashflow();
      
      cashflowCache = { data: result, timestamp: Date.now() };
      
      res.json(result);
    } catch (error) {
      log("ERROR: Predictive cashflow error - " + (error as any)?.message);
      res.status(500).json({ message: "Failed to generate cashflow forecast" });
    }
  });
}
