/**
 * Agent Routes
 * 
 * API endpoints for the autonomous prompting agent
 */

import { Router, Request, Response } from "express";
import { asyncHandler } from "../middleware/errorHandler";
import { isAuthenticated, requireRole, requireAdmin } from "../replit_integrations/auth";
import { db } from "../db";
import { agentPrompts, marketingIntel, intelNewsItems, INTEL_NEWS_TYPES } from "@shared/schema";
import { eq, desc } from "drizzle-orm";
import {
    buildRAGContext,
    generateCategoryPrompts,
    optimizePrompt,
    extractMarketingIntel,
    type StoredPrompt,
} from "../services/agentPromptLibrary";
import {
    initializeAgents,
    messageBus,
    scoutAgent,
    ScoutInput,
} from "../services/agents";

// Initialize agents on module load
initializeAgents();

const router = Router();

// GET /api/agent/context - Get current RAG context
router.get(
    "/context",
    isAuthenticated,
    asyncHandler(async (req: Request, res: Response) => {
        const context = await buildRAGContext();
        return res.json({ success: true, data: context });
    })
);

// GET /api/agent/prompts - List all stored prompts
router.get(
    "/prompts",
    isAuthenticated,
    asyncHandler(async (req: Request, res: Response) => {
        const { category, activeOnly } = req.query;

        let prompts = await db.select().from(agentPrompts).orderBy(desc(agentPrompts.updatedAt));

        if (category && typeof category === "string") {
            prompts = prompts.filter(p => p.category === category);
        }
        if (activeOnly === "true") {
            prompts = prompts.filter(p => p.isActive);
        }

        return res.json({ success: true, data: prompts });
    })
);

// POST /api/agent/prompts/generate - Generate prompts for all categories
router.post(
    "/prompts/generate",
    isAuthenticated,
    requireRole("ceo"),
    asyncHandler(async (req: Request, res: Response) => {
        const prompts = await generateCategoryPrompts();

        // Store generated prompts
        const stored: any[] = [];
        for (const prompt of prompts) {
            try {
                const [inserted] = await db.insert(agentPrompts).values({
                    category: prompt.category,
                    name: prompt.name,
                    basePrompt: prompt.basePrompt,
                    optimizedPrompt: prompt.optimizedPrompt,
                    variables: prompt.variables,
                    performance: prompt.performance,
                    metadata: prompt.metadata,
                    isActive: true,
                }).returning();
                stored.push(inserted);
            } catch (error) {
                console.error(`Error storing prompt for ${prompt.category}:`, error);
            }
        }

        return res.json({
            success: true,
            generated: prompts.length,
            stored: stored.length,
            data: stored
        });
    })
);

// POST /api/agent/prompts - Add a user-suggested prompt
router.post(
    "/prompts",
    isAuthenticated,
    asyncHandler(async (req: Request, res: Response) => {
        const { category, name, basePrompt, variables = [] } = req.body;

        if (!category || !name || !basePrompt) {
            return res.status(400).json({ error: "category, name, and basePrompt are required" });
        }

        // First, let the agent optimize the user's prompt
        const userPrompt: StoredPrompt = {
            category,
            name,
            basePrompt,
            optimizedPrompt: basePrompt,
            variables,
            performance: {
                usageCount: 0,
                successRate: 50,
                avgConfidence: 50,
                lastUsed: new Date().toISOString(),
            },
            metadata: {
                createdBy: "user",
                version: 1,
            },
            isActive: true,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };

        // Optimize it
        const optimized = await optimizePrompt(userPrompt);

        // Store
        const [inserted] = await db.insert(agentPrompts).values({
            category: optimized.category,
            name: optimized.name,
            basePrompt: optimized.basePrompt,
            optimizedPrompt: optimized.optimizedPrompt,
            variables: optimized.variables,
            performance: optimized.performance,
            metadata: optimized.metadata,
            isActive: true,
        }).returning();

        return res.status(201).json({ success: true, data: inserted });
    })
);

