import type { Express } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { storage } from "../storage";
import { isAuthenticated, requireRole } from "../replit_integrations/auth";

const UPLOADS_DIR = "uploads/lead-documents";

if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => {
      cb(null, UPLOADS_DIR);
    },
    filename: (_req, file, cb) => {
      const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
      const ext = path.extname(file.originalname);
      cb(null, `${uniqueSuffix}${ext}`);
    },
  }),
  limits: {
    fileSize: 50 * 1024 * 1024,
  },
  fileFilter: (_req, file, cb) => {
    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/gif",
      "image/webp",
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "text/plain",
      "text/csv",
    ];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`File type ${file.mimetype} is not allowed`));
    }
  },
});

export function registerDocumentRoutes(app: Express) {
  app.get("/api/leads/:leadId/documents", isAuthenticated, requireRole("ceo", "sales"), async (req, res) => {
    try {
      const leadId = Number(req.params.leadId);
      const documents = await storage.getLeadDocuments(leadId);
      res.json(documents);
    } catch (error) {
      console.error("Error fetching documents:", error);
      res.status(500).json({ message: "Failed to fetch documents" });
    }
  });

  app.post("/api/leads/:leadId/documents", isAuthenticated, requireRole("ceo", "sales"), upload.single("file"), async (req: any, res) => {
    try {
      const leadId = Number(req.params.leadId);
      const file = req.file;
      const user = req.user;

      if (!file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      const lead = await storage.getLead(leadId);
      if (!lead) {
        fs.unlinkSync(file.path);
        return res.status(404).json({ message: "Lead not found" });
      }

      const document = await storage.createLeadDocument({
        leadId,
        filename: file.filename,
        originalName: file.originalname,
        mimeType: file.mimetype,
        size: file.size,
        storageKey: file.path,
        uploadedBy: user?.id,
      });

      res.status(201).json(document);
    } catch (error) {
      console.error("Error uploading document:", error);
      res.status(500).json({ message: "Failed to upload document" });
    }
  });

  app.get("/api/documents/:id/download", isAuthenticated, requireRole("ceo", "sales"), async (req, res) => {
    try {
      const documentId = Number(req.params.id);
      const document = await storage.getLeadDocument(documentId);

      if (!document) {
        return res.status(404).json({ message: "Document not found" });
      }

      if (!fs.existsSync(document.storageKey)) {
        return res.status(404).json({ message: "File not found on disk" });
      }

      res.setHeader("Content-Disposition", `attachment; filename="${document.originalName}"`);
      res.setHeader("Content-Type", document.mimeType);
      res.sendFile(path.resolve(document.storageKey));
    } catch (error) {
      console.error("Error downloading document:", error);
      res.status(500).json({ message: "Failed to download document" });
    }
  });

  app.delete("/api/documents/:id", isAuthenticated, requireRole("ceo", "sales"), async (req, res) => {
    try {
      const documentId = Number(req.params.id);
      const document = await storage.getLeadDocument(documentId);

      if (!document) {
        return res.status(404).json({ message: "Document not found" });
      }

      if (fs.existsSync(document.storageKey)) {
        fs.unlinkSync(document.storageKey);
      }

      await storage.deleteLeadDocument(documentId);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting document:", error);
      res.status(500).json({ message: "Failed to delete document" });
    }
  });
}
