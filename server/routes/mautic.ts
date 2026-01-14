import { Router, Request, Response } from "express";
import { asyncHandler } from "../middleware/errorHandler";
import { isAuthenticated, requireRole } from "../replit_integrations/auth";
import { db } from "../db";
import { leads } from "@shared/schema";
import { eq } from "drizzle-orm";
import { log } from "../lib/logger";

const router = Router();

// Mautic configuration
const MAUTIC_URL = process.env.MAUTIC_URL || "http://localhost:8080";
const MAUTIC_API_USER = process.env.MAUTIC_API_USER || "";
const MAUTIC_API_PASSWORD = process.env.MAUTIC_API_PASSWORD || "";

// Basic Auth header for Mautic API
function getMauticAuthHeader(): string {
    const credentials = Buffer.from(`${MAUTIC_API_USER}:${MAUTIC_API_PASSWORD}`).toString("base64");
    return `Basic ${credentials}`;
}

// ============================================
// CONFIGURATION CHECK
// ============================================

// GET /api/mautic/config - Check Mautic configuration
router.get(
    "/config",
    isAuthenticated,
    asyncHandler(async (req: Request, res: Response) => {
        const configured = !!(MAUTIC_API_USER && MAUTIC_API_PASSWORD);

        let connected = false;
        if (configured) {
            try {
                const response = await fetch(`${MAUTIC_URL}/api/contacts?limit=1`, {
                    headers: { Authorization: getMauticAuthHeader() },
                });
                connected = response.ok;
            } catch (e) {
                connected = false;
            }
        }

        return res.json({
            success: true,
            configured,
            connected,
            url: configured ? MAUTIC_URL : null,
        });
    })
);

// ============================================
// CONTACT SYNC
// ============================================

// POST /api/mautic/contacts/sync - Sync leads to Mautic as contacts
router.post(
    "/contacts/sync",
    isAuthenticated,
    requireRole("ceo", "sales"),
    asyncHandler(async (req: Request, res: Response) => {
        if (!MAUTIC_API_USER || !MAUTIC_API_PASSWORD) {
            return res.status(503).json({
                error: "Mautic not configured. Add MAUTIC_API_USER and MAUTIC_API_PASSWORD to environment."
            });
        }

        const { leadIds } = req.body;

        // If specific leadIds provided, sync those; otherwise sync active leads
        let leadsToSync;
        if (leadIds && Array.isArray(leadIds)) {
            leadsToSync = await db.select().from(leads).where(
                // Use inArray for multiple IDs if needed
                eq(leads.id, leadIds[0])
            );
        } else {
            // Sync leads with email that aren't synced yet
            leadsToSync = await db.select().from(leads).where(eq(leads.mauticContactId as any, null)).limit(100);
        }

        let synced = 0;
        let errors: string[] = [];

        for (const lead of leadsToSync) {
            if (!lead.contactEmail) continue;

            try {
                // Create or update contact in Mautic
                const response = await fetch(`${MAUTIC_URL}/api/contacts/new`, {
                    method: "POST",
                    headers: {
                        Authorization: getMauticAuthHeader(),
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        firstname: lead.contactName?.split(" ")[0] || "",
                        lastname: lead.contactName?.split(" ").slice(1).join(" ") || "",
                        email: lead.contactEmail,
                        phone: lead.contactPhone || "",
                        company: lead.clientName || "",
                        address1: lead.projectAddress || "",
                        // Custom fields for Scan2Plan
                        scan2plan_lead_id: lead.id,
                        scan2plan_project_name: lead.projectName || "",
                        scan2plan_deal_stage: lead.dealStage || "",
                        scan2plan_buyer_persona: lead.buyerPersona || "",
                    }),
                });

                if (response.ok) {
                    const data = await response.json();
                    // Update lead with Mautic contact ID
                    await db.update(leads)
                        .set({ mauticContactId: String(data.contact?.id) } as any)
                        .where(eq(leads.id, lead.id));
                    synced++;
                } else {
                    errors.push(`Lead ${lead.id}: ${response.statusText}`);
                }
            } catch (error) {
                errors.push(`Lead ${lead.id}: ${error}`);
            }
        }

        log(`[Mautic] Synced ${synced} contacts, ${errors.length} errors`);

        return res.json({
            success: true,
            synced,
            errors: errors.length > 0 ? errors : undefined,
            message: `Synced ${synced} contacts to Mautic`,
        });
    })
);

// ============================================
// CAMPAIGN TRIGGERS
// ============================================

