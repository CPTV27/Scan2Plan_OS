import { Router } from "express";
import { db } from "../db";
import { intelNewsItems, type IntelNewsType, type IntelRegion, INTEL_NEWS_TYPES, INTEL_REGIONS } from "@shared/schema";
import { eq, desc, and } from "drizzle-orm";
import { isAuthenticated } from "../replit_integrations/auth";

const router = Router();

// GET /api/intel-feeds - List all news items, optionally filtered
router.get("/", isAuthenticated, async (req, res) => {
    try {
        const { type, region, unreadOnly, limit = "50" } = req.query;

        const items = await db
            .select()
            .from(intelNewsItems)
            .where(
                and(
                    eq(intelNewsItems.isArchived, false),
                    type && INTEL_NEWS_TYPES.includes(type as IntelNewsType) ? eq(intelNewsItems.type, type as IntelNewsType) : undefined,
                    region && INTEL_REGIONS.includes(region as IntelRegion) ? eq(intelNewsItems.region, region as IntelRegion) : undefined,
                    unreadOnly === "true" ? eq(intelNewsItems.isRead, false) : undefined
                )
            )
            .orderBy(desc(intelNewsItems.publishedAt))
            .limit(parseInt(limit as string));

        res.json(items);
    } catch (error) {
        console.error("Error fetching intel feeds:", error);
        res.status(500).json({ message: "Failed to fetch intel feeds" });
    }
});

// GET /api/intel-feeds/stats - Get counts by type
router.get("/stats", isAuthenticated, async (req, res) => {
    try {
        const allItems = await db
            .select()
            .from(intelNewsItems)
            .where(eq(intelNewsItems.isArchived, false));

        const stats = {
            opportunity: allItems.filter(i => i.type === "opportunity").length,
            policy: allItems.filter(i => i.type === "policy").length,
            competitor: allItems.filter(i => i.type === "competitor").length,
            unread: allItems.filter(i => !i.isRead).length,
            total: allItems.length,
        };

        res.json(stats);
    } catch (error) {
        console.error("Error fetching intel stats:", error);
        res.status(500).json({ message: "Failed to fetch stats" });
    }
});

// POST /api/intel-feeds - Create a new news item
router.post("/", isAuthenticated, async (req, res) => {
    try {
        const { type, title, summary, sourceUrl, sourceName, region, deadline, estimatedValue, projectType, effectiveDate, agency, competitorName, relevanceScore, metadata } = req.body;

        const [item] = await db.insert(intelNewsItems).values({
            type: type as IntelNewsType,
            title,
            summary,
            sourceUrl,
            sourceName,
            region: region as IntelRegion | undefined,
            deadline: deadline ? new Date(deadline) : undefined,
            estimatedValue,
            projectType,
            effectiveDate: effectiveDate ? new Date(effectiveDate) : undefined,
            agency,
            competitorName,
            relevanceScore,
            metadata,
            createdBy: (req.user as any)?.claims?.email || "system",
        }).returning();

        res.status(201).json(item);
    } catch (error) {
        console.error("Error creating intel item:", error);
        res.status(500).json({ message: "Failed to create intel item" });
    }
});

// PUT /api/intel-feeds/:id/read - Mark as read
router.put("/:id/read", isAuthenticated, async (req, res) => {
    try {
        const { id } = req.params;

        const [item] = await db
            .update(intelNewsItems)
            .set({ isRead: true, updatedAt: new Date() })
            .where(eq(intelNewsItems.id, parseInt(id)))
            .returning();

        if (!item) {
            return res.status(404).json({ message: "Item not found" });
        }

        res.json(item);
    } catch (error) {
        console.error("Error marking item as read:", error);
        res.status(500).json({ message: "Failed to update item" });
    }
});

// PUT /api/intel-feeds/:id/archive - Archive an item
router.put("/:id/archive", isAuthenticated, async (req, res) => {
    try {
        const { id } = req.params;

        const [item] = await db
            .update(intelNewsItems)
            .set({ isArchived: true, updatedAt: new Date() })
            .where(eq(intelNewsItems.id, parseInt(id)))
            .returning();

        if (!item) {
            return res.status(404).json({ message: "Item not found" });
        }

        res.json(item);
    } catch (error) {
        console.error("Error archiving item:", error);
        res.status(500).json({ message: "Failed to archive item" });
    }
});

