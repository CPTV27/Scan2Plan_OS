import { aiClient } from "./aiClient";
import { log } from "../../lib/logger";
import type { Lead } from "@shared/schema";

export interface ProposalSection {
  title: string;
  content: string;
}

export interface ProposalResult {
  sections: ProposalSection[];
  metadata: {
    template: string;
    persona: string | null;
    generatedAt: string;
    wordCount: number;
  };
  analysisTime: number;
  error?: string;
}

const PERSONA_MESSAGING: Record<string, string> = {
  BP1: "The Engineer - Focus on technical accuracy, data quality, and precision specifications",
  BP2: "The GC - Emphasize schedule reliability, coordination benefits, and RFI reduction",
  BP3: "The Architect - Highlight design integration, BIM compatibility, and creative flexibility",
  BP4: "The Developer - Lead with ROI, timeline efficiency, and cost certainty",
  BP5: "The Facility Manager - Stress ongoing value, maintenance planning, and space optimization",
  BP6: "The Property Owner - Emphasize asset documentation, liability reduction, and property value",
  BP7: "The Historic Preservationist - Focus on documentation accuracy, non-invasive methods, and heritage protection",
  BP8: "The Government Official - Highlight compliance, transparency, and public value",
};

const PROPOSAL_SYSTEM_PROMPT = `You are an expert proposal writer for Scan2Plan, a professional laser scanning and BIM services company.

Create compelling, professional proposals that:
1. Address the specific buyer persona's pain points
2. Clearly articulate scope and deliverables
3. Include relevant case studies and social proof
4. Present a clear timeline
5. Justify the pricing with value proposition
6. Mitigate perceived risks

Write in a professional but approachable tone. Be specific and avoid generic language.`;

export async function generateProposal(
  lead: Lead,
  options: {
    template: "technical" | "executive" | "standard";
    sections?: string[];
    caseStudies?: { title: string; summary: string }[];
    persona?: string;
  }
): Promise<ProposalResult> {
  const startTime = Date.now();

  if (!aiClient.isConfigured()) {
    return {
      sections: [],
      metadata: {
        template: options.template,
        persona: options.persona || null,
        generatedAt: new Date().toISOString(),
        wordCount: 0,
      },
      analysisTime: 0,
      error: "AI service not configured",
    };
  }

  const persona = options.persona;
  const personaContext = persona && PERSONA_MESSAGING[persona]
    ? PERSONA_MESSAGING[persona]
    : "General prospect - balance technical and business value";

  const defaultSections = options.template === "executive"
    ? ["executive_summary", "value_proposition", "scope_overview", "timeline", "investment", "next_steps"]
    : options.template === "technical"
    ? ["executive_summary", "scope_of_work", "deliverables", "technical_approach", "timeline", "pricing", "team_qualifications", "risk_mitigation"]
    : ["executive_summary", "scope_of_work", "deliverables", "timeline", "pricing", "case_studies", "next_steps"];

  const requestedSections = options.sections || defaultSections;

  try {
    const projectContext = {
      projectName: lead.projectName,
      clientName: lead.clientName,
      projectAddress: lead.projectAddress,
      buildingType: lead.buildingType,
      sqft: lead.sqft,
      scope: lead.scope,
      disciplines: lead.disciplines,
      value: lead.value,
      notes: lead.notes,
    };

    const result = await aiClient.chatJSON<{
      sections: { title: string; content: string }[];
    }>({
      messages: [
        { role: "system", content: PROPOSAL_SYSTEM_PROMPT },
        {
          role: "user",
          content: `Generate a ${options.template} proposal for this project:

Project Details:
${JSON.stringify(projectContext, null, 2)}

Buyer Persona: ${personaContext}

${options.caseStudies?.length ? `Relevant Case Studies:\n${options.caseStudies.map(c => `- ${c.title}: ${c.summary}`).join("\n")}` : ""}

Generate these sections: ${requestedSections.join(", ")}

Return JSON:
{
  "sections": [
    { "title": "Executive Summary", "content": "Full formatted content for this section..." },
    { "title": "Scope of Work", "content": "Full formatted content..." }
  ]
}

Write professional, compelling content. Use specific details from the project. Each section should be 100-300 words.`,
        },
      ],
      temperature: 0.6,
      maxTokens: 4000,
    });

    if (!result || !result.sections) {
      return {
        sections: [],
        metadata: {
          template: options.template,
          persona: options.persona || null,
          generatedAt: new Date().toISOString(),
          wordCount: 0,
        },
        analysisTime: Date.now() - startTime,
        error: "AI returned no results",
      };
    }

    const wordCount = result.sections.reduce(
      (sum, section) => sum + section.content.split(/\s+/).length,
      0
    );

    log(`[AI Proposal] Generated ${result.sections.length} sections, ${wordCount} words`);

    return {
      sections: result.sections,
      metadata: {
        template: options.template,
        persona: options.persona || null,
        generatedAt: new Date().toISOString(),
        wordCount,
      },
      analysisTime: Date.now() - startTime,
    };
  } catch (error: any) {
    log(`ERROR: [AI Proposal] Generation failed: ${error?.message || error}`);
    return {
      sections: [],
      metadata: {
        template: options.template,
        persona: options.persona || null,
        generatedAt: new Date().toISOString(),
        wordCount: 0,
      },
      analysisTime: Date.now() - startTime,
      error: error?.message || "Generation failed",
    };
  }
}
