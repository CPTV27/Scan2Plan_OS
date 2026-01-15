import { Router } from "express";
import { db } from "../db";
import { intelNewsItems, intelPipelineRuns, intelAgentOutputs, type IntelNewsType, type IntelRegion, INTEL_NEWS_TYPES, INTEL_REGIONS } from "@shared/schema";
import { eq, desc, and } from "drizzle-orm";
import { isAuthenticated, requireRole } from "../replit_integrations/auth";
import { processUnprocessedItems, getProcessedIntelItems, getPipelineResult, markPipelineRunRead } from "../services/intelPipelineWorker";
import { enrichContacts, batchEnrichContacts } from "../services/contactEnrichment";
import { getSlaQueue, getSlaQueueSummary, generateOutreachEmail, prepareLeadsFromQueue, getSequenceForType } from "../services/outreachAutomation";

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
            project: allItems.filter(i => i.type === "project").length,
            technology: allItems.filter(i => i.type === "technology").length,
            funding: allItems.filter(i => i.type === "funding").length,
            event: allItems.filter(i => i.type === "event").length,
            talent: allItems.filter(i => i.type === "talent").length,
            market: allItems.filter(i => i.type === "market").length,
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

// === PROCESSED INTEL ENDPOINTS (Agent Pipeline Results) ===

// GET /api/intel-feeds/processed - List all processed intel with agent summaries
router.get("/processed", isAuthenticated, requireRole("ceo"), async (req, res) => {
    try {
        const { limit = "50", unreadOnly } = req.query;
        const results = await getProcessedIntelItems({
            limit: parseInt(limit as string),
            onlyUnread: unreadOnly === "true",
        });

        res.json(results);
    } catch (error) {
        console.error("Error fetching processed intel:", error);
        res.status(500).json({ message: "Failed to fetch processed intel" });
    }
});

// GET /api/intel-feeds/processed/stats - Get processing stats
router.get("/processed/stats", isAuthenticated, requireRole("ceo"), async (req, res) => {
    try {
        const allRuns = await db.select().from(intelPipelineRuns);

        const stats = {
            total: allRuns.length,
            pending: allRuns.filter(r => r.status === "pending").length,
            running: allRuns.filter(r => r.status === "running").length,
            completed: allRuns.filter(r => r.status === "completed").length,
            failed: allRuns.filter(r => r.status === "failed").length,
            unread: allRuns.filter(r => r.status === "completed" && !r.isRead).length,
            avgAuditScore: Math.round(
                allRuns.filter(r => r.auditScore !== null).reduce((sum, r) => sum + (r.auditScore || 0), 0) /
                allRuns.filter(r => r.auditScore !== null).length || 0
            ),
        };

        res.json(stats);
    } catch (error) {
        console.error("Error fetching processing stats:", error);
        res.status(500).json({ message: "Failed to fetch processing stats" });
    }
});

// GET /api/intel-feeds/:id/pipeline - Get full pipeline result for an intel item
router.get("/:id/pipeline", isAuthenticated, requireRole("ceo"), async (req, res) => {
    try {
        const { id } = req.params;
        const result = await getPipelineResult(parseInt(id));

        if (!result) {
            return res.status(404).json({ message: "No pipeline run found for this item" });
        }

        res.json(result);
    } catch (error) {
        console.error("Error fetching pipeline result:", error);
        res.status(500).json({ message: "Failed to fetch pipeline result" });
    }
});

// PUT /api/intel-feeds/processed/:runId/read - Mark processed intel as read
router.put("/processed/:runId/read", isAuthenticated, requireRole("ceo"), async (req, res) => {
    try {
        const { runId } = req.params;
        await markPipelineRunRead(parseInt(runId));
        res.json({ success: true });
    } catch (error) {
        console.error("Error marking processed intel as read:", error);
        res.status(500).json({ message: "Failed to mark as read" });
    }
});

// POST /api/intel-feeds/process-pending - Manually trigger processing of unprocessed items
router.post("/process-pending", isAuthenticated, requireRole("ceo"), async (req, res) => {
    try {
        const { limit = 10 } = req.body;
        const result = await processUnprocessedItems(limit);
        res.json(result);
    } catch (error) {
        console.error("Error processing pending items:", error);
        res.status(500).json({ message: "Failed to process pending items" });
    }
});

// === CONTACT ENRICHMENT ENDPOINTS ===

// POST /api/intel-feeds/:id/enrich - Enrich contacts for a specific intel item
router.post("/:id/enrich", isAuthenticated, requireRole("ceo"), async (req, res) => {
    try {
        const { id } = req.params;

        // Get the intel item
        const [item] = await db
            .select()
            .from(intelNewsItems)
            .where(eq(intelNewsItems.id, parseInt(id)));

        if (!item) {
            return res.status(404).json({ message: "Intel item not found" });
        }

        // Extract property identifier from metadata
        const metadata = item.metadata as any || {};
        const result = await enrichContacts(
            {
                bbl: metadata.bbl,
                bin: metadata.bin,
                address: item.summary?.match(/Address: ([^.]+)/)?.[1] || undefined,
                state: item.region === "Northeast" ? "NY" : undefined,
            },
            metadata.owner || metadata.applicant
        );

        // Update the intel item with enriched contacts
        await db
            .update(intelNewsItems)
            .set({
                metadata: {
                    ...metadata,
                    enrichedContacts: result.contacts,
                    enrichmentTimestamp: new Date().toISOString(),
                },
                updatedAt: new Date(),
            })
            .where(eq(intelNewsItems.id, parseInt(id)));

        res.json({
            success: result.success,
            contacts: result.contacts,
            sources_checked: result.sources_checked,
            duration_ms: result.duration_ms,
        });
    } catch (error) {
        console.error("Error enriching contacts:", error);
        res.status(500).json({ message: "Failed to enrich contacts" });
    }
});

