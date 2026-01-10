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

  // === PIPELINE SYNC: Import Invoices & Estimates from QuickBooks ===
  app.post("/api/quickbooks/sync-pipeline", isAuthenticated, requireRole("ceo"), asyncHandler(async (req, res) => {
    try {
      const isConnected = await quickbooksClient.isConnected();
      if (!isConnected) {
        return res.status(401).json({ message: "QuickBooks not connected", needsReauth: true });
      }

      const realmId = await quickbooksClient.getRealmId();
      if (!realmId) {
        return res.status(400).json({ message: "Could not get QuickBooks company ID" });
      }

      const results = {
        invoices: { imported: 0, updated: 0, errors: [] as string[] },
        estimates: { imported: 0, updated: 0, errors: [] as string[] },
      };

      // Fetch invoices (Closed Won deals)
      const invoices = await quickbooksClient.fetchInvoices();
      for (const inv of invoices) {
        try {
          const customerName = inv.CustomerRef?.name || "Unknown Customer";
          const projectName = inv.Line?.find((l: any) => l.Description)?.Description || `Invoice #${inv.DocNumber || inv.Id}`;
          const address = inv.ShipAddr ? 
            [inv.ShipAddr.Line1, inv.ShipAddr.City, inv.ShipAddr.CountrySubDivisionCode, inv.ShipAddr.PostalCode]
              .filter(Boolean).join(", ") : null;

          // Check if lead already exists with this QB invoice ID
          const existingLead = await storage.getLeadByQboInvoiceId(inv.Id);
          
          const qboCustomerId = inv.CustomerRef?.value || null;
          
          if (existingLead) {
            // Update existing lead with matching QBO Invoice ID - append audit notes
            const existingNotes = existingLead.notes || "";
            const syncNote = `\n[QB Invoice #${inv.DocNumber || inv.Id} synced: ${new Date().toISOString().split("T")[0]}]`;
            await storage.updateLead(existingLead.id, {
              value: String(inv.TotalAmt),
              dealStage: "Closed Won",
              probability: 100,
              qboCustomerId: qboCustomerId,
              qboSyncedAt: new Date(),
              notes: existingNotes + syncNote,
            });
            results.invoices.updated++;
          } else {
            // Matching priority: 1. QBO Customer ID, 2. Name + Value
            let candidateLeads: any[] = [];
            const invoiceValue = parseFloat(String(inv.TotalAmt));
            
            // Try matching by QBO Customer ID first (deterministic)
            if (qboCustomerId) {
              candidateLeads = await storage.getLeadsByQboCustomerId(qboCustomerId);
            }
            
            // Filter for eligible leads (not already Closed Won, value within range)
            let eligibleLeads = candidateLeads.filter(lead => {
              if (lead.dealStage === "Closed Won") return false;
              if (!lead.value || lead.value === "0") return true;
              const leadValue = parseFloat(lead.value);
              const valueDiff = Math.abs(leadValue - invoiceValue) / Math.max(leadValue, invoiceValue, 1);
              return valueDiff <= 0.30;
            });
            
            // If all QBO Customer ID matches are ineligible, fall back to name matching
            if (eligibleLeads.length === 0) {
              candidateLeads = await storage.getLeadsByClientName(customerName);
              eligibleLeads = candidateLeads.filter(lead => {
                if (lead.dealStage === "Closed Won") return false;
                if (!lead.value || lead.value === "0") return true;
                const leadValue = parseFloat(lead.value);
                const valueDiff = Math.abs(leadValue - invoiceValue) / Math.max(leadValue, invoiceValue, 1);
                return valueDiff <= 0.30;
              });
            }
            
            if (eligibleLeads.length >= 1) {
              // One or more matches - pick the best one using deterministic scoring
              const scoredLeads = eligibleLeads.map(lead => {
                let score = 0;
                const leadValue = parseFloat(lead.value || "0");
                // Closer value = higher score (0-100 points)
                const valueDiff = Math.abs(leadValue - invoiceValue) / Math.max(leadValue, invoiceValue, 1);
                score += (1 - valueDiff) * 100;
                // Address match bonus (+50)
                if (address && lead.projectAddress && lead.projectAddress.toLowerCase().includes(address.toLowerCase().substring(0, 20))) {
                  score += 50;
                }
                // More recent activity bonus (+25 for last 30 days, scaled)
                if (lead.lastContactDate) {
                  const daysSinceContact = (Date.now() - new Date(lead.lastContactDate).getTime()) / (1000 * 60 * 60 * 24);
                  score += Math.max(0, 25 - (daysSinceContact * 0.8));
                }
                // Deterministic tie-breaker: lower ID wins (first created)
                score -= lead.id * 0.0001;
                return { lead, score };
              });
              
              scoredLeads.sort((a, b) => b.score - a.score);
              const matchedLead = scoredLeads[0].lead;
              const existingNotes = matchedLead.notes || "";
              const multiMatchNote = eligibleLeads.length > 1 ? ` [Best match of ${eligibleLeads.length} candidates by value/address/recency]` : "";
              
              await storage.updateLead(matchedLead.id, {
                value: String(inv.TotalAmt),
                dealStage: "Closed Won",
                probability: 100,
                qboInvoiceId: inv.Id,
                qboInvoiceNumber: inv.DocNumber || null,
                qboCustomerId: qboCustomerId,
                qboSyncedAt: new Date(),
                notes: existingNotes + `\n[QB Invoice #${inv.DocNumber || inv.Id}: Promoted to Closed Won]${multiMatchNote}`,
              });
              results.invoices.updated++;
            } else {
              // No match - create new lead
              await storage.createLead({
                clientName: customerName,
                projectName: projectName,
                projectAddress: address,
                value: String(inv.TotalAmt),
                dealStage: "Closed Won",
                probability: 100,
                source: "quickbooks_sync",
                qboInvoiceId: inv.Id,
                qboInvoiceNumber: inv.DocNumber || null,
                qboCustomerId: qboCustomerId,
                qboSyncedAt: new Date(),
                contactEmail: inv.BillEmail?.Address || null,
                notes: `[Imported from QuickBooks Invoice #${inv.DocNumber || inv.Id}]`,
              });
              results.invoices.imported++;
            }
          }
        } catch (err: any) {
          results.invoices.errors.push(`Invoice ${inv.Id}: ${err.message}`);
        }
      }

      // Fetch estimates (Proposal stage deals)
      const estimates = await quickbooksClient.fetchEstimates();
      for (const est of estimates) {
        try {
          const customerName = est.CustomerRef?.name || "Unknown Customer";
          const projectName = est.Line?.find((l: any) => l.Description)?.Description || `Estimate #${est.DocNumber || est.Id}`;
          const address = est.ShipAddr ? 
            [est.ShipAddr.Line1, est.ShipAddr.City, est.ShipAddr.CountrySubDivisionCode, est.ShipAddr.PostalCode]
              .filter(Boolean).join(", ") : null;

          // Check if lead already exists with this QB estimate ID
          const existingLead = await storage.getLeadByQboEstimateId(est.Id);
          
          const qboCustomerId = est.CustomerRef?.value || null;
          
          // Define deal stage order for regression prevention
          const stageOrder = ["Leads", "Contacted", "Proposal", "Negotiation", "On Hold", "Closed Won", "Closed Lost"];
          const getStageIndex = (stage: string) => stageOrder.indexOf(stage);
          const proposalIndex = getStageIndex("Proposal");
          
          if (existingLead) {
            // Update existing lead with matching QBO Estimate ID - don't change closed deals
            if (existingLead.dealStage !== "Closed Won" && existingLead.dealStage !== "Closed Lost") {
              const existingNotes = existingLead.notes || "";
              const syncNote = `\n[QB Estimate #${est.DocNumber || est.Id} synced: ${new Date().toISOString().split("T")[0]}]`;
              await storage.updateLead(existingLead.id, {
                value: String(est.TotalAmt),
                qboCustomerId: qboCustomerId,
                qboSyncedAt: new Date(),
                notes: existingNotes + syncNote,
              });
            }
            results.estimates.updated++;
          } else {
            // Matching priority: 1. QBO Customer ID, 2. Name + Value
            let candidateLeads: any[] = [];
            const estimateValue = parseFloat(String(est.TotalAmt));
            
            // Try matching by QBO Customer ID first (deterministic)
            if (qboCustomerId) {
              candidateLeads = await storage.getLeadsByQboCustomerId(qboCustomerId);
            }
            
            // Filter for eligible leads (not closed, value within range)
            let eligibleLeads = candidateLeads.filter(lead => {
              if (lead.dealStage === "Closed Won" || lead.dealStage === "Closed Lost") return false;
              if (!lead.value || lead.value === "0") return true;
              const leadValue = parseFloat(lead.value);
              const valueDiff = Math.abs(leadValue - estimateValue) / Math.max(leadValue, estimateValue, 1);
              return valueDiff <= 0.30;
            });
            
            // If all QBO Customer ID matches are ineligible, fall back to name matching
            if (eligibleLeads.length === 0) {
              candidateLeads = await storage.getLeadsByClientName(customerName);
              eligibleLeads = candidateLeads.filter(lead => {
                if (lead.dealStage === "Closed Won" || lead.dealStage === "Closed Lost") return false;
                if (!lead.value || lead.value === "0") return true;
                const leadValue = parseFloat(lead.value);
                const valueDiff = Math.abs(leadValue - estimateValue) / Math.max(leadValue, estimateValue, 1);
                return valueDiff <= 0.30;
              });
            }
            
            if (eligibleLeads.length >= 1) {
              // One or more matches - pick the best one using deterministic scoring
              const scoredLeads = eligibleLeads.map(lead => {
                let score = 0;
                const leadValue = parseFloat(lead.value || "0");
                // Closer value = higher score (0-100 points)
                const valueDiff = Math.abs(leadValue - estimateValue) / Math.max(leadValue, estimateValue, 1);
                score += (1 - valueDiff) * 100;
                // Address match bonus (+50)
                if (address && lead.projectAddress && lead.projectAddress.toLowerCase().includes(address.toLowerCase().substring(0, 20))) {
                  score += 50;
                }
                // More recent activity bonus (+25 for last 30 days, scaled)
                if (lead.lastContactDate) {
                  const daysSinceContact = (Date.now() - new Date(lead.lastContactDate).getTime()) / (1000 * 60 * 60 * 24);
                  score += Math.max(0, 25 - (daysSinceContact * 0.8));
                }
                // Deterministic tie-breaker: lower ID wins (first created)
                score -= lead.id * 0.0001;
                return { lead, score };
              });
              
              scoredLeads.sort((a, b) => b.score - a.score);
              const matchedLead = scoredLeads[0].lead;
              const existingNotes = matchedLead.notes || "";
              const currentStageIndex = getStageIndex(matchedLead.dealStage);
              const multiMatchNote = eligibleLeads.length > 1 ? ` [Best match of ${eligibleLeads.length} candidates by value/address/recency]` : "";
              
              await storage.updateLead(matchedLead.id, {
                value: String(est.TotalAmt),
                // Only advance to Proposal if in earlier stage
                ...(currentStageIndex < proposalIndex ? { dealStage: "Proposal", probability: 50 } : {}),
                qboEstimateId: est.Id,
                qboEstimateNumber: est.DocNumber || null,
                qboCustomerId: qboCustomerId,
                qboSyncedAt: new Date(),
                notes: existingNotes + `\n[QB Estimate #${est.DocNumber || est.Id} linked]${multiMatchNote}`,
              });
              results.estimates.updated++;
            } else {
              // No match - create new lead
              await storage.createLead({
                clientName: customerName,
                projectName: projectName,
                projectAddress: address,
                value: String(est.TotalAmt),
                dealStage: "Proposal",
                probability: 50,
                source: "quickbooks_sync",
                qboEstimateId: est.Id,
                qboEstimateNumber: est.DocNumber || null,
                qboCustomerId: qboCustomerId,
                qboSyncedAt: new Date(),
                contactEmail: est.BillEmail?.Address || null,
                notes: `[Imported from QuickBooks Estimate #${est.DocNumber || est.Id}]`,
              });
              results.estimates.imported++;
            }
          }
        } catch (err: any) {
          results.estimates.errors.push(`Estimate ${est.Id}: ${err.message}`);
        }
      }

      const totalImported = results.invoices.imported + results.estimates.imported;
      const totalUpdated = results.invoices.updated + results.estimates.updated;
      const totalErrors = results.invoices.errors.length + results.estimates.errors.length;

      res.json({
        message: `Synced ${totalImported} new deals, updated ${totalUpdated} existing deals${totalErrors > 0 ? `, ${totalErrors} errors` : ""}`,
        ...results,
      });
    } catch (error: any) {
      const errorMessage = error.message || "Pipeline sync failed";
      if (errorMessage.includes("401") || errorMessage.includes("not connected")) {
        res.status(401).json({ message: "QuickBooks authentication expired. Please reconnect.", needsReauth: true });
      } else {
        res.status(500).json({ message: errorMessage });
      }
    }
  }));
}