// POST /api/mautic/campaigns/trigger - Trigger campaign for leads
router.post(
    "/campaigns/trigger",
    isAuthenticated,
    requireRole("ceo", "sales"),
    asyncHandler(async (req: Request, res: Response) => {
        if (!MAUTIC_API_USER || !MAUTIC_API_PASSWORD) {
            return res.status(503).json({ error: "Mautic not configured" });
        }

        const { campaignId, contactIds, eventName } = req.body;

        if (!campaignId || !contactIds || !Array.isArray(contactIds)) {
            return res.status(400).json({
                error: "campaignId and contactIds array required"
            });
        }

        let triggered = 0;

        for (const contactId of contactIds) {
            try {
                // Add contact to campaign
                await fetch(`${MAUTIC_URL}/api/campaigns/${campaignId}/contact/${contactId}/add`, {
                    method: "POST",
                    headers: { Authorization: getMauticAuthHeader() },
                });
                triggered++;
            } catch (error) {
                log(`ERROR: Failed to trigger campaign for contact ${contactId}: ${error}`);
            }
        }

        log(`[Mautic] Triggered campaign ${campaignId} for ${triggered} contacts`);

        return res.json({
            success: true,
            triggered,
            campaignId,
            message: `Triggered campaign for ${triggered} contacts`,
        });
    })
);

// ============================================
// STAT BOMB AUTOMATION
// ============================================

// POST /api/mautic/stat-bomb - Send persona-targeted "Stat Bomb" content
router.post(
    "/stat-bomb",
    isAuthenticated,
    requireRole("ceo", "sales"),
    asyncHandler(async (req: Request, res: Response) => {
        if (!MAUTIC_API_USER || !MAUTIC_API_PASSWORD) {
            return res.status(503).json({ error: "Mautic not configured" });
        }

        const { buyerPersona, content, subject } = req.body;

        if (!buyerPersona || !content || !subject) {
            return res.status(400).json({
                error: "buyerPersona, subject, and content required"
            });
        }

        // Find leads with matching persona that have Mautic contact IDs
        const matchingLeads = await db.select()
            .from(leads)
            .where(eq(leads.buyerPersona, buyerPersona));

        const contactIds = matchingLeads
            .filter((l: any) => l.mauticContactId)
            .map((l: any) => l.mauticContactId);

        if (contactIds.length === 0) {
            return res.status(404).json({
                error: `No synced contacts found for persona ${buyerPersona}`
            });
        }

        // Create a segment email via Mautic API
        try {
            // First create an email
            const emailResponse = await fetch(`${MAUTIC_URL}/api/emails/new`, {
                method: "POST",
                headers: {
                    Authorization: getMauticAuthHeader(),
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    name: `Stat Bomb - ${buyerPersona} - ${new Date().toISOString().split("T")[0]}`,
                    subject,
                    customHtml: content,
                    emailType: "list",
                    isPublished: true,
                }),
            });

            if (!emailResponse.ok) {
                throw new Error(`Failed to create email: ${emailResponse.statusText}`);
            }

            const emailData = await emailResponse.json();

            log(`[Mautic] Created Stat Bomb email ${emailData.email?.id} for persona ${buyerPersona}`);

            return res.json({
                success: true,
                emailId: emailData.email?.id,
                targetedContacts: contactIds.length,
                persona: buyerPersona,
                message: `Stat Bomb email created for ${contactIds.length} ${buyerPersona} contacts`,
            });
        } catch (error) {
            log(`ERROR: Stat Bomb creation failed: ${error}`);
            return res.status(500).json({ error: "Failed to create Stat Bomb email" });
        }
    })
);

// ============================================
// LIST CAMPAIGNS
// ============================================

// GET /api/mautic/campaigns - List available campaigns
router.get(
    "/campaigns",
    isAuthenticated,
    asyncHandler(async (req: Request, res: Response) => {
        if (!MAUTIC_API_USER || !MAUTIC_API_PASSWORD) {
            return res.status(503).json({ error: "Mautic not configured" });
        }

        try {
            const response = await fetch(`${MAUTIC_URL}/api/campaigns`, {
                headers: { Authorization: getMauticAuthHeader() },
            });

            if (!response.ok) {
                throw new Error(response.statusText);
            }

            const data = await response.json();

            return res.json({
                success: true,
                campaigns: data.campaigns || [],
            });
        } catch (error) {
            log(`ERROR: Failed to list campaigns: ${error}`);
            return res.status(500).json({ error: "Failed to list campaigns" });
        }
    })
);

export default router;
