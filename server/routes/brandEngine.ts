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
import { db } from "../db";
import { brandValues, insertBrandValueSchema, standardDefinitions, insertStandardDefinitionSchema } from "@shared/schema";
import { eq } from "drizzle-orm";

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
    const definitions = await db.select().from(standardDefinitions).orderBy(standardDefinitions.category, standardDefinitions.term);
    return res.json({ success: true, data: definitions });
  })
);

router.post(
  "/standards",
  isAuthenticated,
  asyncHandler(async (req: Request, res: Response) => {
    const parsed = insertStandardDefinitionSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid request", details: parsed.error.flatten() });
    }
    const [standard] = await db.insert(standardDefinitions).values(parsed.data).returning();
    return res.json({ success: true, data: standard });
  })
);

router.put(
  "/standards/:id",
  isAuthenticated,
  asyncHandler(async (req: Request, res: Response) => {
    const id = parseInt(req.params.id);
    const { term, definition, guaranteeText, category, active } = req.body;
    const [updated] = await db
      .update(standardDefinitions)
      .set({ term, definition, guaranteeText, category, active })
      .where(eq(standardDefinitions.id, id))
      .returning();
    return res.json({ success: true, data: updated });
  })
);

router.delete(
  "/standards/:id",
  isAuthenticated,
  asyncHandler(async (req: Request, res: Response) => {
    const id = parseInt(req.params.id);
    await db.delete(standardDefinitions).where(eq(standardDefinitions.id, id));
    return res.json({ success: true });
  })
);

