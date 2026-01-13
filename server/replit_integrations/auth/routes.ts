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

  // Check if user has a password set
  app.get("/api/auth/password-status", async (req: any, res) => {
    try {
      if (!req.user?.claims?.sub) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const userId = req.user.claims.sub;
      const hasPassword = await authStorage.hasPassword(userId);
      const session = req.session as any;
      
      res.json({
        hasPassword,
        passwordVerified: !!session?.passwordVerified
      });
    } catch (error) {
      log(`ERROR: Error checking password status - ${error instanceof Error ? error.message : String(error)}`);
      res.status(500).json({ message: "Failed to check password status" });
    }
  });

  // Set a new password (for first-time setup)
  app.post("/api/auth/set-password", async (req: any, res) => {
    try {
      if (!req.user?.claims?.sub) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const { password } = req.body;
      if (!password || typeof password !== 'string' || password.length < 8) {
        return res.status(400).json({ message: "Password must be at least 8 characters" });
      }

      const userId = req.user.claims.sub;
      
      // Check if user already has a password
      const hasPassword = await authStorage.hasPassword(userId);
      if (hasPassword) {
        return res.status(400).json({ message: "Password already set. Use verify-password instead." });
      }

      const success = await authStorage.setPassword(userId, password);
      if (success) {
        // Mark password as verified for this session
        const session = req.session as any;
        session.passwordVerified = true;
        log(`Password set for user ${userId}`);
        res.json({ success: true });
      } else {
        res.status(500).json({ message: "Failed to set password" });
      }
    } catch (error) {
      log(`ERROR: Error setting password - ${error instanceof Error ? error.message : String(error)}`);
      res.status(500).json({ message: "Failed to set password" });
    }
  });

  // Verify existing password
  app.post("/api/auth/verify-password", async (req: any, res) => {
    try {
      if (!req.user?.claims?.sub) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const { password } = req.body;
      if (!password || typeof password !== 'string') {
        return res.status(400).json({ message: "Password is required" });
      }

      const userId = req.user.claims.sub;
      const isValid = await authStorage.verifyPassword(userId, password);
      
      if (isValid) {
        // Mark password as verified for this session
        const session = req.session as any;
        session.passwordVerified = true;
        log(`Password verified for user ${userId}`);
        res.json({ success: true });
      } else {
        log(`SECURITY: Failed password verification attempt for user ${userId}`);
        res.status(401).json({ message: "Invalid password" });
      }
    } catch (error) {
      log(`ERROR: Error verifying password - ${error instanceof Error ? error.message : String(error)}`);
      res.status(500).json({ message: "Failed to verify password" });
    }
  });
}
