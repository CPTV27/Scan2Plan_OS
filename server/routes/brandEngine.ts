import { Router, Request, Response } from "express";
import { asyncHandler } from "../middleware/errorHandler";
import { isAuthenticated, requireRole } from "../replit_integrations/auth";
import { db } from "../db";
import {
  brandPersonas,
  governanceRedLines,
  standardDefinitions,
  insertBrandPersonaSchema,
  insertGovernanceRedLineSchema,
  insertStandardDefinitionSchema,
} from "@shared/schema";
import { eq } from "drizzle-orm";
import {
  generateExecutiveBrief,
  getAuditLogs,
  getStandardDefinitions,
  getRedLines,
  getPersonas,
  BuyerMode,
  PrimaryPain,
  AuthorMode,
} from "../lib/brand_engine";
import { aiClient } from "../services/ai/aiClient";
import { z } from "zod";
import { log } from "../lib/logger";

const router = Router();

const GenerateRequestSchema = z.object({
  buyerType: z.enum(["A_Principal", "B_OwnerDev", "C_Unknown", "BP1", "BP2", "BP3", "BP4", "BP5", "BP6", "BP7", "BP8"]),
  painPoint: z.enum(["Rework_RFI", "ScheduleVolatility", "Inconsistency", "Terms_Risk"]),
  projectContext: z.string().min(10, "Project context must be at least 10 characters"),
  authorMode: z.enum(["Twain", "Fuller"]).optional().default("Twain"),
});

// Map BP codes to buyer modes for the engine
function mapBuyerType(buyerType: string): BuyerMode {
  const mapping: Record<string, BuyerMode> = {
    "BP1": "A_Principal",
    "BP2": "B_OwnerDev",
    "BP3": "B_OwnerDev",
    "BP4": "A_Principal",
    "BP5": "A_Principal",
    "BP6": "B_OwnerDev",
    "BP7": "A_Principal",
    "BP8": "A_Principal",
    "A_Principal": "A_Principal",
    "B_OwnerDev": "B_OwnerDev",
    "C_Unknown": "C_Unknown",
  };
  return mapping[buyerType] || "C_Unknown";
}

// ============================================
// GENERATION ENDPOINTS (existing)
// ============================================

router.post(
  "/generate/executive-brief",
  isAuthenticated,
  asyncHandler(async (req: Request, res: Response) => {
    const parsed = GenerateRequestSchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        error: "Invalid request",
        details: parsed.error.flatten(),
      });
    }

    const { buyerType, painPoint, projectContext, authorMode } = parsed.data;

    const result = await generateExecutiveBrief(
      mapBuyerType(buyerType),
      painPoint as PrimaryPain,
      projectContext,
      authorMode as AuthorMode
    );

    return res.json({
      success: true,
      data: result,
    });
  })
);

router.get(
  "/audit-logs",
  isAuthenticated,
  asyncHandler(async (req: Request, res: Response) => {
    const limit = parseInt(req.query.limit as string) || 10;
    const logs = await getAuditLogs(limit);
    return res.json({ success: true, data: logs });
  })
);

// ============================================
// PERSONAS CRUD
// ============================================

router.get(
  "/personas",
  isAuthenticated,
  asyncHandler(async (req: Request, res: Response) => {
    const personas = await getPersonas();
    return res.json({ success: true, data: personas });
  })
);

router.post(
  "/personas",
  isAuthenticated,
  requireRole("ceo"),
  asyncHandler(async (req: Request, res: Response) => {
    const parsed = insertBrandPersonaSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid data", details: parsed.error.flatten() });
    }

    const [persona] = await db.insert(brandPersonas).values(parsed.data).returning();
    return res.status(201).json({ success: true, data: persona });
  })
);

