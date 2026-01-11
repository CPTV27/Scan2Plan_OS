import type { Express, Request, Response } from "express";
import { asyncHandler } from "../middleware/errorHandler";
import { log } from "../lib/logger";
import { storage } from "../storage";
import { generateEstimatePDF } from "../pdf-generator";

const TRANSPARENT_GIF = Buffer.from(
  'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
  'base64'
);

export function registerProposalRoutes(app: Express): void {
  app.get("/api/proposals/track/:token/pixel.gif", asyncHandler(async (req: Request, res: Response) => {
    const { token } = req.params;
    
    try {
      await storage.recordProposalOpen(token);
      log(`INFO: Proposal email opened via pixel - token: ${token}`);
    } catch (error: any) {
      log(`WARN: Failed to record proposal open: ${error?.message}`);
    }
    
    res.set({
      'Content-Type': 'image/gif',
      'Content-Length': TRANSPARENT_GIF.length,
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
    });
    res.send(TRANSPARENT_GIF);
  }));

  app.get("/api/proposals/track/:token", asyncHandler(async (req: Request, res: Response) => {
    const { token } = req.params;
    
    const event = await storage.getProposalEmailEventByToken(token);
    if (!event) {
      return res.status(404).json({ message: "Proposal not found" });
    }
    
    try {
      await storage.recordProposalClick(token);
      log(`INFO: Proposal magic link clicked - token: ${token}`);
    } catch (error: any) {
      log(`WARN: Failed to record proposal click: ${error?.message}`);
    }
    
    res.redirect(`/proposals/${token}`);
  }));

  app.get("/api/proposals/:token", asyncHandler(async (req: Request, res: Response) => {
    const { token } = req.params;
    
    const event = await storage.getProposalEmailEventByToken(token);
    if (!event) {
      return res.status(404).json({ message: "Proposal not found" });
    }
    
    const lead = await storage.getLead(event.leadId);
    if (!lead) {
      return res.status(404).json({ message: "Lead not found" });
    }
    
    const quotes = await storage.getCpqQuotesByLead(event.leadId);
    const quote = event.quoteId 
      ? quotes.find(q => q.id === event.quoteId) 
      : quotes.find(q => q.isLatest) || quotes[quotes.length - 1];
    
    res.json({
      lead: {
        id: lead.id,
        clientName: lead.clientName,
        projectName: lead.projectName,
        projectAddress: lead.projectAddress,
        contactName: lead.contactName,
      },
      quote: quote ? {
        id: quote.id,
        quoteNumber: quote.quoteNumber,
        totalPrice: quote.totalPrice,
        createdAt: quote.createdAt,
        paymentTerms: quote.paymentTerms,
        areas: quote.areas,
        pricingBreakdown: quote.pricingBreakdown,
      } : null,
      sentAt: event.sentAt,
      recipientEmail: event.recipientEmail,
      recipientName: event.recipientName,
    });
  }));

  app.get("/api/proposals/:token/pdf", asyncHandler(async (req: Request, res: Response) => {
    const { token } = req.params;
    
    const event = await storage.getProposalEmailEventByToken(token);
    if (!event) {
      return res.status(404).json({ message: "Proposal not found" });
    }
    
    const lead = await storage.getLead(event.leadId);
    if (!lead) {
      return res.status(404).json({ message: "Lead not found" });
    }
    
    const doc = generateEstimatePDF({ lead });
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="Scan2Plan_Proposal.pdf"`);
    
    doc.pipe(res);
    doc.end();
  }));

  app.get("/api/leads/:leadId/proposal-emails", asyncHandler(async (req: Request, res: Response) => {
    const leadId = parseInt(req.params.leadId);
    if (isNaN(leadId)) {
      return res.status(400).json({ message: "Invalid lead ID" });
    }
    
    const events = await storage.getProposalEmailEventsByLead(leadId);
    res.json(events);
  }));
}
