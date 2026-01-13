import type { Express, Request, Response } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { setupAuth, registerAuthRoutes, isAuthenticated, requireRole } from "./replit_integrations/auth";
import { asyncHandler } from "./middleware/errorHandler";
import { registerChatRoutes } from "./replit_integrations/chat";
import { registerImageRoutes } from "./replit_integrations/image";
import { log } from "./lib/logger";
import { cacheAsync, CacheDuration } from "./lib/cache";

// Standard Route Modules
import { registerUserRoutes } from "./routes/users";
import { registerLeadRoutes } from "./routes/leads";
import { registerCpqRoutes } from "./routes/cpq";
import { registerHubspotRoutes } from "./routes/hubspot";
import { registerGoogleRoutes } from "./routes/google";
import { registerAnalyticsRoutes } from "./routes/analytics";
import { registerProjectRoutes } from "./routes/projects";
import { registerMarketingRoutes } from "./routes/marketing";
import { registerTimeLogRoutes } from "./routes/timeLogs";
import { registerWebhookRoutes } from "./routes/webhooks";
import { registerQuickbooksRoutes } from "./routes/quickbooks";
import { registerInvoiceRoutes } from "./routes/invoices";
import { registerAirtableRoutes } from "./routes/airtable";
import { registerAIRoutes } from "./routes/ai";
import { registerDocumentRoutes } from "./routes/documents";
import { registerProposalRoutes } from "./routes/proposals";
import { registerStorageRoutes } from "./routes/storage";
import { registerHealthRoutes } from "./routes/health";

// Router Objects
import pandaDocRoutes from "./routes/pandadoc";
import brandEngineRoutes from "./routes/brandEngine";
import intelligenceRoutes from "./routes/intelligence";
import { emailsRouter } from "./routes/emails";
import { personasRouter } from "./routes/personas";
import { deliveryRouter } from "./routes/delivery";
import { chatRouter } from "./routes/chat";

// Refactored Modules
import { operationsRouter } from "./routes/operations";
import { performanceRouter } from "./routes/performance";
import { scoringRouter } from "./routes/scoring";
import { dealsRouter } from "./routes/deals";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  await setupAuth(app);
  registerAuthRoutes(app);

  // PUBLIC routes that bypass auth
  const publicPaths: Array<{ path: string; type: 'exact' | 'prefix' | 'pattern' }> = [
    { path: '/login', type: 'exact' },
    { path: '/callback', type: 'exact' },
    { path: '/logout', type: 'exact' },
    { path: '/test-login', type: 'exact' },
    { path: '/auth/session-status', type: 'exact' },
    { path: '/auth/password-status', type: 'exact' },
    { path: '/auth/set-password', type: 'exact' },
    { path: '/auth/verify-password', type: 'exact' },
    { path: '/auth/user', type: 'exact' },
    { path: '/proposals/track/', type: 'prefix' },
    { path: '/site-readiness/', type: 'prefix' },
    { path: '/public/site-readiness/', type: 'prefix' },
    { path: '/webhooks/', type: 'prefix' },
  ];

  const publicPatterns: RegExp[] = [
    /^\/proposals\/[a-zA-Z0-9_-]{24}$/,
    /^\/proposals\/[a-zA-Z0-9_-]{24}\/pdf$/,
    /^\/client-input\/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/,
  ];

  // Auth Middleware
  app.use('/api', (req, res, next) => {
    const routePath = req.path;
    const isPublicPath = publicPaths.some(({ path, type }) => {
      if (type === 'exact') return routePath === path;
      if (type === 'prefix') return routePath.startsWith(path);
      return false;
    });
    const matchesPublicPattern = publicPatterns.some(pattern => pattern.test(routePath));

    if (isPublicPath || matchesPublicPattern) return next();
    isAuthenticated(req, res, next);
  });

  registerChatRoutes(app);
  registerImageRoutes(app);

  // Health checks (no auth required)
  registerHealthRoutes(app);

  registerUserRoutes(app);
  await registerLeadRoutes(app);
  await registerCpqRoutes(app);
  await registerHubspotRoutes(app);
  await registerGoogleRoutes(app);
  registerAnalyticsRoutes(app);
  registerProjectRoutes(app);
  registerMarketingRoutes(app);
  registerTimeLogRoutes(app);
  await registerWebhookRoutes(app);
  registerQuickbooksRoutes(app);
  registerInvoiceRoutes(app);
  registerAirtableRoutes(app);
  registerAIRoutes(app);
  registerDocumentRoutes(app);

  app.use("/api/pandadoc", pandaDocRoutes);
  app.use("/api/brand", brandEngineRoutes);
  app.use("/api/intelligence", intelligenceRoutes);
  app.use("/api/emails", emailsRouter);
  app.use("/api/personas", personasRouter);
  registerProposalRoutes(app);
  registerStorageRoutes(app);
  app.use("/api/delivery", deliveryRouter);
  app.use("/api/chat", chatRouter);

  // New Modular Routes
  app.use("/api", operationsRouter);
  app.use("/api/performance", performanceRouter);
  app.use("/api", scoringRouter);
  app.use("/api", dealsRouter);

  // Daily Summary with caching (5-minute TTL)
  const getCachedDailySummary = cacheAsync(
    async () => {
      const leads = await storage.getLeads();
      const projects = await storage.getProjects();

      const pipelineValue = leads
        .filter(l => l.dealStage !== "Closed Won" && l.dealStage !== "Closed Lost")
        .reduce((sum, l) => sum + Number(l.value || 0), 0);

      const weightedValue = leads
        .filter(l => l.dealStage !== "Closed Won" && l.dealStage !== "Closed Lost")
        .reduce((sum, l) => sum + (Number(l.value || 0) * Number(l.probability || 0) / 100), 0);

      const activeProjects = projects.filter(p =>
        p.status !== "Complete" && p.status !== "Cancelled"
      ).length;

      return {
        pipelineValue,
        weightedValue,
        activeLeads: leads.filter(l => l.dealStage !== "Closed Won" && l.dealStage !== "Closed Lost").length,
        activeProjects,
        staleLeads: leads.filter(l => {
          if (!l.lastContactDate) return true;
          const daysSince = (Date.now() - new Date(l.lastContactDate).getTime()) / (1000 * 60 * 60 * 24);
          return daysSince > 14;
        }).length,
        generatedAt: new Date().toISOString(),
      };
    },
    { maxAge: CacheDuration.FIVE_MINUTES }
  );

  app.get("/api/daily-summary", isAuthenticated, requireRole("ceo"), asyncHandler(async (req: Request, res: Response) => {
    try {
      const summary = await getCachedDailySummary();
      res.json(summary);
    } catch (error: any) {
      log("ERROR: Daily summary error - " + (error?.message || error));
      res.status(500).json({ message: error.message });
    }
  }));

  // Field Translation Checker
  app.get("/api/field-translation/status", isAuthenticated, asyncHandler(async (req: Request, res: Response) => {
    const hasOpenAI = !!process.env.AI_INTEGRATIONS_OPENAI_API_KEY;
    res.json({ enabled: hasOpenAI });
  }));

  return httpServer;
}
