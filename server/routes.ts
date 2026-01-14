import type { Express, Request, Response } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { setupAuth, registerAuthRoutes, isAuthenticated, requireRole } from "./replit_integrations/auth";
import { asyncHandler } from "./middleware/errorHandler";
import { registerChatRoutes } from "./replit_integrations/chat";
import { registerImageRoutes } from "./replit_integrations/image";
import { log } from "./lib/logger";

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
import pandaDocRoutes from "./routes/pandadoc";
import brandEngineRoutes from "./routes/brandEngine";
import intelligenceRoutes from "./routes/intelligence";
import { registerDocumentRoutes } from "./routes/documents";
import { registerProposalRoutes } from "./routes/proposals";
import { emailsRouter } from "./routes/emails";
import { personasRouter } from "./routes/personas";
import { registerStorageRoutes } from "./routes/storage";
import { registerDeliveryRoutes } from "./routes/delivery";
import { registerFieldOpsRoutes } from "./routes/fieldOps";
import { registerGHLRoutes } from "./routes/ghl";
import { registerHealthRoutes } from "./routes/health";
import { customersRouter } from "./routes/customers";
import { productsRouter } from "./routes/products";
import { proposalTemplatesRouter, proposalTemplateGroupsRouter, generatedProposalsRouter } from "./routes/proposalTemplates";
import { githubActionsRouter } from "./routes/githubActions";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  await setupAuth(app);
  registerAuthRoutes(app);

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

  app.use('/api', (req, res, next) => {
    const routePath = req.path;

    const isPublicPath = publicPaths.some(({ path, type }) => {
      if (type === 'exact') {
        return routePath === path;
      }
      if (type === 'prefix') {
        return routePath.startsWith(path);
      }
      return false;
    });

    const matchesPublicPattern = publicPatterns.some(pattern => pattern.test(routePath));

    if (isPublicPath || matchesPublicPattern) {
      return next();
    }

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
  await registerMarketingRoutes(app);
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
  registerDeliveryRoutes(app);
  registerFieldOpsRoutes(app);
  registerGHLRoutes(app);
  app.use(customersRouter);
  app.use(productsRouter);
  app.use("/api/proposal-templates", proposalTemplatesRouter);
  app.use("/api/proposal-template-groups", proposalTemplateGroupsRouter);
  app.use("/api/generated-proposals", generatedProposalsRouter);
  app.use(githubActionsRouter);  // CI trigger endpoints

  app.post("/api/projects/:projectId/completion-checklist", isAuthenticated, requireRole("ceo", "production"), asyncHandler(async (req: Request, res: Response) => {
    try {
      const projectId = Number(req.params.projectId);
      const project = await storage.getProject(projectId);

      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      const items = req.body.items || [];
      const allComplete = items.length > 0 && items.every((item: any) => item.completed);

      await storage.updateProject(projectId, {
        status: allComplete ? "Complete" : project.status,
      } as any);

      res.json({ success: true, allComplete });
    } catch (error: any) {
      log("ERROR: Error updating completion checklist - " + (error?.message || error));
      res.status(500).json({ message: error.message });
    }
  }));

  return httpServer;
}
