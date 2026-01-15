import { Router, Request, Response } from "express";
import { db } from "../db";
import {
    rfpSubmissions,
    leads,
    cpqQuotes,
    generatedProposals,
    type RfpStatus,
    RFP_STATUSES
} from "@shared/schema";
import { eq, desc, and, inArray } from "drizzle-orm";
import { isAuthenticated, requireRole } from "../replit_integrations/auth";
import { storage } from "../storage";
import { log } from "../lib/logger";
import { aiClient } from "../services/ai/aiClient";
import { qualifyRfp, type QualificationResult, type ExtractedRfpData } from "../services/rfpQualification";

const router = Router();

// ============================================
// RFP UPLOAD & EXTRACTION
// ============================================

// POST /api/rfp/upload - Upload RFP for processing
router.post("/upload", isAuthenticated, async (req: Request, res: Response) => {
    try {
        const { fileName, fileUrl, fileType, fileContent } = req.body;

        if (!fileName) {
            return res.status(400).json({ message: "fileName required" });
        }

        // Create RFP submission record
        const [rfp] = await db.insert(rfpSubmissions).values({
            status: "pending" as RfpStatus,
            originalFileName: fileName,
            fileUrl,
            fileType: fileType || "pdf",
            uploadedBy: (req.user as any)?.claims?.email || "unknown",
        }).returning();

        // Start async extraction if content provided
        if (fileContent) {
            // Update status to extracting
            await db.update(rfpSubmissions)
                .set({ status: "extracting" as RfpStatus })
                .where(eq(rfpSubmissions.id, rfp.id));

            // Extract data using AI
            try {
                const extractedData = await extractRfpData(fileContent, fileName);

                // Run S2P Scoping Bot qualification
                const qualification = await qualifyRfp(extractedData as ExtractedRfpData, fileContent);

                // Determine status based on qualification
                let newStatus: RfpStatus = "extracted";
                if (qualification.status === "disqualified") {
                    newStatus = "rejected"; // Auto-reject disqualified RFPs
                }

                await db.update(rfpSubmissions)
                    .set({
                        status: newStatus,
                        extractedData: {
                            ...extractedData,
                            qualification: {
                                status: qualification.status,
                                confidenceScore: qualification.confidenceScore,
                                priorityScore: qualification.priorityScore,
                                recommendationTier: qualification.recommendationTier,
                                rationale: qualification.rationale,
                                flags: qualification.flags,
                                preferredKeywords: qualification.preferredKeywordsFound,
                                disqualifyingKeywords: qualification.disqualifyingKeywordsFound,
                                disqualificationReason: qualification.disqualificationReason,
                            }
                        },
                        updatedAt: new Date()
                    })
                    .where(eq(rfpSubmissions.id, rfp.id));

                log(`[RFP] Qualified ${rfp.id}: ${qualification.status} (confidence: ${qualification.confidenceScore}%, priority: ${qualification.priorityScore})`);
            } catch (extractError) {
                log(`ERROR: RFP extraction failed for ${rfp.id}: ${extractError}`);
                await db.update(rfpSubmissions)
                    .set({ status: "pending" as RfpStatus })
                    .where(eq(rfpSubmissions.id, rfp.id));
            }
        }

        res.status(201).json(rfp);
    } catch (error) {
        log(`ERROR: RFP upload failed: ${error}`);
        res.status(500).json({ message: "Failed to upload RFP" });
    }
});

