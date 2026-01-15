/**
 * Trigger Pod Ingestion Service
 * 
 * Handles data ingestion from three trigger pods:
 * - P9.1 Permit Trigger (NYC DOB, Boston ISD)
 * - P16 Compliance Trigger (LL11, LL87, LL97, BERDO)
 * - P17 Procurement Trigger (PASSPort, NYSCR, DASNY)
 */

import { db } from "../db";
import { intelNewsItems, intelFeedSources, type IntelNewsType, type IntelRegion } from "@shared/schema";
import { eq } from "drizzle-orm";
import { log } from "../lib/logger";
import { qualifyRfp, type ExtractedRfpData } from "./rfpQualification";

// ============================================
// NYC DOB SOCRATA API ENDPOINTS
// ============================================

const NYC_DOB_ENDPOINTS = {
    // BIS - Legacy filings (excludes DOB NOW)
    bis: "https://data.cityofnewyork.us/resource/ic3t-wcy2.json",
    // DOB NOW - Modern e-filings
    dobNow: "https://data.cityofnewyork.us/resource/w9ak-ipjd.json",
    // PLUTO - Building data
    pluto: "https://data.cityofnewyork.us/resource/64uk-42ks.json",
    // LL87 Energy Audit
    ll87: "https://data.cityofnewyork.us/resource/au6c-jqvf.json",
    // Facades (LL11/FISP)
    facades: "https://data.cityofnewyork.us/resource/xubg-57si.json",
};

const BOSTON_ENDPOINTS = {
    permits: "https://data.boston.gov/api/3/action/datastore_search",
    berdo: "https://data.boston.gov/api/3/action/datastore_search",
};

// ============================================
// INTERFACES
// ============================================

interface PermitFiling {
    job__?: string;
    job_type?: string;
    latest_action_date?: string;
    house__?: string;
    street_name?: string;
    borough?: string;
    applicant_first_name?: string;
    applicant_last_name?: string;
    applicant_business_name?: string;
    owner_business_name?: string;
    existingdwellingunits?: string;
    proposeddwellingunits?: string;
    existingoccupancy?: string;
    proposedoccupancy?: string;
    [key: string]: any;
}

interface SyncResult {
    success: boolean;
    message: string;
    itemsProcessed: number;
    itemsAdded: number;
    errors: string[];
}

// ============================================
// PERMIT TRIGGER (P9.1)
// ============================================

/**
 * Fetch NYC DOB filings for the last N days
 * Filters to A1 (major alterations) and NB (new buildings) job types
 */
export async function syncNycDobFilings(
    daysBack: number = 7,
    jobTypes: string[] = ["A1", "NB"]
): Promise<SyncResult> {
    const errors: string[] = [];
    let itemsAdded = 0;

    try {
        // Calculate date for filtering
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - daysBack);
        const dateStr = startDate.toISOString().split("T")[0];

        // Build SoQL query for BIS
        const bisUrl = new URL(NYC_DOB_ENDPOINTS.bis);
        bisUrl.searchParams.set("$where", `latest_action_date >= '${dateStr}' AND job_type IN ('${jobTypes.join("','")}')`);
        bisUrl.searchParams.set("$select", "job__,job_type,latest_action_date,house__,street_name,borough,applicant_business_name,applicant_first_name,applicant_last_name,owner_business_name");
        bisUrl.searchParams.set("$order", "latest_action_date DESC");
        bisUrl.searchParams.set("$limit", "500");

        log(`[TriggerPod] Fetching NYC DOB BIS filings since ${dateStr}`);

        const response = await fetch(bisUrl.toString());
        if (!response.ok) {
            throw new Error(`NYC DOB API failed: ${response.status} ${response.statusText}`);
        }

        const filings: PermitFiling[] = await response.json();
        log(`[TriggerPod] Found ${filings.length} permit filings`);

        for (const filing of filings) {
            try {
                const address = `${filing.house__ || ""} ${filing.street_name || ""}, ${filing.borough || "NY"}`.trim();
                const applicant = filing.applicant_business_name ||
                    `${filing.applicant_first_name || ""} ${filing.applicant_last_name || ""}`.trim() ||
                    "Unknown";

                // Check for duplicates by job number
                const existingItems = await db
                    .select()
                    .from(intelNewsItems)
                    .where(eq(intelNewsItems.sourceUrl, `nyc-dob-${filing.job__}`))
                    .limit(1);

                if (existingItems.length > 0) continue;

                // Create qualification context
                const extractedData: ExtractedRfpData = {
                    projectName: `${filing.job_type} - ${address}`,
                    projectAddress: address,
                    clientName: filing.owner_business_name || applicant,
                    buildingType: filing.proposedoccupancy || filing.existingoccupancy,
                };

                // Run through S2P Scoping Bot
                const qualification = await qualifyRfp(extractedData);

                // Only add if not disqualified
                if (qualification.status !== "disqualified") {
                    await db.insert(intelNewsItems).values({
                        type: "permit" as IntelNewsType,
                        title: `[${filing.job_type}] ${address}`,
                        summary: `Applicant: ${applicant}. Owner: ${filing.owner_business_name || "N/A"}. Filed: ${filing.latest_action_date}`,
                        sourceUrl: `nyc-dob-${filing.job__}`,
                        sourceName: "NYC DOB BIS",
                        region: "Northeast" as IntelRegion,
                        relevanceScore: qualification.priorityScore,
                        metadata: {
                            jobNumber: filing.job__,
                            jobType: filing.job_type,
                            applicant,
                            owner: filing.owner_business_name,
                            qualification: {
                                status: qualification.status,
                                confidenceScore: qualification.confidenceScore,
                                priorityScore: qualification.priorityScore,
                                tier: qualification.recommendationTier,
                            }
                        },
                        createdBy: "trigger-pod",
                    });
                    itemsAdded++;
                }
            } catch (e: any) {
                errors.push(`Filing ${filing.job__}: ${e.message}`);
            }
        }

        return {
            success: true,
            message: `Synced ${filings.length} NYC DOB filings, added ${itemsAdded} qualified leads`,
            itemsProcessed: filings.length,
            itemsAdded,
            errors,
        };
    } catch (error: any) {
        log(`[TriggerPod] Error syncing NYC DOB: ${error.message}`);
        return {
            success: false,
            message: error.message,
            itemsProcessed: 0,
            itemsAdded: 0,
            errors: [error.message],
        };
    }
}

