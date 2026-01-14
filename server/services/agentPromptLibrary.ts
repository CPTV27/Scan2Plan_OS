/**
 * Agent Prompt Library & Learning System
 * 
 * Stores prompts, tracks performance, and enables self-optimization
 */

import { db } from "../db";
import {
    brandPersonas,
    governanceRedLines,
    standardDefinitions,
    companyCapabilities,
    leads,
    intelNewsItems,
    INTEL_NEWS_TYPES
} from "@shared/schema";
import { eq, desc, and, gte, sql } from "drizzle-orm";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { findSimilarProjects, isChromaDBAvailable } from "./vectorStore";

// Initialize Gemini
const genAI = process.env.GEMINI_API_KEY
    ? new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
    : null;

// Types for the prompt library system
export interface StoredPrompt {
    id?: number;
    category: string;          // Intel category or use case
    name: string;              // Human-readable name
    basePrompt: string;        // The core prompt template
    optimizedPrompt: string;   // AI-refined version
    variables: string[];       // Placeholders like {{region}}, {{projectType}}
    performance: {
        usageCount: number;
        successRate: number;    // 0-100 based on user acceptance
        avgConfidence: number;
        lastUsed: string;
    };
    metadata: {
        createdBy: "system" | "user" | "agent";
        version: number;
        parentId?: number;      // If evolved from another prompt
        optimizationNotes?: string;
    };
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface MarketingIntel {
    id?: number;
    category: string;           // "competitor", "market", "opportunity", etc.
    title: string;
    summary: string;
    insights: string[];         // Key takeaways
    actionItems: string[];      // Recommended actions
    relatedLeads?: number[];    // IDs of relevant leads
    relatedProjects?: number[]; // IDs of relevant projects
    confidence: number;         // AI confidence score
    source: string;             // Where this intel came from
    metadata: Record<string, any>;
    createdAt: string;
    expiresAt?: string;         // When intel becomes stale
}

export interface RAGContext {
    brand: {
        personas: Array<{ name: string; identity: string; mantra: string }>;
        redLines: string[];
        standards: Array<{ term: string; definition: string }>;
    };
    capabilities: Array<{ category: string; name: string; description: string }>;
    geography: {
        regions: string[];
        primaryMarkets: string[];
        serviceAreas: string[];
    };
    network: {
        totalLeads: number;
        leadsByRegion: Record<string, number>;
        topBuildingTypes: string[];
        recentWins: Array<{ name: string; type: string; value?: string }>;
    };
    intel: {
        recentOpportunities: number;
        activeCompetitors: string[];
        policyAlerts: number;
    };
}

/**
 * Build full RAG context from database
 */
export async function buildRAGContext(): Promise<RAGContext> {
    try {
        // Fetch all brand data
        const [personas, redLines, standards, capabilities, recentLeads, recentIntel] = await Promise.all([
            db.select().from(brandPersonas).where(eq(brandPersonas.active, true)),
            db.select().from(governanceRedLines).where(eq(governanceRedLines.active, true)),
            db.select().from(standardDefinitions).where(eq(standardDefinitions.active, true)),
            db.select().from(companyCapabilities).where(eq(companyCapabilities.active, true)),
            db.select().from(leads).orderBy(desc(leads.createdAt)).limit(100),
            db.select().from(intelNewsItems).where(eq(intelNewsItems.isArchived, false)).orderBy(desc(intelNewsItems.createdAt)).limit(50),
        ]);

        // Compute network stats
        const leadsByRegion: Record<string, number> = {};
        const buildingTypeCounts: Record<string, number> = {};

        recentLeads.forEach(lead => {
            // Group by zip code prefix as region proxy
            const region = lead.projectZipCode?.slice(0, 3) || "Unknown";
            leadsByRegion[region] = (leadsByRegion[region] || 0) + 1;

            if (lead.buildingType) {
                buildingTypeCounts[lead.buildingType] = (buildingTypeCounts[lead.buildingType] || 0) + 1;
            }
        });

        const topBuildingTypes = Object.entries(buildingTypeCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([type]) => type);

        const recentWins = recentLeads
            .filter(l => l.dealStage === "Won" || l.dealStage === "Closed Won")
            .slice(0, 5)
            .map(l => ({
                name: l.projectName || l.clientName || "Project",
                type: l.buildingType || "Unknown",
                value: l.value || undefined,
            }));

        // Intel stats
        const opportunities = recentIntel.filter(i => i.type === "opportunity");
        const competitors = recentIntel.filter(i => i.type === "competitor");
        const policies = recentIntel.filter(i => i.type === "policy");

        return {
            brand: {
                personas: personas.map(p => ({
                    name: p.name,
                    identity: p.coreIdentity || "",
                    mantra: p.mantra || "",
                })),
                redLines: redLines.map(r => r.ruleContent),
                standards: standards.slice(0, 10).map(s => ({
                    term: s.term,
                    definition: s.definition || "",
                })),
            },
            capabilities: capabilities.map(c => ({
                category: c.category,
                name: c.name,
                description: c.description,
            })),
            geography: {
                regions: ["Northeast", "Mid-Atlantic", "National"],
                primaryMarkets: ["NYC", "Albany", "Capital Region"],
                serviceAreas: Object.keys(leadsByRegion).slice(0, 10),
            },
            network: {
                totalLeads: recentLeads.length,
                leadsByRegion,
                topBuildingTypes,
                recentWins,
            },
            intel: {
                recentOpportunities: opportunities.length,
                activeCompetitors: competitors.map(c => c.competitorName).filter((name): name is string => name !== null && name !== undefined).filter((v, i, a) => a.indexOf(v) === i),
                policyAlerts: policies.length,
            },
        };
    } catch (error) {
        console.error("Error building RAG context:", error);
        return {
            brand: { personas: [], redLines: [], standards: [] },
            capabilities: [],
            geography: { regions: [], primaryMarkets: [], serviceAreas: [] },
            network: { totalLeads: 0, leadsByRegion: {}, topBuildingTypes: [], recentWins: [] },
            intel: { recentOpportunities: 0, activeCompetitors: [], policyAlerts: 0 },
        };
    }
}

/**
 * Generate optimized prompts for each intel category
 */
export async function generateCategoryPrompts(): Promise<StoredPrompt[]> {
    if (!genAI) {
        console.warn("Gemini not configured, using template prompts");
        return getTemplatePrompts();
    }

    const context = await buildRAGContext();
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });

    const prompts: StoredPrompt[] = [];

    for (const category of INTEL_NEWS_TYPES) {
        try {
            const result = await model.generateContent(`
You are an AI agent for Scan2Plan, a 3D laser scanning and BIM modeling company.

COMPANY CONTEXT:
${JSON.stringify(context, null, 2)}

TASK: Generate an optimized search/monitoring prompt for the "${category}" intel category.

The prompt should:
1. Be specific to Scan2Plan's services and markets
2. Include relevant keywords from their capabilities
3. Target their geographic focus areas
4. Exclude irrelevant noise

OUTPUT FORMAT (JSON only):
{
    "name": "Short name for this prompt",
    "basePrompt": "The search query or monitoring prompt",
    "variables": ["{{variable1}}", "{{variable2}}"],
    "rationale": "Why this prompt is optimized for Scan2Plan"
}
`);

            const text = result.response.text();
            const jsonMatch = text.match(/\{[\s\S]*\}/);

            if (jsonMatch) {
                const parsed = JSON.parse(jsonMatch[0]);
                prompts.push({
                    category,
                    name: parsed.name || `${category} Monitor`,
                    basePrompt: parsed.basePrompt,
                    optimizedPrompt: parsed.basePrompt,
                    variables: parsed.variables || [],
                    performance: {
                        usageCount: 0,
                        successRate: 0,
                        avgConfidence: 0,
                        lastUsed: new Date().toISOString(),
                    },
                    metadata: {
                        createdBy: "agent",
                        version: 1,
                        optimizationNotes: parsed.rationale,
                    },
                    isActive: true,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                });
            }
        } catch (error) {
            console.error(`Error generating prompt for ${category}:`, error);
        }
    }

    return prompts.length > 0 ? prompts : getTemplatePrompts();
}

