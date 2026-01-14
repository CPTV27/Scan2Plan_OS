/**
 * Research Insights Routes
 * 
 * AI-powered business intelligence insights generation
 */

import { Router } from "express";
import { db } from "../db";
import { intelNewsItems, leads, projects } from "@shared/schema";
import { eq, desc, sql, and, gte } from "drizzle-orm";
import { isAuthenticated } from "../replit_integrations/auth";
import { GoogleGenerativeAI } from "@google/generative-ai";

const router = Router();

// Initialize Gemini AI
const genAI = process.env.GEMINI_API_KEY
    ? new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
    : null;

// GET /api/research/insights - Generate AI-powered business insights
router.get("/insights", isAuthenticated, async (req, res) => {
    try {
        // Gather data from multiple sources
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

        // Get intel feed items
        const intelItems = await db
            .select()
            .from(intelNewsItems)
            .where(eq(intelNewsItems.isArchived, false))
            .orderBy(desc(intelNewsItems.createdAt))
            .limit(50);

        // Get recent leads
        const recentLeads = await db
            .select()
            .from(leads)
            .orderBy(desc(leads.createdAt))
            .limit(30);

        // Get active projects
        const activeProjects = await db
            .select()
            .from(projects)
            .limit(20);

        // Aggregate stats
        const opportunityItems = intelItems.filter(i => i.type === "opportunity");
        const policyItems = intelItems.filter(i => i.type === "policy");
        const competitorItems = intelItems.filter(i => i.type === "competitor");

        const totalOpportunityValue = opportunityItems.reduce((sum, item) => {
            return sum + (parseFloat(item.estimatedValue || "0") || 0);
        }, 0);

        const leadsByStatus = recentLeads.reduce((acc, lead) => {
            const stage = lead.dealStage || "Unknown";
            acc[stage] = (acc[stage] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);

        const leadsByRegion = recentLeads.reduce((acc, lead) => {
            const region = lead.projectZipCode?.slice(0, 3) || "Unknown";
            acc[region] = (acc[region] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);

        // Build context for AI
        const contextData = {
            opportunityCount: opportunityItems.length,
            totalOpportunityValue,
            topOpportunities: opportunityItems.slice(0, 5).map(o => ({
                title: o.title,
                value: o.estimatedValue,
                deadline: o.deadline,
                region: o.region
            })),
            policyCount: policyItems.length,
            recentPolicies: policyItems.slice(0, 3).map(p => ({
                title: p.title,
                agency: p.agency,
                effectiveDate: p.effectiveDate
            })),
            competitorCount: competitorItems.length,
            competitorMoves: competitorItems.slice(0, 3).map(c => ({
                title: c.title,
                competitor: c.competitorName
            })),
            leadStats: {
                total: recentLeads.length,
                byStatus: leadsByStatus,
                byRegion: leadsByRegion
            },
            activeProjectCount: activeProjects.length
        };

        let insights = "";

        if (genAI) {
            try {
                const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

                const prompt = `You are a business intelligence analyst for Scan2Plan, a 3D laser scanning and BIM modeling company. Analyze the following market data and provide actionable insights.

Market Data:
- ${opportunityItems.length} bidding opportunities worth ~$${(totalOpportunityValue / 1000).toFixed(0)}K total
- Top opportunities: ${opportunityItems.slice(0, 3).map(o => o.title).join(", ")}
- ${policyItems.length} policy/regulatory updates to monitor
- ${competitorItems.length} competitor intelligence items
- ${recentLeads.length} leads in pipeline (${Object.entries(leadsByStatus).map(([s, c]) => `${c} ${s}`).join(", ")})
- ${activeProjects.length} active projects

Provide a brief (3-4 paragraphs) executive summary covering:
1. **Market Opportunities**: Key bidding opportunities and their strategic value
2. **Competitive Landscape**: What competitors are doing and how to respond
3. **Regulatory Watch**: Important policy changes that could impact operations
4. **Recommended Actions**: 2-3 specific next steps

Keep the tone professional but actionable. Focus on insights that drive decisions.`;

                const result = await model.generateContent(prompt);
                insights = result.response.text();
            } catch (aiError) {
                console.error("AI generation error:", aiError);
                insights = generateFallbackInsights(contextData);
            }
        } else {
            insights = generateFallbackInsights(contextData);
        }

        res.json({
            totalResearchCount: intelItems.length,
            clientsResearched: recentLeads.length,
            researchByType: {
                opportunity: opportunityItems.length,
                policy: policyItems.length,
                competitor: competitorItems.length
            },
            insights,
            generatedAt: new Date().toISOString(),
            data: contextData
        });
    } catch (error) {
        console.error("Error generating insights:", error);
        res.status(500).json({ message: "Failed to generate insights" });
    }
});

// Fallback insights generator when AI is not available
function generateFallbackInsights(data: any): string {
    const parts = [];

    if (data.opportunityCount > 0) {
        parts.push(`**Market Opportunities**: There are ${data.opportunityCount} active bidding opportunities worth approximately $${(data.totalOpportunityValue / 1000).toFixed(0)}K. ${data.topOpportunities.length > 0 ? `Top opportunity: "${data.topOpportunities[0]?.title}".` : ""} Review deadlines and prioritize high-value bids in your core service area.`);
    }

    if (data.competitorCount > 0) {
        parts.push(`**Competitive Intelligence**: Tracking ${data.competitorCount} competitor activities. ${data.competitorMoves.length > 0 ? `Notable: ${data.competitorMoves[0]?.title}.` : ""} Monitor for pricing and service changes that could affect your market position.`);
    }

    if (data.policyCount > 0) {
        parts.push(`**Regulatory Updates**: ${data.policyCount} policy changes require attention. ${data.recentPolicies.length > 0 ? `Key update from ${data.recentPolicies[0]?.agency || "regulatory body"}.` : ""} Ensure compliance with upcoming effective dates.`);
    }

    parts.push(`**Pipeline Health**: ${data.leadStats.total} leads currently in pipeline with ${data.activeProjectCount} active projects. Focus on converting qualified leads and maintaining project delivery timelines.`);

    return parts.join("\n\n");
}

export default router;
