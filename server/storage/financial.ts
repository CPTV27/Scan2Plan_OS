/**
 * Financial Storage Operations
 * 
 * Domain-specific wrapper for financial module operations:
 * - Accounts
 * - Invoices
 * - Internal Loans
 * - Vendor Payables
 */

import { storage } from "../storage";
import type { 
  Account, InsertAccount, 
  Invoice, InsertInvoice,
  InternalLoan, InsertInternalLoan, 
  VendorPayable, InsertVendorPayable 
} from "@shared/schema";

export const accountStorage = {
  getAll: (): Promise<Account[]> => storage.getAccounts(),
  getById: (id: number): Promise<Account | undefined> => storage.getAccount(id),
  create: (account: InsertAccount): Promise<Account> => storage.createAccount(account),
  update: (id: number, updates: Partial<InsertAccount>): Promise<Account> => storage.updateAccount(id, updates),
};

export const invoiceStorage = {
  getAll: (): Promise<Invoice[]> => storage.getInvoices(),
  getById: (id: number): Promise<Invoice | undefined> => storage.getInvoice(id),
  getByLeadId: (leadId: number): Promise<Invoice[]> => storage.getInvoicesByLead(leadId),
  getOverdue: (): Promise<Invoice[]> => storage.getOverdueInvoices(),
  create: (invoice: InsertInvoice): Promise<Invoice> => storage.createInvoice(invoice),
  update: (id: number, updates: Partial<Invoice>): Promise<Invoice> => storage.updateInvoice(id, updates),
};

export const internalLoanStorage = {
  getAll: (): Promise<InternalLoan[]> => storage.getInternalLoans(),
  getActive: (): Promise<InternalLoan | undefined> => storage.getActiveLoan(),
  create: (loan: InsertInternalLoan): Promise<InternalLoan> => storage.createInternalLoan(loan),
  update: (id: number, updates: Partial<InternalLoan>): Promise<InternalLoan> => storage.updateInternalLoan(id, updates),
};

export const vendorPayableStorage = {
  getAll: (): Promise<VendorPayable[]> => storage.getVendorPayables(),
  getUnpaid: (): Promise<VendorPayable[]> => storage.getUnpaidPayables(),
  create: (payable: InsertVendorPayable): Promise<VendorPayable> => storage.createVendorPayable(payable),
  update: (id: number, updates: Partial<VendorPayable>): Promise<VendorPayable> => storage.updateVendorPayable(id, updates),
};
