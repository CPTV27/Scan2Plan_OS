import { db } from "./db";
import {
  leads, projects, fieldNotes, settings, leadResearch, scantechs,
  users, accounts, invoices, internalLoans, vendorPayables, quoteVersions, projectAttachments,
  cpqPricingMatrix, cpqUpteamPricingMatrix, cpqCadPricingMatrix, cpqPricingParameters, cpqQuotes,
  caseStudies, notifications, dealAttributions, events, eventRegistrations, qbCustomers, leadDocuments,
  type InsertLead, type InsertProject, type InsertFieldNote, type InsertLeadResearch,
  type Lead, type Project, type FieldNote, type Setting, type LeadResearch, type User, type UserRole,
  type Account, type InsertAccount, type Invoice, type InsertInvoice,
  type InternalLoan, type InsertInternalLoan, type VendorPayable, type InsertVendorPayable,
  type QuoteVersion, type InsertQuoteVersion,
  type Scantech, type InsertScantech,
  type ProjectAttachment, type InsertProjectAttachment,
  type CpqPricingMatrix, type CpqUpteamPricingMatrix, type CpqCadPricingMatrix, type CpqPricingParameter,
  type CpqQuote, type InsertCpqQuote,
  type CaseStudy, type InsertCaseStudy,
  type Notification, type InsertNotification,
  type DealAttribution, type InsertDealAttribution,
  type Event, type InsertEvent, type EventRegistration, type InsertEventRegistration,
  type QbCustomer, type InsertQbCustomer,
  type LeadDocument, type InsertLeadDocument
} from "@shared/schema";
import { eq, desc, and, lt, sql, max, ilike, isNull, isNotNull } from "drizzle-orm";

export interface IStorage {
  // Leads
  getLeads(): Promise<Lead[]>;
  getDeletedLeads(): Promise<Lead[]>;
  getLead(id: number): Promise<Lead | undefined>;
  getLeadByQboInvoiceId(qboInvoiceId: string): Promise<Lead | undefined>;
  getLeadByQboEstimateId(qboEstimateId: string): Promise<Lead | undefined>;
  getLeadByClientName(clientName: string): Promise<Lead | undefined>;
  getLeadsByClientName(clientName: string): Promise<Lead[]>;
  getLeadsByQboCustomerId(qboCustomerId: string): Promise<Lead[]>;
  createLead(lead: InsertLead): Promise<Lead>;
  updateLead(id: number, updates: Partial<InsertLead>): Promise<Lead>;
  softDeleteLead(id: number, deletedBy?: string): Promise<Lead>;
  restoreLead(id: number): Promise<Lead>;
  deleteLead(id: number): Promise<void>;

  // Projects
  getProjects(): Promise<Project[]>;
  getProject(id: number): Promise<Project | undefined>;
  getProjectByLeadId(leadId: number): Promise<Project | undefined>;
  createProject(project: InsertProject): Promise<Project>;
  updateProject(id: number, updates: Partial<InsertProject>): Promise<Project>;

  // Field Notes
  getFieldNotes(): Promise<FieldNote[]>;
  getFieldNote(id: number): Promise<FieldNote | undefined>;
  createFieldNote(note: InsertFieldNote): Promise<FieldNote>;
  updateFieldNote(id: number, updates: Partial<FieldNote>): Promise<FieldNote>;

  // Settings
  getAllSettings(): Promise<Setting[]>;
  getSetting(key: string): Promise<Setting | undefined>;
  setSetting(key: string, value: unknown): Promise<Setting>;

  // Lead Research
  getLeadResearch(leadId: number): Promise<LeadResearch[]>;
  createLeadResearch(research: InsertLeadResearch): Promise<LeadResearch>;

  // User Management
  getAllUsers(): Promise<User[]>;
  updateUserRole(userId: string, role: UserRole): Promise<User | undefined>;

  // Financial Module - Accounts
  getAccounts(): Promise<Account[]>;
  getAccount(id: number): Promise<Account | undefined>;
  createAccount(account: InsertAccount): Promise<Account>;
  updateAccount(id: number, updates: Partial<InsertAccount>): Promise<Account>;

  // Financial Module - Invoices
  getInvoices(): Promise<Invoice[]>;
  getInvoice(id: number): Promise<Invoice | undefined>;
  getInvoicesByLead(leadId: number): Promise<Invoice[]>;
  getOverdueInvoices(): Promise<Invoice[]>;
  createInvoice(invoice: InsertInvoice): Promise<Invoice>;
  updateInvoice(id: number, updates: Partial<Invoice>): Promise<Invoice>;

  // Financial Module - Internal Loans
  getInternalLoans(): Promise<InternalLoan[]>;
  getActiveLoan(): Promise<InternalLoan | undefined>;
  createInternalLoan(loan: InsertInternalLoan): Promise<InternalLoan>;
  updateInternalLoan(id: number, updates: Partial<InternalLoan>): Promise<InternalLoan>;

  // Financial Module - Vendor Payables
  getVendorPayables(): Promise<VendorPayable[]>;
  getUnpaidPayables(): Promise<VendorPayable[]>;
  createVendorPayable(payable: InsertVendorPayable): Promise<VendorPayable>;
  updateVendorPayable(id: number, updates: Partial<VendorPayable>): Promise<VendorPayable>;

