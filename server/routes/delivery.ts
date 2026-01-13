import { Router } from "express";
import { storage } from "../storage";
import { generateUploadUrl, generateReadUrl, listFiles } from "../gcs";
import { isAuthenticated, requireRole } from "../replit_integrations/auth";
import { asyncHandler } from "../middleware/errorHandler";
import { log } from "../lib/logger";

export const deliveryRouter = Router();

// Get Signed Upload URL for GCS
// POST /api/delivery/sign-upload
deliveryRouter.post("/sign-upload", isAuthenticated, requireRole("production", "ceo"), asyncHandler(async (req, res) => {
    const { filePath, contentType } = req.body;

    if (!filePath || !contentType) {
        return res.status(400).json({ message: "filePath and contentType are required" });
    }

    const result = await generateUploadUrl(filePath, contentType);
    res.json(result);
}));

// Save Potree Config/Path for a Project
// POST /api/delivery/potree/config
deliveryRouter.post("/potree/config", isAuthenticated, requireRole("production", "ceo"), asyncHandler(async (req, res) => {
    const { projectId, gcsPath, gcsBucket } = req.body;

    if (!projectId || !gcsPath) {
        return res.status(400).json({ message: "projectId and gcsPath are required" });
    }

    // Update project with GCS info
    const project = await storage.updateProject(projectId, {
        gcsPath,
        gcsBucket: gcsBucket || "scan2plan-deliverables"
    });

    res.json(project);
}));

// List Files in Project Folder
// GET /api/delivery/files/:projectId
deliveryRouter.get("/files/:projectId", isAuthenticated, asyncHandler(async (req, res) => {
    const projectId = parseInt(req.params.projectId);
    const project = await storage.getProject(projectId);

    if (!project) {
        return res.status(404).json({ message: "Project not found" });
    }

    // Assuming a standard structure or using the saved gcsPath
    const prefix = project.gcsPath || `projects/${project.universalProjectId}/`;
    const files = await listFiles(prefix);
    res.json({ files });
}));

// Get Signed Read URL for a specific file
// POST /api/delivery/sign-read
deliveryRouter.post("/sign-read", isAuthenticated, asyncHandler(async (req, res) => {
    const { filePath } = req.body;
    if (!filePath) {
        return res.status(400).json({ message: "filePath is required" });
    }
    const url = await generateReadUrl(filePath);
    res.json({ url });
}));
