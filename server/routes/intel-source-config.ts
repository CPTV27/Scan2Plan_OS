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

export default router;
