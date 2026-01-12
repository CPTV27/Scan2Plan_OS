/**
 * Lead Storage Operations
 * 
 * Domain-specific wrapper for lead-related storage operations.
 * Provides type-safe access to lead CRUD operations.
 */

import { storage } from "../storage";
import type { Lead, InsertLead, InsertLeadResearch, InsertLeadDocument, LeadDocument } from "@shared/schema";

export const leadStorage = {
  getAll: (): Promise<Lead[]> => storage.getLeads(),
  getDeleted: (): Promise<Lead[]> => storage.getDeletedLeads(),
  getById: (id: number): Promise<Lead | undefined> => storage.getLead(id),
  getByQboInvoiceId: (qboInvoiceId: string): Promise<Lead | undefined> => storage.getLeadByQboInvoiceId(qboInvoiceId),
  getByQboEstimateId: (qboEstimateId: string): Promise<Lead | undefined> => storage.getLeadByQboEstimateId(qboEstimateId),
  getByClientName: (clientName: string): Promise<Lead | undefined> => storage.getLeadByClientName(clientName),
  getAllByClientName: (clientName: string): Promise<Lead[]> => storage.getLeadsByClientName(clientName),
  getAllByQboCustomerId: (qboCustomerId: string): Promise<Lead[]> => storage.getLeadsByQboCustomerId(qboCustomerId),
  getAllByImportSource: (importSource: string): Promise<Lead[]> => storage.getLeadsByImportSource(importSource),
  getByClientToken: (token: string): Promise<Lead | undefined> => storage.getLeadByClientToken(token),
  create: (lead: InsertLead): Promise<Lead> => storage.createLead(lead),
  update: (id: number, updates: Partial<InsertLead>): Promise<Lead> => storage.updateLead(id, updates),
  softDelete: (id: number, deletedBy?: string): Promise<Lead> => storage.softDeleteLead(id, deletedBy),
  restore: (id: number): Promise<Lead> => storage.restoreLead(id),
  hardDelete: (id: number): Promise<void> => storage.deleteLead(id),
};

export const leadResearchStorage = {
  getByLeadId: (leadId: number) => storage.getLeadResearch(leadId),
  create: (research: InsertLeadResearch) => storage.createLeadResearch(research),
};

export const leadDocumentStorage = {
  getByLeadId: (leadId: number): Promise<LeadDocument[]> => storage.getLeadDocuments(leadId),
  getById: (id: number): Promise<LeadDocument | undefined> => storage.getLeadDocument(id),
  create: (doc: InsertLeadDocument): Promise<LeadDocument> => storage.createLeadDocument(doc),
  update: (id: number, updates: Partial<InsertLeadDocument>): Promise<LeadDocument> => storage.updateLeadDocument(id, updates),
  delete: (id: number): Promise<void> => storage.deleteLeadDocument(id),
  getUnmigrated: (leadId: number): Promise<LeadDocument[]> => storage.getUnmigratedDocuments(leadId),
};
