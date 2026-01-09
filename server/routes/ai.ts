import type { Express } from "express";
import { isAuthenticated, requireRole } from "../replit_integrations/auth";
import { asyncHandler } from "../middleware/errorHandler";
import { log } from "../lib/logger";
import { storage } from "../storage";
import { db } from "../db";
import { aiAnalytics, cpqConversations, dealPredictions, projectEmbeddings } from "@shared/schema";
import { eq } from "drizzle-orm";
import {
  analyzeProjectScope,
  analyzeDeal,
  extractFromDocument,
  processCPQChat,
  generateProposal,
  findSimilarProjects,
  createProjectSummary,
  aiClient,
  type ChatMessage,
  type ExtractedCPQData,
} from "../services/ai";
import { checkProposalGates, calculateMarginFromQuote } from "../lib/profitabilityGates";

export function registerAIRoutes(app: Express) {
  // Check if AI is configured
  app.get("/api/ai/status", isAuthenticated, asyncHandler(async (req, res) => {
    res.json({
      enabled: aiClient.isConfigured(),
      features: {
        scopingAssistant: true,
        documentIntelligence: true,
        dealIntelligence: true,
        naturalLanguageCPQ: true,
        proposalGenerator: true,
        projectMatcher: true,
      },
    });
  }));

  // Feature 1: Intelligent Project Scoping Assistant
  app.post("/api/cpq/analyze-project", isAuthenticated, requireRole("ceo", "sales"), asyncHandler(async (req, res) => {
    const startTime = Date.now();
    const { description, address, clientName, projectName, notes, leadId } = req.body;
    const user = req.user as any;

    const result = await analyzeProjectScope({
      description,
      address,
      clientName,
      projectName,
      notes,
    });

    // Track analytics
    await db.insert(aiAnalytics).values({
      feature: "scoping",
      userId: user?.id?.toString() || user?.claims?.email,
      leadId: leadId ? Number(leadId) : null,
      action: "generated",
      timeTakenMs: result.analysisTime,
      metadata: { suggestionCount: result.suggestions.length, confidence: result.overallConfidence },
    });

    log(`[AI Scoping] Generated ${result.suggestions.length} suggestions in ${Date.now() - startTime}ms`);
    res.json(result);
  }));

  // Feature 2: Enhanced Document Extraction (RFP Processor)
  app.post("/api/documents/analyze", isAuthenticated, requireRole("ceo", "sales"), asyncHandler(async (req, res) => {
    const { content, documentType } = req.body;
    const user = req.user as any;

    if (!content || typeof content !== "string") {
      return res.status(400).json({ error: "Document content is required" });
    }

    const validTypes = ["rfp", "sow", "specification", "drawing", "other"];
    const type = validTypes.includes(documentType) ? documentType : "other";

    const result = await extractFromDocument(content, type);

    // Track analytics
    await db.insert(aiAnalytics).values({
      feature: "document",
      userId: user?.id?.toString() || user?.claims?.email,
      action: "generated",
      timeTakenMs: result.analysisTime,
      metadata: { documentType: type, riskFlagsCount: result.riskFlags.length },
    });

    res.json(result);
  }));

  // Feature 3: Predictive Deal Intelligence
  app.get("/api/leads/:id/intelligence", isAuthenticated, requireRole("ceo", "sales"), asyncHandler(async (req, res) => {
    const leadId = Number(req.params.id);
    const user = req.user as any;

    const lead = await storage.getLead(leadId);
    if (!lead) {
      return res.status(404).json({ error: "Lead not found" });
    }

    // Get historical deals for context
    const allLeads = await storage.getLeads();
    const historicalDeals = allLeads.filter(
      (l) => l.id !== leadId && (l.dealStage === "Closed Won" || l.dealStage === "Closed Lost")
    );

    const result = await analyzeDeal(lead, historicalDeals);

    // Store prediction for accuracy tracking
    await db.insert(dealPredictions).values({
      leadId,
      predictedProbability: result.winProbability,
      predictedOutcome: result.winProbability >= 50 ? "won" : "lost",
    });

    // Track analytics
    await db.insert(aiAnalytics).values({
      feature: "intelligence",
      userId: user?.id?.toString() || user?.claims?.email,
      leadId,
      action: "generated",
      timeTakenMs: result.analysisTime,
      metadata: { winProbability: result.winProbability, risksCount: result.risks.length },
    });

    res.json(result);
  }));

  // Feature 4: Natural Language CPQ Interface
  app.post("/api/cpq/chat", isAuthenticated, requireRole("ceo", "sales"), asyncHandler(async (req, res) => {
    const { message, conversationId, leadId } = req.body;
    const user = req.user as any;
    const userId = user?.id?.toString() || user?.claims?.email;

    if (!message || typeof message !== "string") {
      return res.status(400).json({ error: "Message is required" });
    }

    // Get or create conversation
    let conversation: any = null;
    let conversationHistory: ChatMessage[] = [];
    let currentData: ExtractedCPQData = {};

    if (conversationId) {
      const [existing] = await db.select().from(cpqConversations).where(eq(cpqConversations.id, Number(conversationId)));
      if (existing) {
        conversation = existing;
        conversationHistory = (existing.messages as ChatMessage[]) || [];
        currentData = (existing.extractedData as ExtractedCPQData) || {};
      }
    }

    // Process the chat message
    const result = await processCPQChat(message, conversationHistory, currentData);

    // Update conversation history
    const newMessages: ChatMessage[] = [
      ...conversationHistory,
      { role: "user", content: message, timestamp: new Date() },
      { role: "assistant", content: result.response, timestamp: new Date() },
    ];

    // Save or update conversation
    if (conversation) {
      await db.update(cpqConversations)
        .set({
          messages: newMessages,
          extractedData: result.extractedData,
          updatedAt: new Date(),
        })
        .where(eq(cpqConversations.id, conversation.id));
    } else {
      const [newConv] = await db.insert(cpqConversations).values({
        leadId: leadId ? Number(leadId) : null,
        userId,
        messages: newMessages,
        extractedData: result.extractedData,
        status: "active",
      }).returning();
      conversation = newConv;
    }

    res.json({
      ...result,
      conversationId: conversation?.id || null,
    });
  }));

  // Create quote from CPQ conversation
  app.post("/api/cpq/chat/create-quote", isAuthenticated, requireRole("ceo", "sales"), asyncHandler(async (req, res) => {
    const { conversationId } = req.body;

    if (!conversationId) {
      return res.status(400).json({ error: "Conversation ID is required" });
    }

    const [conversation] = await db.select().from(cpqConversations).where(eq(cpqConversations.id, Number(conversationId)));
    if (!conversation) {
      return res.status(404).json({ error: "Conversation not found" });
    }

    const extractedData = conversation.extractedData as ExtractedCPQData;
    if (!extractedData) {
      return res.status(400).json({ error: "No data extracted from conversation" });
    }

    // Normalize disciplines - ensure it's an array
    let disciplines: string[] = ["architecture"];
    if (Array.isArray(extractedData.disciplines)) {
      disciplines = extractedData.disciplines;
    } else if (typeof extractedData.disciplines === "string") {
      disciplines = [extractedData.disciplines];
    }

    // Create quote from extracted data
    const quoteData = {
      leadId: conversation.leadId,
      projectName: extractedData.projectName || "Untitled Quote",
      projectAddress: extractedData.projectAddress || null,
      areas: [{
        id: "1",
        name: "Area 1",
        kind: "standard" as const,
        buildingType: extractedData.buildingType || "1",
        squareFeet: extractedData.squareFeet?.toString() || "",
        lod: extractedData.lod || "300",
        scope: extractedData.scope || "full",
        disciplines,
      }],
      dispatchLocation: extractedData.dispatchLocation || "WOODSTOCK",
      notes: extractedData.notes || "",
      status: "draft" as const,
    };

    const quote = await storage.createCpqQuote(quoteData);

    // Update conversation with quote reference
    await db.update(cpqConversations)
      .set({
        quoteId: quote.id,
        status: "converted",
        updatedAt: new Date(),
      })
      .where(eq(cpqConversations.id, conversation.id));

    res.json({ quote, conversationId });
  }));

  // Feature 5: AI-Powered Proposal Generator
  app.post("/api/proposals/generate", isAuthenticated, requireRole("ceo", "sales"), asyncHandler(async (req, res) => {
    const { leadId, template, sections, persona, caseStudies } = req.body;
    const user = req.user as any;

    if (!leadId) {
      return res.status(400).json({ error: "Lead ID is required" });
    }

    const lead = await storage.getLead(Number(leadId));
    if (!lead) {
      return res.status(404).json({ error: "Lead not found" });
    }

    // Get latest CPQ quote to check margin
    const quotes = await storage.getCpqQuotesByLead(Number(leadId));
    const latestQuote = quotes.length > 0 ? quotes[quotes.length - 1] : null;
    const quotePricing = latestQuote?.pricingBreakdown as { totalClientPrice?: number; totalUpteamCost?: number } | null;

    // Check profitability gates
    const gateResults = checkProposalGates(lead, quotePricing ? { pricingBreakdown: quotePricing } : null);

    // Hard gates - block proposal generation
    if (!gateResults.gmGate.passed) {
      log(`[Proposal Gate] GM gate blocked for lead ${leadId}: ${gateResults.gmGate.message}`);
      return res.status(403).json({
        error: gateResults.gmGate.code,
        message: gateResults.gmGate.message,
        details: gateResults.gmGate.details,
      });
    }

    if (!gateResults.estimatorCardGate.passed) {
      log(`[Proposal Gate] Estimator card required for Tier A lead ${leadId}`);
      return res.status(403).json({
        error: gateResults.estimatorCardGate.code,
        message: gateResults.estimatorCardGate.message,
        details: gateResults.estimatorCardGate.details,
      });
    }

    const validTemplates = ["technical", "executive", "standard"];
    const templateType = validTemplates.includes(template) ? template : "standard";

    const result = await generateProposal(lead, {
      template: templateType as "technical" | "executive" | "standard",
      sections,
      caseStudies,
      persona,
    });

    // Include any soft warnings in response
    if (gateResults.warnings.length > 0) {
      (result as any).warnings = gateResults.warnings;
    }

    // Track analytics
    await db.insert(aiAnalytics).values({
      feature: "proposal",
      userId: user?.id?.toString() || user?.claims?.email,
      leadId: Number(leadId),
      action: "generated",
      timeTakenMs: result.analysisTime,
      metadata: { template: templateType, sectionCount: result.sections.length, wordCount: result.metadata.wordCount },
    });

    res.json(result);
  }));

  // Feature 6: Smart Project Matching
  app.get("/api/projects/similar/:leadId", isAuthenticated, requireRole("ceo", "sales"), asyncHandler(async (req, res) => {
    const leadId = Number(req.params.leadId);
    const useEmbeddings = req.query.embeddings === "true";
    const user = req.user as any;

    const lead = await storage.getLead(leadId);
    if (!lead) {
      return res.status(404).json({ error: "Lead not found" });
    }

    const allLeads = await storage.getLeads();

    const result = await findSimilarProjects(lead, allLeads, {
      useEmbeddings,
      maxResults: 5,
    });

    // Track analytics
    await db.insert(aiAnalytics).values({
      feature: "matching",
      userId: user?.id?.toString() || user?.claims?.email,
      leadId,
      action: "generated",
      timeTakenMs: result.analysisTime,
      metadata: { similarProjectsCount: result.similarProjects.length, useEmbeddings },
    });

    res.json(result);
  }));

  // Recommend case studies for a lead
  app.get("/api/case-studies/recommend/:leadId", isAuthenticated, requireRole("ceo", "sales"), asyncHandler(async (req, res) => {
    const leadId = Number(req.params.leadId);

    const lead = await storage.getLead(leadId);
    if (!lead) {
      return res.status(404).json({ error: "Lead not found" });
    }

    const allLeads = await storage.getLeads();
    const result = await findSimilarProjects(lead, allLeads, { maxResults: 3 });

    res.json({
      recommendations: result.recommendedCaseStudies,
      pricingBenchmarks: result.pricingBenchmarks,
    });
  }));

  // Store project embedding for future matching
  app.post("/api/projects/embed/:leadId", isAuthenticated, requireRole("ceo", "sales"), asyncHandler(async (req, res) => {
    const leadId = Number(req.params.leadId);

    const lead = await storage.getLead(leadId);
    if (!lead) {
      return res.status(404).json({ error: "Lead not found" });
    }

    const summary = createProjectSummary(lead);
    const embeddingResult = await aiClient.embed(summary);

    if (!embeddingResult) {
      return res.status(500).json({ error: "Failed to generate embedding" });
    }

    // Check if embedding exists
    const [existing] = await db.select().from(projectEmbeddings).where(eq(projectEmbeddings.leadId, leadId));

    if (existing) {
      await db.update(projectEmbeddings)
        .set({
          embedding: JSON.stringify(embeddingResult.embedding),
          projectSummary: summary,
          updatedAt: new Date(),
        })
        .where(eq(projectEmbeddings.id, existing.id));
    } else {
      await db.insert(projectEmbeddings).values({
        leadId,
        embedding: JSON.stringify(embeddingResult.embedding),
        projectSummary: summary,
      });
    }

    res.json({ success: true, tokensUsed: embeddingResult.tokensUsed });
  }));

  // AI feature analytics
  app.get("/api/ai/analytics", isAuthenticated, requireRole("ceo"), asyncHandler(async (req, res) => {
    const analytics = await db.select().from(aiAnalytics).limit(100);
    
    const featureCounts: Record<string, number> = {};
    const actionCounts: Record<string, number> = {};
    let totalTimeTaken = 0;

    for (const record of analytics) {
      featureCounts[record.feature] = (featureCounts[record.feature] || 0) + 1;
      if (record.action) {
        actionCounts[record.action] = (actionCounts[record.action] || 0) + 1;
      }
      totalTimeTaken += record.timeTakenMs || 0;
    }

    res.json({
      totalUsage: analytics.length,
      byFeature: featureCounts,
      byAction: actionCounts,
      averageResponseTime: analytics.length > 0 ? Math.round(totalTimeTaken / analytics.length) : 0,
    });
  }));
}