// DELETE /api/intel-feeds/:id - Delete an item
router.delete("/:id", isAuthenticated, async (req, res) => {
    try {
        const { id } = req.params;

        await db.delete(intelNewsItems).where(eq(intelNewsItems.id, parseInt(id)));

        res.json({ success: true });
    } catch (error) {
        console.error("Error deleting intel item:", error);
        res.status(500).json({ message: "Failed to delete item" });
    }
});

// POST /api/intel-feeds/seed-demo - Seed demo data (for testing)
router.post("/seed-demo", isAuthenticated, async (req, res) => {
    try {
        const demoItems = [
            {
                type: "opportunity" as IntelNewsType,
                title: "NYC DOE School Renovation - PS 115 Brooklyn",
                summary: "Scan-to-BIM services needed for 75,000 sqft school renovation. LOD 300 MEP required.",
                sourceUrl: "https://bidnet.example.com/ps115",
                sourceName: "BidNet",
                region: "Northeast" as IntelRegion,
                deadline: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days
                estimatedValue: "85000",
                projectType: "Educational",
                relevanceScore: 92,
            },
            {
                type: "opportunity" as IntelNewsType,
                title: "Hudson Yards Commercial Tower - As-Built Survey",
                summary: "Major developer seeking scan-to-BIM for 45-story mixed-use tower. Architecture + Structure.",
                sourceUrl: "https://rfp.example.com/hudson-yards",
                sourceName: "Dodge Construction",
                region: "Northeast" as IntelRegion,
                deadline: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000), // 21 days
                estimatedValue: "250000",
                projectType: "Commercial - Complex",
                relevanceScore: 95,
            },
            {
                type: "policy" as IntelNewsType,
                title: "NYC DOB Updates Local Law 97 Carbon Reporting Requirements",
                summary: "New building energy benchmarking rules may increase demand for accurate as-built documentation.",
                sourceUrl: "https://nyc.gov/buildings/ll97",
                sourceName: "NYC Department of Buildings",
                agency: "NYC DOB",
                region: "Northeast" as IntelRegion,
                effectiveDate: new Date("2026-05-01"),
                relevanceScore: 88,
            },
            {
                type: "policy" as IntelNewsType,
                title: "OSHA Proposes New Heat Safety Rules for Construction",
                summary: "Proposed rule would require rest breaks and shade access. May affect field scanning schedules.",
                sourceUrl: "https://osha.gov/heat-safety",
                sourceName: "OSHA",
                agency: "OSHA",
                region: "National" as IntelRegion,
                effectiveDate: new Date("2026-07-01"),
                relevanceScore: 75,
            },
            {
                type: "competitor" as IntelNewsType,
                title: "ScanCorp Acquires Regional Player in Mid-Atlantic",
                summary: "National competitor expands into your territory with acquisition of Baltimore-based firm.",
                sourceUrl: "https://linkedin.com/news/scancorp",
                sourceName: "LinkedIn",
                competitorName: "ScanCorp",
                region: "Mid-Atlantic" as IntelRegion,
                relevanceScore: 80,
            },
            {
                type: "competitor" as IntelNewsType,
                title: "TechScan Pro Announces 30% Price Cut on Basic Scanning",
                summary: "Mid-range competitor slashing prices on entry-level services. May affect Tier C pricing.",
                sourceUrl: "https://techscanpro.example.com/pricing",
                sourceName: "Industry News",
                competitorName: "TechScan Pro",
                region: "Northeast" as IntelRegion,
                relevanceScore: 85,
            },
        ];

        const inserted = await db.insert(intelNewsItems).values(demoItems).returning();

        res.json({ success: true, count: inserted.length, items: inserted });
    } catch (error) {
        console.error("Error seeding demo data:", error);
        res.status(500).json({ message: "Failed to seed demo data" });
    }
});

export default router;
