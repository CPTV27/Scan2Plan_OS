/**
 * Analyst Agent
 * 
 * Interprets intel for patterns, trends, and insights
 */

import { AgentBase, AgentType, MessageType, AGENT_CONFIGS } from "./AgentBase";
import { ScoutOutput } from "./ScoutAgent";

export interface AnalystInput {
    intelItems: ScoutOutput[];
    historicalContext?: {
        recentWins: string[];
        activeCompetitors: string[];
        targetRegions: string[];
    };
}

export interface AnalystOutput {
    insights: Array<{
        type: "trend" | "opportunity" | "threat" | "recommendation";
        title: string;
        description: string;
        confidence: number;
        relatedItems: number[];
    }>;
    marketTrends: string[];
    competitorMoves: string[];
    opportunityMatches: Array<{
        intelIndex: number;
        matchScore: number;
        matchReasons: string[];
    }>;
    weeklyDigest: string;
}

export class AnalystAgent extends AgentBase {
    constructor() {
        super(AGENT_CONFIGS.analyst);
    }

    protected buildPrompt(input: AnalystInput): string {
        const itemsSummary = input.intelItems
            .map((item, i) => `[${i}] ${item.title} (${item.category}, relevance: ${item.relevanceScore})`)
            .join("\n");

        return `Analyze the following intel items and provide insights:

INTEL ITEMS:
${itemsSummary}

HISTORICAL CONTEXT:
- Recent wins: ${input.historicalContext?.recentWins?.join(", ") || "None available"}
- Active competitors: ${input.historicalContext?.activeCompetitors?.join(", ") || "Unknown"}
- Target regions: ${input.historicalContext?.targetRegions?.join(", ") || "Not specified"}

Provide analysis as JSON:
{
    "insights": [
        {
            "type": "trend|opportunity|threat|recommendation",
            "title": "Short insight title",
            "description": "Detailed explanation",
            "confidence": 0-100,
            "relatedItems": [item indices]
        }
    ],
    "marketTrends": ["trend 1", "trend 2"],
    "competitorMoves": ["what competitors are doing"],
    "opportunityMatches": [
        {
            "intelIndex": 0,
            "matchScore": 0-100,
            "matchReasons": ["why this is a good fit"]
        }
    ],
    "weeklyDigest": "2-3 paragraph executive summary of the week's intel"
}

Return ONLY valid JSON.`;
    }

    protected parseResponse(content: string): AnalystOutput | null {
        try {
            const jsonMatch = content.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                return JSON.parse(jsonMatch[0]) as AnalystOutput;
            }
        } catch (error) {
            console.error("[Analyst] Failed to parse response:", error);
        }
        return null;
    }

    protected getNextAgent(): AgentType {
        return "strategist";
    }

    protected getOutputType(): MessageType {
        return "insight";
    }
}

export const analystAgent = new AnalystAgent();
