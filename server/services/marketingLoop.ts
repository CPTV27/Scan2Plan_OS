import { db } from "../db";
import { marketingPosts, notifications, projects, leads, caseStudies } from "@shared/schema";
import { eq } from "drizzle-orm";
import { generateSocialContent } from "../lib/contentGenerator";
import { notifyTruthLoopVariance } from "./googleChat";
import { log } from "../lib/logger";

interface TruthLoopResult {
  success: boolean;
  postsCreated: number;
  notificationSent: boolean;
  message: string;
  varianceType?: "overrun" | "underrun";
}

interface TruthLoopOptions {
  costPerSqft?: number;
  varianceThreshold?: number;
}

const DEFAULT_COST_PER_SQFT = 15;
const DEFAULT_VARIANCE_THRESHOLD = 5;

export async function triggerTruthLoop(
  projectId: number,
  variancePercent: number,
  actualSqft: number,
  options: TruthLoopOptions = {}
): Promise<TruthLoopResult> {
  const { 
    costPerSqft = DEFAULT_COST_PER_SQFT,
    varianceThreshold = DEFAULT_VARIANCE_THRESHOLD
  } = options;

  try {
    if (Math.abs(variancePercent) < varianceThreshold) {
      return {
        success: false,
        postsCreated: 0,
        notificationSent: false,
        message: `Variance of ${variancePercent.toFixed(1)}% is below threshold of ${varianceThreshold}%. No content generated.`
      };
    }

    const [project] = await db.select()
      .from(projects)
      .where(eq(projects.id, projectId));

    if (!project) {
      return {
        success: false,
        postsCreated: 0,
        notificationSent: false,
        message: "Project not found"
      };
    }

    let lead = null;
    if (project.leadId) {
      const [foundLead] = await db.select()
        .from(leads)
        .where(eq(leads.id, project.leadId));
      lead = foundLead;
    }

    if (!lead) {
      return {
        success: false,
        postsCreated: 0,
        notificationSent: false,
        message: "Associated lead not found"
      };
    }

    const estimatedSqft = lead.sqft ? Number(lead.sqft) : 0;
    
    if (estimatedSqft === 0) {
      return {
        success: false,
        postsCreated: 0,
        notificationSent: false,
        message: "Cannot generate content: estimated square footage is missing"
      };
    }

    const variance = (actualSqft - estimatedSqft) / estimatedSqft;
    const isOverrun = actualSqft > estimatedSqft;
    const sqftDifference = Math.abs(actualSqft - estimatedSqft);
    const impactAmount = sqftDifference * costPerSqft;

    const projectData = {
      lead: {
        buildingType: lead.buildingType,
        projectAddress: lead.projectAddress,
        sqft: estimatedSqft,
      },
      actualSqft
    };

    const varianceContext = {
      variancePercent: variance * 100,
      isOverrun,
      estimatedSqft,
      actualSqft,
      costPerSqft,
      impactAmount
    };

    const posts = generateSocialContent(projectData, varianceContext);

    let caseStudyId: number | null = null;
    
    const varianceType = isOverrun ? "Overrun" : "Under-Target";
    const caseStudyTitle = `${varianceType} Detection: ${lead.clientName || 'Client'}`;
    const impactStr = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(impactAmount);
    
    const [existingCaseStudy] = await db.select()
      .from(caseStudies)
      .where(eq(caseStudies.title, caseStudyTitle));

    if (existingCaseStudy) {
      caseStudyId = existingCaseStudy.id;
    } else {
      const blurb = isOverrun
        ? `${Math.abs(variance * 100).toFixed(1)}% overrun detected and flagged before delivery. Identified ${impactStr} in potential change order exposure.`
        : `${Math.abs(variance * 100).toFixed(1)}% under-estimate detected. Identified ${impactStr} in potential savings or scope expansion opportunity.`;
      
      const [newCaseStudy] = await db.insert(caseStudies)
        .values({
          title: caseStudyTitle,
          blurb,
          tags: [varianceType, "Variance Detection", lead.buildingType || "Commercial"],
          heroStat: `${Math.abs(variance * 100).toFixed(1)}% ${varianceType}`,
          isActive: true
        })
        .returning();
      caseStudyId = newCaseStudy.id;
    }

    for (const post of posts) {
      await db.insert(marketingPosts).values({
        caseStudyId,
        projectId,
        platform: "linkedin",
        category: post.category,
        content: post.content,
        suggestedVisual: post.suggestedVisual,
        status: "draft",
        variancePercent: (variance * 100).toFixed(2),
        savingsAmount: impactAmount.toFixed(2)
      });
    }

    const ownerId = lead.ownerId || "1";
    const notificationMessage = isOverrun
      ? `Truth Loop: New overrun content generated for ${lead.buildingType || 'Project'}. ${posts.length} posts ready to review.`
      : `Truth Loop: New under-target content generated for ${lead.buildingType || 'Project'}. ${posts.length} posts ready to review.`;

    await db.insert(notifications).values({
      userId: ownerId,
      type: "content_ready",
      leadId: lead.id,
      message: notificationMessage
    });

    // Send Google Chat notification if variance is significant (>10%)
    if (Math.abs(variance) > 0.10) {
      try {
        const baseUrl = process.env.REPLIT_DEV_DOMAIN 
          ? `https://${process.env.REPLIT_DEV_DOMAIN}` 
          : "https://scan2plan.io";
        await notifyTruthLoopVariance(
          { id: projectId, name: project.name },
          variance,
          impactAmount,
          baseUrl
        );
      } catch (err) {
        log(`WARN: [GoogleChat] Truth Loop notification failed (non-blocking) - ${err instanceof Error ? err.message : String(err)}`);
      }
    }

    return {
      success: true,
      postsCreated: posts.length,
      notificationSent: true,
      message: `Created ${posts.length} marketing posts (${varianceType.toLowerCase()}) and notified SDR`,
      varianceType: isOverrun ? "overrun" : "underrun"
    };

  } catch (error) {
    log(`ERROR: Truth Loop error - ${error instanceof Error ? error.message : String(error)}`);
    return {
      success: false,
      postsCreated: 0,
      notificationSent: false,
      message: error instanceof Error ? error.message : "Unknown error"
    };
  }
}

export async function getMarketingPosts(status?: string) {
  let query = db.select().from(marketingPosts);
  
  if (status) {
    query = query.where(eq(marketingPosts.status, status)) as any;
  }
  
  return await query;
}

export async function updatePostStatus(postId: number, status: string) {
  const updateData: any = { status };
  
  if (status === "posted") {
    updateData.postedAt = new Date();
  }
  
  const [updated] = await db.update(marketingPosts)
    .set(updateData)
    .where(eq(marketingPosts.id, postId))
    .returning();
  
  return updated;
}