  // Quote Versions (CPQ History)
  getQuoteVersions(leadId: number): Promise<QuoteVersion[]>;
  getQuoteVersion(id: number): Promise<QuoteVersion | undefined>;
  createQuoteVersion(version: InsertQuoteVersion): Promise<QuoteVersion>;
  updateQuoteVersion(id: number, updates: Partial<QuoteVersion>): Promise<QuoteVersion>;
  getNextVersionNumber(leadId: number): Promise<number>;

  // ScanTechs (Field Technicians)
  getScantechs(): Promise<Scantech[]>;
  getScantech(id: number): Promise<Scantech | undefined>;
  createScantech(scantech: InsertScantech): Promise<Scantech>;
  updateScantech(id: number, updates: Partial<InsertScantech>): Promise<Scantech>;

  // Project Attachments (Visual Scoping - Drive Sync)
  getProjectAttachments(projectId: number): Promise<ProjectAttachment[]>;
  getLeadAttachments(leadId: number): Promise<ProjectAttachment[]>;
  getAttachment(id: number): Promise<ProjectAttachment | undefined>;
  createAttachment(attachment: InsertProjectAttachment): Promise<ProjectAttachment>;
  deleteAttachment(id: number): Promise<void>;
  countProjectAttachments(projectId: number): Promise<number>;

  // CPQ Internal Pricing & Quotes
  getCpqPricingMatrix(): Promise<CpqPricingMatrix[]>;
  getCpqUpteamPricingMatrix(): Promise<CpqUpteamPricingMatrix[]>;
  getCpqCadPricingMatrix(): Promise<CpqCadPricingMatrix[]>;
  getCpqPricingParameters(): Promise<CpqPricingParameter[]>;
  getCpqQuote(id: number): Promise<CpqQuote | undefined>;
  getCpqQuoteByToken(token: string): Promise<CpqQuote | undefined>;
  getCpqQuotesByLead(leadId: number): Promise<CpqQuote[]>;
  getLatestCpqQuoteForLead(leadId: number): Promise<CpqQuote | undefined>;
  createCpqQuote(quote: InsertCpqQuote): Promise<CpqQuote>;
  updateCpqQuote(id: number, updates: Partial<InsertCpqQuote>): Promise<CpqQuote | undefined>;
  deleteCpqQuote(id: number): Promise<void>;
  createCpqQuoteVersion(sourceQuoteId: number, versionName: string | undefined, createdBy: string): Promise<CpqQuote>;

  // Case Studies (Proof Vault)
  getCaseStudies(): Promise<CaseStudy[]>;
  getCaseStudiesByTags(tags: string[]): Promise<CaseStudy[]>;
  getCaseStudy(id: number): Promise<CaseStudy | undefined>;
  createCaseStudy(study: InsertCaseStudy): Promise<CaseStudy>;
  updateCaseStudy(id: number, updates: Partial<InsertCaseStudy>): Promise<CaseStudy | undefined>;

  // Notifications
  createNotification(notification: InsertNotification): Promise<Notification>;
  getNotificationsForUser(userId: string): Promise<Notification[]>;
  markNotificationRead(id: number): Promise<void>;

  // Deal Attributions (Marketing Influence Tracker)
  getDealAttributions(leadId: number): Promise<DealAttribution[]>;
  createDealAttribution(attribution: InsertDealAttribution): Promise<DealAttribution>;
  deleteDealAttribution(id: number): Promise<void>;

  // Events (Education-Led Sales)
  getEvents(): Promise<Event[]>;
  getEvent(id: number): Promise<Event | undefined>;
  createEvent(event: InsertEvent): Promise<Event>;
  updateEvent(id: number, updates: Partial<InsertEvent>): Promise<Event>;
  deleteEvent(id: number): Promise<void>;

  // Event Registrations
  getEventRegistrations(eventId: number): Promise<EventRegistration[]>;
  getEventRegistrationsByLead(leadId: number): Promise<EventRegistration[]>;
  createEventRegistration(registration: InsertEventRegistration): Promise<EventRegistration>;
  updateEventRegistrationStatus(id: number, status: string, leadId: number): Promise<EventRegistration>;
  deleteEventRegistration(id: number): Promise<void>;

  // ABM Analytics
  getTierAAccountPenetration(): Promise<{ total: number; engaged: number; percentage: number }>;

  // QuickBooks Customers (Synced)
  getQbCustomers(): Promise<QbCustomer[]>;
  searchQbCustomers(query: string): Promise<QbCustomer[]>;
  getQbCustomerByQbId(qbId: string): Promise<QbCustomer | undefined>;
  upsertQbCustomer(customer: InsertQbCustomer): Promise<QbCustomer>;

  // Lead Documents (Files attached to deals)
  getLeadDocuments(leadId: number): Promise<LeadDocument[]>;
  getLeadDocument(id: number): Promise<LeadDocument | undefined>;
  createLeadDocument(doc: InsertLeadDocument): Promise<LeadDocument>;
  updateLeadDocument(id: number, updates: Partial<InsertLeadDocument>): Promise<LeadDocument>;
  deleteLeadDocument(id: number): Promise<void>;
  getUnmigratedDocuments(leadId: number): Promise<LeadDocument[]>;
}

