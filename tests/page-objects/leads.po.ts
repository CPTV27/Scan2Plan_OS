import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from './base.po';

export interface LeadData {
  contactName: string;
  email?: string;
  company?: string;
  persona?: string;
  source?: string;
}

export class LeadsPage extends BasePage {
  readonly addLeadButton: Locator;
  readonly leadTable: Locator;
  readonly quickClassifyDropdown: Locator;
  readonly batchSyncButton: Locator;
  readonly leadDialog: Locator;
  readonly contactNameInput: Locator;
  readonly emailInput: Locator;
  readonly companyInput: Locator;
  readonly personaSelect: Locator;
  readonly sourceSelect: Locator;
  readonly saveLeadButton: Locator;
  readonly searchInput: Locator;

  constructor(page: Page) {
    super(page);
    this.addLeadButton = page.locator('[data-testid="button-add-lead"]');
    this.leadTable = page.locator('[data-testid="table-leads"]');
    this.quickClassifyDropdown = page.locator('[data-testid="select-quick-classify"]');
    this.batchSyncButton = page.locator('[data-testid="button-batch-sync"]');
    this.leadDialog = page.locator('[data-testid="dialog-lead"]');
    this.contactNameInput = page.locator('[data-testid="input-contact-name"]');
    this.emailInput = page.locator('[data-testid="input-email"]');
    this.companyInput = page.locator('[data-testid="input-company"]');
    this.personaSelect = page.locator('[data-testid="select-persona"]');
    this.sourceSelect = page.locator('[data-testid="select-source"]');
    this.saveLeadButton = page.locator('[data-testid="button-save-lead"]');
    this.searchInput = page.locator('[data-testid="input-search-leads"]');
  }

  async goto() {
    await super.goto('/pipeline');
    await this.page.waitForSelector('[data-testid="button-add-lead"], [data-testid="table-leads"]', { timeout: 10000 });
  }

  async createLead(data: LeadData): Promise<number> {
    await this.addLeadButton.click();
    await expect(this.leadDialog).toBeVisible();

    await this.contactNameInput.fill(data.contactName);
    
    if (data.email) {
      await this.emailInput.fill(data.email);
    }
    if (data.company) {
      await this.companyInput.fill(data.company);
    }
    if (data.persona) {
      await this.personaSelect.click();
      await this.page.locator(`[data-testid="option-persona-${data.persona}"]`).click();
    }
    if (data.source) {
      await this.sourceSelect.click();
      await this.page.locator(`[data-testid="option-source-${data.source}"]`).click();
    }

    await this.saveLeadButton.click();
    await this.waitForToast('Lead created');
    
    const response = await this.page.waitForResponse(
      (resp) => resp.url().includes('/api/leads') && resp.request().method() === 'POST'
    );
    const json = await response.json();
    return json.id;
  }

  async quickClassifyLead(leadId: number, personaCode: string) {
    const row = this.page.locator(`[data-testid="row-lead-${leadId}"]`);
    const dropdown = row.locator('[data-testid="select-quick-classify"]');
    await dropdown.click();
    await this.page.locator(`[data-testid="option-persona-${personaCode}"]`).click();
    await this.waitForToast('Persona updated');
  }

  async selectLeads(leadIds: number[]) {
    for (const id of leadIds) {
      const checkbox = this.page.locator(`[data-testid="checkbox-lead-${id}"]`);
      await checkbox.check();
    }
  }

  async batchSyncToHubSpot() {
    await this.batchSyncButton.click();
    await this.page.waitForResponse(
      (resp) => resp.url().includes('/api/hubspot/batch-sync') && resp.status() === 200
    );
    await this.waitForToast('Sync complete');
  }

  async searchLeads(query: string) {
    await this.searchInput.fill(query);
    await this.page.waitForTimeout(500);
  }

  async getLeadRow(leadId: number): Promise<Locator> {
    return this.page.locator(`[data-testid="row-lead-${leadId}"]`);
  }

  async deleteLead(leadId: number) {
    const row = await this.getLeadRow(leadId);
    await row.locator('[data-testid="button-delete-lead"]').click();
    await this.page.locator('[data-testid="button-confirm-delete"]').click();
    await this.waitForToast('Lead deleted');
  }
}
