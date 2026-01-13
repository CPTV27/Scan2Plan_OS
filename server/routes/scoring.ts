import { Router } from "express";
import { isAuthenticated, requireRole } from "../replit_integrations/auth";
import { asyncHandler } from "../middleware/errorHandler";
import { storage } from "../storage";
import { applyStalenessPenalties, getStalenessStatus } from "../staleness";
import { calculateProbability, recalculateAllProbabilities, getStageSpecificStaleness } from "../probability";

export const scoringRouter = Router();

// Staleness Routes
scoringRouter.get("/staleness/status", isAuthenticated, requireRole("ceo", "sales"), asyncHandler(async (req, res) => {
    const leads = await storage.getLeads();
    const statusList = leads.map(lead => ({
        leadId: lead.id,
        clientName: lead.clientName,
        ...getStalenessStatus(lead.lastContactDate)
    }));
    res.json(statusList);
}));

scoringRouter.post("/staleness/apply", isAuthenticated, requireRole("ceo"), asyncHandler(async (req, res) => {
    const results = await applyStalenessPenalties();
    res.json(results);
}));

// Probability Routes
scoringRouter.post("/probability/recalculate", isAuthenticated, requireRole("ceo"), asyncHandler(async (req, res) => {
    const results = await recalculateAllProbabilities();
    res.json(results);
}));

scoringRouter.get("/leads/:id/probability-factors", isAuthenticated, requireRole("ceo", "sales"), asyncHandler(async (req, res) => {
    const leadId = Number(req.params.id);
    const lead = await storage.getLead(leadId);
    if (!lead) return res.status(404).json({ message: "Lead not found" });

    const factors = calculateProbability(lead);
    const staleness = getStageSpecificStaleness(lead.dealStage, lead.lastContactDate);

    res.json({
        currentProbability: lead.probability,
        calculatedProbability: factors.finalScore,
        factors,
        staleness,
        lastContactDate: lead.lastContactDate,
        dealStage: lead.dealStage,
    });
}));