/**
 * Optimize an existing prompt based on performance and context
 */
export async function optimizePrompt(
    prompt: StoredPrompt,
    feedback?: { accepted: boolean; userEdits?: string }
): Promise<StoredPrompt> {
    if (!genAI) {
        return prompt;
    }

    const context = await buildRAGContext();
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    try {
        const result = await model.generateContent(`
You are optimizing a search/monitoring prompt for Scan2Plan.

CURRENT PROMPT:
Name: ${prompt.name}
Category: ${prompt.category}
Base: ${prompt.basePrompt}
Current Optimized: ${prompt.optimizedPrompt}
Performance: ${JSON.stringify(prompt.performance)}

${feedback ? `
USER FEEDBACK:
- Accepted: ${feedback.accepted}
- User edits: ${feedback.userEdits || "None"}
` : ""}

COMPANY CONTEXT:
${JSON.stringify(context, null, 2)}

TASK: Generate an improved version of this prompt that:
1. Incorporates any user feedback
2. Improves based on performance metrics
3. Stays aligned with Scan2Plan's brand and capabilities
4. Is more specific and targeted

OUTPUT: Return ONLY the improved prompt text, nothing else.
`);

        const optimized = result.response.text().trim();

        return {
            ...prompt,
            optimizedPrompt: optimized,
            performance: {
                ...prompt.performance,
                usageCount: prompt.performance.usageCount + (feedback?.accepted ? 1 : 0),
                successRate: feedback?.accepted
                    ? Math.min(100, prompt.performance.successRate + 5)
                    : Math.max(0, prompt.performance.successRate - 2),
            },
            metadata: {
                ...prompt.metadata,
                version: prompt.metadata.version + 1,
                optimizationNotes: `Optimized at ${new Date().toISOString()}`,
            },
            updatedAt: new Date().toISOString(),
        };
    } catch (error) {
        console.error("Error optimizing prompt:", error);
        return prompt;
    }
}