// POST /api/rfp/:id/extract - Manually trigger extraction
router.post("/:id/extract", isAuthenticated, async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { content } = req.body;

        if (!content) {
            return res.status(400).json({ message: "content required" });
        }

        const [rfp] = await db.select().from(rfpSubmissions).where(eq(rfpSubmissions.id, parseInt(id)));
        if (!rfp) {
            return res.status(404).json({ message: "RFP not found" });
        }

        await db.update(rfpSubmissions)
            .set({ status: "extracting" as RfpStatus })
            .where(eq(rfpSubmissions.id, parseInt(id)));

        const extractedData = await extractRfpData(content, rfp.originalFileName || "RFP");

        // Run S2P Scoping Bot qualification
        const qualification = await qualifyRfp(extractedData as ExtractedRfpData, content);

        // Determine status based on qualification
        let newStatus: RfpStatus = "extracted";
        if (qualification.status === "disqualified") {
            newStatus = "rejected";
        }

        const [updated] = await db.update(rfpSubmissions)
            .set({
                status: newStatus,
                extractedData: {
                    ...extractedData,
                    qualification: {
                        status: qualification.status,
                        confidenceScore: qualification.confidenceScore,
                        priorityScore: qualification.priorityScore,
                        recommendationTier: qualification.recommendationTier,
                        rationale: qualification.rationale,
                        flags: qualification.flags,
                        preferredKeywords: qualification.preferredKeywordsFound,
                        disqualifyingKeywords: qualification.disqualifyingKeywordsFound,
                        disqualificationReason: qualification.disqualificationReason,
                    }
                },
                updatedAt: new Date()
            })
            .where(eq(rfpSubmissions.id, parseInt(id)))
            .returning();

        log(`[RFP] Manual extraction qualified ${id}: ${qualification.status}`);

        res.json(updated);
    } catch (error) {
        log(`ERROR: RFP extraction failed: ${error}`);
        res.status(500).json({ message: "Failed to extract RFP data" });
    }
});

// ============================================
// CEO REVIEW QUEUE
// ============================================

// GET /api/rfp/queue - Get RFPs pending review
router.get("/queue", isAuthenticated, requireRole("ceo"), async (req: Request, res: Response) => {
    try {
        const { status } = req.query;

        let query = db.select().from(rfpSubmissions);

        if (status) {
            query = query.where(eq(rfpSubmissions.status, status as RfpStatus)) as typeof query;
        } else {
            // Default: show items needing attention
            query = query.where(
                inArray(rfpSubmissions.status, ["extracted", "proposal_ready"])
            ) as typeof query;
        }

        const rfps = await query.orderBy(desc(rfpSubmissions.createdAt));

        res.json(rfps);
    } catch (error) {
        log(`ERROR: Failed to fetch RFP queue: ${error}`);
        res.status(500).json({ message: "Failed to fetch queue" });
    }
});

// GET /api/rfp/:id - Get single RFP details
router.get("/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        const [rfp] = await db.select().from(rfpSubmissions).where(eq(rfpSubmissions.id, parseInt(id)));
        if (!rfp) {
            return res.status(404).json({ message: "RFP not found" });
        }

        // Include related entities if they exist
        let lead = null;
        let proposal = null;

        if (rfp.generatedLeadId) {
            [lead] = await db.select().from(leads).where(eq(leads.id, rfp.generatedLeadId));
        }
        if (rfp.generatedProposalId) {
            [proposal] = await db.select().from(generatedProposals).where(eq(generatedProposals.id, rfp.generatedProposalId));
        }

        res.json({ ...rfp, lead, proposal });
    } catch (error) {
        log(`ERROR: Failed to fetch RFP: ${error}`);
        res.status(500).json({ message: "Failed to fetch RFP" });
    }
});

// ============================================
// PROPOSAL GENERATION
// ============================================

