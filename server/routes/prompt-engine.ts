/**
 * Prompt Engine Routes
 * 
 * API endpoints for the Dynamic Prompting Engine
 */

import { Router, Request, Response } from "express";
import { asyncHandler } from "../middleware/errorHandler";
import { isAuthenticated, requireRole } from "../replit_integrations/auth";
import { db } from "../db";
import { z } from "zod";
import {
    enhancePrompt,
    extractProjectContext,
    detectDocumentType,
    type EnhancementOptions
} from "../services/promptEnhancer";

const router = Router();

// Validation schemas
const enhanceSchema = z.object({
    prompt: z.string().min(5, "Prompt must be at least 5 characters"),
    region: z.string().optional(),
    buyerType: z.string().optional(),
    projectType: z.string().optional(),
    discipline: z.string().optional(),
    urgency: z.enum(["low", "medium", "high"]).optional(),
    autoDetect: z.boolean().optional().default(true),
});

// POST /api/prompt-engine/enhance - Enhance a user prompt
router.post(
    "/enhance",
    isAuthenticated,
    asyncHandler(async (req: Request, res: Response) => {
        const parsed = enhanceSchema.safeParse(req.body);
        if (!parsed.success) {
            return res.status(400).json({
                error: "Invalid request",
                details: parsed.error.errors
            });
        }

        const { prompt, autoDetect, ...explicitOptions } = parsed.data;

        // Auto-detect context from prompt if enabled
        let options: EnhancementOptions = { ...explicitOptions };
        if (autoDetect) {
            const detected = extractProjectContext(prompt);
            options = { ...detected, ...explicitOptions }; // Explicit options override
        }

        // Detect document type
        const documentType = detectDocumentType(prompt);

        // Enhance the prompt
        const result = await enhancePrompt(prompt, options);

        return res.json({
            success: true,
            data: {
                ...result,
                detectedType: documentType,
                optionsUsed: options,
            }
        });
    })
);

// POST /api/prompt-engine/quick-enhance - One-click enhancement with auto-detect
router.post(
    "/quick-enhance",
    isAuthenticated,
    asyncHandler(async (req: Request, res: Response) => {
        const { prompt } = req.body;

        if (!prompt || typeof prompt !== "string" || prompt.length < 5) {
            return res.status(400).json({ error: "Prompt is required (min 5 characters)" });
        }

        // Auto-detect all context
        const options = extractProjectContext(prompt);
        const documentType = detectDocumentType(prompt);
        const result = await enhancePrompt(prompt, options);

        return res.json({
            success: true,
            enhanced: result.enhancedPrompt,
            persona: result.context.persona?.name,
            type: documentType,
            confidence: result.confidence,
        });
    })
);

// GET /api/prompt-engine/context - Get available context options
router.get(
    "/context",
    isAuthenticated,
    asyncHandler(async (req: Request, res: Response) => {
        // Return available options for UI dropdowns
        return res.json({
            success: true,
            data: {
                regions: ["Northeast", "Mid-Atlantic", "Southeast", "Midwest", "Southwest", "West", "National"],
                buyerTypes: ["Architect", "GC", "Owner", "Developer", "Engineer", "Facility Manager"],
                projectTypes: ["Historic", "Commercial", "Residential", "Institutional", "Healthcare", "Industrial", "Infrastructure"],
                disciplines: ["Architecture", "Structure", "MEPF", "Landscape", "Full Scope"],
                urgencyLevels: ["low", "medium", "high"],
            }
        });
    })
);

// POST /api/prompt-engine/analyze - Analyze a prompt without enhancing
router.post(
    "/analyze",
    isAuthenticated,
    asyncHandler(async (req: Request, res: Response) => {
        const { prompt } = req.body;

        if (!prompt || typeof prompt !== "string") {
            return res.status(400).json({ error: "Prompt is required" });
        }

        const detected = extractProjectContext(prompt);
        const documentType = detectDocumentType(prompt);

        return res.json({
            success: true,
            data: {
                detectedContext: detected,
                documentType,
                promptLength: prompt.length,
                wordCount: prompt.split(/\s+/).length,
            }
        });
    })
);

export default router;
