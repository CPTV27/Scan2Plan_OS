/**
 * Strategist Agent
 * 
 * Recommends actions based on analyst insights
 */

import { AgentBase, AgentType, MessageType, AGENT_CONFIGS } from "./AgentBase";
import { AnalystOutput } from "./AnalystAgent";

export interface StrategistInput {
    analysis: AnalystOutput;
    pipelineState?: {
        totalValue: number;
        stageDistribution: Record<string, number>;
        staleDeals: number;
    };
}

export interface StrategistOutput {
    priorityActions: Array<{
        priority: 1 | 2 | 3;
        action: string;
        reasoning: string;
        deadline?: string;
        owner?: string;
        relatedInsight: number;
    }>;
    bidDecisions: Array<{
        opportunityTitle: string;
        decision: "bid" | "no-bid" | "monitor";
        confidence: number;
        reasoning: string;
        pricingHint?: string;
    }>;
    weeklyFocus: string;
    resourceRecommendations: string[];
}

export class StrategistAgent extends AgentBase {
    constructor() {
        super(AGENT_CONFIGS.strategist);
    }

    protected buildPrompt(input: StrategistInput): string {
        const insightsSummary = input.analysis.insights
            .map((insight, i) => `[${i}] ${insight.type}: ${insight.title} (confidence: ${insight.confidence}%)`)
            .join("\n");

        return `Based on the following analysis, provide strategic recommendations:

INSIGHTS:
${insightsSummary}

MARKET TRENDS:
${input.analysis.marketTrends.join(", ")}

OPPORTUNITY MATCHES:
${input.analysis.opportunityMatches.map(m => `Score ${m.matchScore}: ${m.matchReasons.join(", ")}`).join("\n")}

PIPELINE STATE:
- Total value: $${input.pipelineState?.totalValue?.toLocaleString() || "Unknown"}
- Stale deals: ${input.pipelineState?.staleDeals || 0}

Provide strategic recommendations as JSON:
{
    "priorityActions": [
        {
            "priority": 1-3 (1 = most urgent),
            "action": "Specific action to take",
            "reasoning": "Why this is important",
            "deadline": "When it should be done",
            "owner": "Who should do it (CEO, Sales, Ops)",
            "relatedInsight": insight index
        }
    ],
    "bidDecisions": [
        {
            "opportunityTitle": "Name of opportunity",
            "decision": "bid|no-bid|monitor",
            "confidence": 0-100,
            "reasoning": "Why this decision",
            "pricingHint": "Suggested pricing approach"
        }
    ],
    "weeklyFocus": "One sentence describing CEO's focus this week",
    "resourceRecommendations": ["team/resource suggestions"]
}

Return ONLY valid JSON.`;
    }

    protected parseResponse(content: string): StrategistOutput | null {
        try {
            const jsonMatch = content.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                return JSON.parse(jsonMatch[0]) as StrategistOutput;
            }
        } catch (error) {
            console.error("[Strategist] Failed to parse response:", error);
        }
        return null;
    }

    protected getNextAgent(): AgentType {
        return "composer";
    }

    protected getOutputType(): MessageType {
        return "action";
    }
}

export const strategistAgent = new StrategistAgent();