// POST /api/rfp/:id/generate-proposal - Generate proposal from extracted data
router.post("/:id/generate-proposal", isAuthenticated, requireRole("ceo", "sales"), async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        const [rfp] = await db.select().from(rfpSubmissions).where(eq(rfpSubmissions.id, parseInt(id)));
        if (!rfp) {
            return res.status(404).json({ message: "RFP not found" });
        }

        if (!rfp.extractedData) {
            return res.status(400).json({ message: "RFP data not extracted yet" });
        }

        await db.update(rfpSubmissions)
            .set({ status: "generating" as RfpStatus })
            .where(eq(rfpSubmissions.id, parseInt(id)));

        const extracted = rfp.extractedData as any;

        // Step 1: Create lead from extracted data
        const [lead] = await db.insert(leads).values({
            clientName: extracted.clientName || "RFP Response",
            projectName: extracted.projectName || rfp.originalFileName,
            projectAddress: extracted.projectAddress,
            buildingType: extracted.buildingType,
            sqft: extracted.sqft,
            scope: extracted.scope,
            disciplines: extracted.disciplines?.join(", "),
            contactName: extracted.contacts?.[0]?.name,
            contactEmail: extracted.contacts?.[0]?.email,
            contactPhone: extracted.contacts?.[0]?.phone,
            dealStage: "Proposal",
            notes: `Auto-generated from RFP: ${rfp.originalFileName}\n\nRequirements:\n${extracted.requirements?.join("\n- ") || ""}`,
        }).returning();

        // Step 2: Create generated proposal
        const [proposal] = await db.insert(generatedProposals).values({
            leadId: lead.id,
            name: `RFP Response - ${extracted.projectName || rfp.originalFileName}`,
            status: "draft",
            sections: [],
            createdBy: (req.user as any)?.claims?.email || "system",
        }).returning();

        // Step 3: Update RFP with references
        const [updated] = await db.update(rfpSubmissions)
            .set({
                status: "proposal_ready" as RfpStatus,
                generatedLeadId: lead.id,
                generatedProposalId: proposal.id,
                updatedAt: new Date()
            })
            .where(eq(rfpSubmissions.id, parseInt(id)))
            .returning();

        res.json({
            rfp: updated,
            lead,
            proposal,
            message: "Proposal generated successfully. Ready for CEO review."
        });
    } catch (error) {
        log(`ERROR: Failed to generate proposal from RFP: ${error}`);
        res.status(500).json({ message: "Failed to generate proposal" });
    }
});

// ============================================
// APPROVAL WORKFLOW
// ============================================

// POST /api/rfp/:id/approve - CEO approves proposal
router.post("/:id/approve", isAuthenticated, requireRole("ceo"), async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { notes } = req.body;

        const [rfp] = await db.select().from(rfpSubmissions).where(eq(rfpSubmissions.id, parseInt(id)));
        if (!rfp) {
            return res.status(404).json({ message: "RFP not found" });
        }

        if (rfp.status !== "proposal_ready") {
            return res.status(400).json({ message: "RFP not ready for approval" });
        }

        const [updated] = await db.update(rfpSubmissions)
            .set({
                status: "approved" as RfpStatus,
                reviewedBy: (req.user as any)?.claims?.email || "ceo",
                reviewedAt: new Date(),
                reviewNotes: notes,
                updatedAt: new Date()
            })
            .where(eq(rfpSubmissions.id, parseInt(id)))
            .returning();

        // Update proposal status
        if (rfp.generatedProposalId) {
            await db.update(generatedProposals)
                .set({ status: "generated" })
                .where(eq(generatedProposals.id, rfp.generatedProposalId));
        }

        res.json({ rfp: updated, message: "RFP approved. Ready to send." });
    } catch (error) {
        log(`ERROR: Failed to approve RFP: ${error}`);
        res.status(500).json({ message: "Failed to approve" });
    }
});

// POST /api/rfp/:id/reject - CEO rejects proposal
router.post("/:id/reject", isAuthenticated, requireRole("ceo"), async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { notes } = req.body;

        if (!notes) {
            return res.status(400).json({ message: "Rejection notes required" });
        }

        const [updated] = await db.update(rfpSubmissions)
            .set({
                status: "rejected" as RfpStatus,
                reviewedBy: (req.user as any)?.claims?.email || "ceo",
                reviewedAt: new Date(),
                reviewNotes: notes,
                updatedAt: new Date()
            })
            .where(eq(rfpSubmissions.id, parseInt(id)))
            .returning();

        res.json({ rfp: updated, message: "RFP rejected." });
    } catch (error) {
        log(`ERROR: Failed to reject RFP: ${error}`);
        res.status(500).json({ message: "Failed to reject" });
    }
});

// ============================================
// SEND PROPOSAL
// ============================================

