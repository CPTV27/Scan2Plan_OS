import type { Express } from "express";
import { storage } from "../storage";
import { isAuthenticated, requireRole } from "../replit_integrations/auth";
import { asyncHandler } from "../middleware/errorHandler";
import { getWinLossAnalytics } from "../probability";
import { quickbooksClient } from "../quickbooks-client";
import { log } from "../lib/logger";
import { 
  getPerformanceStats, 
  getActiveRequests, 
  clearPerformanceStats 
} from "../middleware/performanceLogger";

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

  app.get("/api/performance/stats", isAuthenticated, requireRole("ceo"), asyncHandler(async (req, res) => {
    res.json({
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      endpoints: getPerformanceStats(),
      activeRequests: getActiveRequests(),
    });
  }));

  app.post("/api/performance/stats/clear", isAuthenticated, requireRole("ceo"), asyncHandler(async (req, res) => {
    clearPerformanceStats();
    res.json({ success: true, message: "Performance stats cleared" });
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
}
