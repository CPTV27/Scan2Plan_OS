import type { Express } from "express";
import { storage } from "../storage";
import { isAuthenticated, requireRole } from "../replit_integrations/auth";
import { log } from "../lib/logger";

export function registerUserRoutes(app: Express): void {
  app.get("/api/users", isAuthenticated, requireRole("ceo"), async (req, res) => {
    try {
      const allUsers = await storage.getAllUsers();
      res.json(allUsers);
    } catch (error: any) {
      log("ERROR: Error fetching users - " + (error?.message || error));
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  app.patch("/api/users/:id/role", isAuthenticated, requireRole("ceo"), async (req, res) => {
    try {
      const { role } = req.body;
      const validRoles = ["ceo", "sales", "production", "accounting"];
      
      if (!role || !validRoles.includes(role)) {
        return res.status(400).json({ 
          message: "Invalid role. Must be one of: ceo, sales, production, accounting" 
        });
      }
      
      const updatedUser = await storage.updateUserRole(req.params.id, role);
      if (!updatedUser) {
        return res.status(404).json({ message: "User not found" });
      }
      
      res.json(updatedUser);
    } catch (error: any) {
      log("ERROR: Error updating user role - " + (error?.message || error));
      res.status(500).json({ message: "Failed to update user role" });
    }
  });
}