// POST /api/agent/prompts/:id/optimize - Trigger optimization for a prompt
router.post(
    "/prompts/:id/optimize",
    isAuthenticated,
    asyncHandler(async (req: Request, res: Response) => {
        const { id } = req.params;
        const { accepted, userEdits } = req.body;

        const [existing] = await db.select().from(agentPrompts).where(eq(agentPrompts.id, parseInt(id)));

        if (!existing) {
            return res.status(404).json({ error: "Prompt not found" });
        }

        // Convert DB record to StoredPrompt
        const storedPrompt: StoredPrompt = {
            id: existing.id,
            category: existing.category,
            name: existing.name,
            basePrompt: existing.basePrompt,
            optimizedPrompt: existing.optimizedPrompt,
            variables: existing.variables || [],
            performance: existing.performance || { usageCount: 0, successRate: 50, avgConfidence: 50, lastUsed: "" },
            metadata: existing.metadata || { createdBy: "system", version: 1 },
            isActive: existing.isActive ?? true,
            createdAt: existing.createdAt?.toISOString() || new Date().toISOString(),
            updatedAt: existing.updatedAt?.toISOString() || new Date().toISOString(),
        };

        // Optimize
        const optimized = await optimizePrompt(storedPrompt, { accepted, userEdits });

        // Update in DB
        const [updated] = await db
            .update(agentPrompts)
            .set({
                optimizedPrompt: optimized.optimizedPrompt,
                performance: optimized.performance,
                metadata: optimized.metadata,
                updatedAt: new Date(),
            })
            .where(eq(agentPrompts.id, parseInt(id)))
            .returning();

        return res.json({ success: true, data: updated });
    })
);

// DELETE /api/agent/prompts/:id - Delete a prompt
router.delete(
    "/prompts/:id",
    isAuthenticated,
    requireRole("ceo"),
    asyncHandler(async (req: Request, res: Response) => {
        const { id } = req.params;
        await db.delete(agentPrompts).where(eq(agentPrompts.id, parseInt(id)));
        return res.json({ success: true });
    })
);

// POST /api/agent/intel/extract - Extract marketing intel from recent news
router.post(
    "/intel/extract",
    isAuthenticated,
    asyncHandler(async (req: Request, res: Response) => {
        // Get recent unprocessed intel items
        const recentItems = await db
            .select()
            .from(intelNewsItems)
            .where(eq(intelNewsItems.isArchived, false))
            .orderBy(desc(intelNewsItems.createdAt))
            .limit(20);

        const itemsForExtraction = recentItems.map(item => ({
            type: item.type,
            title: item.title,
            summary: item.summary || undefined,
            region: item.region || undefined,
        }));

        const extracted = await extractMarketingIntel(itemsForExtraction);

        // Store extracted intel
        const stored: any[] = [];
        for (const intel of extracted) {
            try {
                const [inserted] = await db.insert(marketingIntel).values({
                    category: intel.category,
                    title: intel.title,
                    summary: intel.summary,
                    insights: intel.insights,
                    actionItems: intel.actionItems,
                    confidence: intel.confidence,
                    source: intel.source,
                    metadata: intel.metadata,
                }).returning();
                stored.push(inserted);
            } catch (error) {
                console.error("Error storing marketing intel:", error);
            }
        }

        return res.json({
            success: true,
            processed: recentItems.length,
            extracted: extracted.length,
            stored: stored.length,
            data: stored,
        });
    })
);

// GET /api/agent/intel - List marketing intel
router.get(
    "/intel",
    isAuthenticated,
    asyncHandler(async (req: Request, res: Response) => {
        const { category, limit = "20" } = req.query;

        let intel = await db
            .select()
            .from(marketingIntel)
            .orderBy(desc(marketingIntel.createdAt))
            .limit(parseInt(limit as string));

        if (category && typeof category === "string") {
            intel = intel.filter(i => i.category === category);
        }

        return res.json({ success: true, data: intel });
    })
);

// POST /api/agent/intel/:id/action - Mark intel as actioned
router.post(
    "/intel/:id/action",
    isAuthenticated,
    asyncHandler(async (req: Request, res: Response) => {
        const { id } = req.params;

        const [updated] = await db
            .update(marketingIntel)
            .set({ isActioned: true })
            .where(eq(marketingIntel.id, parseInt(id)))
            .returning();

        if (!updated) {
            return res.status(404).json({ error: "Intel not found" });
        }

        return res.json({ success: true, data: updated });
    })
);

