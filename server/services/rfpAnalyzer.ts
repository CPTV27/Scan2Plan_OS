import pdf from "pdf-parse";
import { aiClient } from "./ai/aiClient";
import { log } from "../lib/logger";
import type { Lead } from "@shared/schema/types";

interface RFPAnalysisResult {
  // Client information
  clientName: string;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;

  // Project details
  projectName: string;
  projectAddress?: string;
  buildingType?: string;
  sqft?: number;
  scope?: string;

  // Requirements
  lodLevel?: string; // LOD 100-400
  disciplines?: string[]; // Arch, Struct, Mech, Elec, etc.
  deliverables?: string[]; // "Revit Model", "Point Cloud", "As-Built Drawings"
  bimVersion?: string; // "Revit 2024"

  // Timeline
  deadline?: string; // ISO date or text like "within 2 weeks"
  duration?: string;
  urgency?: "high" | "medium" | "low";

  // Budget
  budgetHint?: string; // "$40-60K"
  budgetRange?: {
    low?: number;
    high?: number;
  };

  // Evaluation
  evaluationCriteria?: string[]; // ["Price", "Timeline", "Experience"]
  keyRequirements?: string[];

  // Risks
  unusualRequirements?: string[];
  complianceNeeds?: string[]; // "Requires stamped drawings", "LEED certification"

  // Metadata
  confidence: number; // 0-100
  summary: string;
  rawText?: string; // Store for reference
}

export class RFPAnalyzerService {
  /**
   * Extract text from PDF buffer
   */
  private async extractPDFText(buffer: Buffer): Promise<string> {
    try {
      const data = await pdf(buffer);
      return data.text;
    } catch (error: any) {
      log(`ERROR: [RFPAnalyzer] PDF extraction failed: ${error.message}`);
      throw new Error(`Failed to extract PDF text: ${error.message}`);
    }
  }

  /**
   * Analyze RFP text using AI
   */
  private async analyzeRFPText(text: string): Promise<RFPAnalysisResult | null> {
    const systemPrompt = `You are an expert RFP analyzer for a BIM (Building Information Modeling) scanning and modeling company.

Extract structured information from RFP documents. Our services include:
- Laser scanning of buildings (office, retail, industrial, healthcare, etc.)
- Creating as-built BIM models (Revit, LOD 100-400)
- Point cloud processing
- Architectural, structural, MEP (mechanical, electrical, plumbing) modeling

Extract ALL relevant information. Pay special attention to:
1. Who is the client and contact person?
2. What building/project needs scanning?
3. What scope of work is required? (Full building, interior only, exterior, specific disciplines)
4. What LOD (Level of Development) is needed? (LOD 100, 200, 300, 350, 400)
5. What is the timeline/deadline?
6. Any budget hints or price range mentioned?
7. Evaluation criteria (how they'll choose vendor)
8. Unusual or special requirements
9. Compliance needs (stamped drawings, LEED, etc.)

Return valid JSON with extracted data. For missing fields, use null.`;

    const userMessage = `Analyze this RFP document and extract all relevant information:

${text}

Return JSON with this structure:
{
  "clientName": "Company name",
  "contactName": "Contact person name",
  "contactEmail": "email@example.com",
  "contactPhone": "phone number",
  "projectName": "Project name",
  "projectAddress": "Full address",
  "buildingType": "office|retail|industrial|healthcare|educational|residential|mixed-use|warehouse|other",
  "sqft": number,
  "scope": "full|interior|exterior|roof-facades",
  "lodLevel": "LOD 100|LOD 200|LOD 300|LOD 350|LOD 400",
  "disciplines": ["arch", "struct", "mech", "elec", "plumb", "site"],
  "deliverables": ["Revit Model", "Point Cloud", "As-Built Drawings", etc],
  "bimVersion": "Revit 2024",
  "deadline": "ISO date or text",
  "duration": "time estimate",
  "urgency": "high|medium|low",
  "budgetHint": "any price mentions",
  "budgetRange": { "low": number, "high": number },
  "evaluationCriteria": ["price", "timeline", "experience", etc],
  "keyRequirements": ["must-haves"],
  "unusualRequirements": ["special requests"],
  "complianceNeeds": ["regulations"],
  "confidence": 0-100,
  "summary": "2-3 sentence summary of RFP"
}`;

    try {
      const result = await aiClient.chatJSON<RFPAnalysisResult>({
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userMessage },
        ],
        model: "gpt-4o-mini",
        temperature: 0.3, // Low temperature for factual extraction
        maxTokens: 2000,
      });

