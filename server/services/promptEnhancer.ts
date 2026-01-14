/**
 * Prompt Enhancer Service
 * 
 * Enhances basic user prompts using Brand Engine personas,
 * Knowledge Base context, and historical project data.
 */

import { db } from "../db";
import { brandPersonas, governanceRedLines, standardDefinitions, companyCapabilities, leads, projects } from "@shared/schema";
import { eq, desc, ilike, or } from "drizzle-orm";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { findSimilarProjects, isChromaDBAvailable } from "./vectorStore";

// Initialize Gemini (using Replit's integration with fallback)
const genAI = (process.env.AI_INTEGRATIONS_GEMINI_API_KEY || process.env.GEMINI_API_KEY)
    ? new GoogleGenerativeAI(process.env.AI_INTEGRATIONS_GEMINI_API_KEY || process.env.GEMINI_API_KEY || "")
    : null;

// Types
export interface EnhancementOptions {
    region?: string;      // "Northeast", "Mid-Atlantic", etc.
    buyerType?: string;   // "Architect", "GC", "Owner", "Developer"
    projectType?: string; // "Historic", "Commercial", "Residential", "Healthcare"
    discipline?: string;  // "Architecture", "MEPF", "Structure"
    urgency?: "low" | "medium" | "high";
}

export interface EnhancementContext {
    persona?: {
        name: string;
        coreIdentity: string;
        mantra: string;
        directives: string;
    };
    standards?: Array<{
        term: string;
        definition: string;
        guaranteeText?: string;
    }>;
    redLines?: string[];
    capabilities?: string[];
    similarProjects?: Array<{
        name: string;
        clientName: string;
        buildingType?: string;
        value?: string;
    }>;
}

export interface EnhancementResult {
    originalPrompt: string;
    enhancedPrompt: string;
    context: EnhancementContext;
    suggestedTone: string;
    confidence: number; // 0-100
}

/**
 * Select the best persona based on region and buyer type
 */
async function selectPersona(options: EnhancementOptions): Promise<EnhancementContext["persona"] | undefined> {
    try {
        const personas = await db.select().from(brandPersonas).where(eq(brandPersonas.active, true));

        if (!personas.length) return undefined;

        // Match by region first
        if (options.region) {
            const regionMatch = personas.find(p =>
                p.name?.toLowerCase().includes(options.region!.toLowerCase()) ||
                p.coreIdentity?.toLowerCase().includes(options.region!.toLowerCase())
            );
            if (regionMatch) {
                return {
                    name: regionMatch.name,
                    coreIdentity: regionMatch.coreIdentity || "",
                    mantra: regionMatch.mantra || "",
                    directives: regionMatch.directives || "",
                };
            }
        }

        // Match by buyer type
        if (options.buyerType) {
            const buyerMatch = personas.find(p =>
                p.coreIdentity?.toLowerCase().includes(options.buyerType!.toLowerCase())
            );
            if (buyerMatch) {
                return {
                    name: buyerMatch.name,
                    coreIdentity: buyerMatch.coreIdentity || "",
                    mantra: buyerMatch.mantra || "",
                    directives: buyerMatch.directives || "",
                };
            }
        }

        // Default to first active persona
        const defaultPersona = personas[0];
        return {
            name: defaultPersona.name,
            coreIdentity: defaultPersona.coreIdentity || "",
            mantra: defaultPersona.mantra || "",
            directives: defaultPersona.directives || "",
        };
    } catch (error) {
        console.error("Error selecting persona:", error);
        return undefined;
    }
}

/**
 * Get relevant technical standards based on project context
 */
async function getRelevantStandards(options: EnhancementOptions): Promise<EnhancementContext["standards"]> {
    try {
        const standards = await db.select().from(standardDefinitions).where(eq(standardDefinitions.active, true));

        // Filter by relevance to project type
        const relevant = standards.filter(s => {
            const term = s.term.toLowerCase();
            const def = (s.definition || "").toLowerCase();

            // Always include LoD and LoA
            if (term.includes("lod") || term.includes("loa")) return true;

            // Include discipline-specific
            if (options.discipline) {
                if (def.includes(options.discipline.toLowerCase())) return true;
            }

            // Include project type specific
            if (options.projectType) {
                if (def.includes(options.projectType.toLowerCase())) return true;
                if (options.projectType === "Historic" && (term.includes("hbim") || def.includes("historic"))) return true;
            }

            return false;
        });

        return relevant.slice(0, 5).map(s => ({
            term: s.term,
            definition: s.definition || "",
            guaranteeText: s.guaranteeText || undefined,
        }));
    } catch (error) {
        console.error("Error getting standards:", error);
        return [];
    }
}