router.put(
  "/personas/:id",
  isAuthenticated,
  requireRole("ceo"),
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { name, coreIdentity, voiceMode, mantra, directives, active } = req.body;

    const [updated] = await db.update(brandPersonas)
      .set({ name, coreIdentity, voiceMode, mantra, directives, active, updatedAt: new Date() })
      .where(eq(brandPersonas.id, parseInt(id)))
      .returning();

    if (!updated) {
      return res.status(404).json({ error: "Persona not found" });
    }

    return res.json({ success: true, data: updated });
  })
);

router.delete(
  "/personas/:id",
  isAuthenticated,
  requireRole("ceo"),
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    await db.delete(brandPersonas).where(eq(brandPersonas.id, parseInt(id)));
    return res.json({ success: true });
  })
);

// ============================================
// RED LINES CRUD
// ============================================

router.get(
  "/red-lines",
  isAuthenticated,
  asyncHandler(async (req: Request, res: Response) => {
    const redLines = await getRedLines();
    return res.json({ success: true, data: redLines });
  })
);

router.post(
  "/red-lines",
  isAuthenticated,
  requireRole("ceo"),
  asyncHandler(async (req: Request, res: Response) => {
    const parsed = insertGovernanceRedLineSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid data", details: parsed.error.flatten() });
    }

    const [redLine] = await db.insert(governanceRedLines).values(parsed.data).returning();
    return res.status(201).json({ success: true, data: redLine });
  })
);

router.put(
  "/red-lines/:id",
  isAuthenticated,
  requireRole("ceo"),
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { ruleContent, violationCategory, correctionInstruction, severity, active } = req.body;

    const [updated] = await db.update(governanceRedLines)
      .set({ ruleContent, violationCategory, correctionInstruction, severity, active })
      .where(eq(governanceRedLines.id, parseInt(id)))
      .returning();

    if (!updated) {
      return res.status(404).json({ error: "Red line not found" });
    }

    return res.json({ success: true, data: updated });
  })
);

router.delete(
  "/red-lines/:id",
  isAuthenticated,
  requireRole("ceo"),
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    await db.delete(governanceRedLines).where(eq(governanceRedLines.id, parseInt(id)));
    return res.json({ success: true });
  })
);

// ============================================
// STANDARD DEFINITIONS CRUD
// ============================================

router.get(
  "/standards",
  isAuthenticated,
  asyncHandler(async (req: Request, res: Response) => {
    const definitions = await getStandardDefinitions();
    return res.json({ success: true, data: definitions });
  })
);

router.post(
  "/standards",
  isAuthenticated,
  requireRole("ceo"),
  asyncHandler(async (req: Request, res: Response) => {
    const parsed = insertStandardDefinitionSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid data", details: parsed.error.flatten() });
    }

    const [std] = await db.insert(standardDefinitions).values(parsed.data).returning();
    return res.status(201).json({ success: true, data: std });
  })
);

router.put(
  "/standards/:id",
  isAuthenticated,
  requireRole("ceo"),
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { term, definition, guaranteeText, category, active } = req.body;

    const [updated] = await db.update(standardDefinitions)
      .set({ term, definition, guaranteeText, category, active })
      .where(eq(standardDefinitions.id, parseInt(id)))
      .returning();

    if (!updated) {
      return res.status(404).json({ error: "Standard not found" });
    }

    return res.json({ success: true, data: updated });
  })
);

router.delete(
  "/standards/:id",
  isAuthenticated,
  requireRole("ceo"),
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    await db.delete(standardDefinitions).where(eq(standardDefinitions.id, parseInt(id)));
    return res.json({ success: true });
  })
);

// ============================================
// AI EXPAND - Auto-generate brand data
// ============================================

