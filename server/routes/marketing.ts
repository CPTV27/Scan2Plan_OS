import type { Express } from "express";
import { db } from "../db";
import { marketingPosts, evidenceVault, insertEvidenceVaultSchema } from "@shared/schema";
import { isAuthenticated, requireRole } from "../replit_integrations/auth";
import { asyncHandler } from "../middleware/errorHandler";
import { eq } from "drizzle-orm";
import { log } from "../lib/logger";

export async function registerMarketingRoutes(app: Express): Promise<void> {
  app.get("/api/marketing-posts", isAuthenticated, asyncHandler(async (req, res) => {
    try {
      const { status } = req.query;
      let query = db.select().from(marketingPosts);

      if (status && typeof status === "string") {
        query = query.where(eq(marketingPosts.status, status)) as any;
      }

      const posts = await query;
      res.json(posts);
    } catch (error) {
      log("ERROR: Error fetching marketing posts - " + (error as any)?.message);
      res.status(500).json({ message: "Failed to fetch marketing posts" });
    }
  }));

  app.get("/api/marketing-posts/:id", isAuthenticated, asyncHandler(async (req, res) => {
    try {
      const [post] = await db.select()
        .from(marketingPosts)
        .where(eq(marketingPosts.id, Number(req.params.id)));

      if (!post) {
        return res.status(404).json({ message: "Marketing post not found" });
      }

      res.json(post);
    } catch (error) {
      log("ERROR: Error fetching marketing post - " + (error as any)?.message);
      res.status(500).json({ message: "Failed to fetch marketing post" });
    }
  }));

  app.patch("/api/marketing-posts/:id", isAuthenticated, asyncHandler(async (req, res) => {
    try {
      const { status, content, platform } = req.body;
      const updateData: any = {};

      if (status !== undefined) updateData.status = status;
      if (content !== undefined) updateData.content = content;
      if (platform !== undefined) updateData.platform = platform;

      if (status === "posted") {
        updateData.postedAt = new Date();
      }

      const [updated] = await db.update(marketingPosts)
        .set(updateData)
        .where(eq(marketingPosts.id, Number(req.params.id)))
        .returning();

      if (!updated) {
        return res.status(404).json({ message: "Marketing post not found" });
      }

      res.json(updated);
    } catch (error) {
      log("ERROR: Error updating marketing post - " + (error as any)?.message);
      res.status(500).json({ message: "Failed to update marketing post" });
    }
  }));

  app.post("/api/marketing-posts/trigger/:projectId", isAuthenticated, requireRole("ceo", "sales"), asyncHandler(async (req, res) => {
    try {
      const projectId = Number(req.params.projectId);
      const { variancePercent, actualSqft, costPerSqft, varianceThreshold } = req.body;

      if (variancePercent === undefined || !actualSqft) {
        return res.status(400).json({ message: "variancePercent and actualSqft are required" });
      }

      const { triggerTruthLoop } = await import("../services/marketingLoop");
      const result = await triggerTruthLoop(projectId, Number(variancePercent), Number(actualSqft), {
        costPerSqft: costPerSqft ? Number(costPerSqft) : undefined,
        varianceThreshold: varianceThreshold ? Number(varianceThreshold) : undefined
      });

      if (!result.success) {
        return res.status(400).json(result);
      }

      res.json(result);
    } catch (error) {
      log("ERROR: Error triggering Truth Loop - " + (error as any)?.message);
      res.status(500).json({ message: "Failed to trigger Truth Loop" });
    }
  }));

  app.delete("/api/marketing-posts/:id", isAuthenticated, requireRole("ceo"), asyncHandler(async (req, res) => {
    try {
      const [deleted] = await db.delete(marketingPosts)
        .where(eq(marketingPosts.id, Number(req.params.id)))
        .returning();

      if (!deleted) {
        return res.status(404).json({ message: "Marketing post not found" });
      }

      res.json({ message: "Post deleted", post: deleted });
    } catch (error) {
      log("ERROR: Error deleting marketing post - " + (error as any)?.message);
      res.status(500).json({ message: "Failed to delete marketing post" });
    }
  }));

  app.get("/api/evidence-vault", isAuthenticated, asyncHandler(async (req, res) => {
    try {
      const { personaCode, minEws } = req.query;

      let query = db.select().from(evidenceVault);

      if (personaCode && typeof personaCode === "string") {
        query = query.where(eq(evidenceVault.personaCode, personaCode)) as any;
      }

      const entries = await query;

      const filtered = minEws
        ? entries.filter(e => (e.ewsScore || 0) >= Number(minEws))
        : entries;

      res.json(filtered);
    } catch (error) {
      log("ERROR: Error fetching evidence vault - " + (error as any)?.message);
      res.status(500).json({ message: "Failed to fetch evidence vault entries" });
    }
  }));

  app.get("/api/evidence-vault/:id", isAuthenticated, asyncHandler(async (req, res) => {
    try {
      const [entry] = await db.select()
        .from(evidenceVault)
        .where(eq(evidenceVault.id, Number(req.params.id)));

      if (!entry) {
        return res.status(404).json({ message: "Evidence vault entry not found" });
      }

      res.json(entry);
    } catch (error) {
      log("ERROR: Error fetching evidence vault entry - " + (error as any)?.message);
      res.status(500).json({ message: "Failed to fetch evidence vault entry" });
    }
  }));

  app.post("/api/evidence-vault", isAuthenticated, asyncHandler(async (req, res) => {
    try {
      const parsed = insertEvidenceVaultSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Invalid data", errors: parsed.error.errors });
      }

      const [newEntry] = await db.insert(evidenceVault)
        .values(parsed.data)
        .returning();

      res.status(201).json(newEntry);
    } catch (error) {
      log("ERROR: Error creating evidence vault entry - " + (error as any)?.message);
      res.status(500).json({ message: "Failed to create evidence vault entry" });
    }
  }));

  app.patch("/api/evidence-vault/:id", isAuthenticated, asyncHandler(async (req, res) => {
    try {
      const { hookContent, ewsScore, sourceUrl, personaCode } = req.body;

      const [updated] = await db.update(evidenceVault)
        .set({
          hookContent: hookContent !== undefined ? hookContent : undefined,
          ewsScore: ewsScore !== undefined ? Number(ewsScore) : undefined,
          sourceUrl: sourceUrl !== undefined ? sourceUrl : undefined,
          personaCode: personaCode !== undefined ? personaCode : undefined,
        })
        .where(eq(evidenceVault.id, Number(req.params.id)))
        .returning();

      if (!updated) {
        return res.status(404).json({ message: "Evidence vault entry not found" });
      }

      res.json(updated);
    } catch (error) {
      log("ERROR: Error updating evidence vault entry - " + (error as any)?.message);
      res.status(500).json({ message: "Failed to update evidence vault entry" });
    }
  }));

  app.post("/api/evidence-vault/:id/use", isAuthenticated, asyncHandler(async (req, res) => {
    try {
      const [entry] = await db.select()
        .from(evidenceVault)
        .where(eq(evidenceVault.id, Number(req.params.id)));

      if (!entry) {
        return res.status(404).json({ message: "Evidence vault entry not found" });
      }

      const [updated] = await db.update(evidenceVault)
        .set({ usageCount: (entry.usageCount || 0) + 1 })
        .where(eq(evidenceVault.id, Number(req.params.id)))
        .returning();

      res.json(updated);
    } catch (error) {
      log("ERROR: Error incrementing usage count - " + (error as any)?.message);
      res.status(500).json({ message: "Failed to increment usage count" });
    }
  }));

  app.delete("/api/evidence-vault/:id", isAuthenticated, requireRole("ceo"), asyncHandler(async (req, res) => {
    try {
      const [deleted] = await db.delete(evidenceVault)
        .where(eq(evidenceVault.id, Number(req.params.id)))
        .returning();

      if (!deleted) {
        return res.status(404).json({ message: "Evidence vault entry not found" });
      }

      res.json({ message: "Entry deleted", entry: deleted });
    } catch (error) {
      log("ERROR: Error deleting evidence vault entry - " + (error as any)?.message);
      res.status(500).json({ message: "Failed to delete evidence vault entry" });
    }
  }));

  // ===== CASE STUDIES =====
  const { caseStudyStorage } = await import("../storage/marketing");
  const { insertCaseStudySchema, insertCaseStudySnippetSchema } = await import("@shared/schema");

  // List all case studies
  app.get("/api/case-studies", isAuthenticated, asyncHandler(async (req, res) => {
    try {
      const { search, tags } = req.query;

      let studies;
      if (search && typeof search === "string") {
        studies = await caseStudyStorage.search(search);
      } else if (tags && typeof tags === "string") {
        studies = await caseStudyStorage.getByTags(tags.split(","));
      } else {
        studies = await caseStudyStorage.getAll();
      }

      res.json(studies);
    } catch (error) {
      log("ERROR: Error fetching case studies - " + (error as any)?.message);
      res.status(500).json({ message: "Failed to fetch case studies" });
    }
  }));

  // Get single case study with snippets
  app.get("/api/case-studies/:id", isAuthenticated, asyncHandler(async (req, res) => {
    try {
      const study = await caseStudyStorage.getWithSnippets(Number(req.params.id));

      if (!study) {
        return res.status(404).json({ message: "Case study not found" });
      }

      res.json(study);
    } catch (error) {
      log("ERROR: Error fetching case study - " + (error as any)?.message);
      res.status(500).json({ message: "Failed to fetch case study" });
    }
  }));

  // Create case study
  app.post("/api/case-studies", isAuthenticated, requireRole("ceo", "sales"), asyncHandler(async (req, res) => {
    try {
      const parsed = insertCaseStudySchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Invalid data", errors: parsed.error.errors });
      }

      const study = await caseStudyStorage.create(parsed.data);
      res.status(201).json(study);
    } catch (error) {
      log("ERROR: Error creating case study - " + (error as any)?.message);
      res.status(500).json({ message: "Failed to create case study" });
    }
  }));

  // Update case study
  app.put("/api/case-studies/:id", isAuthenticated, requireRole("ceo", "sales"), asyncHandler(async (req, res) => {
    try {
      const updated = await caseStudyStorage.update(Number(req.params.id), req.body);

      if (!updated) {
        return res.status(404).json({ message: "Case study not found" });
      }

      res.json(updated);
    } catch (error) {
      log("ERROR: Error updating case study - " + (error as any)?.message);
      res.status(500).json({ message: "Failed to update case study" });
    }
  }));

  // Delete case study (soft delete)
  app.delete("/api/case-studies/:id", isAuthenticated, requireRole("ceo"), asyncHandler(async (req, res) => {
    try {
      await caseStudyStorage.delete(Number(req.params.id));
      res.json({ message: "Case study deleted" });
    } catch (error) {
      log("ERROR: Error deleting case study - " + (error as any)?.message);
      res.status(500).json({ message: "Failed to delete case study" });
    }
  }));

  // ===== CASE STUDY SNIPPETS =====

  // Get snippets for a case study
  app.get("/api/case-studies/:id/snippets", isAuthenticated, asyncHandler(async (req, res) => {
    try {
      const snippets = await caseStudyStorage.getSnippets(Number(req.params.id));
      res.json(snippets);
    } catch (error) {
      log("ERROR: Error fetching snippets - " + (error as any)?.message);
      res.status(500).json({ message: "Failed to fetch snippets" });
    }
  }));

  // Create snippet
  app.post("/api/case-studies/:id/snippets", isAuthenticated, requireRole("ceo", "sales"), asyncHandler(async (req, res) => {
    try {
      const data = {
        ...req.body,
        caseStudyId: Number(req.params.id),
      };

      const parsed = insertCaseStudySnippetSchema.safeParse(data);
      if (!parsed.success) {
        return res.status(400).json({ message: "Invalid data", errors: parsed.error.errors });
      }

      const snippet = await caseStudyStorage.createSnippet(parsed.data);
      res.status(201).json(snippet);
    } catch (error) {
      log("ERROR: Error creating snippet - " + (error as any)?.message);
      res.status(500).json({ message: "Failed to create snippet" });
    }
  }));

  // Update snippet
  app.put("/api/case-studies/snippets/:snippetId", isAuthenticated, requireRole("ceo", "sales"), asyncHandler(async (req, res) => {
    try {
      const updated = await caseStudyStorage.updateSnippet(Number(req.params.snippetId), req.body);

      if (!updated) {
        return res.status(404).json({ message: "Snippet not found" });
      }

      res.json(updated);
    } catch (error) {
      log("ERROR: Error updating snippet - " + (error as any)?.message);
      res.status(500).json({ message: "Failed to update snippet" });
    }
  }));

  // Delete snippet
  app.delete("/api/case-studies/snippets/:snippetId", isAuthenticated, requireRole("ceo", "sales"), asyncHandler(async (req, res) => {
    try {
      await caseStudyStorage.deleteSnippet(Number(req.params.snippetId));
      res.json({ message: "Snippet deleted" });
    } catch (error) {
      log("ERROR: Error deleting snippet - " + (error as any)?.message);
      res.status(500).json({ message: "Failed to delete snippet" });
    }
  }));
}
