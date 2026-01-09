import { db } from "./db";
import { quickbooksTokens, expenses, type Expense, type InsertExpense } from "@shared/schema";
import { eq, desc } from "drizzle-orm";

const QB_BASE_URL = process.env.QB_SANDBOX === "true" 
  ? "https://sandbox-quickbooks.api.intuit.com"
  : "https://quickbooks.api.intuit.com";

const QB_AUTH_URL = "https://appcenter.intuit.com/connect/oauth2";
const QB_TOKEN_URL = "https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer";

interface QBTokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  x_refresh_token_expires_in: number;
  token_type: string;
}

interface QBExpense {
  Id: string;
  TxnDate: string;
  TotalAmt: number;
  Line: Array<{
    Description?: string;
    Amount: number;
    DetailType: string;
    AccountBasedExpenseLineDetail?: {
      AccountRef: { name: string; value: string };
      BillableStatus?: string;
    };
  }>;
  EntityRef?: { name: string; value: string };
  AccountRef?: { name: string; value: string };
  PrivateNote?: string;
}

export class QuickBooksClient {
  private clientId: string;
  private clientSecret: string;
  private redirectUri: string;

  constructor() {
    this.clientId = process.env.QUICKBOOKS_CLIENT_ID || "";
    this.clientSecret = process.env.QUICKBOOKS_CLIENT_SECRET || "";
    this.redirectUri = process.env.QUICKBOOKS_REDIRECT_URI || "";
  }

  isConfigured(): boolean {
    return !!(this.clientId && this.clientSecret && this.redirectUri);
  }

  getAuthUrl(state: string): string {
    const params = new URLSearchParams({
      client_id: this.clientId,
      response_type: "code",
      scope: "com.intuit.quickbooks.accounting",
      redirect_uri: this.redirectUri,
      state,
    });
    return `${QB_AUTH_URL}?${params.toString()}`;
  }

