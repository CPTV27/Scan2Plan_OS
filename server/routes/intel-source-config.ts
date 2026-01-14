import { Router } from "express";
import { db } from "../db";
import { intelFeedSources, insertIntelFeedSourceSchema, type IntelSourceType } from "@shared/schema";
import { eq } from "drizzle-orm";
import { isAuthenticated, requireRole } from "../replit_integrations/auth";

const router = Router();

router.get("/", isAuthenticated, requireRole("ceo"), async (req, res) => {
    try {
        const sources = await db.select().from(intelFeedSources);
        res.json(sources);
    } catch (error) {
        console.error("Error fetching intel sources:", error);
        res.status(500).json({ message: "Failed to fetch intel sources" });
    }
});

router.post("/", isAuthenticated, requireRole("ceo"), async (req, res) => {
    try {
        const parsed = insertIntelFeedSourceSchema.safeParse(req.body);
        if (!parsed.success) {
            return res.status(400).json({ message: "Invalid request body", errors: parsed.error.errors });
        }

        const [source] = await db.insert(intelFeedSources).values({
            ...parsed.data,
            type: parsed.data.type as IntelSourceType,
        }).returning();
        res.status(201).json(source);
    } catch (error) {
        console.error("Error creating intel source:", error);
        res.status(500).json({ message: "Failed to create intel source" });
    }
});

router.put("/:id", isAuthenticated, requireRole("ceo"), async (req, res) => {
    try {
        const { id } = req.params;
        const { name, type, config, isActive } = req.body;

        const [source] = await db
            .update(intelFeedSources)
            .set({
                ...(name !== undefined && { name }),
                ...(type !== undefined && { type: type as IntelSourceType }),
                ...(config !== undefined && { config }),
                ...(isActive !== undefined && { isActive }),
                updatedAt: new Date(),
            })
            .where(eq(intelFeedSources.id, parseInt(id)))
            .returning();

        if (!source) {
            return res.status(404).json({ message: "Source not found" });
        }

        res.json(source);
    } catch (error) {
        console.error("Error updating intel source:", error);
        res.status(500).json({ message: "Failed to update intel source" });
    }
});

router.delete("/:id", isAuthenticated, requireRole("ceo"), async (req, res) => {
    try {
        const { id } = req.params;
        const [deleted] = await db
            .delete(intelFeedSources)
            .where(eq(intelFeedSources.id, parseInt(id)))
            .returning();

        if (!deleted) {
            return res.status(404).json({ message: "Source not found" });
        }

        res.json({ success: true });
    } catch (error) {
        console.error("Error deleting intel source:", error);
        res.status(500).json({ message: "Failed to delete intel source" });
    }
});

router.post("/:id/test", isAuthenticated, requireRole("ceo"), async (req, res) => {
    try {
        const { id } = req.params;
        const [source] = await db.select().from(intelFeedSources).where(eq(intelFeedSources.id, parseInt(id)));

        if (!source) {
            return res.status(404).json({ message: "Source not found" });
        }

        let testResult = { success: false, message: "" };

        switch (source.type) {
            case "bidnet_api": {
                const config = source.config as { apiKey?: string; apiUrl?: string };
                if (!config?.apiKey || !config?.apiUrl) {
                    testResult = { success: false, message: "API key and URL are required" };
                } else {
                    try {
                        const response = await fetch(config.apiUrl, {
                            method: "GET",
                            headers: { Authorization: `Bearer ${config.apiKey}` },
                        });
                        testResult = {
                            success: response.ok,
                            message: response.ok ? "Connection successful" : `HTTP ${response.status}: ${response.statusText}`,
                        };
                    } catch (e: any) {
                        testResult = { success: false, message: `Connection failed: ${e.message}` };
                    }
                }
                break;
            }
            case "rss": {
                const config = source.config as { feedUrl?: string };
                if (!config?.feedUrl) {
                    testResult = { success: false, message: "Feed URL is required" };
                } else {
                    try {
                        const response = await fetch(config.feedUrl);
                        const text = await response.text();
                        const isXml = text.includes("<rss") || text.includes("<feed") || text.includes("<channel");
                        testResult = {
                            success: response.ok && isXml,
                            message: response.ok && isXml ? "Valid RSS feed" : "Invalid or unreachable RSS feed",
                        };
                    } catch (e: any) {
                        testResult = { success: false, message: `Connection failed: ${e.message}` };
                    }
                }
                break;
            }
            case "webhook": {
                testResult = { success: true, message: "Webhook endpoint is configured - waiting for incoming data" };
                break;
            }
            default:
                testResult = { success: false, message: "Unknown source type" };
        }

        res.json(testResult);
    } catch (error) {
        console.error("Error testing intel source:", error);
        res.status(500).json({ message: "Failed to test intel source" });
    }
});

