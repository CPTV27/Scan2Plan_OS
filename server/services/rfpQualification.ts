/**
 * S2P Scoping Bot - RFP Qualification Engine
 * 
 * Implements intelligent qualification, prioritization, and categorization
 * for RFPs based on Scan2Plan's target project criteria.
 * 
 * Per the CEO's specification:
 * - Smart Qualification Filters
 * - Prioritization Engine  
 * - Context-Aware Knowledge Base
 * - Structured Output & Reporting
 */

import { log } from "../lib/logger";

// ============================================
// CONFIGURATION - QUALIFICATION KEYWORDS
// ============================================

// Preferred project types - must include at least one
export const PREFERRED_KEYWORDS = [
    // Core services
    "renovation", "renovation project", "building renovation",
    "addition", "building addition",
    "lidar", "lidar scanning", "laser scanning", "3d scanning",
    "existing conditions", "as-built", "as built",
    "bim", "building information model", "revit",
    "lod", "lod 300", "lod 350", "level of development",
    "architectural survey", "building survey",
    // Project types
    "redevelopment", "redevelopment project",
    "historic preservation", "historical preservation", "historic building",
    "adaptive reuse", "reuse project", "repurpose",
    "facility assessment", "building assessment",
    "space planning", "interior renovation",
    "MEP survey", "mechanical survey", "electrical survey",
    // Semantic matches
    "facility overhaul", "building overhaul",
    "modernization", "building modernization",
    "retrofit", "building retrofit",
    "rehabilitation", "building rehabilitation",
    "refurbishment", "office renovation",
];

// Disqualifying criteria - immediate exclusion if present
export const DISQUALIFYING_KEYWORDS = [
    // New construction
    "new construction", "new build", "ground-up", "ground up",
    "greenfield", "new facility", "from scratch",
    // Permitting only
    "permitting only", "permit services only", "permit drawings",
    // Civil/site work (not our scope)
    "civil engineering", "sidewalk", "sidewalks", "drainage",
    "stormwater", "storm water", "sewer", "utilities",
    "grading", "earthwork", "paving",
    // Federally funded
    "federally funded", "federal project", "federal grant",
    "HUD", "federal assistance", "federal contract",
    "davis-bacon", "DBE requirements",
    // Other exclusions
    "residential single family", "single family home",
    "landscaping only", "landscape architecture only",
];

// Building types for scope alignment
export const HIGH_PRIORITY_BUILDING_TYPES = [
    "commercial", "office", "office building",
    "healthcare", "hospital", "medical",
    "educational", "university", "school",
    "industrial", "warehouse", "manufacturing",
    "mixed-use", "mixed use",
    "retail", "shopping",
    "hospitality", "hotel",
];

// Geographic reference points (lat, lng)
const DISPATCH_LOCATIONS = {
    troy: { lat: 42.7284, lng: -73.6918, name: "Troy, NY" },
    brooklyn: { lat: 40.6782, lng: -73.9442, name: "Brooklyn, NY" },
    woodstock: { lat: 34.1015, lng: -84.5194, name: "Woodstock, GA" },
    boise: { lat: 43.6150, lng: -116.2023, name: "Boise, ID" },
};

// ============================================
// TYPES
// ============================================

export type QualificationStatus = "qualified" | "disqualified" | "borderline";

export interface QualificationResult {
    status: QualificationStatus;
    confidenceScore: number;        // 0-100
    priorityScore: number;          // 0-100
    disqualificationReason?: string;
    flags: string[];                // Concerns or notes
    preferredKeywordsFound: string[];
    disqualifyingKeywordsFound: string[];
    priorityFactors: {
        sqftScore: number;          // 0-30 points
        geoScore: number;           // 0-25 points  
        urgencyScore: number;       // 0-25 points
        scopeScore: number;         // 0-20 points
    };
    recommendationTier: "top_priority" | "potential" | "low_confidence" | "disqualified";
    rationale: string;
}

export interface ExtractedRfpData {
    projectName?: string;
    clientName?: string;
    projectAddress?: string;
    scope?: string;
    requirements?: string[];
    deadline?: string;
    budget?: string;
    sqft?: number;
    buildingType?: string;
    disciplines?: string[];
    specialRequirements?: string;
    rawText?: string;
}

// ============================================
// MAIN QUALIFICATION FUNCTION
// ============================================