// ============================================
// COMPLIANCE TRIGGER (P16)
// ============================================

/**
 * Fetch LL11 facade compliance issues (UNSAFE or No Report Filed)
 */
export async function syncLl11Compliance(): Promise<SyncResult> {
    const errors: string[] = [];
    let itemsAdded = 0;

    try {
        const url = new URL(NYC_DOB_ENDPOINTS.facades);
        url.searchParams.set("$where", "status IN ('UNSAFE', 'NO REPORT FILED')");
        url.searchParams.set("$select", "bin,bbl,address,block,lot,status,last_status_date");
        url.searchParams.set("$order", "last_status_date DESC");
        url.searchParams.set("$limit", "200");

        log(`[TriggerPod] Fetching LL11 facade compliance issues`);

        const response = await fetch(url.toString());
        if (!response.ok) {
            throw new Error(`LL11 API failed: ${response.status}`);
        }

        const buildings = await response.json();
        log(`[TriggerPod] Found ${buildings.length} LL11 compliance issues`);

        for (const building of buildings) {
            try {
                const address = building.address || `Block ${building.block}, Lot ${building.lot}`;
                const sourceId = `ll11-${building.bin || building.bbl}`;

                const existing = await db
                    .select()
                    .from(intelNewsItems)
                    .where(eq(intelNewsItems.sourceUrl, sourceId))
                    .limit(1);

                if (existing.length > 0) continue;

                await db.insert(intelNewsItems).values({
                    type: "compliance" as IntelNewsType,
                    title: `[LL11 ${building.status}] ${address}`,
                    summary: `Facade compliance issue: ${building.status}. Last status: ${building.last_status_date}`,
                    sourceUrl: sourceId,
                    sourceName: "NYC DOB LL11/FISP",
                    region: "Northeast" as IntelRegion,
                    relevanceScore: building.status === "UNSAFE" ? 90 : 75,
                    metadata: {
                        bin: building.bin,
                        bbl: building.bbl,
                        status: building.status,
                        lastStatusDate: building.last_status_date,
                        law: "LL11",
                        triggerType: "compliance",
                    },
                    createdBy: "trigger-pod",
                });
                itemsAdded++;
            } catch (e: any) {
                errors.push(`Building ${building.bin}: ${e.message}`);
            }
        }

        return {
            success: true,
            message: `Synced ${buildings.length} LL11 issues, added ${itemsAdded} new`,
            itemsProcessed: buildings.length,
            itemsAdded,
            errors,
        };
    } catch (error: any) {
        log(`[TriggerPod] Error syncing LL11: ${error.message}`);
        return {
            success: false,
            message: error.message,
            itemsProcessed: 0,
            itemsAdded: 0,
            errors: [error.message],
        };
    }
}

/**
 * Fetch LL87 energy audit data and compute due dates
 */
