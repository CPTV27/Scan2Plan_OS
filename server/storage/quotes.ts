/**
 * Quote Storage Operations
 * 
 * Domain-specific wrapper for CPQ quote and version operations.
 */

import { storage } from "../storage";
import type { InsertCpqQuote } from "@shared/schema";

export const cpqQuoteStorage = {
  getById: (id: number) => storage.getCpqQuote(id),
  getByToken: (token: string) => storage.getCpqQuoteByToken(token),
  getByPandadocId: (documentId: string) => storage.getCpqQuoteByPandadocId(documentId),
  getByLeadId: (leadId: number) => storage.getCpqQuotesByLead(leadId),
  getLatestForLead: (leadId: number) => storage.getLatestCpqQuoteForLead(leadId),
  create: (quote: InsertCpqQuote) => storage.createCpqQuote(quote),
  update: (id: number, updates: Partial<InsertCpqQuote>) => storage.updateCpqQuote(id, updates),
  delete: (id: number) => storage.deleteCpqQuote(id),
  createVersion: (sourceQuoteId: number, versionName: string | undefined, createdBy: string) => 
    storage.createCpqQuoteVersion(sourceQuoteId, versionName, createdBy),
};

export const quoteVersionStorage = {
  getByLeadId: (leadId: number) => storage.getQuoteVersions(leadId),
  getById: (id: number) => storage.getQuoteVersion(id),
  create: (version: Parameters<typeof storage.createQuoteVersion>[0]) => 
    storage.createQuoteVersion(version),
  update: (id: number, updates: Parameters<typeof storage.updateQuoteVersion>[1]) => 
    storage.updateQuoteVersion(id, updates),
  getNextVersionNumber: (leadId: number) => storage.getNextVersionNumber(leadId),
};

export const cpqPricingStorage = {
  getMatrix: () => storage.getCpqPricingMatrix(),
  getUpteamMatrix: () => storage.getCpqUpteamPricingMatrix(),
  getCadMatrix: () => storage.getCpqCadPricingMatrix(),
  getParameters: () => storage.getCpqPricingParameters(),
};