  async exchangeCodeForTokens(code: string, realmId: string): Promise<void> {
    const response = await fetch(QB_TOKEN_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Authorization": `Basic ${Buffer.from(`${this.clientId}:${this.clientSecret}`).toString("base64")}`,
      },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: this.redirectUri,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to exchange code: ${error}`);
    }

    const data: QBTokenResponse = await response.json();
    await this.saveTokens(data, realmId);
  }

  private async saveTokens(data: QBTokenResponse, realmId: string): Promise<void> {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + data.expires_in * 1000);
    const refreshExpiresAt = new Date(now.getTime() + data.x_refresh_token_expires_in * 1000);

    const existing = await db.select().from(quickbooksTokens).limit(1);
    
    if (existing.length > 0) {
      await db.update(quickbooksTokens)
        .set({
          accessToken: data.access_token,
          refreshToken: data.refresh_token,
          realmId,
          expiresAt,
          refreshExpiresAt,
          updatedAt: now,
        })
        .where(eq(quickbooksTokens.id, existing[0].id));
    } else {
      await db.insert(quickbooksTokens).values({
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        realmId,
        expiresAt,
        refreshExpiresAt,
      });
    }
  }

  async getValidToken(): Promise<{ accessToken: string; realmId: string } | null> {
    const tokens = await db.select().from(quickbooksTokens).limit(1);
    if (tokens.length === 0) return null;

    const token = tokens[0];
    const now = new Date();

    if (token.expiresAt <= now) {
      if (token.refreshExpiresAt <= now) {
        await db.delete(quickbooksTokens).where(eq(quickbooksTokens.id, token.id));
        return null;
      }
      await this.refreshAccessToken(token.refreshToken, token.realmId);
      const refreshed = await db.select().from(quickbooksTokens).limit(1);
      return refreshed.length > 0 
        ? { accessToken: refreshed[0].accessToken, realmId: refreshed[0].realmId }
        : null;
    }

    return { accessToken: token.accessToken, realmId: token.realmId };
  }

  private async refreshAccessToken(refreshToken: string, realmId: string): Promise<void> {
    const response = await fetch(QB_TOKEN_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Authorization": `Basic ${Buffer.from(`${this.clientId}:${this.clientSecret}`).toString("base64")}`,
      },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: refreshToken,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to refresh token: ${error}`);
    }

    const data: QBTokenResponse = await response.json();
    await this.saveTokens(data, realmId);
  }

  async disconnect(): Promise<void> {
    await db.delete(quickbooksTokens);
  }

  async isConnected(): Promise<boolean> {
    const token = await this.getValidToken();
    return token !== null;
  }

  async fetchExpenses(startDate?: Date, endDate?: Date): Promise<QBExpense[]> {
    const token = await this.getValidToken();
    if (!token) throw new Error("QuickBooks not connected");

    const start = startDate || new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
    const end = endDate || new Date();

    const query = `SELECT * FROM Purchase WHERE TxnDate >= '${start.toISOString().split("T")[0]}' AND TxnDate <= '${end.toISOString().split("T")[0]}' MAXRESULTS 1000`;

    const response = await fetch(
      `${QB_BASE_URL}/v3/company/${token.realmId}/query?query=${encodeURIComponent(query)}`,
      {
        headers: {
          "Authorization": `Bearer ${token.accessToken}`,
          "Accept": "application/json",
        },
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to fetch expenses: ${error}`);
    }

    const data = await response.json();
    return data.QueryResponse?.Purchase || [];
  }

  async syncExpenses(): Promise<{ synced: number; errors: string[] }> {
    const qbExpenses = await this.fetchExpenses();
    const results = { synced: 0, errors: [] as string[] };

    for (const qbExp of qbExpenses) {
      try {
        const existing = await db.select()
          .from(expenses)
          .where(eq(expenses.qbExpenseId, qbExp.Id))
          .limit(1);

        const firstLine = qbExp.Line?.[0];
        const expenseData: InsertExpense = {
          qbExpenseId: qbExp.Id,
          vendorName: qbExp.EntityRef?.name || null,
          description: firstLine?.Description || qbExp.PrivateNote || null,
          amount: String(qbExp.TotalAmt),
          expenseDate: new Date(qbExp.TxnDate),
          category: this.categorizeExpense(firstLine?.AccountBasedExpenseLineDetail?.AccountRef?.name),
          accountName: firstLine?.AccountBasedExpenseLineDetail?.AccountRef?.name || qbExp.AccountRef?.name || null,
          isBillable: firstLine?.AccountBasedExpenseLineDetail?.BillableStatus === "Billable",
        };

        if (existing.length > 0) {
          await db.update(expenses)
            .set({ ...expenseData, syncedAt: new Date() })
            .where(eq(expenses.id, existing[0].id));
        } else {
          await db.insert(expenses).values(expenseData);
        }
        results.synced++;
      } catch (err: any) {
        results.errors.push(`Expense ${qbExp.Id}: ${err.message}`);
      }
    }

    return results;
  }

  private categorizeExpense(accountName?: string): string {
    if (!accountName) return "Other";
    const lower = accountName.toLowerCase();
    if (lower.includes("travel") || lower.includes("mileage") || lower.includes("fuel")) return "Travel";
    if (lower.includes("equipment") || lower.includes("scanner") || lower.includes("hardware")) return "Equipment";
    if (lower.includes("labor") || lower.includes("payroll") || lower.includes("contractor")) return "Labor";
    if (lower.includes("software") || lower.includes("subscription") || lower.includes("license")) return "Software";
    if (lower.includes("office") || lower.includes("supplies")) return "Office Supplies";
    if (lower.includes("insurance")) return "Insurance";
    return "Other";
  }

  async getExpenses(): Promise<Expense[]> {
    return db.select().from(expenses).orderBy(desc(expenses.expenseDate));
  }

  async getExpensesByLead(leadId: number): Promise<Expense[]> {
    return db.select().from(expenses).where(eq(expenses.leadId, leadId)).orderBy(desc(expenses.expenseDate));
  }

  async linkExpenseToLead(expenseId: number, leadId: number | null): Promise<Expense> {
    const [updated] = await db.update(expenses)
      .set({ leadId })
      .where(eq(expenses.id, expenseId))
      .returning();
    return updated;
  }

  async linkExpenseToProject(expenseId: number, projectId: number | null): Promise<Expense> {
    const [updated] = await db.update(expenses)
      .set({ projectId })
      .where(eq(expenses.id, expenseId))
      .returning();
    return updated;
  }

  async getExpenseSummaryByLead(leadId: number): Promise<{ total: number; byCategory: Record<string, number> }> {
    const leadExpenses = await this.getExpensesByLead(leadId);
    const byCategory: Record<string, number> = {};
    let total = 0;

    for (const exp of leadExpenses) {
      const amount = parseFloat(exp.amount);
      total += amount;
      const cat = exp.category || "Other";
      byCategory[cat] = (byCategory[cat] || 0) + amount;
    }

    return { total, byCategory };
  }

  // === CHART OF ACCOUNTS ===
  async getAccounts(): Promise<Array<{ id: string; name: string; type: string; subType?: string; balance?: number }>> {
    const token = await this.getValidToken();
    if (!token) throw new Error("QuickBooks not connected");

    const query = "SELECT * FROM Account MAXRESULTS 200";
    const response = await fetch(
      `${QB_BASE_URL}/v3/company/${token.realmId}/query?query=${encodeURIComponent(query)}`,
      {
        headers: {
          "Authorization": `Bearer ${token.accessToken}`,
          "Accept": "application/json",
        },
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to fetch accounts: ${error}`);
    }

    const data = await response.json();
    const accounts = data.QueryResponse?.Account || [];
    return accounts.map((acc: any) => ({
      id: acc.Id,
      name: acc.FullyQualifiedName || acc.Name,
      type: acc.AccountType,
      subType: acc.AccountSubType,
      balance: acc.CurrentBalance,
    }));
  }

  // Filter accounts by type for mapping UI
  async getBankAccounts(): Promise<Array<{ id: string; name: string; balance?: number }>> {
    const accounts = await this.getAccounts();
    return accounts
      .filter(acc => acc.type === "Bank")
      .map(({ id, name, balance }) => ({ id, name, balance }));
  }

  async getCreditCardAccounts(): Promise<Array<{ id: string; name: string; balance?: number }>> {
    const accounts = await this.getAccounts();
    return accounts
      .filter(acc => acc.type === "Credit Card")
      .map(({ id, name, balance }) => ({ id, name, balance }));
  }

  // === FINANCIAL REPORTS ===
  async getBalanceSheet(): Promise<any> {
    const token = await this.getValidToken();
    if (!token) throw new Error("QuickBooks not connected");

    const response = await fetch(
      `${QB_BASE_URL}/v3/company/${token.realmId}/reports/BalanceSheet`,
      {
        headers: {
          "Authorization": `Bearer ${token.accessToken}`,
          "Accept": "application/json",
        },
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to fetch Balance Sheet: ${error}`);
    }

    return response.json();
  }

  async getProfitAndLoss(startDate?: Date, endDate?: Date): Promise<any> {
    const token = await this.getValidToken();
    if (!token) throw new Error("QuickBooks not connected");

    const now = new Date();
    const start = startDate || new Date(now.getFullYear(), now.getMonth(), 1); // First of current month
    const end = endDate || now;

    const params = new URLSearchParams({
      start_date: start.toISOString().split("T")[0],
      end_date: end.toISOString().split("T")[0],
    });

    const response = await fetch(
      `${QB_BASE_URL}/v3/company/${token.realmId}/reports/ProfitAndLoss?${params}`,
      {
        headers: {
          "Authorization": `Bearer ${token.accessToken}`,
          "Accept": "application/json",
        },
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to fetch P&L: ${error}`);
    }

    return response.json();
  }

  // === PROFIT FIRST SYNC ENGINE ===
  async syncFinancialMetrics(mapping: { operatingAccountId?: string; taxAccountId?: string }): Promise<{
    operating_cash: number;
    tax_reserve: number;
    revenue_mtd: number;
    synced_at: string;
  }> {
    // Ensure we have a valid token and capture it for reuse
    const tokenData = await this.getValidToken();
    if (!tokenData) {
      throw new Error("QuickBooks not connected");
    }

    let operating_cash = 0;
    let tax_reserve = 0;
    let revenue_mtd = 0;

    // Fetch account balances from Chart of Accounts using the validated token
    if (mapping.operatingAccountId || mapping.taxAccountId) {
      try {
        const accounts = await this.getAccountsWithToken(tokenData.accessToken, tokenData.realmId);
        
        if (mapping.operatingAccountId) {
          const opAccount = accounts.find(a => a.id === mapping.operatingAccountId);
          operating_cash = opAccount?.balance || 0;
        }
        
        if (mapping.taxAccountId) {
          const taxAccount = accounts.find(a => a.id === mapping.taxAccountId);
          tax_reserve = taxAccount?.balance || 0;
        }
      } catch (err) {
        console.warn("[QBO] Failed to fetch account balances:", err);
      }
    }

    // Fetch MTD revenue from P&L report using the validated token
    try {
      const pnl = await this.getProfitAndLossWithToken(tokenData.accessToken, tokenData.realmId);
      revenue_mtd = this.extractIncomeTotal(pnl);
    } catch (err) {
      console.warn("[QBO] Failed to fetch P&L for revenue_mtd:", err);
    }

    return {
      operating_cash,
      tax_reserve,
      revenue_mtd,
      synced_at: new Date().toISOString(),
    };
  }

  // Helper to extract Total Income from P&L report robustly
  private extractIncomeTotal(report: any): number {
    if (!report?.Rows?.Row) return 0;
    
    // Strategy 1: Look for Income section's Summary (the section-level total is "Total Income")
    for (const section of report.Rows.Row) {
      if (section.group === "Income" && section.Summary?.ColData) {
        // The Summary row is specifically the "Total Income" row
        // Find the numeric column (usually index 1, but search all to be safe)
        for (let i = section.Summary.ColData.length - 1; i >= 0; i--) {
          const col = section.Summary.ColData[i];
          const val = parseFloat(col?.value);
          if (!isNaN(val)) {
            return val; // Last numeric value in Summary is typically the total
          }
        }
      }
    }
    
    // Strategy 2: Look for a row explicitly labeled "Total Income" within Income section only
    const findTotalIncomeInSection = (rows: any[], inIncomeSection: boolean): number => {
      for (const row of rows) {
        const isIncomeSection = row.group === "Income" || inIncomeSection;
        
        // Check row header for "Total Income" label
        if (isIncomeSection && row.Header?.ColData?.[0]?.value?.includes("Total Income")) {
          for (const col of row.Header.ColData) {
            const val = parseFloat(col?.value);
            if (!isNaN(val)) return val;
          }
        }
        
        // Check Summary for "Total Income" if within Income section
        if (isIncomeSection && row.Summary?.ColData) {
          const firstCol = row.Summary.ColData[0]?.value || "";
          if (firstCol.includes("Total Income") || (row.group === "Income" && !firstCol)) {
            for (let i = row.Summary.ColData.length - 1; i >= 0; i--) {
              const val = parseFloat(row.Summary.ColData[i]?.value);
              if (!isNaN(val)) return val;
            }
          }
        }
        
        // Recurse into child rows if in Income section
        if (isIncomeSection && row.Rows?.Row) {
          const found = findTotalIncomeInSection(row.Rows.Row, true);
          if (found !== 0) return found;
        }
      }
      return 0;
    };
    
    return findTotalIncomeInSection(report.Rows.Row, false);
  }

  // Internal method that uses a pre-validated token
  private async getAccountsWithToken(accessToken: string, realmId: string): Promise<Array<{ id: string; name: string; type: string; subType?: string; balance?: number }>> {
    const query = "SELECT * FROM Account MAXRESULTS 200";
    const response = await fetch(
      `${QB_BASE_URL}/v3/company/${realmId}/query?query=${encodeURIComponent(query)}`,
      {
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Accept": "application/json",
        },
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to fetch accounts: ${error}`);
    }

    const data = await response.json();
    const accounts = data.QueryResponse?.Account || [];
    return accounts.map((acc: any) => ({
      id: acc.Id,
      name: acc.FullyQualifiedName || acc.Name,
      type: acc.AccountType,
      subType: acc.AccountSubType,
      balance: acc.CurrentBalance,
    }));
  }

  // Internal method that uses a pre-validated token
  private async getProfitAndLossWithToken(accessToken: string, realmId: string, startDate?: Date, endDate?: Date): Promise<any> {
    const now = new Date();
    const start = startDate || new Date(now.getFullYear(), now.getMonth(), 1);
    const end = endDate || now;

    const params = new URLSearchParams({
      start_date: start.toISOString().split("T")[0],
      end_date: end.toISOString().split("T")[0],
    });

    const response = await fetch(
      `${QB_BASE_URL}/v3/company/${realmId}/reports/ProfitAndLoss?${params}`,
      {
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Accept": "application/json",
        },
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to fetch P&L: ${error}`);
    }

    return response.json();
  }

  async getProfitabilityStats(): Promise<{
    totalRevenue: number;
    totalExpenses: number;
    profitMargin: number;
    byLead: Array<{ leadId: number; clientName: string; revenue: number; expenses: number; profit: number; margin: number }>;
  }> {
    const { leads } = await import("@shared/schema");
    const allLeads = await db.select().from(leads);
    const allExpenses = await db.select().from(expenses);

    const expensesByLead = new Map<number, number>();
    let unlinkedExpenses = 0;

    for (const exp of allExpenses) {
      const amount = parseFloat(exp.amount);
      if (exp.leadId) {
        expensesByLead.set(exp.leadId, (expensesByLead.get(exp.leadId) || 0) + amount);
      } else {
        unlinkedExpenses += amount;
      }
    }

    const byLead = allLeads
      .filter(l => l.dealStage === "Closed Won")
      .map(lead => {
        const revenue = parseFloat(lead.value || "0");
        const exp = expensesByLead.get(lead.id) || 0;
        const profit = revenue - exp;
        return {
          leadId: lead.id,
          clientName: lead.clientName,
          revenue,
          expenses: exp,
          profit,
          margin: revenue > 0 ? (profit / revenue) * 100 : 0,
        };
      })
      .sort((a, b) => b.profit - a.profit);

    const totalRevenue = byLead.reduce((sum, l) => sum + l.revenue, 0);
    const totalLinkedExpenses = byLead.reduce((sum, l) => sum + l.expenses, 0);
    const totalExpenses = totalLinkedExpenses + unlinkedExpenses;
    const profitMargin = totalRevenue > 0 ? ((totalRevenue - totalExpenses) / totalRevenue) * 100 : 0;

    return { totalRevenue, totalExpenses, profitMargin, byLead };
  }

  // === ESTIMATE SYNC ENGINE ===

  // Service item mapping: Map disciplines to QBO service item names
  private readonly SERVICE_MAPPING: Record<string, string> = {
    "Architecture": "Service:Architecture",
    "MEP": "Service:Engineering", 
    "Structural": "Service:Engineering",
    "Scanning": "Service:FieldScanning",
    "Point Cloud Processing": "Service:FieldScanning",
    "BIM Modeling": "Service:Architecture",
    "As-Built Documentation": "Service:Architecture",
    "Matterport": "Service:FieldScanning",
    "Site Photography": "Service:FieldScanning",
  };

  // Find or create a customer in QuickBooks
  async findOrCreateCustomer(clientName: string, email?: string): Promise<{ id: string; name: string }> {
    const token = await this.getValidToken();
    if (!token) throw new Error("QuickBooks not connected");

    // Search for existing customer by name
    const searchQuery = `SELECT * FROM Customer WHERE DisplayName = '${clientName.replace(/'/g, "\\'")}'`;
    const searchResponse = await fetch(
      `${QB_BASE_URL}/v3/company/${token.realmId}/query?query=${encodeURIComponent(searchQuery)}`,
      {
        headers: {
          "Authorization": `Bearer ${token.accessToken}`,
          "Accept": "application/json",
        },
      }
    );

    if (searchResponse.ok) {
      const searchData = await searchResponse.json();
      const existing = searchData.QueryResponse?.Customer?.[0];
      if (existing) {
        return { id: existing.Id, name: existing.DisplayName };
      }
    }

    // Create new customer
    const customerPayload = {
      DisplayName: clientName,
      PrimaryEmailAddr: email ? { Address: email } : undefined,
    };

    const createResponse = await fetch(
      `${QB_BASE_URL}/v3/company/${token.realmId}/customer`,
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token.accessToken}`,
          "Accept": "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(customerPayload),
      }
    );

    if (!createResponse.ok) {
      const error = await createResponse.text();
      throw new Error(`Failed to create customer: ${error}`);
    }

    const createData = await createResponse.json();
    return { 
      id: createData.Customer.Id, 
      name: createData.Customer.DisplayName 
    };
  }

  // Find service item by name (returns null if not found - we'll use description-only lines)
  private async findServiceItem(accessToken: string, realmId: string, serviceName: string): Promise<string | null> {
    const query = `SELECT * FROM Item WHERE FullyQualifiedName = '${serviceName.replace(/'/g, "\\'")}'`;
    const response = await fetch(
      `${QB_BASE_URL}/v3/company/${realmId}/query?query=${encodeURIComponent(query)}`,
      {
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Accept": "application/json",
        },
      }
    );

    if (response.ok) {
      const data = await response.json();
      const item = data.QueryResponse?.Item?.[0];
      if (item) return item.Id;
    }
    return null;
  }

  // Create an estimate from proposal pricing data
  async createEstimateFromQuote(
    leadId: number,
    clientName: string,
    projectName: string,
    lineItems: Array<{ description: string; quantity: number; unitPrice: number; amount: number; discipline?: string }>,
    email?: string
  ): Promise<{ estimateId: string; estimateNumber: string; customerId: string }> {
    const token = await this.getValidToken();
    if (!token) throw new Error("QuickBooks not connected");

    // Step 1: Find or create customer
    const customer = await this.findOrCreateCustomer(clientName, email);

    // Step 2: Build estimate lines with proper service item mapping
    const estimateLines = await Promise.all(
      lineItems.map(async (item, index) => {
        let itemRef: { value: string; name?: string } | undefined;
        
        // First try to map using the discipline field directly
        if (item.discipline && this.SERVICE_MAPPING[item.discipline]) {
          const serviceName = this.SERVICE_MAPPING[item.discipline];
          const itemId = await this.findServiceItem(token.accessToken, token.realmId, serviceName);
          if (itemId) {
            itemRef = { value: itemId, name: serviceName };
          }
        }
        
        // Fallback: Try to map from description
        if (!itemRef) {
          const mappedService = Object.entries(this.SERVICE_MAPPING).find(([key]) => 
            item.description.toLowerCase().includes(key.toLowerCase())
          );
          
          if (mappedService) {
            const itemId = await this.findServiceItem(token.accessToken, token.realmId, mappedService[1]);
            if (itemId) {
              itemRef = { value: itemId, name: mappedService[1] };
            }
          }
        }

        const line: any = {
          LineNum: index + 1,
          Description: item.description,
          Amount: item.amount,
          DetailType: "SalesItemLineDetail",
          SalesItemLineDetail: {
            Qty: item.quantity,
            UnitPrice: item.unitPrice,
          },
        };

        if (itemRef) {
          line.SalesItemLineDetail.ItemRef = itemRef;
        }

        return line;
      })
    );

    // Step 3: Create estimate
    const estimatePayload = {
      CustomerRef: { value: customer.id },
      CustomerMemo: { value: `Proposal for ${projectName}` },
      Line: estimateLines,
      PrivateNote: `Synced from Scan2Plan OS - Lead #${leadId}`,
      DocNumber: `S2P-${leadId}-${Date.now().toString(36).toUpperCase()}`,
    };

    const createResponse = await fetch(
      `${QB_BASE_URL}/v3/company/${token.realmId}/estimate`,
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token.accessToken}`,
          "Accept": "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(estimatePayload),
      }
    );

    if (!createResponse.ok) {
      const error = await createResponse.text();
      throw new Error(`Failed to create estimate: ${error}`);
    }

    const estimateData = await createResponse.json();
    return {
      estimateId: estimateData.Estimate.Id,
      estimateNumber: estimateData.Estimate.DocNumber,
      customerId: customer.id,
    };
  }

  // Get QBO estimate URL for viewing
  getEstimateUrl(estimateId: string, realmId: string): string {
    const isSandbox = process.env.QB_SANDBOX === "true";
    const domain = isSandbox ? "sandbox.qbo.intuit.com" : "qbo.intuit.com";
    return `https://${domain}/app/estimate?txnId=${estimateId}&companyId=${realmId}`;
  }

  // Get QBO base URL configuration
  getConfig(): { baseUrl: string; isSandbox: boolean } {
    const isSandbox = process.env.QB_SANDBOX === "true";
    const domain = isSandbox ? "sandbox.qbo.intuit.com" : "qbo.intuit.com";
    return { baseUrl: `https://${domain}`, isSandbox };
  }

  // Get realm ID from stored tokens
  async getRealmId(): Promise<string | null> {
    const token = await this.getValidToken();
    return token?.realmId || null;
  }
}

export const quickbooksClient = new QuickBooksClient();
