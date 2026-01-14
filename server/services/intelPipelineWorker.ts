/**
 * Intel Pipeline Worker
 * 
 * Automatically processes intel items through the 5-agent pipeline:
 * Scout -> Analyst -> Strategist -> Composer -> Auditor
 */

import { db } from "../db";
import { intelNewsItems, intelPipelineRuns, intelAgentOutputs } from "@shared/schema";
import { eq, and, isNull, desc, sql, inArray } from "drizzle-orm";
import { runAgentPipeline, initializeAgents } from "./agents";
import type { AgentMessage } from "./agents";

let isInitialized = false;

/**
 * Initialize the worker (ensures agents are ready)
 */
function ensureInitialized() {
  if (!isInitialized) {
    initializeAgents();
    isInitialized = true;
  }
}

/**
 * Find intel items that haven't been processed yet
 */
async function findUnprocessedItems(limit: number = 5): Promise<number[]> {
  const processedItemIds = db
    .select({ id: intelPipelineRuns.intelItemId })
    .from(intelPipelineRuns);

  const items = await db
    .select({ id: intelNewsItems.id })
    .from(intelNewsItems)
    .where(
      sql`${intelNewsItems.id} NOT IN (SELECT ${intelPipelineRuns.intelItemId} FROM ${intelPipelineRuns})`
    )
    .orderBy(desc(intelNewsItems.createdAt))
    .limit(limit);

  return items.map(i => i.id);
}

/**
 * Process a single intel item through the full pipeline
 */
async function processItem(itemId: number): Promise<{
  success: boolean;
  runId?: number;
  error?: string;
}> {
  ensureInitialized();

  const [item] = await db
    .select()
    .from(intelNewsItems)
    .where(eq(intelNewsItems.id, itemId))
    .limit(1);

  if (!item) {
    return { success: false, error: "Item not found" };
  }

  const [run] = await db
    .insert(intelPipelineRuns)
    .values({
      intelItemId: itemId,
      status: "running",
      currentAgent: "scout",
      startedAt: new Date(),
    })
    .returning();

  try {
    const rawContent = [
      item.title,
      item.summary || "",
      item.sourceName ? `Source: ${item.sourceName}` : "",
      item.sourceUrl ? `URL: ${item.sourceUrl}` : "",
      item.region ? `Region: ${item.region}` : "",
      item.projectType ? `Project Type: ${item.projectType}` : "",
    ].filter(Boolean).join("\n\n");

    const startTime = Date.now();
    const messages = await runAgentPipeline(rawContent, item.sourceName || "intel_feed");

    const agentOutputRecords = messages.map((msg, index) => ({
      runId: run.id,
      agent: msg.from as "scout" | "analyst" | "strategist" | "composer" | "auditor",
      output: msg.payload,
      status: "completed" as const,
      durationMs: Math.round((Date.now() - startTime) / (index + 1)),
      confidence: msg.payload?.relevanceScore || msg.payload?.confidence || msg.payload?.score || 75,
    }));

    if (agentOutputRecords.length > 0) {
      await db.insert(intelAgentOutputs).values(agentOutputRecords);
    }

    const scoutOutput = messages.find(m => m.from === "scout")?.payload;
    const strategistOutput = messages.find(m => m.from === "strategist")?.payload;
    const composerOutput = messages.find(m => m.from === "composer")?.payload;
    const auditorOutput = messages.find(m => m.from === "auditor")?.payload;

    await db
      .update(intelPipelineRuns)
      .set({
        status: "completed",
        completedAt: new Date(),
        currentAgent: null,
        executiveSummary: scoutOutput?.summary || strategistOutput?.summary || null,
        recommendedActions: strategistOutput?.actions || strategistOutput?.recommendations || null,
        draftEmail: composerOutput?.email || composerOutput?.content || composerOutput?.draft || null,
        auditScore: auditorOutput?.score || auditorOutput?.qualityScore || 75,
        auditVerdict: auditorOutput?.verdict || auditorOutput?.result || "approved",
        updatedAt: new Date(),
      })
      .where(eq(intelPipelineRuns.id, run.id));

    console.log(`[IntelPipeline] Processed item ${itemId}, run ${run.id} - ${messages.length} agents completed`);

    return { success: true, runId: run.id };

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);

    await db
      .update(intelPipelineRuns)
      .set({
        status: "failed",
        error: errorMessage,
        updatedAt: new Date(),
      })
      .where(eq(intelPipelineRuns.id, run.id));

    console.error(`[IntelPipeline] Failed to process item ${itemId}:`, errorMessage);
    return { success: false, runId: run.id, error: errorMessage };
  }
}

/**
 * Process all unprocessed items
 */
export async function processUnprocessedItems(limit: number = 10): Promise<{
  processed: number;
  successful: number;
  failed: number;
  results: Array<{ itemId: number; runId?: number; success: boolean; error?: string }>;
}> {
  const itemIds = await findUnprocessedItems(limit);
  const results: Array<{ itemId: number; runId?: number; success: boolean; error?: string }> = [];

  for (const itemId of itemIds) {
    const result = await processItem(itemId);
    results.push({ itemId, ...result });
    
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  return {
    processed: results.length,
    successful: results.filter(r => r.success).length,
    failed: results.filter(r => !r.success).length,
    results,
  };
}

/**
 * Get pipeline run with all agent outputs for an intel item
 */
export async function getPipelineResult(intelItemId: number): Promise<{
  run: typeof intelPipelineRuns.$inferSelect | null;
  outputs: typeof intelAgentOutputs.$inferSelect[];
} | null> {
  const [run] = await db
    .select()
    .from(intelPipelineRuns)
    .where(eq(intelPipelineRuns.intelItemId, intelItemId))
    .orderBy(desc(intelPipelineRuns.createdAt))
    .limit(1);

  if (!run) {
    return null;
  }

  const outputs = await db
    .select()
    .from(intelAgentOutputs)
    .where(eq(intelAgentOutputs.runId, run.id));

  return { run, outputs };
}

/**
 * Get all completed pipeline runs with their source items
 */
export async function getProcessedIntelItems(options: {
  limit?: number;
  onlyUnread?: boolean;
} = {}): Promise<Array<{
  item: typeof intelNewsItems.$inferSelect;
  run: typeof intelPipelineRuns.$inferSelect;
}>> {
  const { limit = 50, onlyUnread = false } = options;

  const query = db
    .select({
      item: intelNewsItems,
      run: intelPipelineRuns,
    })
    .from(intelPipelineRuns)
    .innerJoin(intelNewsItems, eq(intelPipelineRuns.intelItemId, intelNewsItems.id))
    .where(eq(intelPipelineRuns.status, "completed"))
    .orderBy(desc(intelPipelineRuns.completedAt))
    .limit(limit);

  const results = await query;

  if (onlyUnread) {
    return results.filter(r => !r.run.isRead);
  }

  return results;
}

/**
 * Mark a processed intel item as read
 */
export async function markPipelineRunRead(runId: number): Promise<void> {
  await db
    .update(intelPipelineRuns)
    .set({ isRead: true, updatedAt: new Date() })
    .where(eq(intelPipelineRuns.id, runId));
}
