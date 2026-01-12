/**
 * Lead Storage Operations
 * 
 * Domain-specific wrapper for lead-related storage operations.
 * Provides type-safe access to lead CRUD operations.
 */

import { storage } from "../storage";
import type { Lead, InsertLead } from "@shared/schema";

export const leadStorage = {
  getAll: () => storage.getLeads(),
  getDeleted: () => storage.getDeletedLeads(),
  getById: (id: number) => storage.getLead(id),
  getByQboInvoiceId: (qboInvoiceId: string) => storage.getLeadByQboInvoiceId(qboInvoiceId),
  getByQboEstimateId: (qboEstimateId: string) => storage.getLeadByQboEstimateId(qboEstimateId),
  getByClientName: (clientName: string) => storage.getLeadByClientName(clientName),
  getAllByClientName: (clientName: string) => storage.getLeadsByClientName(clientName),
  getAllByQboCustomerId: (qboCustomerId: string) => storage.getLeadsByQboCustomerId(qboCustomerId),
  getAllByImportSource: (importSource: string) => storage.getLeadsByImportSource(importSource),
  getByClientToken: (token: string) => storage.getLeadByClientToken(token),
  create: (lead: InsertLead) => storage.createLead(lead),
  update: (id: number, updates: Partial<InsertLead>) => storage.updateLead(id, updates),
  softDelete: (id: number, deletedBy?: string) => storage.softDeleteLead(id, deletedBy),
  restore: (id: number) => storage.restoreLead(id),
  hardDelete: (id: number) => storage.deleteLead(id),
};

export const leadResearchStorage = {
  getByLeadId: (leadId: number) => storage.getLeadResearch(leadId),
  create: (research: Parameters<typeof storage.createLeadResearch>[0]) => 
    storage.createLeadResearch(research),
};

export const leadDocumentStorage = {
  getByLeadId: (leadId: number) => storage.getLeadDocuments(leadId),
  getById: (id: number) => storage.getLeadDocument(id),
  create: (doc: Parameters<typeof storage.createLeadDocument>[0]) => 
    storage.createLeadDocument(doc),
  update: (id: number, updates: Parameters<typeof storage.updateLeadDocument>[1]) => 
    storage.updateLeadDocument(id, updates),
  delete: (id: number) => storage.deleteLeadDocument(id),
  getUnmigrated: (leadId: number) => storage.getUnmigratedDocuments(leadId),
};
