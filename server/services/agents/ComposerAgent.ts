/**
 * Composer Agent
 * 
 * Drafts content based on strategist recommendations
 */

import { AgentBase, AgentType, MessageType, AGENT_CONFIGS } from "./AgentBase";
import { StrategistOutput } from "./StrategistAgent";

export interface ComposerInput {
    strategy: StrategistOutput;
    brandContext?: {
        persona: string;
        voiceTone: string;
        redLines: string[];
    };
    targetContact?: {
        name: string;
        title: string;
        company: string;
    };
}

export interface ComposerOutput {
    drafts: Array<{
        type: "email" | "proposal" | "linkedin" | "case-study";
        title: string;
        content: string;
        forAction: number; // Index of priority action this supports
        metadata: {
            wordCount: number;
            targetPersona?: string;
        };
    }>;
    contentSuggestions: string[];
}

export class ComposerAgent extends AgentBase {
    constructor() {
        super(AGENT_CONFIGS.composer);
    }

    protected buildPrompt(input: ComposerInput): string {
        const actionsSummary = input.strategy.priorityActions
            .filter(a => a.priority <= 2)
            .map((action, i) => `[${i}] Priority ${action.priority}: ${action.action}`)
            .join("\n");

        return `Create content drafts for the following priority actions:

PRIORITY ACTIONS:
${actionsSummary}

WEEKLY FOCUS: ${input.strategy.weeklyFocus}

BRAND CONTEXT:
- Persona: ${input.brandContext?.persona || "Professional scanning expert"}
- Tone: ${input.brandContext?.voiceTone || "Confident, helpful, expert"}
- Red lines: ${input.brandContext?.redLines?.join("; ") || "None specified"}

${input.targetContact ? `TARGET CONTACT:
- Name: ${input.targetContact.name}
- Title: ${input.targetContact.title}
- Company: ${input.targetContact.company}` : ""}

Create content as JSON:
{
    "drafts": [
        {
            "type": "email|proposal|linkedin|case-study",
            "title": "Subject line or title",
            "content": "Full content draft",
            "forAction": action index,
            "metadata": {
                "wordCount": number,
                "targetPersona": "if applicable"
            }
        }
    ],
    "contentSuggestions": ["other content ideas"]
}

Return ONLY valid JSON.`;
    }

    protected parseResponse(content: string): ComposerOutput | null {
        try {
            const jsonMatch = content.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                return JSON.parse(jsonMatch[0]) as ComposerOutput;
            }
        } catch (error) {
            console.error("[Composer] Failed to parse response:", error);
        }
        return null;
    }

    protected getNextAgent(): AgentType {
        return "auditor";
    }

    protected getOutputType(): MessageType {
        return "content";
    }
}

export const composerAgent = new ComposerAgent();