router.post(
  "/standards/seed",
  isAuthenticated,
  asyncHandler(async (req: Request, res: Response) => {
    const seedData = [
      { category: "scanning_loa", term: "LoA 40 (Measured Accuracy)", definition: "Tolerance: 0–1/8 inch. Point clouds generated directly from laser scans, providing high-precision scan data aligned with real-world conditions.", guaranteeText: "Validated via B-Validation (overlapping scan alignment) and C-Validation (control points aligned with survey data)." },
      { category: "scanning_loa", term: "LoA 30 (Modeled Accuracy)", definition: "Tolerance: 0–1/2 inch. BIM/CAD models derived from point clouds, ensuring modeled geometry reflects scanned data for construction-ready deliverables.", guaranteeText: null },
      { category: "scanning_devices", term: "Trimble X7", definition: "Accuracy: ±2mm. Features colorized scans and real-time registration for high-precision surveying.", guaranteeText: null },
      { category: "scanning_devices", term: "NavVis VLX 2", definition: "Accuracy: Up to 6mm. Mobile SLAM scanning for dynamic environments and large-scale capture.", guaranteeText: null },
      { category: "scanning_process", term: "Pre-Scan Protocol", definition: "Conduct site surveys to identify access points and conditions. Ensure comprehensive planning to cover all required areas.", guaranteeText: null },
      { category: "scanning_process", term: "On-Site Execution", definition: "Perform live review to verify completeness of scan coverage. Address missing data before leaving the site.", guaranteeText: null },
      { category: "modeling_lod", term: "LoD 200", definition: "Schematic massing, basic geometry for feasibility studies.", guaranteeText: null },
      { category: "modeling_lod", term: "LoD 300", definition: "Construction-ready elements, accurate geometry and dimensions.", guaranteeText: null },
      { category: "modeling_lod", term: "LoD 350", definition: "Detailed construction-ready models with joint and connection details.", guaranteeText: null },
      { category: "modeling_lod", term: "LoD 350+ (HBIM)", definition: "Custom detail for historic preservation, including carvings and ornate features.", guaranteeText: null },
      { category: "modeling_disciplines", term: "Architecture", definition: "Elements: Walls, doors, windows, ceilings, and floors. Special Features: Custom details for historic and high-profile projects (LoD 350+).", guaranteeText: null },
      { category: "modeling_disciplines", term: "Structure", definition: "Elements: Beams, columns, trusses, and foundations. Special Features: Detailed connections supporting structural analysis.", guaranteeText: null },
      { category: "modeling_disciplines", term: "MEPF", definition: "Mechanical, Electrical, Plumbing, Fire. Elements: Ducts, pipes, conduits, and sprinkler systems. Special Features: Fully clash-detectable layouts compatible with multidisciplinary coordination.", guaranteeText: null },
      { category: "modeling_disciplines", term: "Landscape", definition: "Elements: Topography, pathways, and foliage. Special Features: Georeferenced models for landscape design and historic preservation at LoD 350+.", guaranteeText: null },
      { category: "quality_control", term: "3-Stage QC Process", definition: "Stage 1: Dedicated BIM Modeling and CAD drafting teams. Stage 2: Dedicated BIM and CAD QC teams. Stage 3: Senior Engineer Review.", guaranteeText: "Every deliverable passes through our rigorous 3-stage quality control process." },
    ];
    
    for (const item of seedData) {
      const existing = await db.select().from(standardDefinitions).where(eq(standardDefinitions.term, item.term));
      if (existing.length === 0) {
        await db.insert(standardDefinitions).values(item);
      }
    }
    
    const allStandards = await db.select().from(standardDefinitions).orderBy(standardDefinitions.category, standardDefinitions.term);
    return res.json({ success: true, data: allStandards });
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

// Brand Values CRUD
router.get(
  "/values",
  isAuthenticated,
  asyncHandler(async (req: Request, res: Response) => {
    const values = await db.select().from(brandValues).orderBy(brandValues.category, brandValues.sortOrder);
    return res.json({ success: true, data: values });
  })
);

router.post(
  "/values",
  isAuthenticated,
  asyncHandler(async (req: Request, res: Response) => {
    const parsed = insertBrandValueSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid request", details: parsed.error.flatten() });
    }
    const [value] = await db.insert(brandValues).values(parsed.data).returning();
    return res.json({ success: true, data: value });
  })
);

router.put(
  "/values/:id",
  isAuthenticated,
  asyncHandler(async (req: Request, res: Response) => {
    const id = parseInt(req.params.id);
    const { title, content, category, sortOrder, isActive } = req.body;
    const [updated] = await db
      .update(brandValues)
      .set({ title, content, category, sortOrder, isActive, updatedAt: new Date() })
      .where(eq(brandValues.id, id))
      .returning();
    if (!updated) {
      return res.status(404).json({ error: "Brand value not found" });
    }
    return res.json({ success: true, data: updated });
  })
);

router.delete(
  "/values/:id",
  isAuthenticated,
  asyncHandler(async (req: Request, res: Response) => {
    const id = parseInt(req.params.id);
    await db.delete(brandValues).where(eq(brandValues.id, id));
    return res.json({ success: true });
  })
);

// Seed initial brand values if empty
router.post(
  "/values/seed",
  isAuthenticated,
  asyncHandler(async (req: Request, res: Response) => {
    const existing = await db.select().from(brandValues);
    if (existing.length > 0) {
      return res.json({ success: true, message: "Brand values already seeded", data: existing });
    }

    const initialValues = [
      { category: "mission", title: "Mission Statement", content: "To deliver trust, confidence, and integrity on every project.", sortOrder: 0 },
      { category: "vision", title: "Vision Statement", content: "Scan2Plan is the measure of excellence for Architects and Engineers.", sortOrder: 0 },
      { category: "core_values", title: "We Care", content: "Emphasizing empathy and client-first service.", sortOrder: 0 },
      { category: "core_values", title: "Can Do", content: "A solutions-driven mindset to overcome challenges.", sortOrder: 1 },
      { category: "core_values", title: "Continual Improvement", content: "Relentless pursuit of innovation and refinement.", sortOrder: 2 },
      { category: "three_uniques", title: "The Measure of Excellence", content: "Industry-leading LoD, LoA, accuracy, and quality control.", sortOrder: 0 },
      { category: "three_uniques", title: "Tailored to Your Needs", content: "Flexible deliverables customized for client workflows.", sortOrder: 1 },
      { category: "three_uniques", title: "Ready When You Are", content: "High-touch service with fast and consistent results.", sortOrder: 2 },
      { category: "guarantee", title: "Price Match", content: "We will match any price that aligns with our standards.", sortOrder: 0 },
      { category: "guarantee", title: "LoD & LoA Definition", content: "We define and deliver LoD & LoA on every project.", sortOrder: 1 },
      { category: "guarantee", title: "Unlimited Support", content: "Unlimited support within scope.", sortOrder: 2 },
      { category: "sustainability", title: "Environmental Impact", content: "Adaptive reuse minimizes waste, conserves embodied energy, and reduces emissions. At Scan2Plan, our services preserve cultural heritage while mitigating environmental impact.", sortOrder: 0 },
      { category: "empowerment", title: "Empower Visionaries", content: "We empower architects, designers, and innovators to focus on design, enabling greener futures.", sortOrder: 0 },
      { category: "empowerment", title: "Grant Access", content: "High-end BIM solutions accessible to all partners, fostering innovation in adaptive reuse.", sortOrder: 1 },
      { category: "empowerment", title: "Innovate to Collaborate", content: "Your success is our priority. We adapt, innovate, and exceed expectations.", sortOrder: 2 },
      { category: "taglines", title: "Primary Tagline", content: "The Measure of Excellence.", sortOrder: 0 },
      { category: "taglines", title: "Secondary Tagline", content: "Focus on Design.", sortOrder: 1 },
      { category: "taglines", title: "Tertiary Tagline", content: "Certainty lies in good data.", sortOrder: 2 },
    ];

    const inserted = await db.insert(brandValues).values(initialValues).returning();
    return res.json({ success: true, data: inserted });
  })
);

export default router;
