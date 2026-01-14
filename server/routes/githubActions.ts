/**
 * GitHub Actions API Routes
 * 
 * Provides endpoints to trigger and monitor CI workflows.
 */

import { Router } from "express";
import { asyncHandler } from "../middleware/errorHandler";
import { log } from "../lib/logger";

export const githubActionsRouter = Router();

const GITHUB_OWNER = "CPTV27";
const GITHUB_REPO = "Scan2Plan_OS";
const WORKFLOW_FILE = "ci.yml";

/**
 * POST /api/ci/trigger
 * Triggers the CI workflow via GitHub Actions API
 */
githubActionsRouter.post(
    "/api/ci/trigger",
    asyncHandler(async (req, res) => {
        const githubToken = process.env.GITHUB_TOKEN;

        if (!githubToken) {
            return res.status(503).json({
                success: false,
                error: "GitHub integration not configured",
                message: "Set GITHUB_TOKEN environment variable to enable CI triggers",
            });
        }

        const { runE2e = true } = req.body;

        try {
            const response = await fetch(
                `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/actions/workflows/${WORKFLOW_FILE}/dispatches`,
                {
                    method: "POST",
                    headers: {
                        Accept: "application/vnd.github.v3+json",
                        Authorization: `Bearer ${githubToken}`,
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        ref: "main",
                        inputs: {
                            run_e2e: runE2e.toString(),
                        },
                    }),
                }
            );

            if (response.status === 204) {
                log("CI workflow triggered successfully");
                return res.json({
                    success: true,
                    message: "CI workflow triggered successfully",
                    details: {
                        workflow: WORKFLOW_FILE,
                        branch: "main",
                        runE2e,
                    },
                });
            }

            const errorText = await response.text();
            log(`Failed to trigger CI: ${response.status} - ${errorText}`);
            return res.status(response.status).json({
                success: false,
                error: "Failed to trigger workflow",
                details: errorText,
            });
        } catch (error: any) {
            log(`Error triggering CI: ${error.message}`);
            return res.status(500).json({
                success: false,
                error: "Failed to trigger workflow",
                message: error.message,
            });
        }
    })
);

/**
 * GET /api/ci/status
 * Gets the latest workflow run status
 */
githubActionsRouter.get(
    "/api/ci/status",
    asyncHandler(async (req, res) => {
        const githubToken = process.env.GITHUB_TOKEN;

        if (!githubToken) {
            return res.status(503).json({
                success: false,
                error: "GitHub integration not configured",
                configured: false,
            });
        }

        try {
            const response = await fetch(
                `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/actions/runs?per_page=5`,
                {
                    headers: {
                        Accept: "application/vnd.github.v3+json",
                        Authorization: `Bearer ${githubToken}`,
                    },
                }
            );

            if (!response.ok) {
                throw new Error(`GitHub API error: ${response.status}`);
            }

            const data = await response.json();
            const runs = data.workflow_runs.map((run: any) => ({
                id: run.id,
                name: run.name,
                status: run.status,
                conclusion: run.conclusion,
                branch: run.head_branch,
                createdAt: run.created_at,
                updatedAt: run.updated_at,
                url: run.html_url,
                commit: {
                    sha: run.head_sha?.substring(0, 7),
                    message: run.head_commit?.message?.split("\n")[0],
                },
            }));

            return res.json({
                success: true,
                configured: true,
                runs,
            });
        } catch (error: any) {
            log(`Error fetching CI status: ${error.message}`);
            return res.status(500).json({
                success: false,
                error: error.message,
                configured: true,
            });
        }
    })
);