export class DatabaseStorage implements IStorage {
  // Leads
  async getLeads(): Promise<Lead[]> {
    // Filter out soft-deleted leads (deletedAt is null = active)
    return await db.select().from(leads)
      .where(isNull(leads.deletedAt))
      .orderBy(desc(leads.lastContactDate));
  }

  async getDeletedLeads(): Promise<Lead[]> {
    // Get soft-deleted leads for trash view
    return await db.select().from(leads)
      .where(isNotNull(leads.deletedAt))
      .orderBy(desc(leads.deletedAt));
  }

  async getLead(id: number): Promise<Lead | undefined> {
    const [lead] = await db.select().from(leads).where(eq(leads.id, id));
    return lead;
  }

  async getLeadByQboInvoiceId(qboInvoiceId: string): Promise<Lead | undefined> {
    const [lead] = await db.select().from(leads).where(eq(leads.qboInvoiceId, qboInvoiceId));
    return lead;
  }

  async getLeadByQboEstimateId(qboEstimateId: string): Promise<Lead | undefined> {
    const [lead] = await db.select().from(leads).where(eq(leads.qboEstimateId, qboEstimateId));
    return lead;
  }

  async getLeadByClientName(clientName: string): Promise<Lead | undefined> {
    const [lead] = await db.select().from(leads).where(eq(leads.clientName, clientName));
    return lead;
  }

  async getLeadsByClientName(clientName: string): Promise<Lead[]> {
    return await db.select().from(leads).where(eq(leads.clientName, clientName)).orderBy(desc(leads.lastContactDate));
  }

  async getLeadsByQboCustomerId(qboCustomerId: string): Promise<Lead[]> {
    return await db.select().from(leads).where(eq(leads.qboCustomerId, qboCustomerId)).orderBy(desc(leads.lastContactDate));
  }

  async createLead(insertLead: InsertLead): Promise<Lead> {
    const dbValues = {
      ...insertLead,
      value: insertLead.value?.toString(),
      travelRate: insertLead.travelRate?.toString(),
    };
    const [lead] = await db.insert(leads).values(dbValues).returning();
    return lead;
  }

  async updateLead(id: number, updates: Partial<InsertLead>): Promise<Lead> {
    const dbUpdates: Record<string, unknown> = { updatedAt: new Date() };
    
    // Copy over all fields, converting numbers to strings for decimal columns
    for (const [key, value] of Object.entries(updates)) {
      if (value === undefined) continue; // Skip undefined values
      
      if (key === 'value' && value !== null) {
        dbUpdates[key] = value.toString();
      } else if (key === 'travelRate' && value !== null) {
        dbUpdates[key] = value.toString();
      } else {
        dbUpdates[key] = value;
      }
    }
    
    const [updated] = await db.update(leads)
      .set(dbUpdates)
      .where(eq(leads.id, id))
      .returning();
    return updated;
  }

  async softDeleteLead(id: number, deletedBy?: string): Promise<Lead> {
    const [deleted] = await db.update(leads)
      .set({ deletedAt: new Date(), deletedBy: deletedBy || null })
      .where(eq(leads.id, id))
      .returning();
    return deleted;
  }

  async restoreLead(id: number): Promise<Lead> {
    const [restored] = await db.update(leads)
      .set({ deletedAt: null, deletedBy: null })
      .where(eq(leads.id, id))
      .returning();
    return restored;
  }

  async deleteLead(id: number): Promise<void> {
    // Delete all CPQ quotes for this lead (which cascades to PandaDoc documents)
    const leadQuotes = await this.getCpqQuotesByLead(id);
    for (const quote of leadQuotes) {
      await this.deleteCpqQuote(quote.id);
    }
    
    // Delete related records to satisfy foreign key constraints
    await db.delete(leadResearch).where(eq(leadResearch.leadId, id));
    await db.delete(projects).where(eq(projects.leadId, id));
    await db.delete(fieldNotes).where(eq(fieldNotes.leadId, id));
    await db.delete(dealAttributions).where(eq(dealAttributions.leadId, id));
    await db.delete(quoteVersions).where(eq(quoteVersions.leadId, id));
    
    // Finally delete the lead
    await db.delete(leads).where(eq(leads.id, id));
  }

  // Projects
  async getProjects(): Promise<Project[]> {
    return await db.select().from(projects).orderBy(desc(projects.createdAt));
  }

  async getProject(id: number): Promise<Project | undefined> {
    const [project] = await db.select().from(projects).where(eq(projects.id, id));
    return project;
  }

  async getProjectByLeadId(leadId: number): Promise<Project | undefined> {
    const [project] = await db.select().from(projects).where(eq(projects.leadId, leadId));
    return project;
  }

  async createProject(insertProject: InsertProject): Promise<Project> {
    const [project] = await db.insert(projects).values(insertProject).returning();
    return project;
  }

  async updateProject(id: number, updates: Partial<InsertProject>): Promise<Project> {
    const [updated] = await db.update(projects)
      .set(updates)
      .where(eq(projects.id, id))
      .returning();
    return updated;
  }

  // Field Notes
  async getFieldNotes(): Promise<FieldNote[]> {
    return await db.select().from(fieldNotes).orderBy(desc(fieldNotes.createdAt));
  }

