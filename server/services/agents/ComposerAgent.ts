/**
 * Composer Agent
 * 
 * Drafts content based on strategist recommendations
 * Uses past proposal RAG for informed content generation
 */

import { AgentBase, AgentType, MessageType, AGENT_CONFIGS } from "./AgentBase";
import { StrategistOutput, FitScore } from "./StrategistAgent";

/**
 * Past proposal reference for RAG context
 */
export interface ProposalReference {
    title: string;
    clientName: string;
    buildingType: string;
    outcome: "won" | "lost" | "pending";
    executiveSummary?: string;
    scopeOfWork?: string;
    methodology?: string;
    caseStudies?: string;
    similarity: number;  // 0-1 match score
}

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
    // NEW: Past proposal context for RAG
    similarProposals?: ProposalReference[];
    opportunityDetails?: {
        title: string;
        client: string;
        buildingType: string;
        squareFeet?: number;
        deadline?: string;
    };
}

export interface ComposerOutput {
    drafts: Array<{
        type: "email" | "proposal" | "linkedin" | "case-study" | "rfp-response";
        title: string;
        content: string;
        forAction: number;
        metadata: {
            wordCount: number;
            targetPersona?: string;
            referencedProposals?: string[];  // Titles of proposals used
        };
    }>;
    contentSuggestions: string[];
    proposalSections?: {
        executiveSummary?: string;
        scopeOfWork?: string;
        methodology?: string;
        deliverables?: string;
        timeline?: string;
        whyUs?: string;
    };
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

        // Build past proposal context if available
        let proposalContext = "";
        if (input.similarProposals && input.similarProposals.length > 0) {
            proposalContext = `
SIMILAR WINNING PROPOSALS (use these as templates):
${input.similarProposals.map((p, i) => `
--- PROPOSAL ${i + 1}: ${p.title} (${Math.round(p.similarity * 100)}% match) ---
Client: ${p.clientName}
Building Type: ${p.buildingType}
Outcome: ${p.outcome}
${p.executiveSummary ? `Executive Summary: ${p.executiveSummary}` : ""}
${p.scopeOfWork ? `Scope: ${p.scopeOfWork}` : ""}
${p.methodology ? `Methodology: ${p.methodology}` : ""}
${p.caseStudies ? `Case Studies Referenced: ${p.caseStudies}` : ""}
`).join("\n")}`;
        }

        // Build opportunity context if available
        let opportunityContext = "";
        if (input.opportunityDetails) {
            opportunityContext = `
TARGET OPPORTUNITY:
- Project: ${input.opportunityDetails.title}
- Client: ${input.opportunityDetails.client}
- Building Type: ${input.opportunityDetails.buildingType}
${input.opportunityDetails.squareFeet ? `- Size: ${input.opportunityDetails.squareFeet.toLocaleString()} sqft` : ""}
${input.opportunityDetails.deadline ? `- Deadline: ${input.opportunityDetails.deadline}` : ""}`;
        }

        // Build fit score context
        let fitScoreContext = "";
        if (input.strategy.fitScore) {
            const fs = input.strategy.fitScore;
            fitScoreContext = `
FIT SCORE: ${fs.overall}/100 (${fs.decision.toUpperCase()})
- Project Type Match: ${fs.breakdown.projectTypeMatch}%
- Geo Fit: ${fs.breakdown.geoFit}%
- Margin Potential: ${fs.breakdown.marginPotential}%
Green Flags: ${fs.greenFlags.join(", ") || "None"}
Red Flags: ${fs.redFlags.join(", ") || "None"}`;
        }

        return `Create content drafts for the following priority actions:

PRIORITY ACTIONS:
${actionsSummary}

WEEKLY FOCUS: ${input.strategy.weeklyFocus}
${fitScoreContext}
${opportunityContext}
${proposalContext}

BRAND CONTEXT:
- Persona: ${input.brandContext?.persona || "Professional scanning expert"}
- Tone: ${input.brandContext?.voiceTone || "Confident, helpful, expert"}
- Red lines: ${input.brandContext?.redLines?.join("; ") || "None specified"}

${input.targetContact ? `TARGET CONTACT:
- Name: ${input.targetContact.name}
- Title: ${input.targetContact.title}
- Company: ${input.targetContact.company}` : ""}

INSTRUCTIONS:
1. If similar winning proposals are provided, adapt their language and structure
2. Reference specific case studies and metrics from past wins
3. Match the tone and positioning to Scan2Plan's brand
4. For RFP responses, include proposalSections with structured content

Create content as JSON:
{
    "drafts": [
        {
            "type": "email|proposal|linkedin|case-study|rfp-response",
            "title": "Subject line or title",
            "content": "Full content draft",
            "forAction": action index,
            "metadata": {
                "wordCount": number,
                "targetPersona": "if applicable",
                "referencedProposals": ["titles of proposals used"]
            }
        }
    ],
    "contentSuggestions": ["other content ideas"],
    "proposalSections": {
        "executiveSummary": "2-3 paragraph summary",
        "scopeOfWork": "Detailed scope description",
        "methodology": "How we'll approach the work",
        "deliverables": "What client receives",
        "timeline": "Estimated schedule",
        "whyUs": "Differentiators and experience"
    }
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
