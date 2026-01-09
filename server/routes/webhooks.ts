import type { Express } from "express";
import { storage } from "../storage";
import { db } from "../db";
import { trackingEvents } from "@shared/schema";
import { asyncHandler } from "../middleware/errorHandler";
import { and, eq, gte } from "drizzle-orm";
import { log } from "../lib/logger";

export async function registerWebhookRoutes(app: Express): Promise<void> {
  const hubspotService = await import('../services/hubspot');

  app.post("/api/webhooks/hubspot/deal", asyncHandler(async (req, res) => {
    try {
      const events = Array.isArray(req.body) ? req.body : [req.body];
      
      for (const event of events) {
        if (event.subscriptionType === 'deal.propertyChange' && event.propertyName === 'dealstage') {
          await hubspotService.updateLeadFromHubSpotDeal(event.objectId, event.propertyValue);
        }
      }
      
      res.status(200).send('OK');
    } catch (error) {
      log("ERROR: HubSpot webhook error - " + (error as Error)?.message);
      res.status(500).send('Error');
    }
  }));

  app.post("/api/webhooks/hubspot/engagement", asyncHandler(async (req, res) => {
    try {
      const events = Array.isArray(req.body) ? req.body : [req.body];
      log("[HubSpot Engagement] Webhook received: " + JSON.stringify(events).slice(0, 500));
      
      for (const event of events) {
        const eventType = event.subscriptionType;
        const contactId = event.objectId;
        
        if (eventType === 'email.open' || eventType === 'email.click' || eventType === 'email.reply') {
          const allLeads = await storage.getLeads();
          const lead = allLeads.find(l => l.hubspotId === String(contactId));
          
          if (lead) {
            const scoreBoost = eventType === 'email.reply' ? 25 : eventType === 'email.click' ? 15 : 5;
            const currentScore = lead.leadScore || 0;
            const newScore = currentScore + scoreBoost;
            
            await storage.updateLead(lead.id, { leadScore: newScore } as any);
            
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
            
            log(`[HubSpot Engagement] ${eventType} for lead ${lead.id}, score now ${newScore}`);
          }
        }
      }
      
      res.status(200).send('OK');
    } catch (error) {
      log("ERROR: [HubSpot Engagement] Webhook error - " + (error as Error)?.message);
      res.status(500).send('Error');
    }
  }));

  app.post("/api/google-chat/webhook", asyncHandler(async (req, res) => {
    const event = req.body;
    log("Google Chat webhook received: " + (event.type || "unknown event"));
    
    switch (event.type) {
      case "ADDED_TO_SPACE":
        log("Bot added to space: " + event.space?.displayName);
        res.json({ text: "Scan2Plan Concierge is now active in this space." });
        break;
      case "REMOVED_FROM_SPACE":
        log("Bot removed from space: " + event.space?.displayName);
        res.json({});
        break;
      case "MESSAGE":
        log("Message received: " + event.message?.text);
        res.json({ text: "Scan2Plan Concierge received your message. This space is managed automatically." });
        break;
      default:
        res.json({ text: "Event received" });
    }
  }));
}
