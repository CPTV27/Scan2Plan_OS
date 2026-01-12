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


  // Check session status - allows unauthenticated access to show login prompt
  app.get("/api/auth/session-status", async (req: any, res) => {
    try {
      // Check if user is authenticated (has valid session with user data)
      if (!req.user?.claims?.sub) {
        return res.json({
          authenticated: false,
          email: null,
          isEmailAllowed: false,
          accessGranted: false
        });
      }

      const userId = req.user.claims.sub;
      const user = await authStorage.getUser(userId);
      const isEmailAllowed = user?.email ? authStorage.isEmailDomainAllowed(user.email) : false;

      res.json({
        authenticated: true,
        email: user?.email,
        isEmailAllowed,
        accessGranted: isEmailAllowed
      });
    } catch (error) {
      log(`ERROR: Error checking session status - ${error instanceof Error ? error.message : String(error)}`);
      res.status(500).json({ message: "Failed to check session status" });
    }
  });
}