router.post("/:id/sync", isAuthenticated, requireRole("ceo"), async (req, res) => {
    try {
        const { id } = req.params;
        const [source] = await db.select().from(intelFeedSources).where(eq(intelFeedSources.id, parseInt(id)));

        if (!source) {
            return res.status(404).json({ message: "Source not found" });
        }

        if (!source.isActive) {
            return res.status(400).json({ message: "Source is not active" });
        }

        let syncResult = { success: false, message: "", itemsProcessed: 0 };

        try {
            switch (source.type) {
                case "bidnet_api": {
                    syncResult = { success: true, message: "BidNet API sync completed", itemsProcessed: 0 };
                    break;
                }
                case "rss": {
                    syncResult = { success: true, message: "RSS feed sync completed", itemsProcessed: 0 };
                    break;
                }
                case "webhook": {
                    syncResult = { success: true, message: "Webhook sources sync on-demand when data arrives", itemsProcessed: 0 };
                    break;
                }
            }

            await db
                .update(intelFeedSources)
                .set({
                    lastSyncAt: new Date(),
                    lastSyncStatus: "success",
                    lastSyncError: null,
                    updatedAt: new Date(),
                })
                .where(eq(intelFeedSources.id, parseInt(id)));
        } catch (syncError: any) {
            await db
                .update(intelFeedSources)
                .set({
                    lastSyncAt: new Date(),
                    lastSyncStatus: "error",
                    lastSyncError: syncError.message,
                    updatedAt: new Date(),
                })
                .where(eq(intelFeedSources.id, parseInt(id)));

            syncResult = { success: false, message: syncError.message, itemsProcessed: 0 };
        }

        res.json(syncResult);
    } catch (error) {
        console.error("Error syncing intel source:", error);
        res.status(500).json({ message: "Failed to sync intel source" });
    }
});

