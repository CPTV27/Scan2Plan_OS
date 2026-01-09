import type { Express } from "express";
import { storage } from "../storage";
import { isAuthenticated, requireRole } from "../replit_integrations/auth";
import { asyncHandler } from "../middleware/errorHandler";
import { getWinLossAnalytics } from "../probability";
import { quickbooksClient } from "../quickbooks-client";
import { log } from "../lib/logger";

export function registerAnalyticsRoutes(app: Express): void {
  app.get("/api/analytics/win-loss", isAuthenticated, requireRole("ceo", "sales", "accounting"), asyncHandler(async (req, res) => {
    try {
      const analytics = await getWinLossAnalytics();
      res.json(analytics);
    } catch (error) {
      log("ERROR: Win/loss analytics error - " + (error as Error)?.message);
      res.status(500).json({ message: "Failed to fetch win/loss analytics" });
    }
  }));

  app.get("/api/analytics/abm-penetration", isAuthenticated, requireRole("ceo"), asyncHandler(async (req, res) => {
    try {
      const penetration = await storage.getTierAAccountPenetration();
      res.json(penetration);
    } catch (error) {
      log("ERROR: ABM penetration error - " + (error as Error)?.message);
      res.status(500).json({ message: "Failed to fetch ABM penetration" });
    }
  }));

  app.get("/api/analytics/profitability", isAuthenticated, requireRole("ceo"), asyncHandler(async (req, res) => {
    try {
      const stats = await quickbooksClient.getProfitabilityStats();
      res.json(stats);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  }));
}
