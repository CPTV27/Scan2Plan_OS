import { ChromaClient, Collection } from "chromadb";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { log } from "../lib/logger";

// ChromaDB client - connects to local or remote instance
const CHROMA_URL = process.env.CHROMA_URL || "http://localhost:8000";

// Google AI for embeddings (using Replit AI integration)
const genAI = process.env.AI_INTEGRATIONS_GEMINI_API_KEY
    ? new GoogleGenerativeAI(process.env.AI_INTEGRATIONS_GEMINI_API_KEY)
    : null;

let client: ChromaClient | null = null;
let projectsCollection: Collection | null = null;

/**
 * Initialize ChromaDB connection
 */
export async function initChromaDB(): Promise<boolean> {
    try {
        client = new ChromaClient({ path: CHROMA_URL });

        // Get or create the projects collection
        projectsCollection = await client.getOrCreateCollection({
            name: "scan2plan_projects",
            metadata: {
                description: "Project embeddings for smart matching",
                hnsw_space: "cosine"
            },
        });

        log(`[ChromaDB] Connected to ${CHROMA_URL}, collection: scan2plan_projects`);
        return true;
    } catch (error) {
        log(`WARN: ChromaDB not available: ${error}`);
        client = null;
        projectsCollection = null;
        return false;
    }
}

/**
 * Check if ChromaDB is available
 */
export function isChromaDBAvailable(): boolean {
    return client !== null && projectsCollection !== null;
}

/**
 * Generate embedding for text using Google's text-embedding-004
 */
async function generateEmbedding(text: string): Promise<number[]> {
    if (!genAI) {
        throw new Error("AI_INTEGRATIONS_GEMINI_API_KEY not configured");
    }

    const model = genAI.getGenerativeModel({ model: "text-embedding-004" });
    const result = await model.embedContent(text);
    return result.embedding.values;
}


/**
 * Add or update a project in the vector store
 */
export async function upsertProjectEmbedding(project: {
    id: number;
    name: string;
    clientName: string;
    buildingType?: string;
    sqft?: number;
    disciplines?: string[];
    region?: string;
    status?: string;
    description?: string;
}): Promise<boolean> {
    if (!projectsCollection) {
        log("WARN: ChromaDB not initialized");
        return false;
    }

    try {
        // Create rich text representation for embedding
        const textContent = [
            `Project: ${project.name}`,
            `Client: ${project.clientName}`,
            project.buildingType ? `Building Type: ${project.buildingType}` : "",
            project.sqft ? `Size: ${project.sqft} sqft` : "",
            project.disciplines?.length ? `Disciplines: ${project.disciplines.join(", ")}` : "",
            project.region ? `Region: ${project.region}` : "",
            project.description || "",
        ].filter(Boolean).join("\n");

        const embedding = await generateEmbedding(textContent);

        await projectsCollection.upsert({
            ids: [String(project.id)],
            embeddings: [embedding],
            metadatas: [{
                projectId: project.id,
                projectName: project.name,
                clientName: project.clientName,
                buildingType: project.buildingType || "",
                sqft: project.sqft || 0,
                disciplines: project.disciplines?.join(",") || "",
                region: project.region || "",
                status: project.status || "",
            }],
            documents: [textContent],
        });

        log(`[ChromaDB] Upserted project ${project.id}: ${project.name}`);
        return true;
    } catch (error) {
        log(`ERROR: Failed to upsert project embedding: ${error}`);
        return false;
    }
}

/**
 * Find similar projects using vector similarity
 */
export async function findSimilarProjects(query: {
    description?: string;
    buildingType?: string;
    sqft?: number;
    disciplines?: string[];
    region?: string;
}, limit: number = 5): Promise<{
    id: number;
    name: string;
    clientName: string;
    similarity: number;
    metadata: Record<string, any>;
}[]> {
    if (!projectsCollection) {
        log("WARN: ChromaDB not initialized, falling back to empty results");
        return [];
    }

    try {
        // Build query text from parameters
        const queryText = [
            query.description || "",
            query.buildingType ? `Building Type: ${query.buildingType}` : "",
            query.sqft ? `Size: ${query.sqft} sqft` : "",
            query.disciplines?.length ? `Disciplines: ${query.disciplines.join(", ")}` : "",
            query.region ? `Region: ${query.region}` : "",
        ].filter(Boolean).join("\n");

        if (!queryText.trim()) {
            return [];
        }

        const queryEmbedding = await generateEmbedding(queryText);

        const results = await projectsCollection.query({
            queryEmbeddings: [queryEmbedding],
            nResults: limit,
            include: ["metadatas", "documents", "distances"],
        });

        if (!results.ids[0]?.length) {
            return [];
        }

        return results.ids[0].map((id, index) => ({
            id: parseInt(id),
            name: results.metadatas?.[0]?.[index]?.projectName as string || "",
            clientName: results.metadatas?.[0]?.[index]?.clientName as string || "",
            similarity: 1 - (results.distances?.[0]?.[index] || 0), // Convert distance to similarity
            metadata: results.metadatas?.[0]?.[index] || {},
        }));
    } catch (error) {
        log(`ERROR: Similar projects search failed: ${error}`);
        return [];
    }
}

/**
 * Delete a project from the vector store
 */
export async function deleteProjectEmbedding(projectId: number): Promise<boolean> {
    if (!projectsCollection) {
        return false;
    }

    try {
        await projectsCollection.delete({ ids: [String(projectId)] });
        log(`[ChromaDB] Deleted project ${projectId}`);
        return true;
    } catch (error) {
        log(`ERROR: Failed to delete project embedding: ${error}`);
        return false;
    }
}

/**
 * Get collection stats
 */
export async function getVectorStats(): Promise<{ count: number } | null> {
    if (!projectsCollection) {
        return null;
    }

    try {
        const count = await projectsCollection.count();
        return { count };
    } catch (error) {
        log(`ERROR: Failed to get vector stats: ${error}`);
        return null;
    }
}
