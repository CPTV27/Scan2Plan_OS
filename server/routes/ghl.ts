import type { Express } from "express";
import { isAuthenticated, requireRole } from "../replit_integrations/auth";
import { asyncHandler } from "../middleware/errorHandler";
import * as ghlService from "../services/gohighlevel";
import { log } from "../lib/logger";

export function registerGHLRoutes(app: Express): void {
  app.post("/api/leads/batch-sync", isAuthenticated, requireRole("ceo", "sales"), asyncHandler(async (req, res) => {
    const { leadIds } = req.body;
    if (!Array.isArray(leadIds) || leadIds.length === 0) {
      return res.status(400).json({ message: "leadIds array required" });
    }

    try {
      const result = await ghlService.batchSyncLeads(leadIds);
      res.json(result);
    } catch (error: any) {
      log("ERROR: Batch sync error - " + (error?.message || error));
      res.status(500).json({ message: error.message || "Batch sync failed" });
    }
  }));

  app.get("/api/ghl/status", isAuthenticated, requireRole("ceo", "sales"), asyncHandler(async (req, res) => {
    try {
      const connected = await ghlService.isGHLConnected();
      const configured = ghlService.isGHLConfigured();
      res.json({ connected, configured });
    } catch (error: any) {
      log("ERROR: GHL status error - " + (error?.message || error));
      res.status(500).json({ message: error.message || "Failed to get GHL status" });
    }
  }));
}