  async getFieldNote(id: number): Promise<FieldNote | undefined> {
    const [note] = await db.select().from(fieldNotes).where(eq(fieldNotes.id, id));
    return note;
  }

  async createFieldNote(insertNote: InsertFieldNote): Promise<FieldNote> {
    const [note] = await db.insert(fieldNotes).values(insertNote).returning();
    return note;
  }

  async updateFieldNote(id: number, updates: Partial<FieldNote>): Promise<FieldNote> {
    const [updated] = await db.update(fieldNotes)
      .set(updates)
      .where(eq(fieldNotes.id, id))
      .returning();
    return updated;
  }

  // Settings
  async getAllSettings(): Promise<Setting[]> {
    return await db.select().from(settings);
  }

  async getSetting(key: string): Promise<Setting | undefined> {
    const [setting] = await db.select().from(settings).where(eq(settings.key, key));
    return setting;
  }

  async setSetting(key: string, value: unknown): Promise<Setting> {
    const existing = await this.getSetting(key);
    if (existing) {
      const [updated] = await db.update(settings)
        .set({ value, updatedAt: new Date() })
        .where(eq(settings.key, key))
        .returning();
      return updated;
    } else {
      const [created] = await db.insert(settings)
        .values({ key, value })
        .returning();
      return created;
    }
  }

  // Lead Research
  async getLeadResearch(leadId: number): Promise<LeadResearch[]> {
    return await db.select().from(leadResearch)
      .where(eq(leadResearch.leadId, leadId))
      .orderBy(desc(leadResearch.createdAt));
  }

  async getAllResearch(): Promise<LeadResearch[]> {
    return await db.select().from(leadResearch)
      .orderBy(desc(leadResearch.createdAt));
  }

  async createLeadResearch(research: InsertLeadResearch): Promise<LeadResearch> {
    const [created] = await db.insert(leadResearch).values(research).returning();
    return created;
  }