// POST /api/intel-feeds/enrich-batch - Enrich contacts for multiple intel items
router.post("/enrich-batch", isAuthenticated, requireRole("ceo"), async (req, res) => {
    try {
        const { itemIds, limit = 10 } = req.body;

        let items;
        if (itemIds && Array.isArray(itemIds)) {
            // Enrich specific items
            items = await db
                .select()
                .from(intelNewsItems)
                .where(
                    and(
                        eq(intelNewsItems.isArchived, false),
                        // Filter to requested IDs (simplified - just get permit/compliance items)
                    )
                )
                .limit(limit);
        } else {
            // Get permit/compliance items without enriched contacts
            items = await db
                .select()
                .from(intelNewsItems)
                .where(
                    and(
                        eq(intelNewsItems.isArchived, false),
                        eq(intelNewsItems.type, "permit")
                    )
                )
                .orderBy(desc(intelNewsItems.relevanceScore))
                .limit(limit);
        }

        const enrichmentItems = items.map(item => {
            const metadata = item.metadata as any || {};
            return {
                identifier: {
                    bbl: metadata.bbl,
                    bin: metadata.bin,
                    address: item.summary?.match(/Address: ([^.]+)/)?.[1],
                    state: item.region === "Northeast" ? "NY" : undefined,
                },
                firmName: metadata.owner || metadata.applicant,
            };
        });

        const result = await batchEnrichContacts(enrichmentItems);

        // Update each item with its enriched contacts
        for (let i = 0; i < items.length; i++) {
            const item = items[i];
            const enrichment = result.results[i];
            const metadata = item.metadata as any || {};

            if (enrichment && enrichment.contacts.length > 0) {
                await db
                    .update(intelNewsItems)
                    .set({
                        metadata: {
                            ...metadata,
                            enrichedContacts: enrichment.contacts,
                            enrichmentTimestamp: new Date().toISOString(),
                        },
                        updatedAt: new Date(),
                    })
                    .where(eq(intelNewsItems.id, item.id));
            }
        }

        res.json({
            success: true,
            summary: result.summary,
            details: result.results.map((r, i) => ({
                itemId: items[i]?.id,
                contacts: r.contacts.length,
                success: r.success,
            })),
        });
    } catch (error) {
        console.error("Error batch enriching contacts:", error);
        res.status(500).json({ message: "Failed to batch enrich contacts" });
    }
});

// === SLA QUEUE & OUTREACH AUTOMATION ===

// GET /api/intel-feeds/sla-queue - Get 48-hour SLA queue
router.get("/sla-queue", isAuthenticated, requireRole("ceo"), async (req, res) => {
    try {
        const { limit = "50", type, status } = req.query;

        const items = await getSlaQueue({
            limit: parseInt(limit as string),
            type: type as IntelNewsType,
            status: status as "on_track" | "at_risk" | "overdue",
        });

        res.json(items);
    } catch (error) {
        console.error("Error fetching SLA queue:", error);
        res.status(500).json({ message: "Failed to fetch SLA queue" });
    }
});

// GET /api/intel-feeds/sla-queue/summary - Get SLA queue statistics
router.get("/sla-queue/summary", isAuthenticated, requireRole("ceo"), async (req, res) => {
    try {
        const summary = await getSlaQueueSummary();
        res.json(summary);
    } catch (error) {
        console.error("Error fetching SLA summary:", error);
        res.status(500).json({ message: "Failed to fetch SLA summary" });
    }
});

// POST /api/intel-feeds/:id/generate-outreach - Generate outreach email for item
router.post("/:id/generate-outreach", isAuthenticated, requireRole("ceo"), async (req, res) => {
    try {
        const { id } = req.params;
        const { contactIndex = 0 } = req.body;

        // Get the item from SLA queue
        const items = await getSlaQueue({ limit: 500 });
        const item = items.find(i => i.id === parseInt(id));

        if (!item) {
            return res.status(404).json({ message: "Item not found in SLA queue" });
        }

        if (item.contacts.length === 0) {
            return res.status(400).json({
                message: "No contacts enriched for this item. Run /enrich first."
            });
        }

        const contact = item.contacts[contactIndex] || item.contacts[0];
        const email = generateOutreachEmail(item, contact);
        const sequence = getSequenceForType(item.type);

        res.json({
            email,
            contact,
            sequence: sequence?.name || null,
            nextSteps: sequence?.steps || [],
        });
    } catch (error) {
        console.error("Error generating outreach:", error);
        res.status(500).json({ message: "Failed to generate outreach" });
    }
});

// POST /api/intel-feeds/sla-queue/prepare-leads - Create leads from queue for Mautic sync
router.post("/sla-queue/prepare-leads", isAuthenticated, requireRole("ceo"), async (req, res) => {
    try {
        const { limit = 20 } = req.body;

        const items = await getSlaQueue({ limit });
        const created = await prepareLeadsFromQueue(items);

        res.json({
            success: true,
            leadsCreated: created,
            fromItems: items.length,
            message: `Created ${created} leads from ${items.length} queue items. Run /api/mautic/contacts/sync to push to Mautic.`,
        });
    } catch (error) {
        console.error("Error preparing leads:", error);
        res.status(500).json({ message: "Failed to prepare leads" });
    }
});

export default router;
