/**
 * Quote Storage Operations
 * 
 * Domain-specific wrapper for CPQ quote and version operations.
 */

import { storage } from "../storage";
import type { 
  CpqQuote, InsertCpqQuote, 
  QuoteVersion, InsertQuoteVersion,
  CpqPricingMatrix, CpqUpteamPricingMatrix, CpqCadPricingMatrix, CpqPricingParameter
} from "@shared/schema";

export const cpqQuoteStorage = {
  getById: (id: number): Promise<CpqQuote | undefined> => storage.getCpqQuote(id),
  getByToken: (token: string): Promise<CpqQuote | undefined> => storage.getCpqQuoteByToken(token),
  getByPandadocId: (documentId: string): Promise<CpqQuote | undefined> => storage.getCpqQuoteByPandadocId(documentId),
  getByLeadId: (leadId: number): Promise<CpqQuote[]> => storage.getCpqQuotesByLead(leadId),
  getLatestForLead: (leadId: number): Promise<CpqQuote | undefined> => storage.getLatestCpqQuoteForLead(leadId),
  create: (quote: InsertCpqQuote): Promise<CpqQuote> => storage.createCpqQuote(quote),
  update: (id: number, updates: Partial<InsertCpqQuote>): Promise<CpqQuote | undefined> => storage.updateCpqQuote(id, updates),
  delete: (id: number): Promise<void> => storage.deleteCpqQuote(id),
  createVersion: (sourceQuoteId: number, versionName: string | undefined, createdBy: string): Promise<CpqQuote> => 
    storage.createCpqQuoteVersion(sourceQuoteId, versionName, createdBy),
};

export const quoteVersionStorage = {
  getByLeadId: (leadId: number): Promise<QuoteVersion[]> => storage.getQuoteVersions(leadId),
  getById: (id: number): Promise<QuoteVersion | undefined> => storage.getQuoteVersion(id),
  create: (version: InsertQuoteVersion): Promise<QuoteVersion> => storage.createQuoteVersion(version),
  update: (id: number, updates: Partial<QuoteVersion>): Promise<QuoteVersion> => storage.updateQuoteVersion(id, updates),
  getNextVersionNumber: (leadId: number): Promise<number> => storage.getNextVersionNumber(leadId),
};

export const cpqPricingStorage = {
  getMatrix: (): Promise<CpqPricingMatrix[]> => storage.getCpqPricingMatrix(),
  getUpteamMatrix: (): Promise<CpqUpteamPricingMatrix[]> => storage.getCpqUpteamPricingMatrix(),
  getCadMatrix: (): Promise<CpqCadPricingMatrix[]> => storage.getCpqCadPricingMatrix(),
  getParameters: (): Promise<CpqPricingParameter[]> => storage.getCpqPricingParameters(),
};
