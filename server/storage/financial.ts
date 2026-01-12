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
  InsertAccount, 
  InsertInvoice, 
  InsertInternalLoan, 
  InsertVendorPayable 
} from "@shared/schema";

export const accountStorage = {
  getAll: () => storage.getAccounts(),
  getById: (id: number) => storage.getAccount(id),
  create: (account: InsertAccount) => storage.createAccount(account),
  update: (id: number, updates: Partial<InsertAccount>) => storage.updateAccount(id, updates),
};

export const invoiceStorage = {
  getAll: () => storage.getInvoices(),
  getById: (id: number) => storage.getInvoice(id),
  getByLeadId: (leadId: number) => storage.getInvoicesByLead(leadId),
  getOverdue: () => storage.getOverdueInvoices(),
  create: (invoice: InsertInvoice) => storage.createInvoice(invoice),
  update: (id: number, updates: Parameters<typeof storage.updateInvoice>[1]) => 
    storage.updateInvoice(id, updates),
};

export const internalLoanStorage = {
  getAll: () => storage.getInternalLoans(),
  getActive: () => storage.getActiveLoan(),
  create: (loan: InsertInternalLoan) => storage.createInternalLoan(loan),
  update: (id: number, updates: Parameters<typeof storage.updateInternalLoan>[1]) => 
    storage.updateInternalLoan(id, updates),
};

export const vendorPayableStorage = {
  getAll: () => storage.getVendorPayables(),
  getUnpaid: () => storage.getUnpaidPayables(),
  create: (payable: InsertVendorPayable) => storage.createVendorPayable(payable),
  update: (id: number, updates: Parameters<typeof storage.updateVendorPayable>[1]) => 
    storage.updateVendorPayable(id, updates),
};
