import type { Express } from "express";
import { authStorage } from "./storage";
import { isAuthenticated } from "./replitAuth";
import { log } from "../../lib/logger";

// Register auth-specific routes
export function registerAuthRoutes(app: Express): void {
  // Get current authenticated user
  app.get("/api/auth/user", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await authStorage.getUser(userId);
      res.json(user);
    } catch (error) {
      log(`ERROR: Error fetching user - ${error instanceof Error ? error.message : String(error)}`);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });
}