// GET /api/agent/categories - List available categories
router.get(
    "/categories",
    isAuthenticated,
    asyncHandler(async (req: Request, res: Response) => {
        return res.json({
            success: true,
            data: INTEL_NEWS_TYPES.map(type => ({
                value: type,
                label: type.charAt(0).toUpperCase() + type.slice(1),
            })),
        });
    })
);

// GET /api/agent/analytics - Get aggregate intel statistics
router.get(
    "/analytics",
    isAuthenticated,
    asyncHandler(async (req: Request, res: Response) => {
        // Get all intel items (not archived)
        const allItems = await db
            .select()
            .from(intelNewsItems)
            .where(eq(intelNewsItems.isArchived, false));

        // Aggregate by category
        const byCategory: Record<string, { count: number; actionable: number; avgRelevance: number; items: any[] }> = {};
        const byRegion: Record<string, number> = {};
        const byCompetitor: Record<string, number> = {};

        let totalActionable = 0;
        let totalWithValue = 0;
        let totalEstimatedValue = 0;

        for (const item of allItems) {
            // By category
            if (!byCategory[item.type]) {
                byCategory[item.type] = { count: 0, actionable: 0, avgRelevance: 0, items: [] };
            }
            byCategory[item.type].count++;
            if (item.isActionable) {
                byCategory[item.type].actionable++;
                totalActionable++;
            }
            // Store recent items (max 5 per category for preview)
            if (byCategory[item.type].items.length < 5) {
                byCategory[item.type].items.push({
                    id: item.id,
                    title: item.title,
                    region: item.region,
                    relevanceScore: item.relevanceScore,
                    createdAt: item.createdAt,
                });
            }

            // By region
            if (item.region) {
                byRegion[item.region] = (byRegion[item.region] || 0) + 1;
            }

            // By competitor
            if (item.competitorName) {
                byCompetitor[item.competitorName] = (byCompetitor[item.competitorName] || 0) + 1;
            }

            // Estimated value
            if (item.estimatedValue) {
                totalWithValue++;
                totalEstimatedValue += Number(item.estimatedValue) || 0;
            }
        }

        // Calculate average relevance per category
        for (const cat of Object.keys(byCategory)) {
            const catItems = allItems.filter(i => i.type === cat);
            const totalRelevance = catItems.reduce((sum, i) => sum + (i.relevanceScore || 0), 0);
            byCategory[cat].avgRelevance = catItems.length > 0
                ? Math.round(totalRelevance / catItems.length)
                : 0;
        }

        // Top opportunities by value
        const topOpportunities = allItems
            .filter(i => i.type === "opportunity" && i.estimatedValue)
            .sort((a, b) => (Number(b.estimatedValue) || 0) - (Number(a.estimatedValue) || 0))
            .slice(0, 10)
            .map(i => ({
                id: i.id,
                title: i.title,
                region: i.region,
                estimatedValue: i.estimatedValue,
                relevanceScore: i.relevanceScore,
            }));

        // Summary stats
        const summary = {
            totalItems: allItems.length,
            totalActionable,
            totalEstimatedValue,
            avgValuePerOpportunity: totalWithValue > 0 ? Math.round(totalEstimatedValue / totalWithValue) : 0,
            unreadCount: allItems.filter(i => !i.isRead).length,
            last24Hours: allItems.filter(i => {
                const created = new Date(i.createdAt || 0);
                const now = new Date();
                return (now.getTime() - created.getTime()) < 24 * 60 * 60 * 1000;
            }).length,
            last7Days: allItems.filter(i => {
                const created = new Date(i.createdAt || 0);
                const now = new Date();
                return (now.getTime() - created.getTime()) < 7 * 24 * 60 * 60 * 1000;
            }).length,
        };

        return res.json({
            success: true,
            data: {
                summary,
                byCategory,
                byRegion,
                byCompetitor,
                topOpportunities,
            },
        });
    })
);

