import type { Express } from "express";
import { storage } from "../storage";
import { isAuthenticated, requireRole } from "../replit_integrations/auth";
import { log } from "../lib/logger";

export async function registerHubspotRoutes(app: Express): Promise<void> {
  const hubspotService = await import('../services/hubspot');

  app.get("/api/hubspot/status", isAuthenticated, requireRole("ceo", "sales"), async (req, res) => {
    try {
      const { testHubSpotConnection } = await import("../hubspot");
      const status = await testHubSpotConnection();
      res.json(status);
    } catch (err: any) {
      res.json({ connected: false, message: err.message });
    }
  });

  app.get("/api/hubspot/contacts", isAuthenticated, requireRole("ceo", "sales"), async (req, res) => {
    try {
      const { getHubSpotContacts } = await import("../hubspot");
      const contacts = await getHubSpotContacts(100);
      res.json(contacts);
    } catch (err: any) {
      log("ERROR: HubSpot contacts error - " + (err?.message || err));
      res.status(500).json({ message: err.message || "Failed to fetch HubSpot contacts" });
    }
  });

  app.get("/api/hubspot/deals", isAuthenticated, requireRole("ceo", "sales"), async (req, res) => {
    try {
      const { getHubSpotDeals } = await import("../hubspot");
      const deals = await getHubSpotDeals(100);
      res.json(deals);
    } catch (err: any) {
      log("ERROR: HubSpot deals error - " + (err?.message || err));
      res.status(500).json({ message: err.message || "Failed to fetch HubSpot deals" });
    }
  });

  app.get("/api/hubspot/companies", isAuthenticated, requireRole("ceo", "sales"), async (req, res) => {
    try {
      const { getHubSpotCompanies } = await import("../hubspot");
      const companies = await getHubSpotCompanies(100);
      res.json(companies);
    } catch (err: any) {
      log("ERROR: HubSpot companies error - " + (err?.message || err));
      res.status(500).json({ message: err.message || "Failed to fetch HubSpot companies" });
    }
  });

  app.post("/api/hubspot/sync", isAuthenticated, requireRole("ceo", "sales"), async (req, res) => {
    try {
      const { syncDealsToLeads } = await import("../hubspot");
      const result = await syncDealsToLeads();
      res.json(result);
    } catch (err: any) {
      log("ERROR: HubSpot sync error - " + (err?.message || err));
      res.status(500).json({ message: err.message || "Failed to sync HubSpot deals" });
    }
  });

  app.post("/api/hubspot/import", isAuthenticated, requireRole("ceo", "sales"), async (req, res) => {
    try {
      const { syncDealsToLeads } = await import("../hubspot");
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
      log("ERROR: HubSpot import error - " + (err?.message || err));
      res.status(500).json({ message: err.message || "Failed to import HubSpot deals" });
    }
  });

  app.get("/api/integrations/hubspot/status", isAuthenticated, requireRole("ceo", "sales"), async (req, res) => {
    const connected = await hubspotService.isHubSpotConnected();
    res.json({ connected });
  });

  app.get("/api/personas", isAuthenticated, requireRole("ceo", "sales"), async (req, res) => {
    const personaList = await hubspotService.getPersonas();
    res.json(personaList);
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
}
