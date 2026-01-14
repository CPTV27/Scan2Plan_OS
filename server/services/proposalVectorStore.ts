/**
 * Proposal Vector Store
 * 
 * Indexes past proposals for RAG-based proposal generation
 * Allows ComposerAgent to pull relevant content from winning proposals
 */

import { ChromaClient, Collection } from "chromadb";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { log } from "../lib/logger";

// ChromaDB client
const CHROMA_URL = process.env.CHROMA_URL || "http://localhost:8000";

// Google AI for embeddings
const genAI = (process.env.AI_INTEGRATIONS_GEMINI_API_KEY || process.env.GEMINI_API_KEY)
    ? new GoogleGenerativeAI(process.env.AI_INTEGRATIONS_GEMINI_API_KEY || process.env.GEMINI_API_KEY || "")
    : null;

let client: ChromaClient | null = null;
let proposalsCollection: Collection | null = null;

/**
 * Proposal document for indexing
 */
export interface ProposalDocument {
    id: string;                    // Unique ID (e.g., "proposal-123")
    title: string;                 // Project name
    clientName: string;
    buildingType: string;
    squareFeet: number;
    region: string;
    disciplines: string[];         // architecture, mepf, structure, etc.
    outcome: "won" | "lost" | "pending";
    value: number;                 // Contract value

    // Sections for RAG retrieval
    executiveSummary?: string;
    scopeOfWork?: string;
    methodology?: string;
    deliverables?: string;
    timeline?: string;
    teamDescription?: string;
    caseStudies?: string;          // Referenced case studies
    pricingApproach?: string;      // Pricing strategy description

    // Metadata
    submittedDate?: string;
    createdAt: string;
}

/**
 * Search result from proposal store
 */
export interface ProposalSearchResult {
    proposal: ProposalDocument;
    score: number;
    relevantSections: string[];
}

/**
 * Initialize the proposals collection in ChromaDB
 */
export async function initProposalStore(): Promise<boolean> {
    try {
        client = new ChromaClient({ path: CHROMA_URL });

        proposalsCollection = await client.getOrCreateCollection({
            name: "scan2plan_proposals",
            metadata: {
                description: "Past proposal embeddings for RAG-based proposal generation",
                hnsw_space: "cosine"
            },
        });

        log(`[ProposalStore] Connected, collection: scan2plan_proposals`);
        return true;
    } catch (error) {
        log(`WARN: ProposalStore not available: ${error}`);
        client = null;
        proposalsCollection = null;
        return false;
    }
}

/**
 * Check if proposal store is available
 */
export function isProposalStoreAvailable(): boolean {
    return client !== null && proposalsCollection !== null;
}

/**
 * Generate embedding for text
 */
async function generateEmbedding(text: string): Promise<number[]> {
    if (!genAI) {
        throw new Error("GEMINI_API_KEY not configured for embeddings");
    }

    const model = genAI.getGenerativeModel({ model: "text-embedding-004" });
    const result = await model.embedContent(text);
    return result.embedding.values;
}

/**
 * Create searchable text from proposal
 */
function createProposalText(proposal: ProposalDocument): string {
    const parts = [
        `Project: ${proposal.title}`,
        `Client: ${proposal.clientName}`,
        `Building Type: ${proposal.buildingType}`,
        `Size: ${proposal.squareFeet?.toLocaleString()} sqft`,
        `Region: ${proposal.region}`,
        `Disciplines: ${proposal.disciplines?.join(", ")}`,
        `Value: $${proposal.value?.toLocaleString()}`,
        `Outcome: ${proposal.outcome}`,
    ];

    if (proposal.executiveSummary) parts.push(`Executive Summary: ${proposal.executiveSummary}`);
    if (proposal.scopeOfWork) parts.push(`Scope: ${proposal.scopeOfWork}`);
    if (proposal.methodology) parts.push(`Methodology: ${proposal.methodology}`);
    if (proposal.deliverables) parts.push(`Deliverables: ${proposal.deliverables}`);
    if (proposal.caseStudies) parts.push(`Case Studies: ${proposal.caseStudies}`);

    return parts.join("\n");
}

/**
 * Index a proposal for future retrieval
 */
export async function indexProposal(proposal: ProposalDocument): Promise<boolean> {
    if (!proposalsCollection) {
        log("WARN: ProposalStore not initialized");
        return false;
    }

    try {
        const text = createProposalText(proposal);
        const embedding = await generateEmbedding(text);

        await proposalsCollection.upsert({
            ids: [proposal.id],
            embeddings: [embedding],
            metadatas: [{
                title: proposal.title,
                clientName: proposal.clientName,
                buildingType: proposal.buildingType,
                squareFeet: proposal.squareFeet,
                region: proposal.region,
                disciplines: proposal.disciplines.join(","),
                outcome: proposal.outcome,
                value: proposal.value,
                submittedDate: proposal.submittedDate || "",
            }],
            documents: [text],
        });

        log(`[ProposalStore] Indexed proposal: ${proposal.title} (${proposal.id})`);
        return true;
    } catch (error) {
        log(`ERROR: Failed to index proposal: ${error}`);
        return false;
    }
}

/**
 * Search for similar proposals based on opportunity/RFP description
 */