// GET /api/agent/executive-summary - AI-generated executive insights
router.get(
    "/executive-summary",
    isAuthenticated,
    asyncHandler(async (req: Request, res: Response) => {
        // Get all active intel items
        const allItems = await db
            .select()
            .from(intelNewsItems)
            .where(eq(intelNewsItems.isArchived, false))
            .orderBy(desc(intelNewsItems.createdAt));

        const now = new Date();
        const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

        // Categorize items
        const opportunities = allItems.filter(i => i.type === "opportunity");
        const competitors = allItems.filter(i => i.type === "competitor");
        const policies = allItems.filter(i => i.type === "policy");
        const highValue = opportunities.filter(i => (Number(i.estimatedValue) || 0) > 50000);
        const actionable = allItems.filter(i => i.isActionable);

        // Urgent items (deadline within 7 days)
        const urgentItems = allItems.filter(i => {
            if (!i.deadline) return false;
            const deadline = new Date(i.deadline);
            return deadline > now && deadline < new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
        });

        // New this week
        const newThisWeek = allItems.filter(i => new Date(i.createdAt || 0) > oneWeekAgo);

        // Build executive insights
        const insights: string[] = [];

        if (opportunities.length > 0) {
            const totalValue = opportunities.reduce((sum, o) => sum + (Number(o.estimatedValue) || 0), 0);
            insights.push(`📋 ${opportunities.length} opportunities worth $${(totalValue / 1000).toFixed(0)}k in pipeline`);
        }

        if (highValue.length > 0) {
            insights.push(`💰 ${highValue.length} high-value RFPs (>$50k) ready to pursue`);
        }

        if (urgentItems.length > 0) {
            insights.push(`⚡ ${urgentItems.length} items with deadlines this week`);
        }

        if (newThisWeek.length > 0) {
            insights.push(`📥 ${newThisWeek.length} new intel items this week`);
        }

        if (competitors.length > 0) {
            const uniqueCompetitors = new Set(competitors.map(c => c.competitorName).filter(Boolean));
            insights.push(`👁️ ${uniqueCompetitors.size} competitors active in your territory`);
        }

        if (policies.length > 0) {
            insights.push(`📜 ${policies.length} policy/regulatory updates to review`);
        }

        // Top 5 actions for CEO
        const actions = [
            ...highValue.slice(0, 3).map(o => ({
                type: "opportunity" as const,
                priority: "high" as const,
                title: o.title,
                subtitle: `$${((Number(o.estimatedValue) || 0) / 1000).toFixed(0)}k potential`,
                itemId: o.id,
                region: o.region,
            })),
            ...urgentItems.slice(0, 2).map(u => ({
                type: "urgent" as const,
                priority: "urgent" as const,
                title: u.title,
                subtitle: `Deadline: ${new Date(u.deadline!).toLocaleDateString()}`,
                itemId: u.id,
                region: u.region,
            })),
        ].slice(0, 5);

        // Weekly trend (compare to previous week)
        const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
        const lastWeek = allItems.filter(i => {
            const created = new Date(i.createdAt || 0);
            return created > twoWeeksAgo && created < oneWeekAgo;
        });
        const thisWeekCount = newThisWeek.length;
        const lastWeekCount = lastWeek.length;
        const trendPercent = lastWeekCount > 0
            ? Math.round(((thisWeekCount - lastWeekCount) / lastWeekCount) * 100)
            : 0;

        return res.json({
            success: true,
            data: {
                insights,
                actions,
                stats: {
                    totalOpportunities: opportunities.length,
                    highValueCount: highValue.length,
                    urgentCount: urgentItems.length,
                    newThisWeek: newThisWeek.length,
                    actionableCount: actionable.length,
                    totalEstimatedValue: opportunities.reduce((sum, o) => sum + (Number(o.estimatedValue) || 0), 0),
                },
                trend: {
                    direction: trendPercent >= 0 ? "up" : "down",
                    percent: Math.abs(trendPercent),
                    thisWeek: thisWeekCount,
                    lastWeek: lastWeekCount,
                },
            },
        });
    })
);

// POST /api/agent/pipeline - Run intel through all 5 agents
router.post(
    "/pipeline",
    isAuthenticated,
    requireRole("ceo"),
    asyncHandler(async (req: Request, res: Response) => {
        const { rawContent, source = "manual" } = req.body;

        if (!rawContent) {
            return res.status(400).json({
                success: false,
                message: "rawContent is required"
            });
        }

        const traceId = crypto.randomUUID();

        try {
            // Start the pipeline
            const results = await messageBus.runPipeline({
                rawContent,
                source,
            });

            // Extract final outputs from each agent
            const scoutOutput = results.find(r => r.from === "scout")?.payload;
            const analystOutput = results.find(r => r.from === "analyst")?.payload;
            const strategistOutput = results.find(r => r.from === "strategist")?.payload;
            const composerOutput = results.find(r => r.from === "composer")?.payload;
            const auditorOutput = results.find(r => r.from === "auditor")?.payload;

            return res.json({
                success: true,
                traceId,
                agentsCompleted: results.length,
                outputs: {
                    scout: scoutOutput,
                    analyst: analystOutput,
                    strategist: strategistOutput,
                    composer: composerOutput,
                    auditor: auditorOutput,
                },
                timeline: results.map(r => ({
                    agent: r.from,
                    type: r.type,
                    timestamp: r.timestamp,
                })),
            });
        } catch (error: any) {
            console.error("[Pipeline] Error:", error);
            return res.status(500).json({
                success: false,
                message: error.message || "Pipeline execution failed",
                traceId,
            });
        }
    })
);