export async function syncLl87EnergyAudits(): Promise<SyncResult> {
    const errors: string[] = [];
    let itemsAdded = 0;

    try {
        const url = new URL(NYC_DOB_ENDPOINTS.ll87);
        url.searchParams.set("$select", "bbl,address,last_eer_filing_year");
        url.searchParams.set("$order", "last_eer_filing_year ASC");
        url.searchParams.set("$limit", "300");

        log(`[TriggerPod] Fetching LL87 energy audit data`);

        const response = await fetch(url.toString());
        if (!response.ok) {
            throw new Error(`LL87 API failed: ${response.status}`);
        }

        const buildings = await response.json();
        const currentYear = new Date().getFullYear();

        for (const building of buildings) {
            try {
                const lastEerYear = parseInt(building.last_eer_filing_year) || 0;
                const dueYear = lastEerYear + 10;
                const yearsUntilDue = dueYear - currentYear;

                // Only interested in buildings due within 12 months or overdue
                if (yearsUntilDue > 1) continue;

                const sourceId = `ll87-${building.bbl}`;
                const existing = await db
                    .select()
                    .from(intelNewsItems)
                    .where(eq(intelNewsItems.sourceUrl, sourceId))
                    .limit(1);

                if (existing.length > 0) continue;

                const status = yearsUntilDue <= 0 ? "OVERDUE" : "DUE_SOON";
                const urgency = yearsUntilDue <= 0 ? 95 : 80;

                await db.insert(intelNewsItems).values({
                    type: "compliance" as IntelNewsType,
                    title: `[LL87 ${status}] ${building.address}`,
                    summary: `Energy audit ${status.toLowerCase().replace("_", " ")}. Last EER: ${lastEerYear}. Due: ${dueYear}`,
                    sourceUrl: sourceId,
                    sourceName: "NYC DOB LL87",
                    region: "Northeast" as IntelRegion,
                    relevanceScore: urgency,
                    metadata: {
                        bbl: building.bbl,
                        lastEerYear,
                        dueYear,
                        status,
                        law: "LL87",
                        triggerType: "compliance",
                    },
                    createdBy: "trigger-pod",
                });
                itemsAdded++;
            } catch (e: any) {
                errors.push(`Building ${building.bbl}: ${e.message}`);
            }
        }

        return {
            success: true,
            message: `Processed ${buildings.length} LL87 records, added ${itemsAdded} due/overdue`,
            itemsProcessed: buildings.length,
            itemsAdded,
            errors,
        };
    } catch (error: any) {
        log(`[TriggerPod] Error syncing LL87: ${error.message}`);
        return {
            success: false,
            message: error.message,
            itemsProcessed: 0,
            itemsAdded: 0,
            errors: [error.message],
        };
    }
}

// ============================================
// SYNC DISPATCHER
// ============================================

export type TriggerPodSourceType =
    | "nyc_dob_bis"
    | "nyc_dob_now"
    | "nyc_ll11"
    | "nyc_ll87"
    | "nyc_ll97"
    | "boston_isd"
    | "boston_berdo"
    | "cambridge_beudo"
    | "nyc_passport"
    | "nys_contract_reporter"
    | "dasny";

/**
 * Dispatch sync based on source type
 */
export async function syncTriggerPodSource(sourceType: TriggerPodSourceType): Promise<SyncResult> {
    switch (sourceType) {
        case "nyc_dob_bis":
            return syncNycDobFilings(7, ["A1", "NB"]);
        case "nyc_ll11":
            return syncLl11Compliance();
        case "nyc_ll87":
            return syncLl87EnergyAudits();
        default:
            return {
                success: false,
                message: `Source type ${sourceType} not yet implemented`,
                itemsProcessed: 0,
                itemsAdded: 0,
                errors: [`Unimplemented: ${sourceType}`],
            };
    }
}

/**
 * Run all trigger pod syncs
 */
export async function syncAllTriggerPods(): Promise<{
    total: SyncResult;
    bySource: Record<string, SyncResult>;
}> {
    const sources: TriggerPodSourceType[] = ["nyc_dob_bis", "nyc_ll11", "nyc_ll87"];
    const results: Record<string, SyncResult> = {};
    let totalProcessed = 0;
    let totalAdded = 0;
    const allErrors: string[] = [];

    for (const source of sources) {
        const result = await syncTriggerPodSource(source);
        results[source] = result;
        totalProcessed += result.itemsProcessed;
        totalAdded += result.itemsAdded;
        allErrors.push(...result.errors);
    }

    return {
        total: {
            success: allErrors.length === 0,
            message: `Synced ${sources.length} sources: ${totalProcessed} items processed, ${totalAdded} added`,
            itemsProcessed: totalProcessed,
            itemsAdded: totalAdded,
            errors: allErrors,
        },
        bySource: results,
    };
}
