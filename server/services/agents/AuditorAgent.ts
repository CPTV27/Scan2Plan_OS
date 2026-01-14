/**
 * Auditor Agent
 * 
 * Quality control for all agent outputs
 */

import { AgentBase, AgentType, MessageType, AGENT_CONFIGS } from "./AgentBase";
import { ComposerOutput } from "./ComposerAgent";

export interface AuditorInput {
    composerOutput: ComposerOutput;
    brandRules?: {
        redLines: string[];
        voiceGuidelines: string[];
        factChecks: string[];
    };
}

export interface AuditorOutput {
    results: Array<{
        draftIndex: number;
        status: "pass" | "fail" | "needs-revision";
        issues: Array<{
            type: "brand" | "redline" | "fact" | "tone" | "other";
            description: string;
            severity: "low" | "medium" | "high";
            suggestedFix?: string;
        }>;
        overallScore: number;
    }>;
    feedbackForScout: string[];
    approvedDrafts: number[];
}

export class AuditorAgent extends AgentBase {
    constructor() {
        super(AGENT_CONFIGS.auditor);
    }

    protected buildPrompt(input: AuditorInput): string {
        const draftsSummary = input.composerOutput.drafts
            .map((draft, i) => `[${i}] ${draft.type}: "${draft.title}" (${draft.metadata.wordCount} words)`)
            .join("\n");

        return `Review the following content drafts for quality and compliance:

DRAFTS TO REVIEW:
${draftsSummary}

DRAFT CONTENTS:
${input.composerOutput.drafts.map((d, i) => `--- DRAFT ${i} ---\n${d.content}`).join("\n\n")}

BRAND RULES:
- Red lines (never do): ${input.brandRules?.redLines?.join("; ") || "Don't overpromise, be accurate on timelines"}
- Voice guidelines: ${input.brandRules?.voiceGuidelines?.join("; ") || "Professional, confident, helpful"}
- Fact checks: ${input.brandRules?.factChecks?.join("; ") || "Verify claims about capabilities"}

Review each draft and return JSON:
{
    "results": [
        {
            "draftIndex": 0,
            "status": "pass|fail|needs-revision",
            "issues": [
                {
                    "type": "brand|redline|fact|tone|other",
                    "description": "What's wrong",
                    "severity": "low|medium|high",
                    "suggestedFix": "How to fix it"
                }
            ],
            "overallScore": 0-100
        }
    ],
    "feedbackForScout": ["suggestions to improve future intel gathering"],
    "approvedDrafts": [indices of passing drafts]
}

Return ONLY valid JSON.`;
    }

    protected parseResponse(content: string): AuditorOutput | null {
        try {
            const jsonMatch = content.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                return JSON.parse(jsonMatch[0]) as AuditorOutput;
            }
        } catch (error) {
            console.error("[Auditor] Failed to parse response:", error);
        }
        return null;
    }

    protected getNextAgent(): AgentType {
        // Auditor is the end of the chain
        return "scout"; // Feedback loop
    }

    protected getOutputType(): MessageType {
        return "audit";
    }
}

export const auditorAgent = new AuditorAgent();