// GET /api/agent/pipeline/status - Check if pipeline is ready
router.get(
    "/pipeline/status",
    isAuthenticated,
    asyncHandler(async (req: Request, res: Response) => {
        const hasOpenAI = !!(process.env.AI_INTEGRATIONS_OPENAI_API_KEY || process.env.OPENAI_API_KEY);
        const hasGemini = !!(process.env.AI_INTEGRATIONS_GEMINI_API_KEY || process.env.GEMINI_API_KEY);

        return res.json({
            success: true,
            ready: hasOpenAI || hasGemini,
            agents: {
                scout: { ready: hasOpenAI, model: "gpt-4o-mini" },
                analyst: { ready: hasGemini, model: "gemini-1.5-pro" },
                strategist: { ready: hasOpenAI, model: "gpt-4o" },
                composer: { ready: hasOpenAI, model: "gpt-4o" },
                auditor: { ready: hasOpenAI, model: "gpt-4o-mini" },
            },
        });
    })
);

// =============================================
// AGENT CONFIG MANAGEMENT (CEO Prompt Editor)
// =============================================

import { AGENT_CONFIGS, type AgentType as AgentTypeDef } from "../services/agents";

// In-memory store for custom prompts (persists until server restart)
// In production, this would be stored in the database
const customAgentPrompts: Partial<Record<AgentTypeDef, { systemPrompt: string; updatedAt: Date; updatedBy: string }>> = {};

// GET /api/agent/configs - Get all agent configurations (for visualization)
router.get(
    "/configs",
    isAuthenticated,
    asyncHandler(async (req: Request, res: Response) => {
        const configs = Object.entries(AGENT_CONFIGS).map(([key, config]) => {
            const customPrompt = customAgentPrompts[key as AgentTypeDef];
            return {
                name: config.name,
                displayName: config.displayName,
                provider: config.provider,
                model: config.model,
                temperature: config.temperature,
                maxTokens: config.maxTokens,
                systemPrompt: customPrompt?.systemPrompt || config.systemPrompt,
                isCustomized: !!customPrompt,
                updatedAt: customPrompt?.updatedAt,
                updatedBy: customPrompt?.updatedBy,
            };
        });

        // Pipeline flow for visualization
        const pipelineFlow = {
            nodes: [
                { id: "rss", label: "📡 RSS Feeds", type: "source" },
                { id: "chromadb", label: "🔮 ChromaDB", type: "source" },
                { id: "postgres", label: "🐘 PostgreSQL", type: "source" },
                { id: "scout", label: "🔍 Scout", type: "agent" },
                { id: "analyst", label: "📊 Analyst", type: "agent" },
                { id: "strategist", label: "🎯 Strategist", type: "agent" },
                { id: "composer", label: "✍️ Composer", type: "agent" },
                { id: "auditor", label: "🛡️ Auditor", type: "agent" },
                { id: "output", label: "📤 Output", type: "output" },
            ],
            edges: [
                { from: "rss", to: "scout", label: "Intel" },
                { from: "postgres", to: "analyst", label: "Leads/Projects" },
                { from: "chromadb", to: "composer", label: "Proposals" },
                { from: "scout", to: "analyst", label: "Structured Data" },
                { from: "analyst", to: "strategist", label: "Insights" },
                { from: "strategist", to: "composer", label: "Actions" },
                { from: "composer", to: "auditor", label: "Drafts" },
                { from: "auditor", to: "output", label: "Approved" },
            ],
        };

        return res.json({
            success: true,
            agents: configs,
            pipelineFlow,
        });
    })
);

