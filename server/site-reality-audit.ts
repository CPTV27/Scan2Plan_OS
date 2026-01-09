import OpenAI from "openai";
import { log } from "./lib/logger";

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY!,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

export interface SiteAuditInput {
  projectAddress: string;
  clientName: string;
  buildingType?: string;
  scopeOfWork?: string;
  sqft?: number;
  disciplines?: string;
  notes?: string;
}

export interface RiskItem {
  category: "structural" | "access" | "sqft" | "mep" | "environmental" | "scheduling";
  severity: "low" | "medium" | "high";
  description: string;
  recommendation: string;
}

export interface SiteRealityAuditResult {
  address: string;
  auditDate: string;
  buildingAnalysis: {
    estimatedFloors: number;
    roofComplexity: "simple" | "moderate" | "complex";
    hvacDensity: "light" | "moderate" | "heavy";
    exteriorFeatures: string[];
    potentialChallenges: string[];
  };
  sqftAssessment: {
    scopedSqft: number | null;
    estimatedActualSqft: number | null;
    variancePercent: number | null;
    varianceRisk: "none" | "low" | "medium" | "high";
    notes: string;
  };
  risks: RiskItem[];
  overallRiskScore: number;
  recommendations: string[];
  confidenceLevel: "low" | "medium" | "high";
  rawAnalysis: string;
}

export async function performSiteRealityAudit(input: SiteAuditInput): Promise<SiteRealityAuditResult> {
  const prompt = `You are a senior building surveyor and laser scanning expert analyzing a project site for a BIM/laser scanning company called Scan2Plan.

PROJECT DETAILS:
- Address: ${input.projectAddress}
- Client: ${input.clientName}
- Building Type (per scope): ${input.buildingType || "Not specified"}
- Scoped Square Footage: ${input.sqft ? `${input.sqft.toLocaleString()} sqft` : "Not specified"}
- Scope of Work: ${input.scopeOfWork || "Not specified"}
- Disciplines: ${input.disciplines || "Not specified"}
- Notes: ${input.notes || "None"}

YOUR TASK:
Analyze this building location and provide a "Reality Check" audit. Consider:

1. BUILDING ANALYSIS:
   - Estimate the number of floors/levels based on the address and building type
   - Assess roof complexity (flat, pitched, multiple levels, mechanical penthouses)
   - Evaluate likely HVAC density based on building type
   - Identify exterior features that may complicate scanning (setbacks, cantilevers, adjacent buildings)
   - Note any access challenges (loading docks, secure areas, public spaces)

2. SQUARE FOOTAGE ASSESSMENT:
   - Based on the building type and address context, estimate if the scoped square footage seems reasonable
   - Flag if there's potential for hidden areas, basements, mezzanines, or mechanical rooms not accounted for
   - Calculate potential variance risk (10%+ variance triggers billing adjustment requirements)

3. RISK IDENTIFICATION:
   - Structural risks (complex geometry, heritage elements, unusual materials)
   - Access risks (scheduling constraints, security requirements, active occupancy)
   - MEP complexity (data centers, medical facilities, industrial processes)
   - Environmental risks (hazardous materials, confined spaces)
   - Scheduling risks (weather exposure, seasonal constraints)

4. RECOMMENDATIONS:
   - Suggest any pre-scan site visits or clarifications needed
   - Recommend equipment or staffing adjustments
   - Flag items requiring client confirmation before scheduling

Respond in this exact JSON format:
{
  "buildingAnalysis": {
    "estimatedFloors": <number>,
    "roofComplexity": "simple" | "moderate" | "complex",
    "hvacDensity": "light" | "moderate" | "heavy",
    "exteriorFeatures": [<string array>],
    "potentialChallenges": [<string array>]
  },
  "sqftAssessment": {
    "scopedSqft": <number or null>,
    "estimatedActualSqft": <number or null if cannot estimate>,
    "variancePercent": <number or null>,
    "varianceRisk": "none" | "low" | "medium" | "high",
    "notes": "<explanation>"
  },
  "risks": [
    {
      "category": "structural" | "access" | "sqft" | "mep" | "environmental" | "scheduling",
      "severity": "low" | "medium" | "high",
      "description": "<what the risk is>",
      "recommendation": "<what to do about it>"
    }
  ],
  "overallRiskScore": <1-10 scale, 10 being highest risk>,
  "recommendations": [<string array of actionable recommendations>],
  "confidenceLevel": "low" | "medium" | "high",
  "analysis": "<brief narrative summary of findings>"
}`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.3,
      response_format: { type: "json_object" },
    });

    const text = response.choices[0]?.message?.content || "";
    
    let parsed: any;
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("No JSON found in response");
      }
    } catch (parseError) {
      log(`ERROR: Failed to parse AI response: ${text}`);
      throw new Error("Failed to parse site audit response");
    }

    return {
      address: input.projectAddress,
      auditDate: new Date().toISOString(),
      buildingAnalysis: parsed.buildingAnalysis || {
        estimatedFloors: 1,
        roofComplexity: "moderate",
        hvacDensity: "moderate",
        exteriorFeatures: [],
        potentialChallenges: [],
      },
      sqftAssessment: {
        scopedSqft: input.sqft || null,
        estimatedActualSqft: parsed.sqftAssessment?.estimatedActualSqft || null,
        variancePercent: parsed.sqftAssessment?.variancePercent || null,
        varianceRisk: parsed.sqftAssessment?.varianceRisk || "none",
        notes: parsed.sqftAssessment?.notes || "",
      },
      risks: parsed.risks || [],
      overallRiskScore: parsed.overallRiskScore || 5,
      recommendations: parsed.recommendations || [],
      confidenceLevel: parsed.confidenceLevel || "medium",
      rawAnalysis: parsed.analysis || text,
    };
  } catch (error) {
    log(`ERROR: Site reality audit failed - ${error instanceof Error ? error.message : String(error)}`);
    throw error;
  }
}
