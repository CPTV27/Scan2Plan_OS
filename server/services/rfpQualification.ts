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

// Preferred project types - must include at least one (from P9.1 Trigger Pod)
export const PREFERRED_KEYWORDS = [
    // Core services
    "renovation", "renovation project", "building renovation",
    "addition", "building addition",
    "lidar", "lidar scanning", "laser scanning", "3d scanning",
    "existing conditions", "as-built", "as built", "as-built set",
    "bim", "building information model", "revit",
    "lod", "lod 300", "lod 350", "level of development",
    "architectural survey", "building survey",
    // Project types (P9.1)
    "redevelopment", "redevelopment project",
    "historic preservation", "historical preservation", "historic building",
    "adaptive reuse", "reuse project", "repurpose",
    "facility assessment", "building assessment",
    "space planning", "interior renovation",
    "mep survey", "mechanical survey", "electrical survey",
    // Semantic matches
    "facility overhaul", "building overhaul",
    "modernization", "building modernization",
    "retrofit", "building retrofit",
    "rehabilitation", "building rehabilitation",
    "refurbishment", "office renovation",
    // NEW from Trigger Pods (P9.1 scope fit)
    "tenant improvement", "ti", "fit-out", "fitout",
    "change-of-use", "change of use",
    "envelope", "façade", "facade",
    "campus", "multi-building", "multi building",
    "mep upgrade", "mep upgrades",
    "decarbonization", "electrification",
    "commissioning", "re-cx", "recx",
    // Legacy/indirect phrases (Scoping Bot spec)
    "record drawings", "measured drawings",
    "field verify", "field verification",
    "existing conditions survey", "building documentation",
    "habs", "hals", "3d survey",
    "modeling of existing", "bim for existing",
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
    "hud", "federal assistance", "federal contract",
    "davis-bacon", "dbe requirements",
    // Other exclusions (from P9.1)
    "residential single family", "single family home",
    "landscaping only", "landscape architecture only",
    "janitorial", "abatement-only", "bird waste",
    "signage only", "wayfinding-only",
    "it only", "low-voltage-only",
    "snow", "ice removal",
    "pure cm", "pure gc",
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

// Critical-use building types (bonus scoring per Scoping Bot spec)
export const CRITICAL_USE_BUILDING_TYPES = [
    "healthcare", "hospital", "medical", "lab", "laboratory",
    "airport", "utility", "power plant",
    "education", "educational", "higher-ed", "university", "college",
];

// Compliance program keywords (P16 Compliance Trigger Pod)
export const COMPLIANCE_KEYWORDS = [
    "ll11", "fisp", "facade inspection",
    "ll87", "energy audit", "eer",
    "ll97", "ghg cap", "carbon cap",
    "ll84", "benchmarking",
    "berdo", "beudo",
    "decarbonization", "electrification",
    "building performance standard",
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

    // Step 3: Calculate priority scores (using Scoping Bot spec: Scope 50 + Size 30 + Geo 10 + Urgency 10)
    const priorityFactors = calculatePriorityFactors(extractedData, preferredFound, searchText);
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
    preferredKeywords: string[],
    searchText: string
): QualificationResult["priorityFactors"] {
    const lowerSearchText = searchText.toLowerCase();

    // ============================================
    // SCOPE FIT SCORE (0-50 points) - per Scoping Bot spec
    // ============================================
    let scopeScore = 0;

    // 50: explicitly asks for existing conditions / as-builts / Scan-to-BIM / LoD/LoA
    if (lowerSearchText.includes("existing conditions") ||
        lowerSearchText.includes("as-built") ||
        lowerSearchText.includes("scan-to-bim") ||
        lowerSearchText.includes("scan to bim") ||
        lowerSearchText.includes("lod 300") ||
        lowerSearchText.includes("lod 350") ||
        lowerSearchText.includes("loa")) {
        scopeScore = 50;
    }
    // 40: renovation/addition Tier-A (even if deliverables vague)
    else if (preferredKeywords.length >= 2 && data.sqft && data.sqft >= 50000) {
        scopeScore = 40;
    }
    // 30: renovation/addition Tier-B
    else if (preferredKeywords.length >= 1 && data.sqft && data.sqft >= 10000) {
        scopeScore = 30;
    }
    // 20: renovation/addition Tier-C
    else if (preferredKeywords.length >= 1 && data.sqft && data.sqft >= 3000) {
        scopeScore = 20;
    }
    // 10: some preferred keywords found
    else if (preferredKeywords.length >= 1) {
        scopeScore = 10;
    }

    // ============================================
    // SIZE SCORE (0-30 points) - Tier A=30, B=20, C=10
    // ============================================
    let sqftScore = 0;
    if (data.sqft) {
        if (data.sqft >= 50000) sqftScore = 30;       // Tier-A
        else if (data.sqft >= 10000) sqftScore = 20;  // Tier-B
        else if (data.sqft >= 3000) sqftScore = 10;   // Tier-C
        else sqftScore = 5;                            // Below minimum
    }

    // ============================================
    // GEO PROXIMITY SCORE (0-10 points) - per Scoping Bot spec
    // ============================================
    let geoScore = 5; // Default if no address
    if (data.projectAddress) {
        const address = data.projectAddress.toLowerCase();
        // Hub cities = 10
        if (address.includes("new york") || address.includes("nyc") ||
            address.includes("brooklyn") || address.includes("manhattan") ||
            address.includes("troy") || address.includes("albany") ||
            address.includes("boston") || address.includes("woodstock")) {
            geoScore = 10;
        }
        // Rest of NE = 6-8
        else if (address.includes("connecticut") || address.includes("ct") ||
            address.includes("rhode island") || address.includes("ri") ||
            address.includes("massachusetts") || address.includes("ma") ||
            address.includes("vermont") || address.includes("vt") ||
            address.includes("new hampshire") || address.includes("nh") ||
            address.includes("maine") || address.includes("me") ||
            address.includes("new jersey") || address.includes("nj")) {
            geoScore = 7;
        }
        // Major markets outside NE = 3-5
        else if (address.includes("georgia") || address.includes("atlanta") ||
            address.includes("idaho") || address.includes("boise") ||
            address.includes("california") || address.includes("texas") ||
            address.includes("florida")) {
            geoScore = 4;
        }
        // Other = 0-3
        else {
            geoScore = 2;
        }
    }

    // ============================================
    // URGENCY SCORE (0-10 points) - deadline + compliance drivers
    // ============================================
    let urgencyScore = 3; // Default

    // Deadline urgency
    if (data.deadline) {
        const deadline = new Date(data.deadline);
        const now = new Date();
        const daysUntil = Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

        if (daysUntil <= 21) urgencyScore = 10;
        else if (daysUntil <= 30) urgencyScore = 8;
        else if (daysUntil <= 60) urgencyScore = 5;
        else urgencyScore = 3;
    }

    // Compliance driver bonus (LL11/LL87/LL97/BERDO/BEUDO)
    const hasComplianceDriver = COMPLIANCE_KEYWORDS.some(kw => lowerSearchText.includes(kw));
    if (hasComplianceDriver && urgencyScore < 8) {
        urgencyScore = 8; // Compliance = at least 8
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