export async function searchSimilarProposals(
    query: string,
    filters?: {
        buildingType?: string;
        region?: string;
        minSquareFeet?: number;
        maxSquareFeet?: number;
        outcome?: "won" | "lost" | "pending";
    },
    limit: number = 5
): Promise<ProposalSearchResult[]> {
    if (!proposalsCollection) {
        log("WARN: ProposalStore not initialized");
        return [];
    }

    try {
        const queryEmbedding = await generateEmbedding(query);

        // Build where clause for filters
        const whereClause: Record<string, any> = {};
        if (filters?.buildingType) {
            whereClause.buildingType = filters.buildingType;
        }
        if (filters?.region) {
            whereClause.region = filters.region;
        }
        if (filters?.outcome) {
            whereClause.outcome = filters.outcome;
        }

        const results = await proposalsCollection.query({
            queryEmbeddings: [queryEmbedding],
            nResults: limit,
            where: Object.keys(whereClause).length > 0 ? whereClause : undefined,
        });

        if (!results.ids[0] || results.ids[0].length === 0) {
            return [];
        }

        // Transform results
        return results.ids[0].map((id, index) => {
            const metadata = results.metadatas?.[0]?.[index] || {};
            const distance = results.distances?.[0]?.[index] || 1;
            const score = 1 - distance; // Convert distance to similarity score

            return {
                proposal: {
                    id,
                    title: metadata.title as string,
                    clientName: metadata.clientName as string,
                    buildingType: metadata.buildingType as string,
                    squareFeet: metadata.squareFeet as number,
                    region: metadata.region as string,
                    disciplines: (metadata.disciplines as string)?.split(",") || [],
                    outcome: metadata.outcome as "won" | "lost" | "pending",
                    value: metadata.value as number,
                    submittedDate: metadata.submittedDate as string,
                    createdAt: new Date().toISOString(),
                },
                score,
                relevantSections: [], // Would be populated by additional query
            };
        });
    } catch (error) {
        log(`ERROR: Proposal search failed: ${error}`);
        return [];
    }
}

/**
 * Get winning proposals for a specific building type
 */
export async function getWinningProposals(
    buildingType: string,
    limit: number = 3
): Promise<ProposalDocument[]> {
    const results = await searchSimilarProposals(
        `${buildingType} building project scan-to-BIM`,
        { buildingType, outcome: "won" },
        limit
    );

    return results.map(r => r.proposal);
}

/**
 * Seed sample proposals for testing
 */
export async function seedSampleProposals(): Promise<number> {
    const sampleProposals: ProposalDocument[] = [
        {
            id: "proposal-sample-1",
            title: "NYC Hospital Wing Renovation",
            clientName: "Mount Sinai Health System",
            buildingType: "Healthcare",
            squareFeet: 125000,
            region: "NYC",
            disciplines: ["architecture", "mepf", "structure"],
            outcome: "won",
            value: 185000,
            executiveSummary: "Comprehensive Scan-to-BIM for the new patient wing at Mount Sinai, enabling clash detection and MEP coordination during active hospital operations.",
            scopeOfWork: "Full 3D laser scanning of existing conditions across 4 floors, LOD 300 BIM modeling for architecture, MEP, and structure.",
            methodology: "Phased scanning approach with nighttime scanning to minimize disruption. Leica RTC360 for general scanning, NavVis for large corridors.",
            deliverables: "Revit models (LOD 300), point cloud delivery via Potree viewer, clash detection report.",
            caseStudies: "NYU Langone ED Renovation, Cornell Weill Medical Center expansion",
            createdAt: new Date().toISOString(),
        },
        {
            id: "proposal-sample-2",
            title: "Historic Landmark Facade Documentation",
            clientName: "NYC Landmarks Preservation Commission",
            buildingType: "Historic/Landmark",
            squareFeet: 45000,
            region: "NYC",
            disciplines: ["architecture", "facade"],
            outcome: "won",
            value: 48000,
            executiveSummary: "High-precision facade documentation for HABS/HAER compliance, supporting the renovation of a 1920s Art Deco commercial building.",
            scopeOfWork: "Exterior facade scanning at sub-millimeter accuracy, interior atrium capture, ornamental detail modeling.",
            methodology: "Terrestrial and close-range scanning with Leica P50, photogrammetry for fine detail.",
            deliverables: "Orthorectified facade elevations, CAD drawings, 3D mesh for visualization.",
            caseStudies: "Woolworth Building facade study, Grand Central Terminal survey",
            createdAt: new Date().toISOString(),
        },
        {
            id: "proposal-sample-3",
            title: "Multi-Family Residential Conversion",
            clientName: "Brookfield Properties",
            buildingType: "Commercial/Office",
            squareFeet: 280000,
            region: "NYC",
            disciplines: ["architecture", "mepf"],
            outcome: "won",
            value: 165000,
            executiveSummary: "As-built documentation supporting the conversion of a 1970s office tower to luxury residential, focusing on MEP routing and floor-to-floor heights.",
            scopeOfWork: "Full interior scanning of 18 floors, exterior envelope capture, MEP routing documentation.",
            methodology: "Mobile scanning (NavVis VLX) for speed, supplemented with static scans for mechanical rooms.",
            deliverables: "LOD 200 architectural shell, LOD 300 MEP routing, floor-to-floor verification report.",
            caseStudies: "One Wall Street residential conversion, 111 Wall Street renovation",
            createdAt: new Date().toISOString(),
        },
    ];

    let indexed = 0;
    for (const proposal of sampleProposals) {
        const success = await indexProposal(proposal);
        if (success) indexed++;
    }

    log(`[ProposalStore] Seeded ${indexed}/${sampleProposals.length} sample proposals`);
    return indexed;
}