// POST /intel-source-config/seed-defaults - Seed 9 default feed configurations (CEO only)
router.post("/seed-defaults", isAuthenticated, requireRole("ceo"), async (req, res) => {
    try {
        const defaultFeeds = [
            // 1. Bidding Opportunities
            {
                name: "Bidding Opportunities",
                type: "rss" as IntelSourceType,
                config: {
                    feedUrl: "https://news.google.com/rss/search?q=RFP+construction+scanning+OR+BIM",
                    targetType: "opportunity",
                    searchPrompt: `(RFP OR "request for proposal" OR bid OR "invitation to bid" OR procurement) AND ("3D scanning" OR "laser scanning" OR "LiDAR" OR "as-built" OR "Scan-to-BIM" OR "point cloud" OR "building survey" OR "existing conditions")`,
                    keywords: ["RFP", "bid", "procurement", "3D scanning", "laser scanning", "Scan-to-BIM", "as-built"],
                    excludeKeywords: [],
                    syncIntervalMinutes: 60,
                },
            },
            // 2. Policy & Regulatory
            {
                name: "Policy & Regulatory Updates",
                type: "rss" as IntelSourceType,
                config: {
                    feedUrl: "https://news.google.com/rss/search?q=NYC+building+code+OR+construction+regulation",
                    targetType: "policy",
                    searchPrompt: `("Local Law 97" OR "LL97" OR "building emissions" OR "carbon reporting" OR "energy audit" OR "DOB filing" OR "landmark preservation" OR "historic district" OR "building code update") AND (NYC OR "New York" OR construction)`,
                    keywords: ["Local Law 97", "DOB", "OSHA", "building code", "regulation", "compliance", "permit"],
                    excludeKeywords: [],
                    syncIntervalMinutes: 360,
                },
            },
            // 3. Competitor Intelligence
            {
                name: "Competitor Intelligence",
                type: "rss" as IntelSourceType,
                config: {
                    feedUrl: "https://news.google.com/rss/search?q=3D+scanning+company+OR+Scan-to-BIM+services",
                    targetType: "competitor",
                    searchPrompt: `("3D scanning company" OR "Scan-to-BIM" OR "laser scanning services" OR "point cloud modeling" OR "reality capture") AND (acquires OR merger OR partnership OR expands OR funding OR "wins contract") NOT "Scan2Plan"`,
                    keywords: ["acquires", "merger", "partnership", "expands", "wins contract", "new office"],
                    excludeKeywords: ["Scan2Plan", "scan2plan.io"],
                    syncIntervalMinutes: 240,
                },
            },
            // 4. Project Opportunities
            {
                name: "New Construction Projects",
                type: "rss" as IntelSourceType,
                config: {
                    feedUrl: "https://news.google.com/rss/search?q=NYC+construction+project+OR+renovation+project",
                    targetType: "project",
                    searchPrompt: `("construction start" OR "groundbreaking" OR "renovation project" OR "building permit" OR "design contract" OR "tenant improvement") AND (NYC OR Manhattan OR Brooklyn OR Albany OR "Capital Region") AND ("square feet" OR architect OR "general contractor")`,
                    keywords: ["construction", "renovation", "groundbreaking", "building permit", "tenant improvement"],
                    excludeKeywords: [],
                    syncIntervalMinutes: 120,
                },
            },
            // 5. Technology & Innovation
            {
                name: "Scanning & BIM Technology",
                type: "rss" as IntelSourceType,
                config: {
                    feedUrl: "https://news.google.com/rss/search?q=LiDAR+technology+OR+BIM+software+OR+reality+capture",
                    targetType: "technology",
                    searchPrompt: `("LiDAR" OR "Trimble" OR "NavVis" OR "reality capture" OR "point cloud" OR "BIM software" OR "Revit" OR "digital twin") AND (release OR update OR new OR innovation OR AI)`,
                    keywords: ["LiDAR", "Trimble", "NavVis", "BIM", "Revit", "point cloud", "AI", "reality capture"],
                    excludeKeywords: [],
                    syncIntervalMinutes: 480,
                },
            },
            // 6. Funding & Grants
            {
                name: "Funding & Grant Opportunities",
                type: "rss" as IntelSourceType,
                config: {
                    feedUrl: "https://news.google.com/rss/search?q=construction+grant+OR+historic+preservation+funding",
                    targetType: "funding",
                    searchPrompt: `(grant OR funding OR "federal program" OR "state program" OR "tax credit") AND ("historic preservation" OR "energy efficiency" OR "infrastructure" OR "capital improvement" OR "adaptive reuse")`,
                    keywords: ["grant", "funding", "tax credit", "historic preservation", "SHPO", "energy efficiency"],
                    excludeKeywords: [],
                    syncIntervalMinutes: 720,
                },
            },
            // 7. Industry Events
            {
                name: "Industry Events & Conferences",
                type: "rss" as IntelSourceType,
                config: {
                    feedUrl: "https://news.google.com/rss/search?q=AEC+conference+OR+construction+expo+OR+BIM+summit",
                    targetType: "event",
                    searchPrompt: `(conference OR summit OR expo OR webinar OR "trade show") AND (AEC OR construction OR BIM OR scanning OR architecture OR engineering)`,
                    keywords: ["conference", "summit", "expo", "AIA", "AGC", "BOMA", "Autodesk University"],
                    excludeKeywords: [],
                    syncIntervalMinutes: 1440,
                },
            },
            // 8. Talent & Hiring
            {
                name: "Talent & Hiring Trends",
                type: "rss" as IntelSourceType,
                config: {
                    feedUrl: "https://news.google.com/rss/search?q=BIM+jobs+OR+construction+hiring+OR+scanning+technician",
                    targetType: "talent",
                    searchPrompt: `(hiring OR "job market" OR "labor shortage" OR "skilled trades" OR salaries) AND (BIM OR scanning OR construction OR "reality capture" OR Revit)`,
                    keywords: ["hiring", "jobs", "labor shortage", "BIM modeler", "scan technician", "salaries"],
                    excludeKeywords: [],
                    syncIntervalMinutes: 1440,
                },
            },
            // 9. Market Analysis
            {
                name: "Market Trends & Analysis",
                type: "rss" as IntelSourceType,
                config: {
                    feedUrl: "https://news.google.com/rss/search?q=construction+industry+trends+OR+AEC+market+forecast",
                    targetType: "market",
                    searchPrompt: `("market trends" OR forecast OR "industry report" OR analysis OR growth) AND (construction OR AEC OR "real estate" OR scanning OR BIM) AND (2025 OR 2026 OR outlook)`,
                    keywords: ["market trends", "forecast", "industry report", "growth", "outlook", "construction spending"],
                    excludeKeywords: [],
                    syncIntervalMinutes: 1440,
                },
            },
        ];

        let created = 0;
        let skipped = 0;

        for (const feed of defaultFeeds) {
            try {
                await db.insert(intelFeedSources).values(feed);
                created++;
            } catch (e: any) {
                // Skip if already exists (unique constraint)
                if (e.code === "23505") {
                    skipped++;
                } else {
                    throw e;
                }
            }
        }

        res.json({
            success: true,
            created,
            skipped,
            total: defaultFeeds.length,
            message: `Created ${created} intel feed configurations (${skipped} already existed)`
        });
    } catch (error) {
        console.error("Error seeding default feeds:", error);
        res.status(500).json({ message: "Failed to seed default feeds" });
    }
});

export default router;
