import { Router, Request, Response } from "express";
import { pandaDocClient } from "../lib/pandadoc-client";
import { isAuthenticated } from "../replit_integrations/auth";

const router = Router();

router.get("/status", async (req: Request, res: Response) => {
  try {
    const isConfigured = pandaDocClient.isConfigured();
    const stats = await pandaDocClient.getStats();
    res.json({ 
      configured: isConfigured,
      ...stats,
    });
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

router.get("/batches", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const batches = await pandaDocClient.getBatches();
    res.json(batches);
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

router.post("/batches", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const { name } = req.body;
    const userId = (req.user as any)?.id;
    const batch = await pandaDocClient.createImportBatch(name, userId);
    res.json(batch);
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

router.post("/batches/:batchId/start", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const batchId = parseInt(req.params.batchId);
    const { status, dateFrom, dateTo } = req.body;
    
    const result = await pandaDocClient.startImport(batchId, {
      status,
      dateFrom,
      dateTo,
    });
    
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

router.get("/batches/:batchId/documents", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const batchId = parseInt(req.params.batchId);
    const documents = await pandaDocClient.getBatchDocuments(batchId);
    res.json(documents);
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

router.get("/documents", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const { status } = req.query;
    const documents = await pandaDocClient.getAllDocuments(status as string);
    res.json(documents);
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

router.get("/documents/:id", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const document = await pandaDocClient.getDocument(id);
    if (!document) {
      return res.status(404).json({ error: "Document not found" });
    }
    res.json(document);
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

router.post("/documents/:id/process", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const document = await pandaDocClient.processDocument(id);
    res.json(document);
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

router.post("/documents/:id/approve", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const { editedData, reviewNotes } = req.body;
    const userId = (req.user as any)?.id || "system";
    
    const result = await pandaDocClient.approveDocument(id, userId, editedData, reviewNotes);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

router.post("/documents/:id/reject", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const { reviewNotes } = req.body;
    const userId = (req.user as any)?.id || "system";
    
    const document = await pandaDocClient.rejectDocument(id, userId, reviewNotes);
    res.json(document);
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

router.post("/sync", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const { status, dateFrom, dateTo } = req.body;
    const userId = (req.user as any)?.id;
    
    const batch = await pandaDocClient.createImportBatch(
      `Sync ${new Date().toISOString()}`,
      userId
    );
    
    const result = await pandaDocClient.startImport(batch.id, {
      status,
      dateFrom,
      dateTo,
    });
    
    res.json({ batch, ...result });
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

router.post("/process-all-pending", isAuthenticated, async (req: Request, res: Response) => {
  try {
    const documents = await pandaDocClient.getAllDocuments("pending");
    const results = [];
    
    for (const doc of documents) {
      try {
        const processed = await pandaDocClient.processDocument(doc.id);
        results.push({ id: doc.id, status: "success", document: processed });
      } catch (error) {
        results.push({ id: doc.id, status: "error", error: String(error) });
      }
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    res.json({ processed: results.length, results });
  } catch (error) {
    res.status(500).json({ error: String(error) });
  }
});

export default router;
