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

  // Check if user has password set
  app.get("/api/auth/password-status", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const hasPassword = await authStorage.hasPassword(userId);
      const user = await authStorage.getUser(userId);
      const isEmailAllowed = user?.email ? authStorage.isEmailDomainAllowed(user.email) : false;
      
      res.json({ 
        hasPassword, 
        isEmailAllowed,
        needsPasswordSetup: !hasPassword && isEmailAllowed
      });
    } catch (error) {
      log(`ERROR: Error checking password status - ${error instanceof Error ? error.message : String(error)}`);
      res.status(500).json({ message: "Failed to check password status" });
    }
  });

  // Set password for first-time users
  app.post("/api/auth/set-password", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { password, confirmPassword } = req.body;

      // Validate password
      if (!password || password.length < 8) {
        return res.status(400).json({ message: "Password must be at least 8 characters" });
      }

      if (password !== confirmPassword) {
        return res.status(400).json({ message: "Passwords do not match" });
      }

      // Check if user already has a password
      const hasPassword = await authStorage.hasPassword(userId);
      if (hasPassword) {
        return res.status(400).json({ message: "Password already set. Use change password instead." });
      }

      // Set the password
      const success = await authStorage.setPassword(userId, password);
      if (success) {
        // Mark session as password verified
        req.session.passwordVerified = true;
        res.json({ success: true });
      } else {
        res.status(500).json({ message: "Failed to set password" });
      }
    } catch (error) {
      log(`ERROR: Error setting password - ${error instanceof Error ? error.message : String(error)}`);
      res.status(500).json({ message: "Failed to set password" });
    }
  });

  // Verify password for returning users
  app.post("/api/auth/verify-password", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { password } = req.body;
      const ipAddress = req.ip || req.connection.remoteAddress;

      // Check if user is locked out
      const isLockedOut = await authStorage.isUserLockedOut(userId);
      if (isLockedOut) {
        return res.status(429).json({ 
          message: "Too many failed attempts. Please try again in 15 minutes.",
          lockedOut: true
        });
      }

      // Verify password
      const isValid = await authStorage.verifyPassword(userId, password);
      
      // Record the attempt
      await authStorage.recordLoginAttempt(userId, isValid, ipAddress);

      if (isValid) {
        // Mark session as password verified
        req.session.passwordVerified = true;
        res.json({ success: true });
      } else {
        const failedAttempts = await authStorage.getRecentFailedAttempts(userId);
        const remainingAttempts = 5 - failedAttempts;
        
        res.status(401).json({ 
          message: "Invalid password",
          remainingAttempts: Math.max(0, remainingAttempts)
        });
      }
    } catch (error) {
      log(`ERROR: Error verifying password - ${error instanceof Error ? error.message : String(error)}`);
      res.status(500).json({ message: "Failed to verify password" });
    }
  });

  // Check if session has verified password
  app.get("/api/auth/session-status", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await authStorage.getUser(userId);
      const hasPassword = await authStorage.hasPassword(userId);
      const isEmailAllowed = user?.email ? authStorage.isEmailDomainAllowed(user.email) : false;
      const passwordVerified = req.session.passwordVerified === true;

      res.json({
        authenticated: true,
        email: user?.email,
        isEmailAllowed,
        hasPassword,
        passwordVerified,
        needsPasswordSetup: isEmailAllowed && !hasPassword,
        needsPasswordVerification: isEmailAllowed && hasPassword && !passwordVerified,
        accessGranted: isEmailAllowed && hasPassword && passwordVerified
      });
    } catch (error) {
      log(`ERROR: Error checking session status - ${error instanceof Error ? error.message : String(error)}`);
      res.status(500).json({ message: "Failed to check session status" });
    }
  });
}