// POST /api/rfp/:id/send - Send approved proposal via PandaDoc
router.post("/:id/send", isAuthenticated, requireRole("ceo"), async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { recipientEmail, message } = req.body;

        const [rfp] = await db.select().from(rfpSubmissions).where(eq(rfpSubmissions.id, parseInt(id)));
        if (!rfp) {
            return res.status(404).json({ message: "RFP not found" });
        }

        if (rfp.status !== "approved") {
            return res.status(400).json({ message: "RFP must be approved before sending" });
        }

        const extracted = rfp.extractedData as any;
        const toEmail = recipientEmail || extracted?.contacts?.[0]?.email;

        if (!toEmail) {
            return res.status(400).json({ message: "Recipient email required" });
        }

        // TODO: Integrate with existing PandaDoc flow
        // For now, mark as sent with placeholder
        const [updated] = await db.update(rfpSubmissions)
            .set({
                status: "sent" as RfpStatus,
                sentAt: new Date(),
                sentTo: toEmail,
                updatedAt: new Date()
            })
            .where(eq(rfpSubmissions.id, parseInt(id)))
            .returning();

        // Update proposal status
        if (rfp.generatedProposalId) {
            await db.update(generatedProposals)
                .set({ status: "sent" })
                .where(eq(generatedProposals.id, rfp.generatedProposalId));
        }

        log(`[RFP] Proposal sent for RFP ${id} to ${toEmail}`);

        res.json({
            rfp: updated,
            message: `Proposal sent to ${toEmail}`
        });
    } catch (error) {
        log(`ERROR: Failed to send RFP proposal: ${error}`);
        res.status(500).json({ message: "Failed to send" });
    }
});

// ============================================
// STATS & LISTING
// ============================================

// GET /api/rfp/stats - Get RFP pipeline stats
router.get("/stats", isAuthenticated, async (req: Request, res: Response) => {
    try {
        const all = await db.select().from(rfpSubmissions);

        const stats = {
            total: all.length,
            pending: all.filter(r => r.status === "pending").length,
            extracted: all.filter(r => r.status === "extracted").length,
            proposalReady: all.filter(r => r.status === "proposal_ready").length,
            approved: all.filter(r => r.status === "approved").length,
            sent: all.filter(r => r.status === "sent").length,
            rejected: all.filter(r => r.status === "rejected").length,
        };

        res.json(stats);
    } catch (error) {
        log(`ERROR: Failed to fetch RFP stats: ${error}`);
        res.status(500).json({ message: "Failed to fetch stats" });
    }
});

// GET /api/rfp - List all RFPs
router.get("/", isAuthenticated, async (req: Request, res: Response) => {
    try {
        const { limit = "50" } = req.query;

        const rfps = await db.select()
            .from(rfpSubmissions)
            .orderBy(desc(rfpSubmissions.createdAt))
            .limit(parseInt(limit as string));

        res.json(rfps);
    } catch (error) {
        log(`ERROR: Failed to list RFPs: ${error}`);
        res.status(500).json({ message: "Failed to list RFPs" });
    }
});

// ============================================
// AI EXTRACTION HELPER
// ============================================

async function extractRfpData(content: string, fileName: string) {
    const systemPrompt = `You are an expert at extracting structured data from RFPs (Request for Proposals) for a laser scanning and BIM services company.

Extract the following information and return as JSON:
- projectName: Name of the project
- clientName: Name of the client/organization
- projectAddress: Project location/address
- scope: Brief description of work scope
- requirements: Array of specific requirements
- deadline: Submission deadline if mentioned
- budget: Budget range if mentioned
- contacts: Array of {name, email, phone} for contacts
- buildingType: Type of building (Commercial, Residential, Educational, Healthcare, etc.)
- sqft: Square footage if mentioned
- disciplines: Array of required disciplines (Architectural, MEP, Structural, etc.)
- specialRequirements: Any special requirements (LOD levels, software, certifications)

Return ONLY valid JSON, no markdown.`;

    const userPrompt = `Extract RFP data from this document (${fileName}):\n\n${content.substring(0, 8000)}`;

    const response = await aiClient.generateText(systemPrompt, userPrompt);

    if (!response) {
        return {
            projectName: fileName.replace(/\.(pdf|docx|doc)$/i, ""),
            requirements: [],
            contacts: []
        };
    }

    try {
        // Clean up response and parse JSON
        let jsonStr = response.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
        return JSON.parse(jsonStr);
    } catch (e) {
        log(`WARN: Failed to parse RFP extraction JSON: ${e}`);
        return {
            projectName: fileName.replace(/\.(pdf|docx|doc)$/i, ""),
            requirements: [],
            contacts: []
        };
    }
}

export default router;
