/**
 * Storage Module - Domain-Organized Re-exports
 * 
 * This module provides backwards-compatible access to all storage operations
 * while organizing them by domain for cleaner imports in new code.
 * 
 * Usage:
 *   // Legacy (still works):
 *   import { storage } from "../storage";
 * 
 *   // New domain-specific (preferred for new code):
 *   import { storage } from "../storage/index";
 *   // Then use: storage.leads.getLead(id)
 * 
 * Domains:
 *   - leads: Lead management (CRUD, search, soft delete)
 *   - projects: Production projects
 *   - quotes: CPQ quotes and versions
 *   - financial: Accounts, invoices, loans, payables
 *   - marketing: Case studies, events, attributions
 *   - users: User management
 *   - quickbooks: QBO customer sync
 *   - documents: Lead documents and attachments
 *   - settings: System settings
 */

export { storage, IStorage, DatabaseStorage } from "../storage";

export * from "./leads";
export * from "./quotes";
export * from "./financial";
export * from "./marketing";