/**
 * Get active red lines that should never be violated
 */
async function getRedLines(): Promise<string[]> {
    try {
        const redLines = await db.select().from(governanceRedLines).where(eq(governanceRedLines.active, true));
        return redLines.map(r => r.ruleContent);
    } catch (error) {
        console.error("Error getting red lines:", error);
        return [];
    }
}

/**
 * Get company capabilities
 */
async function getCapabilities(): Promise<string[]> {
    try {
        const caps = await db.select().from(companyCapabilities);
        return caps.map(c => `${c.category}: ${c.name} - ${c.description}`);
    } catch (error) {
        console.error("Error getting capabilities:", error);
        return [];
    }
}

/**
 * Find similar won projects for case study references
 */
async function findSimilarWonProjects(options: EnhancementOptions): Promise<EnhancementContext["similarProjects"]> {
    try {
        // Try vector search first if available
        if (isChromaDBAvailable()) {
            const similar = await findSimilarProjects({
                buildingType: options.projectType,
                region: options.region,
                disciplines: options.discipline ? [options.discipline] : undefined,
            }, 3);

            if (similar.length > 0) {
                return similar.map(p => ({
                    name: p.name,
                    clientName: p.clientName,
                    buildingType: p.metadata.buildingType,
                }));
            }
        }

        // Fallback to database search using leads (which have project-like data)
        const recentLeads = await db
            .select()
            .from(leads)
            .orderBy(desc(leads.createdAt))
            .limit(10);

        // Filter by matching criteria
        const filtered = recentLeads.filter(l => {
            if (options.projectType && l.buildingType) {
                return l.buildingType.toLowerCase().includes(options.projectType.toLowerCase());
            }
            return true;
        }).slice(0, 3);

        return filtered.map(l => ({
            name: l.projectName || l.clientName || "Project",
            clientName: l.clientName || "Client",
            buildingType: l.buildingType || undefined,
            value: l.value || undefined,
        }));
    } catch (error) {
        console.error("Error finding similar projects:", error);
        return [];
    }
}

/**
 * Main enhancement function
 */
export async function enhancePrompt(
    userPrompt: string,
    options: EnhancementOptions = {}
): Promise<EnhancementResult> {
    // Gather context
    const [persona, standards, redLines, capabilities, similarProjects] = await Promise.all([
        selectPersona(options),
        getRelevantStandards(options),
        getRedLines(),
        getCapabilities(),
        findSimilarWonProjects(options),
    ]);

    const context: EnhancementContext = {
        persona,
        standards,
        redLines,
        capabilities,
        similarProjects,
    };

    // If no AI available, return basic enhancement
    if (!genAI) {
        return {
            originalPrompt: userPrompt,
            enhancedPrompt: userPrompt + (persona ? `\n\nUse ${persona.name} voice: ${persona.mantra}` : ""),
            context,
            suggestedTone: persona?.name || "Professional",
            confidence: 50,
        };
    }

    // Build AI enhancement prompt
    const systemPrompt = `You are a Prompt Enhancement Engine for Scan2Plan, a 3D laser scanning and BIM modeling company.

Your job is to take a basic user prompt and enhance it with specific context, technical accuracy, and brand voice.

COMPANY CONTEXT:
${persona ? `
BRAND PERSONA: ${persona.name}
Core Identity: ${persona.coreIdentity}
Mantra: ${persona.mantra}
Directives: ${persona.directives}
` : ""}

TECHNICAL STANDARDS:
${standards?.map(s => `- ${s.term}: ${s.definition}`).join("\n") || "Standard accuracy: LoA-40 (measured), LoA-30 (modeled)"}

${redLines && redLines.length > 0 ? `
RED LINES (Never violate):
${redLines.map(r => `- ${r}`).join("\n")}
` : ""}

${capabilities && capabilities.length > 0 ? `
CAPABILITIES:
${capabilities.slice(0, 5).join("\n")}
` : ""}

${similarProjects && similarProjects.length > 0 ? `
REFERENCE PROJECTS (for case studies):
${similarProjects.map(p => `- ${p.name} for ${p.clientName}${p.buildingType ? ` (${p.buildingType})` : ""}`).join("\n")}
` : ""}

ENHANCEMENT RULES:
1. Maintain the user's core intent
2. Add specific technical details (LoD, LoA, equipment)
3. Infuse the brand persona's voice and confidence
4. Reference similar projects where relevant
5. Include any guarantees or differentiators
6. Keep it actionable and specific

OUTPUT FORMAT:
Return ONLY the enhanced prompt. Do not include explanations or metadata.`;

    const userMessage = `Original prompt: "${userPrompt}"

${options.region ? `Region context: ${options.region}` : ""}
${options.buyerType ? `Buyer type: ${options.buyerType}` : ""}
${options.projectType ? `Project type: ${options.projectType}` : ""}
${options.discipline ? `Discipline focus: ${options.discipline}` : ""}
${options.urgency ? `Urgency: ${options.urgency}` : ""}

Enhance this prompt with Scan2Plan's expertise and brand voice.`;

    try {
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        const result = await model.generateContent(
            systemPrompt + "\n\n" + userMessage
        );

        const enhancedPrompt = result.response.text().trim();

        return {
            originalPrompt: userPrompt,
            enhancedPrompt,
            context,
            suggestedTone: persona?.name || "Professional Authority",
            confidence: 85,
        };
    } catch (error) {
        console.error("AI enhancement failed:", error);
        // Fallback to template-based enhancement
        let enhanced = userPrompt;
        if (persona) {
            enhanced = `As ${persona.name}, ${persona.mantra}\n\n${userPrompt}`;
        }
        if (standards && standards.length > 0) {
            enhanced += `\n\nKey standards: ${standards.map(s => s.term).join(", ")}`;
        }

        return {
            originalPrompt: userPrompt,
            enhancedPrompt: enhanced,
            context,
            suggestedTone: persona?.name || "Professional",
            confidence: 60,
        };
    }
}

