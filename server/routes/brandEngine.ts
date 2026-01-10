import { Router, Request, Response } from "express";
import { asyncHandler } from "../middleware/errorHandler";
import { isAuthenticated } from "../replit_integrations/auth";
import {
  generateExecutiveBrief,
  getAuditLogs,
  getStandardDefinitions,
  getRedLines,
  getPersonas,
  BuyerMode,
  PrimaryPain,
  AuthorMode,
} from "../lib/brand_engine";
import { z } from "zod";

const router = Router();

const GenerateRequestSchema = z.object({
  buyerType: z.enum(["A_Principal", "B_OwnerDev", "C_Unknown", "BP1", "BP2", "BP3", "BP4", "BP5", "BP6", "BP7", "BP8"]),
  painPoint: z.enum(["Rework_RFI", "ScheduleVolatility", "Inconsistency", "Terms_Risk"]),
  projectContext: z.string().min(10, "Project context must be at least 10 characters"),
  authorMode: z.enum(["Twain", "Fuller"]).optional().default("Twain"),
});

// Map BP codes to buyer modes for the engine
function mapBuyerType(buyerType: string): BuyerMode {
  const mapping: Record<string, BuyerMode> = {
    "BP1": "A_Principal",  // Engineer -> Principal
    "BP2": "B_OwnerDev",   // GC/Contractor -> Owner/Dev
    "BP3": "B_OwnerDev",   // Owner's Rep -> Owner/Dev
    "BP4": "A_Principal",  // PM -> Principal
    "BP5": "A_Principal",  // Architect -> Principal
    "BP6": "B_OwnerDev",   // Developer/Owner -> Owner/Dev
    "BP7": "A_Principal",  // Sustainability Lead -> Principal
    "BP8": "A_Principal",  // Tech Leader -> Principal
    "A_Principal": "A_Principal",
    "B_OwnerDev": "B_OwnerDev",
    "C_Unknown": "C_Unknown",
  };
  return mapping[buyerType] || "C_Unknown";
}

router.post(
  "/generate/executive-brief",
  isAuthenticated,
  asyncHandler(async (req: Request, res: Response) => {
    const parsed = GenerateRequestSchema.safeParse(req.body);
    
    if (!parsed.success) {
      return res.status(400).json({
        error: "Invalid request",
        details: parsed.error.flatten(),
      });
    }

    const { buyerType, painPoint, projectContext, authorMode } = parsed.data;

    const result = await generateExecutiveBrief(
      mapBuyerType(buyerType),
      painPoint as PrimaryPain,
      projectContext,
      authorMode as AuthorMode
    );

    return res.json({
      success: true,
      data: result,
    });
  })
);

router.get(
  "/audit-logs",
  isAuthenticated,
  asyncHandler(async (req: Request, res: Response) => {
    const limit = parseInt(req.query.limit as string) || 10;
    const logs = await getAuditLogs(limit);
    return res.json({ success: true, data: logs });
  })
);

router.get(
  "/standards",
  isAuthenticated,
  asyncHandler(async (req: Request, res: Response) => {
    const definitions = await getStandardDefinitions();
    return res.json({ success: true, data: definitions });
  })
);

router.get(
  "/red-lines",
  isAuthenticated,
  asyncHandler(async (req: Request, res: Response) => {
    const redLines = await getRedLines();
    return res.json({ success: true, data: redLines });
  })
);

router.get(
  "/personas",
  isAuthenticated,
  asyncHandler(async (req: Request, res: Response) => {
    const personas = await getPersonas();
    return res.json({ success: true, data: personas });
  })
);

export default router;