  // User Management
  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users).orderBy(desc(users.createdAt));
  }

  async updateUserRole(userId: string, role: UserRole): Promise<User | undefined> {
    const [updated] = await db.update(users)
      .set({ role, updatedAt: new Date() })
      .where(eq(users.id, userId))
      .returning();
    return updated;
  }

  // === FINANCIAL MODULE ===

  // Accounts (Profit First)
  async getAccounts(): Promise<Account[]> {
    return await db.select().from(accounts).orderBy(accounts.accountType);
  }

  async getAccount(id: number): Promise<Account | undefined> {
    const [account] = await db.select().from(accounts).where(eq(accounts.id, id));
    return account;
  }

  async createAccount(insertAccount: InsertAccount): Promise<Account> {
    const dbValues = {
      ...insertAccount,
      actualBalance: insertAccount.actualBalance?.toString() || "0",
      virtualBalance: insertAccount.virtualBalance?.toString() || "0",
      allocationPercent: insertAccount.allocationPercent.toString(),
    };
    const [account] = await db.insert(accounts).values(dbValues).returning();
    return account;
  }

  async updateAccount(id: number, updates: Partial<InsertAccount>): Promise<Account> {
    const dbUpdates: Record<string, unknown> = { updatedAt: new Date() };
    for (const [key, value] of Object.entries(updates)) {
      if (value === undefined) continue;
      if (key === 'actualBalance' || key === 'virtualBalance' || key === 'allocationPercent') {
        dbUpdates[key] = value?.toString();
      } else {
        dbUpdates[key] = value;
      }
    }
    const [updated] = await db.update(accounts).set(dbUpdates).where(eq(accounts.id, id)).returning();
    return updated;
  }

  // Invoices (AR with Interest)
  async getInvoices(): Promise<Invoice[]> {
    return await db.select().from(invoices).orderBy(desc(invoices.dueDate));
  }

  async getInvoice(id: number): Promise<Invoice | undefined> {
    const [invoice] = await db.select().from(invoices).where(eq(invoices.id, id));
    return invoice;
  }

  async getInvoicesByLead(leadId: number): Promise<Invoice[]> {
    return await db.select().from(invoices).where(eq(invoices.leadId, leadId)).orderBy(desc(invoices.dueDate));
  }

  async getOverdueInvoices(): Promise<Invoice[]> {
    const now = new Date();
    return await db.select().from(invoices)
      .where(and(
        lt(invoices.dueDate, now),
        sql`${invoices.status} != 'Paid' AND ${invoices.status} != 'Written Off'`
      ))
      .orderBy(desc(invoices.dueDate));
  }

  async createInvoice(insertInvoice: InsertInvoice): Promise<Invoice> {
    const dbValues = {
      ...insertInvoice,
      totalAmount: insertInvoice.totalAmount.toString(),
      amountPaid: (insertInvoice.amountPaid || 0).toString(),
    };
    const [invoice] = await db.insert(invoices).values(dbValues).returning();
    return invoice;
  }

  async updateInvoice(id: number, updates: Partial<Invoice>): Promise<Invoice> {
    const dbUpdates: Record<string, unknown> = { updatedAt: new Date() };
    for (const [key, value] of Object.entries(updates)) {
      if (value === undefined) continue;
      if (key === 'totalAmount' || key === 'amountPaid' || key === 'interestAccrued') {
        dbUpdates[key] = value?.toString();
      } else {
        dbUpdates[key] = value;
      }
    }
    const [updated] = await db.update(invoices).set(dbUpdates).where(eq(invoices.id, id)).returning();
    return updated;
  }

  // Internal Loans
  async getInternalLoans(): Promise<InternalLoan[]> {
    return await db.select().from(internalLoans).orderBy(desc(internalLoans.loanDate));
  }

  async getActiveLoan(): Promise<InternalLoan | undefined> {
    const [loan] = await db.select().from(internalLoans)
      .where(eq(internalLoans.isFullyRepaid, false))
      .orderBy(desc(internalLoans.loanDate));
    return loan;
  }

  async createInternalLoan(insertLoan: InsertInternalLoan): Promise<InternalLoan> {
    const originalAmount = insertLoan.originalAmount;
    const amountRepaid = insertLoan.amountRepaid || 0;
    const remainingBalance = originalAmount - amountRepaid;
    
    const dbValues = {
      ...insertLoan,
      originalAmount: originalAmount.toString(),
      amountRepaid: amountRepaid.toString(),
      remainingBalance: remainingBalance.toString(),
      isFullyRepaid: remainingBalance <= 0,
    };
    const [loan] = await db.insert(internalLoans).values(dbValues).returning();
    return loan;
  }

  async updateInternalLoan(id: number, updates: Partial<InternalLoan>): Promise<InternalLoan> {
    const dbUpdates: Record<string, unknown> = { updatedAt: new Date() };
    for (const [key, value] of Object.entries(updates)) {
      if (value === undefined) continue;
      if (key === 'originalAmount' || key === 'amountRepaid' || key === 'remainingBalance') {
        dbUpdates[key] = value?.toString();
      } else {
        dbUpdates[key] = value;
      }
    }
    const [updated] = await db.update(internalLoans).set(dbUpdates).where(eq(internalLoans.id, id)).returning();
    return updated;
  }

  // Vendor Payables (AP)
  async getVendorPayables(): Promise<VendorPayable[]> {
    return await db.select().from(vendorPayables).orderBy(vendorPayables.dueDate);
  }

  async getUnpaidPayables(): Promise<VendorPayable[]> {
    return await db.select().from(vendorPayables)
      .where(eq(vendorPayables.isPaid, false))
      .orderBy(vendorPayables.dueDate);
  }

  async createVendorPayable(insertPayable: InsertVendorPayable): Promise<VendorPayable> {
    const dbValues = {
      ...insertPayable,
      amount: insertPayable.amount.toString(),
    };
    const [payable] = await db.insert(vendorPayables).values(dbValues).returning();
    return payable;
  }

  async updateVendorPayable(id: number, updates: Partial<VendorPayable>): Promise<VendorPayable> {
    const dbUpdates: Record<string, unknown> = { updatedAt: new Date() };
    for (const [key, value] of Object.entries(updates)) {
      if (value === undefined) continue;
      if (key === 'amount') {
        dbUpdates[key] = value?.toString();
      } else {
        dbUpdates[key] = value;
      }
    }
    const [updated] = await db.update(vendorPayables).set(dbUpdates).where(eq(vendorPayables.id, id)).returning();
    return updated;
  }

  // Quote Versions (CPQ History)
  async getQuoteVersions(leadId: number): Promise<QuoteVersion[]> {
    return await db.select().from(quoteVersions)
      .where(eq(quoteVersions.leadId, leadId))
      .orderBy(desc(quoteVersions.versionNumber));
  }

  async getQuoteVersion(id: number): Promise<QuoteVersion | undefined> {
    const [version] = await db.select().from(quoteVersions).where(eq(quoteVersions.id, id));
    return version;
  }

  async createQuoteVersion(insertVersion: InsertQuoteVersion): Promise<QuoteVersion> {
    const [version] = await db.insert(quoteVersions).values(insertVersion).returning();
    return version;
  }

  async updateQuoteVersion(id: number, updates: Partial<QuoteVersion>): Promise<QuoteVersion> {
    const [updated] = await db.update(quoteVersions).set(updates).where(eq(quoteVersions.id, id)).returning();
    return updated;
  }

  async getNextVersionNumber(leadId: number): Promise<number> {
    const result = await db.select({ maxVersion: max(quoteVersions.versionNumber) })
      .from(quoteVersions)
      .where(eq(quoteVersions.leadId, leadId));
    return (result[0]?.maxVersion ?? 0) + 1;
  }

  // ScanTechs (Field Technicians)
  async getScantechs(): Promise<Scantech[]> {
    return await db.select().from(scantechs).orderBy(scantechs.name);
  }

  async getScantech(id: number): Promise<Scantech | undefined> {
    const [scantech] = await db.select().from(scantechs).where(eq(scantechs.id, id));
    return scantech;
  }

  async createScantech(insertScantech: InsertScantech): Promise<Scantech> {
    const [scantech] = await db.insert(scantechs).values(insertScantech).returning();
    return scantech;
  }

  async updateScantech(id: number, updates: Partial<InsertScantech>): Promise<Scantech> {
    const [updated] = await db.update(scantechs).set(updates).where(eq(scantechs.id, id)).returning();
    return updated;
  }

  // Project Attachments (Visual Scoping - Drive Sync)
  async getProjectAttachments(projectId: number): Promise<ProjectAttachment[]> {
    return await db.select().from(projectAttachments)
      .where(eq(projectAttachments.projectId, projectId))
      .orderBy(desc(projectAttachments.createdAt));
  }

  async getLeadAttachments(leadId: number): Promise<ProjectAttachment[]> {
    return await db.select().from(projectAttachments)
      .where(eq(projectAttachments.leadId, leadId))
      .orderBy(desc(projectAttachments.createdAt));
  }

  async getAttachment(id: number): Promise<ProjectAttachment | undefined> {
    const [attachment] = await db.select().from(projectAttachments).where(eq(projectAttachments.id, id));
    return attachment;
  }

  async createAttachment(insertAttachment: InsertProjectAttachment): Promise<ProjectAttachment> {
    const [attachment] = await db.insert(projectAttachments).values(insertAttachment).returning();
    return attachment;
  }

  async deleteAttachment(id: number): Promise<void> {
    await db.delete(projectAttachments).where(eq(projectAttachments.id, id));
  }

  async countProjectAttachments(projectId: number): Promise<number> {
    const result = await db.select({ count: sql<number>`count(*)::int` })
      .from(projectAttachments)
      .where(eq(projectAttachments.projectId, projectId));
    return result[0]?.count ?? 0;
  }

  // CPQ Internal Pricing & Quotes
  async getCpqPricingMatrix(): Promise<CpqPricingMatrix[]> {
    return await db.select().from(cpqPricingMatrix);
  }

  async getCpqUpteamPricingMatrix(): Promise<CpqUpteamPricingMatrix[]> {
    return await db.select().from(cpqUpteamPricingMatrix);
  }

  async getCpqCadPricingMatrix(): Promise<CpqCadPricingMatrix[]> {
    return await db.select().from(cpqCadPricingMatrix);
  }

  async getCpqPricingParameters(): Promise<CpqPricingParameter[]> {
    return await db.select().from(cpqPricingParameters);
  }

  async getCpqQuote(id: number): Promise<CpqQuote | undefined> {
    const [quote] = await db.select().from(cpqQuotes).where(eq(cpqQuotes.id, id));
    return quote;
  }

  async getCpqQuoteByToken(token: string): Promise<CpqQuote | undefined> {
    const [quote] = await db.select().from(cpqQuotes).where(eq(cpqQuotes.clientToken, token));
    return quote;
  }

  async getCpqQuotesByLead(leadId: number): Promise<CpqQuote[]> {
    return await db.select().from(cpqQuotes)
      .where(eq(cpqQuotes.leadId, leadId))
      .orderBy(desc(cpqQuotes.versionNumber));
  }

  async getLatestCpqQuoteForLead(leadId: number): Promise<CpqQuote | undefined> {
    const [quote] = await db.select().from(cpqQuotes)
      .where(and(eq(cpqQuotes.leadId, leadId), eq(cpqQuotes.isLatest, true)))
      .limit(1);
    return quote;
  }

  async createCpqQuote(insertQuote: InsertCpqQuote): Promise<CpqQuote> {
    // Use provided quoteNumber or generate a new one (check undefined explicitly for empty string support)
    const quoteNumber = insertQuote.quoteNumber !== undefined && insertQuote.quoteNumber !== '' 
      ? insertQuote.quoteNumber 
      : `Q${Date.now()}`;
    
    // Check if versionNumber was explicitly provided
    const providedVersionNumber = (insertQuote as any).versionNumber;
    let versionNumber = providedVersionNumber ?? 1;
    let shouldBeLatest = true;
    
    if (insertQuote.leadId) {
      const existingQuotes = await db.select().from(cpqQuotes)
        .where(eq(cpqQuotes.leadId, insertQuote.leadId));
      
      const maxVersion = Math.max(...existingQuotes.map(q => q.versionNumber), 0);
      
      // Only auto-increment if no version was provided
      if (providedVersionNumber === undefined || providedVersionNumber === null) {
        versionNumber = maxVersion + 1;
      }
      
      // Only mark as latest if this version is strictly greater than current max
      // or if there are no existing quotes (maxVersion is 0)
      shouldBeLatest = maxVersion === 0 || versionNumber > maxVersion;
      
      // Only update isLatest flags if this will be the new latest
      if (shouldBeLatest && existingQuotes.length > 0) {
        await db.update(cpqQuotes)
          .set({ isLatest: false })
          .where(eq(cpqQuotes.leadId, insertQuote.leadId));
      }
    }
    
    const [quote] = await db.insert(cpqQuotes).values({
      ...insertQuote,
      quoteNumber,
      versionNumber,
      isLatest: shouldBeLatest,
    }).returning();
    return quote;
  }

  async updateCpqQuote(id: number, updates: Partial<InsertCpqQuote>): Promise<CpqQuote | undefined> {
    const [updated] = await db.update(cpqQuotes)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(cpqQuotes.id, id))
      .returning();
    return updated;
  }

  async deleteCpqQuote(id: number): Promise<void> {
    // First delete any PandaDoc documents referencing this quote
    await db.delete(pandaDocDocuments).where(eq(pandaDocDocuments.cpqQuoteId, id));
    await db.delete(cpqQuotes).where(eq(cpqQuotes.id, id));
  }

  async createCpqQuoteVersion(sourceQuoteId: number, versionName: string | undefined, createdBy: string): Promise<CpqQuote> {
    const sourceQuote = await this.getCpqQuote(sourceQuoteId);
    if (!sourceQuote) {
      throw new Error("Source quote not found");
    }

    // Determine the root parent ID
    const rootId = sourceQuote.parentQuoteId || sourceQuote.id;

    // Get all existing versions to determine the next version number
    const existingVersions = await db.select().from(cpqQuotes)
      .where(sql`${cpqQuotes.id} = ${rootId} OR ${cpqQuotes.parentQuoteId} = ${rootId}`);
    const maxVersion = Math.max(...existingVersions.map(v => v.versionNumber), 0);
    const newVersionNumber = maxVersion + 1;

    // Generate new quote number
    const quoteNumber = `Q${Date.now()}`;

    // Create the new version by copying all data from source
    const { id, quoteNumber: _qn, createdAt, updatedAt, versionNumber, versionName: _vn, parentQuoteId: _pid, ...quoteData } = sourceQuote;

    const [newVersion] = await db.insert(cpqQuotes).values({
      ...quoteData,
      quoteNumber,
      parentQuoteId: rootId,
      versionNumber: newVersionNumber,
      versionName: versionName || `Version ${newVersionNumber}`,
      createdBy,
    }).returning();

    return newVersion;
  }

  // Case Studies (Proof Vault)
  async getCaseStudies(): Promise<CaseStudy[]> {
    return await db.select().from(caseStudies)
      .where(eq(caseStudies.isActive, true))
      .orderBy(desc(caseStudies.createdAt));
  }

  async getCaseStudiesByTags(tags: string[]): Promise<CaseStudy[]> {
    if (!tags.length) return this.getCaseStudies();
    const allStudies = await this.getCaseStudies();
    return allStudies.filter(study => 
      study.tags.some(tag => tags.some(t => 
        tag.toLowerCase().includes(t.toLowerCase()) || t.toLowerCase().includes(tag.toLowerCase())
      ))
    );
  }

  async getCaseStudy(id: number): Promise<CaseStudy | undefined> {
    const [study] = await db.select().from(caseStudies).where(eq(caseStudies.id, id));
    return study;
  }

  async createCaseStudy(insertStudy: InsertCaseStudy): Promise<CaseStudy> {
    const [study] = await db.insert(caseStudies).values(insertStudy).returning();
    return study;
  }

  async updateCaseStudy(id: number, updates: Partial<InsertCaseStudy>): Promise<CaseStudy | undefined> {
    const [updated] = await db.update(caseStudies)
      .set(updates)
      .where(eq(caseStudies.id, id))
      .returning();
    return updated;
  }

  // Notifications
  async createNotification(notification: InsertNotification): Promise<Notification> {
    const [created] = await db.insert(notifications).values(notification).returning();
    return created;
  }

  async getNotificationsForUser(userId: string): Promise<Notification[]> {
    return await db.select().from(notifications)
      .where(eq(notifications.userId, userId))
      .orderBy(desc(notifications.createdAt));
  }

  async markNotificationRead(id: number): Promise<void> {
    await db.update(notifications)
      .set({ read: true })
      .where(eq(notifications.id, id));
  }

  // Deal Attributions (Marketing Influence Tracker)
  async getDealAttributions(leadId: number): Promise<DealAttribution[]> {
    return await db.select().from(dealAttributions)
      .where(eq(dealAttributions.leadId, leadId))
      .orderBy(desc(dealAttributions.recordedAt));
  }

  async createDealAttribution(attribution: InsertDealAttribution): Promise<DealAttribution> {
    const [created] = await db.insert(dealAttributions).values(attribution).returning();
    return created;
  }

  async deleteDealAttribution(id: number): Promise<void> {
    await db.delete(dealAttributions).where(eq(dealAttributions.id, id));
  }

  // Events (Education-Led Sales)
  async getEvents(): Promise<Event[]> {
    return await db.select().from(events).orderBy(desc(events.date));
  }

  async getEvent(id: number): Promise<Event | undefined> {
    const [event] = await db.select().from(events).where(eq(events.id, id));
    return event;
  }

  async createEvent(insertEvent: InsertEvent): Promise<Event> {
    const dbValues = {
      ...insertEvent,
      ceuCredits: insertEvent.ceuCredits?.toString(),
    };
    const [event] = await db.insert(events).values(dbValues).returning();
    return event;
  }

  async updateEvent(id: number, updates: Partial<InsertEvent>): Promise<Event> {
    const dbUpdates: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(updates)) {
      if (value === undefined) continue;
      if (key === 'ceuCredits' && value !== null) {
        dbUpdates[key] = value.toString();
      } else {
        dbUpdates[key] = value;
      }
    }
    const [updated] = await db.update(events)
      .set(dbUpdates)
      .where(eq(events.id, id))
      .returning();
    return updated;
  }

  async deleteEvent(id: number): Promise<void> {
    // First delete related registrations
    await db.delete(eventRegistrations).where(eq(eventRegistrations.eventId, id));
    await db.delete(events).where(eq(events.id, id));
  }

  // Event Registrations
  async getEventRegistrations(eventId: number): Promise<EventRegistration[]> {
    return await db.select().from(eventRegistrations)
      .where(eq(eventRegistrations.eventId, eventId))
      .orderBy(desc(eventRegistrations.registeredAt));
  }

  async getEventRegistrationsByLead(leadId: number): Promise<EventRegistration[]> {
    return await db.select().from(eventRegistrations)
      .where(eq(eventRegistrations.leadId, leadId))
      .orderBy(desc(eventRegistrations.registeredAt));
  }

  async createEventRegistration(registration: InsertEventRegistration): Promise<EventRegistration> {
    const [created] = await db.insert(eventRegistrations).values(registration).returning();
    return created;
  }

  async updateEventRegistrationStatus(id: number, status: string, leadId: number): Promise<EventRegistration> {
    const updateData: Record<string, unknown> = { status };
    
    // Set timestamp based on status
    if (status === 'attended') {
      updateData.attendedAt = new Date();
      // Award +10 lead score points for attending
      await db.update(leads)
        .set({ leadScore: sql`COALESCE(lead_score, 0) + 10` })
        .where(eq(leads.id, leadId));
    } else if (status === 'certificate_sent') {
      updateData.certificateSentAt = new Date();
    }
    
    const [updated] = await db.update(eventRegistrations)
      .set(updateData)
      .where(eq(eventRegistrations.id, id))
      .returning();
    return updated;
  }

  async deleteEventRegistration(id: number): Promise<void> {
    await db.delete(eventRegistrations).where(eq(eventRegistrations.id, id));
  }

  // ABM Analytics
  async getTierAAccountPenetration(): Promise<{ total: number; engaged: number; percentage: number }> {
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    // Count total Tier A accounts
    const [totalResult] = await db.select({ count: sql<number>`COUNT(*)` })
      .from(leads)
      .where(eq(leads.abmTier, 'Tier A'));
    const total = Number(totalResult?.count || 0);

    // Count Tier A accounts with Meeting or Proposal stage in last 90 days
    const [engagedResult] = await db.select({ count: sql<number>`COUNT(*)` })
      .from(leads)
      .where(and(
        eq(leads.abmTier, 'Tier A'),
        sql`(deal_stage IN ('Proposal', 'Negotiation', 'Closed Won') OR last_contact_date >= ${ninetyDaysAgo})`
      ));
    const engaged = Number(engagedResult?.count || 0);

    const percentage = total > 0 ? Math.round((engaged / total) * 100) : 0;

    return { total, engaged, percentage };
  }

  // QuickBooks Customers
  async getQbCustomers(): Promise<QbCustomer[]> {
    return await db.select().from(qbCustomers).orderBy(qbCustomers.displayName);
  }

  async searchQbCustomers(query: string): Promise<QbCustomer[]> {
    if (!query || query.length < 2) return [];
    const searchPattern = `%${query}%`;
    return await db.select().from(qbCustomers)
      .where(ilike(qbCustomers.displayName, searchPattern))
      .orderBy(qbCustomers.displayName)
      .limit(20);
  }

  async getQbCustomerByQbId(qbId: string): Promise<QbCustomer | undefined> {
    const [customer] = await db.select().from(qbCustomers).where(eq(qbCustomers.qbId, qbId));
    return customer;
  }

  async upsertQbCustomer(customer: InsertQbCustomer): Promise<QbCustomer> {
    const existing = await this.getQbCustomerByQbId(customer.qbId);
    if (existing) {
      const [updated] = await db.update(qbCustomers)
        .set({ ...customer, syncedAt: new Date() })
        .where(eq(qbCustomers.qbId, customer.qbId))
        .returning();
      return updated;
    } else {
      const [created] = await db.insert(qbCustomers).values(customer).returning();
      return created;
    }
  }

  // Lead Documents
  async getLeadDocuments(leadId: number): Promise<LeadDocument[]> {
    return await db.select().from(leadDocuments)
      .where(eq(leadDocuments.leadId, leadId))
      .orderBy(desc(leadDocuments.uploadedAt));
  }

  async getLeadDocument(id: number): Promise<LeadDocument | undefined> {
    const [doc] = await db.select().from(leadDocuments).where(eq(leadDocuments.id, id));
    return doc;
  }

  async createLeadDocument(doc: InsertLeadDocument): Promise<LeadDocument> {
    const [created] = await db.insert(leadDocuments).values(doc).returning();
    return created;
  }

  async updateLeadDocument(id: number, updates: Partial<InsertLeadDocument>): Promise<LeadDocument> {
    const [updated] = await db.update(leadDocuments)
      .set(updates)
      .where(eq(leadDocuments.id, id))
      .returning();
    return updated;
  }

  async deleteLeadDocument(id: number): Promise<void> {
    await db.delete(leadDocuments).where(eq(leadDocuments.id, id));
  }

  async getUnmigratedDocuments(leadId: number): Promise<LeadDocument[]> {
    return await db.select().from(leadDocuments)
      .where(and(
        eq(leadDocuments.leadId, leadId),
        isNull(leadDocuments.movedToDriveAt)
      ))
      .orderBy(leadDocuments.uploadedAt);
  }
}

export const storage = new DatabaseStorage();
