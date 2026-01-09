import type { Express } from "express";
import { db } from "../db";
import { settings, expenses } from "@shared/schema";
import { storage } from "../storage";
import { isAuthenticated, requireRole } from "../replit_integrations/auth";
import { asyncHandler } from "../middleware/errorHandler";
import { quickbooksClient } from "../quickbooks-client";
import { eq } from "drizzle-orm";
import { z } from "zod";
import crypto from "crypto";
import { log } from "../lib/logger";

export function registerQuickbooksRoutes(app: Express): void {
  app.get("/api/quickbooks/status", isAuthenticated, requireRole("ceo"), asyncHandler(async (req, res) => {
    try {
      const configured = quickbooksClient.isConfigured();
      const connected = configured ? await quickbooksClient.isConnected() : false;
      const config = quickbooksClient.getConfig();
      const realmId = connected ? await quickbooksClient.getRealmId() : null;
      const redirectUri = process.env.QUICKBOOKS_REDIRECT_URI || "";
      
      log("[QuickBooks] Status check: " + JSON.stringify({
        configured,
        connected,
        hasClientId: !!process.env.QUICKBOOKS_CLIENT_ID,
        hasClientSecret: !!process.env.QUICKBOOKS_CLIENT_SECRET,
        hasRedirectUri: !!process.env.QUICKBOOKS_REDIRECT_URI,
        redirectUri,
      }));
      
      res.json({ configured, connected, ...config, realmId, redirectUri });
    } catch (error: any) {
      log("ERROR: [QuickBooks] Status error - " + error.message);
      res.json({ configured: quickbooksClient.isConfigured(), connected: false, error: error.message });
    }
  }));

  app.get("/api/quickbooks/estimate-url/:leadId", isAuthenticated, requireRole("ceo", "sales"), asyncHandler(async (req, res) => {
    try {
      const leadId = Number(req.params.leadId);
      const lead = await storage.getLead(leadId);
      if (!lead) return res.status(404).json({ message: "Lead not found" });
      
      const isConnected = await quickbooksClient.isConnected();
      const realmId = isConnected ? await quickbooksClient.getRealmId() : null;
      
      if (!isConnected || !realmId) {
        return res.json({ url: null, connected: false, estimateId: lead.qboEstimateId, estimateNumber: lead.qboEstimateNumber });
      }
      
      if (!lead.qboEstimateId) return res.json({ url: null, connected: true });
      
      const url = quickbooksClient.getEstimateUrl(lead.qboEstimateId, realmId);
      res.json({ url, connected: true, estimateId: lead.qboEstimateId, estimateNumber: lead.qboEstimateNumber });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  }));

  app.get("/api/quickbooks/auth", isAuthenticated, requireRole("ceo"), (req, res) => {
    if (!quickbooksClient.isConfigured()) {
      return res.status(400).json({ message: "QuickBooks credentials not configured" });
    }
    const state = crypto.randomBytes(16).toString("hex");
    (req.session as any).qbState = state;
    const authUrl = quickbooksClient.getAuthUrl(state);
    res.json({ authUrl });
  });

  app.get("/api/quickbooks/callback", asyncHandler(async (req, res) => {
    try {
      const { code, state, realmId } = req.query;
      
      if (!code || !realmId) {
        return res.redirect("/settings?qb_error=missing_params");
      }

      const expectedState = (req.session as any).qbState;
      if (!state || state !== expectedState) {
        log("ERROR: QuickBooks OAuth state mismatch - possible CSRF attempt");
        return res.redirect("/settings?qb_error=invalid_state");
      }
      
      delete (req.session as any).qbState;

      await quickbooksClient.exchangeCodeForTokens(code as string, realmId as string);
      res.redirect("/settings?qb_connected=true");
    } catch (error: any) {
      log("ERROR: QuickBooks callback error - " + error.message);
      res.redirect(`/settings?qb_error=${encodeURIComponent(error.message)}`);
    }
  }));

  app.post("/api/quickbooks/disconnect", isAuthenticated, requireRole("ceo"), asyncHandler(async (req, res) => {
    try {
      await quickbooksClient.disconnect();
      res.json({ message: "QuickBooks disconnected" });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  }));

  app.post("/api/quickbooks/sync", isAuthenticated, requireRole("ceo"), asyncHandler(async (req, res) => {
    try {
      const result = await quickbooksClient.syncExpenses();
      res.json(result);
    } catch (error: any) {
      const errorMessage = error.message || "Sync failed";
      if (errorMessage.includes("401") || errorMessage.includes("expired") || errorMessage.includes("not connected")) {
        res.status(401).json({ message: "QuickBooks authentication expired. Please reconnect.", needsReauth: true });
      } else {
        res.status(500).json({ message: errorMessage });
      }
    }
  }));

  app.get("/api/quickbooks/accounts", isAuthenticated, requireRole("ceo"), asyncHandler(async (req, res) => {
    try {
      const accounts = await quickbooksClient.getAccounts();
      const bankAccounts = accounts.filter(a => a.type === "Bank");
      const creditCardAccounts = accounts.filter(a => a.type === "Credit Card");
      const allAccounts = accounts;
      res.json({ bankAccounts, creditCardAccounts, allAccounts });
    } catch (error: any) {
      const errorMessage = error.message || "Failed to fetch accounts";
      if (errorMessage.includes("not connected")) {
        res.status(401).json({ message: "QuickBooks not connected", needsReauth: true });
      } else {
        res.status(500).json({ message: errorMessage });
      }
    }
  }));

  app.get("/api/settings/financial-mapping", isAuthenticated, requireRole("ceo"), asyncHandler(async (req, res) => {
    try {
      const result = await db.select().from(settings).where(eq(settings.key, "financial_mapping")).limit(1);
      if (result.length === 0) {
        return res.json({ operatingAccountId: null, taxAccountId: null, expenseAccountId: null });
      }
      res.json(result[0].value);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  }));

  const financialMappingSchema = z.object({
    operatingAccountId: z.string().min(1, "Operating account is required").nullable(),
    taxAccountId: z.string().min(1, "Tax account is required").nullable(),
    expenseAccountId: z.string().nullable().optional(),
  });

  app.post("/api/settings/financial-mapping", isAuthenticated, requireRole("ceo"), asyncHandler(async (req, res) => {
    try {
      const parsed = financialMappingSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ 
          message: "Invalid mapping data", 
          errors: parsed.error.errors 
        });
      }

      const { operatingAccountId, taxAccountId, expenseAccountId } = parsed.data;
      const mapping = { 
        operatingAccountId: operatingAccountId || null, 
        taxAccountId: taxAccountId || null, 
        expenseAccountId: expenseAccountId || null 
      };

      const existing = await db.select().from(settings).where(eq(settings.key, "financial_mapping")).limit(1);
      
      if (existing.length > 0) {
        await db.update(settings)
          .set({ value: mapping, updatedAt: new Date() })
          .where(eq(settings.key, "financial_mapping"));
      } else {
        await db.insert(settings).values({ key: "financial_mapping", value: mapping });
      }

      res.json({ message: "Financial mapping saved", mapping });
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  }));

  app.get("/api/quickbooks/financial-metrics", isAuthenticated, requireRole("ceo"), asyncHandler(async (req, res) => {
    try {
      const mappingResult = await db.select().from(settings).where(eq(settings.key, "financial_mapping")).limit(1);
      const mapping = mappingResult.length > 0 
        ? (mappingResult[0].value as { operatingAccountId?: string; taxAccountId?: string })
        : {};

      const metrics = await quickbooksClient.syncFinancialMetrics(mapping);
      res.json(metrics);
    } catch (error: any) {
      const errorMessage = error.message || "Failed to sync metrics";
      if (errorMessage.includes("not connected")) {
        res.status(401).json({ message: "QuickBooks not connected", needsReauth: true });
      } else {
        res.status(500).json({ message: errorMessage });
      }
    }
  }));

  app.get("/api/expenses", isAuthenticated, requireRole("ceo"), asyncHandler(async (req, res) => {
    try {
      const expensesList = await quickbooksClient.getExpenses();
      res.json(expensesList);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  }));

  app.patch("/api/expenses/:id/link", isAuthenticated, requireRole("ceo"), asyncHandler(async (req, res) => {
    try {
      const expenseId = parseInt(req.params.id);
      const { leadId, projectId } = req.body;
      
      let expense;
      if (leadId !== undefined) {
        expense = await quickbooksClient.linkExpenseToLead(expenseId, leadId);
      }
      if (projectId !== undefined) {
        expense = await quickbooksClient.linkExpenseToProject(expenseId, projectId);
      }
      
      res.json(expense);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  }));

  const fieldExpenseSchema = z.object({
    category: z.enum(["Parking", "Tolls", "Fuel", "Meals", "Hotel", "Equipment Rental", "Supplies", "Other"]),
    amount: z.number().positive("Amount must be positive"),
    description: z.string().optional(),
    vendorName: z.string().optional(),
  });

  app.post("/api/projects/:projectId/expenses", isAuthenticated, requireRole("production", "ceo"), asyncHandler(async (req, res) => {
    try {
      const projectId = parseInt(req.params.projectId);
      const user = req.user as any;
      
      const parsed = fieldExpenseSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: parsed.error.errors[0]?.message || "Invalid expense data" });
      }
      
      const { category, amount, description, vendorName } = parsed.data;

      const expense = await db.insert(expenses).values({
        projectId,
        techId: user.id,
        category,
        amount: amount.toString(),
        description: description || null,
        vendorName: vendorName || null,
        source: "field_entry",
        syncedFromQbo: false,
      }).returning();

      res.status(201).json(expense[0]);
    } catch (error: any) {
      log("ERROR: Field expense error - " + error.message);
      res.status(500).json({ message: error.message });
    }
  }));

  app.get("/api/projects/:projectId/expenses", isAuthenticated, requireRole("production", "ceo"), asyncHandler(async (req, res) => {
    try {
      const projectId = parseInt(req.params.projectId);
      const projectExpenses = await db.select()
        .from(expenses)
        .where(eq(expenses.projectId, projectId));
      res.json(projectExpenses);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
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