/**
 * Quick detect what type of document the user wants
 */
export function detectDocumentType(prompt: string): "proposal" | "bid" | "email" | "brief" | "unknown" {
    const lower = prompt.toLowerCase();

    if (lower.includes("proposal") || lower.includes("rfp response")) return "proposal";
    if (lower.includes("bid") || lower.includes("quote")) return "bid";
    if (lower.includes("email") || lower.includes("outreach") || lower.includes("cold")) return "email";
    if (lower.includes("brief") || lower.includes("summary") || lower.includes("executive")) return "brief";

    return "unknown";
}

/**
 * Extract project context from prompt
 */
export function extractProjectContext(prompt: string): Partial<EnhancementOptions> {
    const options: Partial<EnhancementOptions> = {};
    const lower = prompt.toLowerCase();

    // Detect region
    if (lower.includes("northeast") || lower.includes("ny") || lower.includes("new york") || lower.includes("albany")) {
        options.region = "Northeast";
    } else if (lower.includes("mid-atlantic") || lower.includes("dc") || lower.includes("maryland")) {
        options.region = "Mid-Atlantic";
    }

    // Detect buyer type
    if (lower.includes("architect")) options.buyerType = "Architect";
    else if (lower.includes("contractor") || lower.includes("gc")) options.buyerType = "GC";
    else if (lower.includes("owner") || lower.includes("developer")) options.buyerType = "Owner";

    // Detect project type
    if (lower.includes("historic") || lower.includes("preservation") || lower.includes("hbim")) {
        options.projectType = "Historic";
    } else if (lower.includes("school") || lower.includes("university") || lower.includes("hospital") || lower.includes("healthcare")) {
        options.projectType = "Institutional";
    } else if (lower.includes("commercial") || lower.includes("office") || lower.includes("retail")) {
        options.projectType = "Commercial";
    } else if (lower.includes("residential") || lower.includes("home") || lower.includes("house")) {
        options.projectType = "Residential";
    }

    // Detect discipline
    if (lower.includes("mep") || lower.includes("mechanical") || lower.includes("electrical") || lower.includes("plumbing")) {
        options.discipline = "MEPF";
    } else if (lower.includes("structure") || lower.includes("structural")) {
        options.discipline = "Structure";
    } else if (lower.includes("architecture") || lower.includes("architectural")) {
        options.discipline = "Architecture";
    }

    // Detect urgency
    if (lower.includes("urgent") || lower.includes("asap") || lower.includes("rush")) {
        options.urgency = "high";
    }

    return options;
}
