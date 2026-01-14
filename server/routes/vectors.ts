import { Router, Request, Response } from "express";
import { asyncHandler } from "../middleware/errorHandler";
import { isAuthenticated } from "../replit_integrations/auth";
import {
    initChromaDB,
    isChromaDBAvailable,
    findSimilarProjects,
    upsertProjectEmbedding,
    getVectorStats
} from "../services/vectorStore";
import { db } from "../db";
import { projects } from "@shared/schema";
import { log } from "../lib/logger";

const router = Router();

// Initialize ChromaDB on startup (non-blocking)
initChromaDB().catch(() => log("ChromaDB initialization skipped"));

// ============================================
// SMART PROJECT MATCHING
// ============================================

// POST /api/vectors/search - Find similar projects
router.post(
    "/search",
    isAuthenticated,
    asyncHandler(async (req: Request, res: Response) => {
        if (!isChromaDBAvailable()) {
            return res.status(503).json({
                error: "Vector search not available. ChromaDB not configured.",
                fallback: true
            });
        }

        const { description, buildingType, sqft, disciplines, region, limit = 5 } = req.body;

        const similar = await findSimilarProjects(
            { description, buildingType, sqft, disciplines, region },
            limit
        );

        return res.json({
            success: true,
            count: similar.length,
            results: similar,
        });
    })
);

// ============================================
// INDEX MANAGEMENT
// ============================================

// POST /api/vectors/index-all - Index all projects (admin)
router.post(
    "/index-all",
    isAuthenticated,
    asyncHandler(async (req: Request, res: Response) => {
        if (!isChromaDBAvailable()) {
            return res.status(503).json({ error: "ChromaDB not available" });
        }

        // Get all projects
        const allProjects = await db.select().from(projects);

        let indexed = 0;
        for (const project of allProjects) {
            const p = project as any;
            const success = await upsertProjectEmbedding({
                id: project.id,
                name: project.name,
                clientName: project.clientName || "",
                buildingType: p.buildingType || undefined,
                sqft: p.sqft || undefined,
                disciplines: p.disciplines ? String(p.disciplines).split(",") : undefined,
                region: p.region || undefined,
                status: project.status || undefined,
            });
            if (success) indexed++;
        }


        log(`[Vectors] Indexed ${indexed}/${allProjects.length} projects`);

        return res.json({
            success: true,
            indexed,
            total: allProjects.length,
            message: `Indexed ${indexed} projects for vector search`,
        });
    })
);

// GET /api/vectors/stats - Get vector store stats
router.get(
    "/stats",
    isAuthenticated,
    asyncHandler(async (req: Request, res: Response) => {
        const available = isChromaDBAvailable();
        const stats = available ? await getVectorStats() : null;

        return res.json({
            success: true,
            available,
            stats,
            chromaUrl: process.env.CHROMA_URL || "http://localhost:8000",
        });
    })
);

// GET /api/vectors/config - Check configuration
router.get(
    "/config",
    isAuthenticated,
    asyncHandler(async (req: Request, res: Response) => {
        const available = isChromaDBAvailable();

        return res.json({
            success: true,
            configured: available,
            url: process.env.CHROMA_URL || "http://localhost:8000",
            message: available
                ? "ChromaDB connected and ready"
                : "ChromaDB not available. Run: docker run -p 8000:8000 chromadb/chroma",
        });
    })
);

export default router;