/**
 * Extract marketing intelligence from intel items
 */
export async function extractMarketingIntel(
    intelItems: Array<{ type: string; title: string; summary?: string; region?: string }>
): Promise<MarketingIntel[]> {
    if (!genAI || intelItems.length === 0) {
        return [];
    }

    const context = await buildRAGContext();
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    try {
        const result = await model.generateContent(`
You are analyzing market intelligence for Scan2Plan.

INTEL ITEMS:
${JSON.stringify(intelItems.slice(0, 10), null, 2)}

COMPANY CONTEXT:
${JSON.stringify(context, null, 2)}

TASK: Extract actionable marketing intelligence from these items.
For each significant insight, provide:
- Key insight summary
- Recommended action
- Confidence level (0-100)

OUTPUT FORMAT (JSON array):
[
    {
        "category": "market|competitor|opportunity|policy",
        "title": "Short title",
        "summary": "What this means for Scan2Plan",
        "insights": ["Insight 1", "Insight 2"],
        "actionItems": ["Action 1", "Action 2"],
        "confidence": 85
    }
]
`);

        const text = result.response.text();
        const jsonMatch = text.match(/\[[\s\S]*\]/);

        if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            return parsed.map((item: any) => ({
                ...item,
                source: "agent-extraction",
                metadata: {},
                createdAt: new Date().toISOString(),
            }));
        }
    } catch (error) {
        console.error("Error extracting marketing intel:", error);
    }

    return [];
}

/**
 * Fallback template prompts when AI is unavailable
 */
function getTemplatePrompts(): StoredPrompt[] {
    return INTEL_NEWS_TYPES.map(category => ({
        category,
        name: `${category.charAt(0).toUpperCase() + category.slice(1)} Monitor`,
        basePrompt: getDefaultPromptForCategory(category),
        optimizedPrompt: getDefaultPromptForCategory(category),
        variables: ["{{region}}", "{{buildingType}}"],
        performance: {
            usageCount: 0,
            successRate: 50,
            avgConfidence: 50,
            lastUsed: new Date().toISOString(),
        },
        metadata: {
            createdBy: "system" as const,
            version: 1,
        },
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    }));
}

function getDefaultPromptForCategory(category: string): string {
    const prompts: Record<string, string> = {
        opportunity: "(RFP OR bid OR procurement) AND (3D scanning OR BIM OR laser scanning OR as-built) AND ({{region}} OR construction)",
        policy: "(building code OR regulation OR compliance OR Local Law) AND (construction OR renovation OR {{region}})",
        competitor: "(scanning company OR BIM services OR reality capture) AND (acquires OR expands OR wins) NOT Scan2Plan",
        project: "(construction start OR renovation OR building permit) AND ({{region}} OR {{buildingType}})",
        technology: "(LiDAR OR BIM software OR reality capture OR Revit) AND (new OR release OR AI)",
        funding: "(grant OR funding OR tax credit) AND (construction OR historic preservation OR energy)",
        event: "(conference OR summit OR expo) AND (AEC OR construction OR BIM OR scanning)",
        talent: "(hiring OR jobs OR labor) AND (BIM OR scanning OR construction)",
        market: "(market trends OR forecast OR industry report) AND (construction OR AEC)",
    };
    return prompts[category] || `${category} AND construction AND scanning`;
}

/**
 * Store marketing intel in database (uses intelNewsItems as storage)
 */
export async function storeMarketingIntel(intel: MarketingIntel): Promise<boolean> {
    try {
        await db.insert(intelNewsItems).values({
            type: intel.category as any,
            title: intel.title,
            summary: intel.summary,
            metadata: {
                insights: intel.insights,
                actionItems: intel.actionItems,
                confidence: intel.confidence,
                source: intel.source,
                extractedAt: intel.createdAt,
            },
            relevanceScore: intel.confidence,
            isActionable: intel.actionItems.length > 0,
        });
        return true;
    } catch (error) {
        console.error("Error storing marketing intel:", error);
        return false;
    }
}
