/**
 * Scout Agent
 * 
 * Gathers and structures intel from various sources
 */

import { AgentBase, AgentType, MessageType, AGENT_CONFIGS } from "./AgentBase";

export interface ScoutInput {
    rawContent: string;
    source: string;
    sourceUrl?: string;
    category?: string;
}

export interface ScoutOutput {
    title: string;
    summary: string;
    category: string;
    relevanceScore: number;
    entities: {
        companies: string[];
        locations: string[];
        values: string[];
        deadlines: string[];
    };
    actionable: boolean;
    isDuplicate: boolean;
    metadata: Record<string, any>;
}

export class ScoutAgent extends AgentBase {
    constructor() {
        super(AGENT_CONFIGS.scout);
    }

    protected buildPrompt(input: ScoutInput): string {
        return `Analyze the following raw intel and extract structured data:

SOURCE: ${input.source}
URL: ${input.sourceUrl || "N/A"}
SUGGESTED CATEGORY: ${input.category || "unknown"}

CONTENT:
${input.rawContent}

Extract and return JSON with these fields:
{
    "title": "Short descriptive title",
    "summary": "2-3 sentence summary",
    "category": "one of: opportunity, competitor, policy, technology, partnership, market, regulation, event, talent",
    "relevanceScore": 0-100 (how relevant to 3D scanning/BIM services),
    "entities": {
        "companies": ["company names mentioned"],
        "locations": ["cities, states, regions"],
        "values": ["dollar amounts, sqft, etc"],
        "deadlines": ["dates, timeframes"]
    },
    "actionable": true/false (is there something Scan2Plan should act on?),
    "isDuplicate": false,
    "metadata": { any other useful extracted data }
}

Return ONLY valid JSON.`;
    }

    protected parseResponse(content: string): ScoutOutput | null {
        try {
            const jsonMatch = content.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                return JSON.parse(jsonMatch[0]) as ScoutOutput;
            }
        } catch (error) {
            console.error("[Scout] Failed to parse response:", error);
        }
        return null;
    }

    protected getNextAgent(): AgentType {
        return "analyst";
    }

    protected getOutputType(): MessageType {
        return "intel";
    }
}

export const scoutAgent = new ScoutAgent();
