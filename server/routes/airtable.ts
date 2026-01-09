import type { Express } from "express";
import { storage } from "../storage";
import { isAuthenticated, requireRole } from "../replit_integrations/auth";
import { getTimeEntries, isAirtableConfigured, getAirtableOverview, getAirtableAnalytics, AIRTABLE_WRITE_ENABLED, syncProjectToAirtable } from "../airtable";
import { log } from "../lib/logger";

export function registerAirtableRoutes(app: Express): void {
  app.get("/api/airtable/time-entries", isAuthenticated, requireRole("ceo", "production"), async (req, res) => {
    try {
      const entries = await getTimeEntries();
      res.json(entries);
    } catch (err: any) {
      log("ERROR: Airtable time entries error - " + (err?.message || err));
      res.status(500).json({ message: err.message || "Failed to fetch time entries" });
    }
  });

  app.get("/api/airtable/overview", isAuthenticated, requireRole("ceo"), async (req, res) => {
    try {
      const overview = await getAirtableOverview();
      res.json(overview);
    } catch (err: any) {
      log("ERROR: Airtable overview error - " + (err?.message || err));
      res.status(500).json({ message: err.message || "Failed to fetch Airtable overview" });
    }
  });

  app.get("/api/airtable/analytics", isAuthenticated, requireRole("ceo"), async (req, res) => {
    try {
      const analytics = await getAirtableAnalytics();
      res.json(analytics);
    } catch (err: any) {
      log("ERROR: Airtable analytics error - " + (err?.message || err));
      res.status(500).json({ message: err.message || "Failed to fetch Airtable analytics" });
    }
  });

  app.get("/api/integrations/airtable/status", isAuthenticated, requireRole("ceo"), async (req, res) => {
    res.json({ 
      configured: isAirtableConfigured(),
      writeEnabled: AIRTABLE_WRITE_ENABLED,
      features: {
        timeEntries: isAirtableConfigured(),
        projectSync: isAirtableConfigured() && AIRTABLE_WRITE_ENABLED,
        reporting: isAirtableConfigured()
      }
    });
  });

  app.post("/api/airtable/sync-project/:projectId", isAuthenticated, requireRole("ceo", "production"), async (req, res) => {
    try {
      const projectId = Number(req.params.projectId);
      const project = await storage.getProject(projectId);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }
      const result = await syncProjectToAirtable(project);
      res.json(result);
    } catch (err: any) {
      log("ERROR: Airtable sync error - " + (err?.message || err));
      res.status(500).json({ message: err.message || "Failed to sync to Airtable" });
    }
  });
}
