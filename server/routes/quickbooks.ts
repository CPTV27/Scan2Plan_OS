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

// Map QBO estimate status to deal stage
function mapQboStatusToDealStage(estimate: any): string {
  const status = estimate.TxnStatus;
  
  // Check if estimate was converted to invoice
  if (estimate.LinkedTxn?.some((txn: any) => txn.TxnType === 'Invoice')) {
    return 'Closed Won';
  }
  
  switch (status) {
    case 'Accepted':
      return 'Closed Won';
    case 'Rejected':
      return 'Closed Lost';
    case 'Closed':
      // Closed without acceptance is usually a loss
      return 'Closed Lost';
    case 'Pending':
    default:
      return 'Proposal';
  }
}

// Get probability based on deal stage
function getStageProbability(stage: string): number {
  switch (stage) {
    case 'Closed Won': return 100;
    case 'Closed Lost': return 0;
    case 'Negotiation': return 75;
    case 'Proposal': return 50;
    case 'Qualified': return 25;
    default: return 10;
  }
}

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

  // Create QuickBooks estimate from CPQ quote
  const createEstimateSchema = z.object({
    quoteId: z.number().int().positive(),
    contactEmail: z.string().email().optional(),
    forceResync: z.boolean().optional().default(false),
  });

  app.post("/api/quickbooks/estimate", isAuthenticated, requireRole("ceo", "sales"), asyncHandler(async (req, res) => {
    try {
      const parsed = createEstimateSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ 
          message: "Invalid request data", 
          errors: parsed.error.errors 
        });
      }

      const { quoteId, contactEmail, forceResync } = parsed.data;

      // Fetch the quote
      const quote = await storage.getCpqQuote(quoteId);
      if (!quote) {
        return res.status(404).json({ message: "Quote not found" });
      }

      if (!quote.leadId) {
        return res.status(400).json({ message: "Quote is not linked to a lead" });
      }

      // Fetch the lead
      const lead = await storage.getLead(quote.leadId);
      if (!lead) {
        return res.status(404).json({ message: "Lead not found" });
      }

      // Check if already synced (unless force resync)
      if (lead.qboEstimateId && !forceResync) {
        return res.status(409).json({ 
          message: "Estimate already exists in QuickBooks", 
          estimateId: lead.qboEstimateId,
          estimateNumber: lead.qboEstimateNumber,
        });
      }

      // Check QuickBooks connection
      const isConnected = await quickbooksClient.isConnected();
      if (!isConnected) {
        return res.status(401).json({ message: "QuickBooks not connected", needsReauth: true });
      }

      // Transform CPQ quote pricing_breakdown into line items for QuickBooks
      const lineItems: Array<{ description: string; quantity: number; unitPrice: number; amount: number; discipline?: string }> = [];
      const pricingBreakdown = quote.pricingBreakdown as any;
      const areas = quote.areas as any[];

      // Add area-based line items from pricing breakdown (areaBreakdown is the actual field name)
      const areaBreakdown = pricingBreakdown?.areaBreakdown || pricingBreakdown?.areas || [];
      if (Array.isArray(areaBreakdown)) {
        for (const area of areaBreakdown) {
          const areaName = area.name || area.label || `Area ${area.id}`;
          const price = Number(area.price || area.subtotal || area.total || 0);
          
          // Get disciplines from the matching area in quote.areas
          const areaConfig = areas?.find(a => a.name === area.name || a.id === area.id);
          const disciplines = areaConfig?.disciplines as string[] || [];
          const primaryDiscipline = disciplines[0]; // Use first discipline as primary
          
          if (price > 0 && !isNaN(price)) {
            lineItems.push({
              description: `${areaName}${disciplines.length > 0 ? ` (${disciplines.join(', ')})` : ''}`,
              quantity: 1,
              unitPrice: price,
              amount: price,
              discipline: primaryDiscipline,
            });
          }
        }
      }

      // Add travel cost from pricing breakdown or quote.travel
      const travelCost = Number(pricingBreakdown?.travelCost || 0);
      const travel = quote.travel as any;
      if (travelCost > 0 && !isNaN(travelCost)) {
        lineItems.push({
          description: `Travel - ${travel?.distance || 0} miles from ${travel?.dispatchLocation || 'Office'}`,
          quantity: 1,
          unitPrice: travelCost,
          amount: travelCost,
        });
      } else if (travel?.total && Number(travel.total) > 0) {
        const travelAmount = Number(travel.total);
        if (!isNaN(travelAmount)) {
          lineItems.push({
            description: `Travel - ${travel.distance || 0} miles from ${travel.dispatchLocation || 'Office'}`,
            quantity: 1,
            unitPrice: travelAmount,
            amount: travelAmount,
          });
        }
      }

      // Add additional services if present
      const services = quote.services as any[];
      if (services && Array.isArray(services)) {
        for (const service of services) {
          const serviceAmount = Number(service.price || service.amount || 0);
          if (serviceAmount > 0 && !isNaN(serviceAmount)) {
            const quantity = Number(service.quantity) || 1;
            lineItems.push({
              description: service.label || service.name || 'Additional Service',
              quantity: quantity,
              unitPrice: serviceAmount / quantity,
              amount: serviceAmount,
            });
          }
        }
      }

      // Fallback: If no line items from breakdown, use total price as single line
      if (lineItems.length === 0 && quote.totalPrice) {
        const totalPrice = Number(quote.totalPrice);
        if (!isNaN(totalPrice) && totalPrice > 0) {
          lineItems.push({
            description: quote.projectName || 'Professional Services',
            quantity: 1,
            unitPrice: totalPrice,
            amount: totalPrice,
          });
        }
      }

      // Validate we have at least one valid line item
      if (lineItems.length === 0) {
        return res.status(400).json({ message: "No valid line items could be extracted from the quote" });
      }

      // Reconcile line items with CPQ total - add adjustment if there's a difference
      const quoteTotalPrice = Number(quote.totalPrice || pricingBreakdown?.totalPrice || 0);
      const lineItemsTotal = lineItems.reduce((sum, item) => sum + Number(item.amount || 0), 0);
      
      if (quoteTotalPrice > 0 && !isNaN(quoteTotalPrice) && !isNaN(lineItemsTotal)) {
        const difference = Math.round((quoteTotalPrice - lineItemsTotal) * 100) / 100;
        
        if (Math.abs(difference) >= 0.01) {
          // Add adjustment line item to reconcile the total
          lineItems.push({
            description: difference > 0 
              ? 'Project Adjustments (Complexity, LOD, Risk Factors)' 
              : 'Discount Adjustment',
            quantity: 1,
            unitPrice: difference,
            amount: difference,
          });
          log(`[QuickBooks] Added reconciliation adjustment of $${difference.toFixed(2)} to match CPQ total of $${quoteTotalPrice.toFixed(2)}`);
        }
      }

      // Create the estimate in QuickBooks
      const clientName = quote.clientName || lead.clientName || 'Unknown Client';
      const projectName = quote.projectName || lead.projectName || 'Project';
      // Better email fallback chain
      const email = contactEmail || lead.contactEmail || lead.billingContactEmail || (quote as any).billingContactEmail || undefined;

      let result;
      try {
        result = await quickbooksClient.createEstimateFromQuote(
          lead.id,
          clientName,
          projectName,
          lineItems,
          email
        );
      } catch (qbError: any) {
        log(`ERROR: [QuickBooks] Failed to create estimate for lead ${lead.id}: ${qbError.message}`);
        throw qbError; // Re-throw to be caught by outer handler
      }

      // Update lead with QuickBooks IDs - this must succeed to prevent duplicates
      try {
        await storage.updateLead(lead.id, {
          qboEstimateId: result.estimateId,
          qboEstimateNumber: result.estimateNumber,
          qboCustomerId: result.customerId,
          qboSyncedAt: new Date(),
        });
      } catch (updateError: any) {
        log(`ERROR: [QuickBooks] Created estimate ${result.estimateNumber} but failed to update lead ${lead.id}: ${updateError.message}`);
        // Return partial success with estimate info so user can manually update or retry with forceResync
        return res.status(500).json({
          message: `Estimate ${result.estimateNumber} created in QuickBooks but failed to save to local database. Use Re-sync option to retry.`,
          estimateId: result.estimateId,
          estimateNumber: result.estimateNumber,
          partialSuccess: true,
        });
      }

      log(`[QuickBooks] Created estimate ${result.estimateNumber} for lead ${lead.id} from quote ${quoteId}`);

      res.json({
        message: "Estimate created successfully",
        estimateId: result.estimateId,
        estimateNumber: result.estimateNumber,
        customerId: result.customerId,
      });
    } catch (error: any) {
      log("ERROR: [QuickBooks] Create estimate error - " + error.message);
      const errorMessage = error.message || "Failed to create estimate";
      if (errorMessage.includes("401") || errorMessage.includes("expired") || errorMessage.includes("not connected")) {
        res.status(401).json({ message: "QuickBooks authentication expired. Please reconnect.", needsReauth: true });
      } else {
        res.status(500).json({ message: errorMessage });
      }
    }
  }));

  // Download estimate PDF from QuickBooks
  app.get("/api/quickbooks/estimate/:estimateId/pdf", isAuthenticated, requireRole("ceo", "sales"), asyncHandler(async (req, res) => {
    try {
      const { estimateId } = req.params;

      if (!estimateId) {
        return res.status(400).json({ message: "Estimate ID is required" });
      }

      const isConnected = await quickbooksClient.isConnected();
      if (!isConnected) {
        return res.status(401).json({ message: "QuickBooks not connected", needsReauth: true });
      }

      const pdfBuffer = await quickbooksClient.downloadEstimatePdf(estimateId);

      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename="estimate-${estimateId}.pdf"`);
      res.setHeader("Content-Length", pdfBuffer.length.toString());
      res.send(pdfBuffer);
    } catch (error: any) {
      log("ERROR: [QuickBooks] PDF download error - " + error.message);
      const errorMessage = error.message || "Failed to download PDF";
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

  // === SYNC ALL EXPENSES (Purchases + Bills) ===
  app.post("/api/quickbooks/sync-expenses", isAuthenticated, requireRole("ceo"), asyncHandler(async (req, res) => {
    try {
      const isConnected = await quickbooksClient.isConnected();
      if (!isConnected) {
        return res.status(401).json({ message: "QuickBooks not connected", needsReauth: true });
      }
      const result = await quickbooksClient.syncAllExpenses();
      res.json({ 
        success: true, 
        purchases: result.purchases,
        bills: result.bills,
        total: {
          synced: result.purchases.synced + result.bills.synced,
          errors: [...result.purchases.errors, ...result.bills.errors],
        }
      });
    } catch (error: any) {
      log("ERROR: Sync expenses error - " + error.message);
      res.status(500).json({ success: false, error: error.message });
    }
  }));

  // === JOB COSTING ANALYTICS ===
  app.get("/api/analytics/job-costing", isAuthenticated, requireRole("ceo"), asyncHandler(async (req, res) => {
    try {
      const analytics = await quickbooksClient.getJobCostingAnalytics();
      res.json(analytics);
    } catch (error: any) {
      log("ERROR: Job costing analytics error - " + error.message);
      res.status(500).json({ error: error.message });
    }
  }));

  // === OVERHEAD BREAKDOWN ===
  app.get("/api/analytics/overhead", isAuthenticated, requireRole("ceo"), asyncHandler(async (req, res) => {
    try {
      const analytics = await quickbooksClient.getJobCostingAnalytics();
      res.json(analytics.overhead);
    } catch (error: any) {
      log("ERROR: Overhead analytics error - " + error.message);
      res.status(500).json({ error: error.message });
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
            // Update existing lead with matching QBO Estimate ID
            const hasLinkedInvoice = est.LinkedTxn?.some((txn: any) => txn.TxnType === 'Invoice') || false;
            const mappedStage = mapQboStatusToDealStage(est);
            
            // Always update status tracking fields
            const updateData: any = {
              value: String(est.TotalAmt),
              qboEstimateStatus: est.TxnStatus || null,
              qboHasLinkedInvoice: hasLinkedInvoice,
              qboCustomerId: qboCustomerId,
              qboSyncedAt: new Date(),
            };
            
            // Don't regress closed deals unless QBO shows a different closed state
            if (existingLead.dealStage !== "Closed Won" && existingLead.dealStage !== "Closed Lost") {
              // Only advance stage if QBO status indicates more advanced stage
              const currentStageIndex = stageOrder.indexOf(existingLead.dealStage);
              const mappedStageIndex = stageOrder.indexOf(mappedStage);
              if (mappedStageIndex > currentStageIndex) {
                updateData.dealStage = mappedStage;
                updateData.probability = getStageProbability(mappedStage);
              }
              
              const existingNotes = existingLead.notes || "";
              const syncNote = `\n[QB Estimate #${est.DocNumber || est.Id} synced: ${new Date().toISOString().split("T")[0]}] Status: ${est.TxnStatus || 'Pending'}`;
              updateData.notes = existingNotes + syncNote;
            }
            
            await storage.updateLead(existingLead.id, updateData);
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
              
              const mappedStage = mapQboStatusToDealStage(est);
              const mappedStageIndex = getStageIndex(mappedStage);
              const hasLinkedInvoice = est.LinkedTxn?.some((txn: any) => txn.TxnType === 'Invoice') || false;
              
              // Determine if we should update the stage (only if mapped stage is more advanced)
              const shouldUpdateStage = mappedStageIndex > currentStageIndex;
              
              await storage.updateLead(matchedLead.id, {
                value: String(est.TotalAmt),
                // Update stage if QBO status indicates more advanced stage
                ...(shouldUpdateStage ? { 
                  dealStage: mappedStage, 
                  probability: getStageProbability(mappedStage) 
                } : {}),
                qboEstimateId: est.Id,
                qboEstimateNumber: est.DocNumber || null,
                qboEstimateStatus: est.TxnStatus || null,
                qboHasLinkedInvoice: hasLinkedInvoice,
                qboCustomerId: qboCustomerId,
                qboSyncedAt: new Date(),
                importSource: matchedLead.importSource || "qbo_sync",
                notes: existingNotes + `\n[QB Estimate #${est.DocNumber || est.Id} linked (${est.TxnStatus || 'Pending'})]${multiMatchNote}`,
              });
              results.estimates.updated++;
            } else {
              // No match - create new lead with status mapping
              const mappedStage = mapQboStatusToDealStage(est);
              const hasLinkedInvoice = est.LinkedTxn?.some((txn: any) => txn.TxnType === 'Invoice') || false;
              
              const newLead = await storage.createLead({
                clientName: customerName,
                projectName: projectName,
                projectAddress: address,
                value: String(est.TotalAmt),
                dealStage: mappedStage,
                probability: getStageProbability(mappedStage),
                source: "quickbooks_sync",
                qboEstimateId: est.Id,
                qboEstimateNumber: est.DocNumber || null,
                qboEstimateStatus: est.TxnStatus || null,
                qboHasLinkedInvoice: hasLinkedInvoice,
                qboCustomerId: qboCustomerId,
                qboSyncedAt: new Date(),
                importSource: "qbo_sync",
                contactEmail: est.BillEmail?.Address || null,
                notes: `[Imported from QuickBooks Estimate #${est.DocNumber || est.Id}] Status: ${est.TxnStatus || 'Pending'}`,
              });
              log(`[QBO Sync] Created new lead ID ${newLead.id} from Estimate #${est.DocNumber || est.Id} for ${customerName}`);
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

  // Re-sync statuses for existing QBO imports
  app.post("/api/quickbooks/resync-statuses", isAuthenticated, requireRole("ceo"), asyncHandler(async (req, res) => {
    try {
      const isConnected = await quickbooksClient.isConnected();
      if (!isConnected) {
        return res.status(401).json({ message: "QuickBooks not connected", needsReauth: true });
      }

      // Get all leads that came from QBO sync
      const qboLeads = await storage.getLeadsByImportSource('qbo_sync');
      
      let updated = 0;
      let errors = 0;
      const errorDetails: string[] = [];
      
      // Define stage order for comparison
      const stageOrder = ["Leads", "Contacted", "Proposal", "Negotiation", "On Hold", "Closed Won", "Closed Lost"];
      
      for (const lead of qboLeads) {
        if (!lead.qboEstimateId) continue;
        
        try {
          // Fetch current estimate status from QBO
          const estimate = await quickbooksClient.getEstimate(lead.qboEstimateId);
          
          if (estimate) {
            const newStage = mapQboStatusToDealStage(estimate);
            const hasInvoice = estimate.LinkedTxn?.some((txn: any) => txn.TxnType === 'Invoice') || false;
            
            // Only advance stage, never regress
            const currentStageIndex = stageOrder.indexOf(lead.dealStage);
            const newStageIndex = stageOrder.indexOf(newStage);
            const shouldUpdateStage = newStageIndex > currentStageIndex;
            
            await storage.updateLead(lead.id, {
              qboEstimateStatus: estimate.TxnStatus || null,
              qboHasLinkedInvoice: hasInvoice,
              qboSyncedAt: new Date(),
              ...(shouldUpdateStage ? {
                dealStage: newStage,
                probability: getStageProbability(newStage),
              } : {}),
            });
            updated++;
          }
        } catch (err: any) {
          console.error(`Failed to resync lead ${lead.id}:`, err);
          errorDetails.push(`Lead ${lead.id}: ${err.message}`);
          errors++;
        }
      }
      
      res.json({ 
        success: true, 
        updated, 
        errors,
        errorDetails: errorDetails.slice(0, 10), // Only return first 10 errors
        message: `Updated ${updated} leads from QBO status${errors > 0 ? `, ${errors} errors` : ''}` 
      });
      
    } catch (error: any) {
      const errorMessage = error.message || "Resync failed";
      if (errorMessage.includes("401") || errorMessage.includes("not connected")) {
        res.status(401).json({ message: "QuickBooks authentication expired. Please reconnect.", needsReauth: true });
      } else {
        res.status(500).json({ message: errorMessage });
      }
    }
  }));

  // Sync all customers from QuickBooks
  app.post("/api/quickbooks/sync-customers", isAuthenticated, requireRole("ceo", "sales"), asyncHandler(async (req, res) => {
    try {
      const isConnected = await quickbooksClient.isConnected();
      if (!isConnected) {
        return res.status(400).json({ message: "QuickBooks not connected" });
      }

      const customers = await quickbooksClient.getAllCustomers();
      let synced = 0;
      let errors: string[] = [];

      for (const c of customers) {
        try {
          await storage.upsertQbCustomer({
            qbId: c.id,
            displayName: c.displayName,
            companyName: c.companyName || null,
            email: c.email || null,
            phone: c.phone || null,
            mobile: c.mobile || null,
            fax: c.fax || null,
            billingLine1: c.billingAddress?.line1 || null,
            billingLine2: c.billingAddress?.line2 || null,
            billingCity: c.billingAddress?.city || null,
            billingState: c.billingAddress?.state || null,
            billingPostalCode: c.billingAddress?.postalCode || null,
            billingCountry: c.billingAddress?.country || null,
            shippingLine1: c.shippingAddress?.line1 || null,
            shippingLine2: c.shippingAddress?.line2 || null,
            shippingCity: c.shippingAddress?.city || null,
            shippingState: c.shippingAddress?.state || null,
            shippingPostalCode: c.shippingAddress?.postalCode || null,
            shippingCountry: c.shippingAddress?.country || null,
            balance: c.balance?.toString() || null,
            active: c.active ?? true,
          });
          synced++;
        } catch (err: any) {
          errors.push(`${c.displayName}: ${err.message}`);
        }
      }

      log(`[QuickBooks] Synced ${synced} customers from QuickBooks`);
      res.json({ 
        success: true, 
        synced, 
        total: customers.length,
        errors: errors.length > 0 ? errors : undefined,
      });
    } catch (error: any) {
      log("ERROR: [QuickBooks] Customer sync failed - " + error.message);
      res.status(500).json({ message: error.message || "Customer sync failed" });
    }
  }));

  // Search local QB customers (for autocomplete)
  app.get("/api/quickbooks/customers/search", isAuthenticated, asyncHandler(async (req, res) => {
    const query = (req.query.q as string) || "";
    const customers = await storage.searchQbCustomers(query);
    res.json({ customers });
  }));

  // Get all local QB customers
  app.get("/api/quickbooks/customers", isAuthenticated, asyncHandler(async (req, res) => {
    const customers = await storage.getQbCustomers();
    res.json({ customers });
  }));
}
