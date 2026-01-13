import type { Express, Request, Response } from "express";
import { db } from "../db";
import { missionLogs } from "@shared/schema";
import { desc } from "drizzle-orm";
import { isAuthenticated, requireRole } from "../replit_integrations/auth";
import { asyncHandler } from "../middleware/errorHandler";
import { log } from "../lib/logger";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

export function registerFieldOpsRoutes(app: Express) {
  app.get("/api/mission-logs", isAuthenticated, requireRole("ceo", "production"), asyncHandler(async (req: Request, res: Response) => {
    try {
      const logs = await db.select().from(missionLogs).orderBy(desc(missionLogs.missionDate)).limit(100);
      res.json(logs);
    } catch (error: any) {
      log("ERROR: Error fetching mission logs - " + (error?.message || error));
      res.status(500).json({ message: error.message });
    }
  }));

  app.post("/api/mission-logs", isAuthenticated, requireRole("ceo", "production"), asyncHandler(async (req: Request, res: Response) => {
    try {
      const { projectId, notes } = req.body;
      const userId = (req.user as any)?.id?.toString() || "system";
      
      if (!projectId) {
        return res.status(400).json({ message: "projectId is required" });
      }
      
      const [newLog] = await db.insert(missionLogs).values({
        projectId: Number(projectId),
        techId: userId,
        notes: notes || null,
        missionDate: new Date(),
      }).returning();
      
      res.status(201).json(newLog);
    } catch (error: any) {
      log("ERROR: Error creating mission log - " + (error?.message || error));
      res.status(500).json({ message: error.message });
    }
  }));

  app.get("/api/field-translation/status", isAuthenticated, requireRole("ceo", "production"), asyncHandler(async (req: Request, res: Response) => {
    const hasOpenAI = !!process.env.AI_INTEGRATIONS_OPENAI_API_KEY;
    res.json({ enabled: hasOpenAI });
  }));

  app.post("/api/field-translation/translate", isAuthenticated, requireRole("ceo", "production"), asyncHandler(async (req: Request, res: Response) => {
    try {
      const { rawNote, projectId } = req.body;
      
      if (!rawNote || typeof rawNote !== "string") {
        return res.status(400).json({ message: "rawNote is required" });
      }

      if (!process.env.AI_INTEGRATIONS_OPENAI_API_KEY) {
        return res.status(503).json({ message: "AI translation service not configured" });
      }

      const systemPrompt = `You are a technical documentation assistant for a laser scanning and BIM company.

Transform messy field notes from technicians into:
1. A clear, professional summary suitable for client communication
2. Structured data extraction

Return ONLY valid JSON:
{
  "professionalSummary": "Polished version suitable for client emails",
  "technicalNotes": "Technical details for internal use",
  "extractedData": {
    "sqftScanned": number or null,
    "roomsScanned": number or null,
    "issuesFound": ["array of issues"],
    "equipmentUsed": ["array of equipment"],
    "durationEstimate": "estimated time spent"
  },
  "actionItems": ["any follow-up actions needed"],
  "clientReady": true/false
}`;

      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Transform these field notes:\n\n${rawNote}` }
        ],
        temperature: 0.3,
        response_format: { type: "json_object" }
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error("No response from AI");
      }

      const translation = JSON.parse(content);

      if (projectId) {
        await db.insert(missionLogs).values({
          projectId: Number(projectId),
          techId: (req.user as any)?.id?.toString() || "system",
          notes: translation.professionalSummary,
          missionDate: new Date(),
        });
      }

      res.json(translation);
    } catch (error: any) {
      log("ERROR: Field translation error - " + (error?.message || error));
      res.status(500).json({ message: error.message || "Translation failed" });
    }
  }));
}
