/**
 * Strategist Agent
 * 
 * Recommends actions based on analyst insights
 * Includes FitScore for structured go/no-go decisions
 */

import { AgentBase, AgentType, MessageType, AGENT_CONFIGS } from "./AgentBase";
import { AnalystOutput } from "./AnalystAgent";

/**
 * Structured fit score for RFP/opportunity evaluation
 * Based on patterns from RFP_IntelliCheck and Microsoft RFP Reviewer
 */
export interface FitScore {
    overall: number;           // 0-100
    decision: "go" | "no-go" | "maybe";
    confidence: number;        // 0-100 on the decision
    breakdown: {
        projectTypeMatch: number;   // 0-100: Have we done this before?
        geoFit: number;             // 0-100: Travel viable?
        capacityFit: number;        // 0-100: Can we staff it?
        marginPotential: number;    // 0-100: Will it hit 40%? 
        comfortLevel: number;       // 0-100: Risk assessment
    };
    redFlags: string[];    // Reasons NOT to pursue
    greenFlags: string[];  // Reasons TO pursue
    rationale: string;     // 2-3 sentence summary
}

export interface StrategistInput {
    analysis: AnalystOutput;
    pipelineState?: {
        totalValue: number;
        stageDistribution: Record<string, number>;
        staleDeals: number;
    };
    companyContext?: {
        regions: string[];
        buildingTypes: string[];
        currentCapacity: "low" | "medium" | "high";
    };
}

export interface StrategistOutput {
    fitScore: FitScore;
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
        fitScore: FitScore;
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

        return `Based on the following analysis, provide strategic recommendations with STRUCTURED FIT SCORES.

INSIGHTS:
${insightsSummary}

MARKET TRENDS:
${input.analysis.marketTrends.join(", ")}

OPPORTUNITY MATCHES:
${input.analysis.opportunityMatches.map(m => `Score ${m.matchScore}: ${m.matchReasons.join(", ")}`).join("\n")}

PIPELINE STATE:
- Total value: $${input.pipelineState?.totalValue?.toLocaleString() || "Unknown"}
- Stale deals: ${input.pipelineState?.staleDeals || 0}

COMPANY CONTEXT:
- Target regions: ${input.companyContext?.regions?.join(", ") || "Northeast, Mid-Atlantic"}
- Building types: ${input.companyContext?.buildingTypes?.join(", ") || "Commercial, Healthcare, Historic"}
- Current capacity: ${input.companyContext?.currentCapacity || "medium"}

SCAN2PLAN FIT CRITERIA:
- Project type match: Do we have case studies/experience?
- Geo fit: Is it in our coverage area (NY, NJ, PA, CT)? How far from dispatch?
- Capacity fit: Can we staff it given current workload?
- Margin potential: Can we hit 40% gross margin?
- Comfort level: Any red flags (tight timeline, complex requirements, unknown client)?

Provide strategic recommendations as JSON:
{
    "fitScore": {
        "overall": 0-100,
        "decision": "go|no-go|maybe",
        "confidence": 0-100,
        "breakdown": {
            "projectTypeMatch": 0-100,
            "geoFit": 0-100,
            "capacityFit": 0-100,
            "marginPotential": 0-100,
            "comfortLevel": 0-100
        },
        "redFlags": ["list of concerns"],
        "greenFlags": ["list of positives"],
        "rationale": "2-3 sentence summary of recommendation"
    },
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
            "fitScore": { same structure as above },
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
                const parsed = JSON.parse(jsonMatch[0]) as StrategistOutput;

                // Ensure fitScore has defaults if missing
                if (!parsed.fitScore) {
                    parsed.fitScore = {
                        overall: 50,
                        decision: "maybe",
                        confidence: 50,
                        breakdown: {
                            projectTypeMatch: 50,
                            geoFit: 50,
                            capacityFit: 50,
                            marginPotential: 50,
                            comfortLevel: 50,
                        },
                        redFlags: [],
                        greenFlags: [],
                        rationale: "Insufficient data for scoring",
                    };
                }

                return parsed;
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