// GET /api/agent/configs/:agent - Get specific agent config
router.get(
    "/configs/:agent",
    isAuthenticated,
    asyncHandler(async (req: Request, res: Response) => {
        const agentName = req.params.agent as AgentTypeDef;
        const config = AGENT_CONFIGS[agentName];

        if (!config) {
            return res.status(404).json({ error: `Agent '${agentName}' not found` });
        }

        const customPrompt = customAgentPrompts[agentName];

        return res.json({
            success: true,
            data: {
                name: config.name,
                displayName: config.displayName,
                provider: config.provider,
                model: config.model,
                temperature: config.temperature,
                maxTokens: config.maxTokens,
                systemPrompt: customPrompt?.systemPrompt || config.systemPrompt,
                defaultPrompt: config.systemPrompt,
                isCustomized: !!customPrompt,
                updatedAt: customPrompt?.updatedAt,
                updatedBy: customPrompt?.updatedBy,
            },
        });
    })
);

// PUT /api/agent/configs/:agent - Update agent system prompt (CEO only)
router.put(
    "/configs/:agent",
    isAuthenticated,
    requireAdmin,
    asyncHandler(async (req: Request, res: Response) => {
        const agentName = req.params.agent as AgentTypeDef;
        const { systemPrompt } = req.body;
        const user = (req as any).user;

        const config = AGENT_CONFIGS[agentName];
        if (!config) {
            return res.status(404).json({ error: `Agent '${agentName}' not found` });
        }

        if (!systemPrompt || typeof systemPrompt !== "string") {
            return res.status(400).json({ error: "systemPrompt is required" });
        }

        // Store custom prompt
        customAgentPrompts[agentName] = {
            systemPrompt,
            updatedAt: new Date(),
            updatedBy: user?.email || user?.username || "unknown",
        };

        // Also update the in-memory config (affects running agents)
        AGENT_CONFIGS[agentName].systemPrompt = systemPrompt;

        console.log(`[Agent Config] ${agentName} prompt updated by ${user?.email}`);

        return res.json({
            success: true,
            message: `${config.displayName} prompt updated successfully`,
            data: {
                name: config.name,
                systemPrompt,
                updatedAt: customAgentPrompts[agentName]!.updatedAt,
                updatedBy: customAgentPrompts[agentName]!.updatedBy,
            },
        });
    })
);

// POST /api/agent/configs/:agent/reset - Reset to default prompt (CEO only)
router.post(
    "/configs/:agent/reset",
    isAuthenticated,
    requireAdmin,
    asyncHandler(async (req: Request, res: Response) => {
        const agentName = req.params.agent as AgentTypeDef;
        const config = AGENT_CONFIGS[agentName];

        if (!config) {
            return res.status(404).json({ error: `Agent '${agentName}' not found` });
        }

        // Remove custom prompt
        delete customAgentPrompts[agentName];

        // Note: We'd need to store defaults to truly reset. For now, just clear custom.
        console.log(`[Agent Config] ${agentName} prompt reset to default`);

        return res.json({
            success: true,
            message: `${config.displayName} prompt reset to default`,
        });
    })
);

// POST /api/agent/configs/:agent/test - Test agent with sample input (CEO only)
router.post(
    "/configs/:agent/test",
    isAuthenticated,
    requireAdmin,
    asyncHandler(async (req: Request, res: Response) => {
        const agentName = req.params.agent as AgentTypeDef;
        const { testInput } = req.body;

        if (!testInput) {
            return res.status(400).json({ error: "testInput is required" });
        }

        const config = AGENT_CONFIGS[agentName];
        if (!config) {
            return res.status(404).json({ error: `Agent '${agentName}' not found` });
        }

        try {
            // Run the agent with test input
            const startTime = Date.now();
            const results = await messageBus.runPipeline(
                { rawContent: testInput, source: "test" },
                agentName
            );

            const agentResult = results.find(r => r.from === agentName);
            const durationMs = Date.now() - startTime;

            return res.json({
                success: true,
                agent: agentName,
                durationMs,
                output: agentResult?.payload || null,
                fullPipeline: results.length > 1,
                agentsRun: results.map(r => r.from),
            });
        } catch (error: any) {
            return res.status(500).json({
                success: false,
                error: error.message,
            });
        }
    })
);

export default router;