export async function qualifyRfp(
    extractedData: ExtractedRfpData,
    rawContent?: string
): Promise<QualificationResult> {
    const flags: string[] = [];

    // Combine all text for keyword search
    const searchText = buildSearchText(extractedData, rawContent);

    // Step 1: Check for disqualifying keywords
    const disqualifyingFound = findKeywords(searchText, DISQUALIFYING_KEYWORDS);
    if (disqualifyingFound.length > 0) {
        return {
            status: "disqualified",
            confidenceScore: 95,
            priorityScore: 0,
            disqualificationReason: `Project contains disqualifying criteria: ${disqualifyingFound.join(", ")}`,
            flags: [`Disqualifying keywords: ${disqualifyingFound.join(", ")}`],
            preferredKeywordsFound: [],
            disqualifyingKeywordsFound: disqualifyingFound,
            priorityFactors: { sqftScore: 0, geoScore: 0, urgencyScore: 0, scopeScore: 0 },
            recommendationTier: "disqualified",
            rationale: `This RFP was automatically disqualified because it contains the following criteria outside Scan2Plan's scope: ${disqualifyingFound.join(", ")}.`,
        };
    }

    // Step 2: Check for preferred keywords
    const preferredFound = findKeywords(searchText, PREFERRED_KEYWORDS);

    // Step 3: Calculate priority scores
    const priorityFactors = calculatePriorityFactors(extractedData, preferredFound);
    const priorityScore =
        priorityFactors.sqftScore +
        priorityFactors.geoScore +
        priorityFactors.urgencyScore +
        priorityFactors.scopeScore;

    // Step 4: Calculate confidence score
    let confidenceScore = calculateConfidenceScore(preferredFound, extractedData, searchText);

    // Step 5: Add flags for ambiguous situations
    if (preferredFound.length === 0) {
        flags.push("No preferred keywords found - may require manual review");
    }
    if (!extractedData.sqft) {
        flags.push("Square footage not specified");
    }
    if (!extractedData.projectAddress) {
        flags.push("Project address not specified - cannot calculate proximity");
    }
    if (!extractedData.deadline) {
        flags.push("Submission deadline not specified");
    }

    // Step 6: Determine qualification status
    let status: QualificationStatus;
    let recommendationTier: QualificationResult["recommendationTier"];

    if (preferredFound.length >= 2 && confidenceScore >= 70) {
        status = "qualified";
        if (priorityScore >= 70) {
            recommendationTier = "top_priority";
        } else if (priorityScore >= 40) {
            recommendationTier = "potential";
        } else {
            recommendationTier = "low_confidence";
        }
    } else if (preferredFound.length >= 1 || confidenceScore >= 50) {
        status = "borderline";
        recommendationTier = "low_confidence";
        flags.push("Borderline qualification - manual review recommended");
    } else {
        status = "borderline";
        recommendationTier = "low_confidence";
        flags.push("Low confidence match - likely not a fit but flagged for review");
        confidenceScore = Math.max(confidenceScore, 20);
    }

    // Build rationale
    const rationale = buildRationale(status, preferredFound, priorityFactors, extractedData);

    log(`[RFP Qualification] ${extractedData.projectName || "Unknown"}: ${status} (confidence: ${confidenceScore}%, priority: ${priorityScore})`);

    return {
        status,
        confidenceScore,
        priorityScore,
        flags,
        preferredKeywordsFound: preferredFound,
        disqualifyingKeywordsFound: [],
        priorityFactors,
        recommendationTier,
        rationale,
    };
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function buildSearchText(data: ExtractedRfpData, rawContent?: string): string {
    const parts = [
        data.projectName,
        data.clientName,
        data.scope,
        data.buildingType,
        data.specialRequirements,
        data.requirements?.join(" "),
        data.disciplines?.join(" "),
        rawContent?.substring(0, 10000), // Limit raw content search
    ];
    return parts.filter(Boolean).join(" ").toLowerCase();
}

function findKeywords(text: string, keywords: string[]): string[] {
    const found: string[] = [];
    const lowerText = text.toLowerCase();

    for (const keyword of keywords) {
        if (lowerText.includes(keyword.toLowerCase())) {
            found.push(keyword);
        }
    }

    return Array.from(new Set(found)); // Deduplicate
}

function calculatePriorityFactors(
    data: ExtractedRfpData,
    preferredKeywords: string[]
): QualificationResult["priorityFactors"] {
    // Square footage score (0-30 points) - larger = higher priority
    let sqftScore = 0;
    if (data.sqft) {
        if (data.sqft >= 100000) sqftScore = 30;
        else if (data.sqft >= 50000) sqftScore = 25;
        else if (data.sqft >= 25000) sqftScore = 20;
        else if (data.sqft >= 10000) sqftScore = 15;
        else if (data.sqft >= 5000) sqftScore = 10;
        else sqftScore = 5;
    }

    // Geographic score (0-25 points) - closer to dispatch = higher
    let geoScore = 15; // Default middle score if no address
    if (data.projectAddress) {
        const address = data.projectAddress.toLowerCase();
        // Simple geographic matching
        if (address.includes("new york") || address.includes("ny") || address.includes("brooklyn") || address.includes("manhattan")) {
            geoScore = 25; // NYC area - highest priority
        } else if (address.includes("troy") || address.includes("albany") || address.includes("new jersey") || address.includes("nj")) {
            geoScore = 22; // Near Troy
        } else if (address.includes("georgia") || address.includes("ga") || address.includes("atlanta")) {
            geoScore = 20; // Near Woodstock
        } else if (address.includes("idaho") || address.includes("boise")) {
            geoScore = 18; // Near Boise
        } else if (address.includes("california") || address.includes("texas") || address.includes("florida")) {
            geoScore = 12; // Major markets
        } else {
            geoScore = 8; // Other locations
        }
    }

    // Urgency score (0-25 points) - tighter deadline = higher
    let urgencyScore = 10; // Default middle score
    if (data.deadline) {
        const deadline = new Date(data.deadline);
        const now = new Date();
        const daysUntil = Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

        if (daysUntil <= 7) urgencyScore = 25;
        else if (daysUntil <= 14) urgencyScore = 22;
        else if (daysUntil <= 21) urgencyScore = 18;
        else if (daysUntil <= 30) urgencyScore = 14;
        else if (daysUntil <= 60) urgencyScore = 10;
        else urgencyScore = 5;
    }

    // Scope alignment score (0-20 points) - BIM/LOD requirements = higher
    let scopeScore = 5;
    const scopeText = [data.scope, data.specialRequirements, ...(data.requirements || [])].join(" ").toLowerCase();

    // LOD 300+ or explicit BIM = high priority
    if (scopeText.includes("lod 300") || scopeText.includes("lod 350") || scopeText.includes("lod300") || scopeText.includes("lod350")) {
        scopeScore = 20;
    } else if (scopeText.includes("lod") || scopeText.includes("bim") || scopeText.includes("revit")) {
        scopeScore = 15;
    } else if (scopeText.includes("scan") || scopeText.includes("survey") || scopeText.includes("as-built")) {
        scopeScore = 12;
    } else if (preferredKeywords.length >= 3) {
        scopeScore = 10;
    }

    return { sqftScore, geoScore, urgencyScore, scopeScore };
}

function calculateConfidenceScore(
    preferredKeywords: string[],
    data: ExtractedRfpData,
    searchText: string
): number {
    let score = 30; // Base score

    // Preferred keywords boost (up to 40 points)
    score += Math.min(preferredKeywords.length * 10, 40);

    // Data completeness boost (up to 20 points)
    if (data.projectName) score += 3;
    if (data.clientName) score += 3;
    if (data.projectAddress) score += 4;
    if (data.sqft) score += 4;
    if (data.scope) score += 3;
    if (data.deadline) score += 3;

    // High-value building type boost (up to 10 points)
    if (data.buildingType) {
        const bt = data.buildingType.toLowerCase();
        if (HIGH_PRIORITY_BUILDING_TYPES.some(t => bt.includes(t))) {
            score += 10;
        }
    }

    return Math.min(score, 100);
}

function buildRationale(
    status: QualificationStatus,
    preferredKeywords: string[],
    factors: QualificationResult["priorityFactors"],
    data: ExtractedRfpData
): string {
    const parts: string[] = [];

    if (status === "qualified") {
        parts.push(`This RFP is a strong fit for Scan2Plan.`);
        if (preferredKeywords.length > 0) {
            parts.push(`Key indicators: ${preferredKeywords.slice(0, 5).join(", ")}.`);
        }
    } else if (status === "borderline") {
        parts.push(`This RFP requires manual review to confirm fit.`);
        if (preferredKeywords.length > 0) {
            parts.push(`Some relevant keywords found: ${preferredKeywords.join(", ")}.`);
        } else {
            parts.push(`Limited matching keywords were detected.`);
        }
    }

    // Priority factors
    const factorNotes: string[] = [];
    if (factors.sqftScore >= 20 && data.sqft) {
        factorNotes.push(`Large project (${data.sqft.toLocaleString()} sqft)`);
    }
    if (factors.geoScore >= 20) {
        factorNotes.push(`Located near dispatch hub`);
    }
    if (factors.urgencyScore >= 18) {
        factorNotes.push(`Urgent deadline`);
    }
    if (factors.scopeScore >= 15) {
        factorNotes.push(`Strong BIM/LOD requirements`);
    }

    if (factorNotes.length > 0) {
        parts.push(`Priority factors: ${factorNotes.join(", ")}.`);
    }

    return parts.join(" ");
}

// ============================================
// AI-ENHANCED QUALIFICATION (Optional)
// ============================================

export async function qualifyWithAI(
    extractedData: ExtractedRfpData,
    rawContent: string
): Promise<QualificationResult> {
    // First run rule-based qualification
    const baseResult = await qualifyRfp(extractedData, rawContent);

    // If borderline, could enhance with AI semantic analysis
    // For now, return base result
    // TODO: Add AI-powered semantic matching for edge cases

    return baseResult;
}