      if (!result) {
        log("ERROR: [RFPAnalyzer] AI returned null result");
        return null;
      }

      // Validate minimum required fields
      if (!result.projectName && !result.clientName) {
        log("WARN: [RFPAnalyzer] AI couldn't extract basic project info");
        return null;
      }

      return result;
    } catch (error: any) {
      log(`ERROR: [RFPAnalyzer] AI analysis failed: ${error.message}`);
      return null;
    }
  }

  /**
   * Analyze RFP PDF and return structured data
   */
  async analyzePDF(pdfBuffer: Buffer): Promise<{
    analysis: RFPAnalysisResult;
    textLength: number;
  } | null> {
    log("[RFPAnalyzer] Starting PDF analysis");

    // Step 1: Extract text
    const text = await this.extractPDFText(pdfBuffer);

    if (!text || text.trim().length < 100) {
      throw new Error("PDF appears to be empty or too short to analyze");
    }

    log(`[RFPAnalyzer] Extracted ${text.length} characters from PDF`);

    // Step 2: Analyze with AI
    const analysis = await this.analyzeRFPText(text);

    if (!analysis) {
      throw new Error("AI analysis failed - could not extract RFP data");
    }

    // Store raw text for reference
    analysis.rawText = text.slice(0, 10000); // Store first 10K chars

    log(`[RFPAnalyzer] Analysis complete with ${analysis.confidence}% confidence`);
    log(`[RFPAnalyzer] Extracted: ${analysis.projectName || 'Unknown Project'} for ${analysis.clientName || 'Unknown Client'}`);

    return {
      analysis,
      textLength: text.length,
    };
  }

  /**
   * Convert RFP analysis to Lead data structure
   */
  convertToLeadData(analysis: RFPAnalysisResult): Partial<Lead> {
    return {
      clientName: analysis.clientName || "Unknown Client",
      projectName: analysis.projectName || "RFP Project",
      projectAddress: analysis.projectAddress || "",
      contactName: analysis.contactName,
      contactEmail: analysis.contactEmail,
      contactPhone: analysis.contactPhone,

      buildingType: analysis.buildingType,
      sqft: analysis.sqft,
      scope: analysis.scope,

      // Store detailed analysis in notes
      notes: `RFP Analysis Summary:
${analysis.summary}

Key Requirements:
${analysis.keyRequirements?.join("\n- ") || "None specified"}

Deliverables:
${analysis.deliverables?.join("\n- ") || "None specified"}

${analysis.deadline ? `Deadline: ${analysis.deadline}` : ""}
${analysis.budgetHint ? `Budget: ${analysis.budgetHint}` : ""}

Unusual Requirements:
${analysis.unusualRequirements?.join("\n- ") || "None"}

Compliance:
${analysis.complianceNeeds?.join("\n- ") || "None"}

Analysis Confidence: ${analysis.confidence}%`,

      source: "RFP",
      dealStage: "Leads",
      priority: analysis.urgency === "high" ? 10 : analysis.urgency === "medium" ? 7 : 5,
    };
  }

  /**
   * Suggest quote parameters based on RFP analysis
   */
  suggestQuoteParameters(analysis: RFPAnalysisResult): {
    suggestedValue?: number;
    lodLevel?: string;
    disciplines?: string[];
    needsResearch: boolean;
    warnings: string[];
  } {
    const warnings: string[] = [];

    // Check for budget range
    let suggestedValue: number | undefined;
    if (analysis.budgetRange?.low && analysis.budgetRange?.high) {
      // Suggest midpoint of range
      suggestedValue = (analysis.budgetRange.low + analysis.budgetRange.high) / 2;
    }

    // Check for unusual requirements
    if (analysis.unusualRequirements && analysis.unusualRequirements.length > 0) {
      warnings.push("⚠️ Unusual requirements detected - review carefully");
    }

    // Check for compliance needs
    if (analysis.complianceNeeds && analysis.complianceNeeds.length > 0) {
      warnings.push("⚠️ Compliance requirements - may need partner/certification");
    }

    // Check confidence level
    if (analysis.confidence < 70) {
      warnings.push("⚠️ Low confidence analysis - verify extracted data");
    }

    // Determine if needs more research
    const needsResearch =
      !analysis.sqft ||
      !analysis.buildingType ||
      !analysis.projectAddress ||
      warnings.length > 0;

    return {
      suggestedValue,
      lodLevel: analysis.lodLevel,
      disciplines: analysis.disciplines,
      needsResearch,
      warnings,
    };
  }
}

export const rfpAnalyzer = new RFPAnalyzerService();