router.post(
  "/ai-expand",
  isAuthenticated,
  requireRole("ceo"),
  asyncHandler(async (req: Request, res: Response) => {
    const { type, context, count = 3 } = req.body;

    if (!type || !["persona", "redline", "standard"].includes(type)) {
      return res.status(400).json({ error: "type must be persona, redline, or standard" });
    }

    let systemPrompt = "";
    let userPrompt = "";

    if (type === "persona") {
      systemPrompt = `You are a brand strategist for Scan2Plan, a laser scanning and BIM company. Create brand personas that define voice, tone, and identity for content generation. Each persona should have: name, coreIdentity (1-2 sentences), mantra (short phrase), and directives (guidance for AI). Return JSON array.`;
      userPrompt = `Generate ${count} new brand personas for: ${context || "B2B construction technology sales"}\n\nReturn ONLY valid JSON array like: [{"name": "...", "coreIdentity": "...", "mantra": "...", "directives": "..."}]`;
    } else if (type === "redline") {
      systemPrompt = `You are a content governance expert for Scan2Plan, ensuring all marketing content avoids hype, unsubstantiated claims, and competitor comparisons. Create red-line rules that content must not violate. Each rule has: ruleContent (what to avoid), violationCategory (V1-Hype, V2-Comparison, V3-Guarantee, etc.), correctionInstruction, severity (1-5). Return JSON array.`;
      userPrompt = `Generate ${count} new governance red-lines for: ${context || "B2B construction marketing compliance"}\n\nReturn ONLY valid JSON array like: [{"ruleContent": "...", "violationCategory": "...", "correctionInstruction": "...", "severity": 3}]`;
    } else if (type === "standard") {
      systemPrompt = `You are a terminology expert for Scan2Plan, a laser scanning and BIM company. Create standard definitions for canonical terms used in proposals and marketing. Each standard has: term, definition, category (delivery, quality, process, etc.), and optional guaranteeText (if term can be guaranteed). Return JSON array.`;
      userPrompt = `Generate ${count} new standard definitions for: ${context || "laser scanning and BIM services"}\n\nReturn ONLY valid JSON array like: [{"term": "...", "definition": "...", "category": "...", "guaranteeText": null}]`;
    }

    try {
      const response = await aiClient.generateText(systemPrompt, userPrompt);

      if (!response) {
        return res.status(500).json({ error: "AI generation failed" });
      }

      // Parse JSON response
      let suggestions: any[] = [];
      try {
        const jsonStr = response.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
        suggestions = JSON.parse(jsonStr);
      } catch (e) {
        log(`WARN: Failed to parse AI suggestions: ${e}`);
        return res.status(500).json({ error: "Failed to parse AI response" });
      }

      return res.json({
        success: true,
        type,
        suggestions,
        message: `Generated ${suggestions.length} ${type} suggestions. Review and save the ones you want.`
      });
    } catch (error) {
      log(`ERROR: AI expand failed: ${error}`);
      return res.status(500).json({ error: "AI generation failed" });
    }
  })
);

// ============================================
// BATCH SAVE AI SUGGESTIONS
// ============================================

router.post(
  "/ai-expand/save",
  isAuthenticated,
  requireRole("ceo"),
  asyncHandler(async (req: Request, res: Response) => {
    const { type, items } = req.body;

    if (!type || !items || !Array.isArray(items)) {
      return res.status(400).json({ error: "type and items array required" });
    }

    let saved = 0;

    if (type === "persona") {
      for (const item of items) {
        await db.insert(brandPersonas).values({
          name: item.name,
          coreIdentity: item.coreIdentity,
          mantra: item.mantra,
          directives: item.directives,
          active: true,
        });
        saved++;
      }
    } else if (type === "redline") {
      for (const item of items) {
        await db.insert(governanceRedLines).values({
          ruleContent: item.ruleContent,
          violationCategory: item.violationCategory,
          correctionInstruction: item.correctionInstruction,
          severity: item.severity || 3,
          active: true,
        });
        saved++;
      }
    } else if (type === "standard") {
      for (const item of items) {
        await db.insert(standardDefinitions).values({
          term: item.term,
          definition: item.definition,
          category: item.category,
          guaranteeText: item.guaranteeText,
          active: true,
        });
        saved++;
      }
    }

    return res.json({ success: true, saved, message: `Saved ${saved} ${type}(s)` });
  })
);

export default router;
