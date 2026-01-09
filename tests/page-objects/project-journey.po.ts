import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from './base.po';
import * as path from 'path';

export class ProjectJourneyPage extends BasePage {
  readonly uploadButton: Locator;
  readonly fileInput: Locator;
  readonly varianceAuditTab: Locator;
  readonly overrunShieldButton: Locator;
  readonly projectTable: Locator;
  readonly varianceChart: Locator;
  readonly reportDownloadButton: Locator;
  readonly varianceBadge: Locator;
  readonly auditResultsCard: Locator;
  readonly sqftInput: Locator;
  readonly estimatedSqftDisplay: Locator;
  readonly actualSqftDisplay: Locator;

  constructor(page: Page) {
    super(page);
    this.uploadButton = page.locator('[data-testid="button-upload-csv"]');
    this.fileInput = page.locator('input[type="file"]');
    this.varianceAuditTab = page.locator('[data-testid="tab-variance-audit"]');
    this.overrunShieldButton = page.locator('[data-testid="button-overrun-shield"]');
    this.projectTable = page.locator('[data-testid="table-projects"]');
    this.varianceChart = page.locator('[data-testid="chart-variance"]');
    this.reportDownloadButton = page.locator('[data-testid="button-download-report"]');
    this.varianceBadge = page.locator('[data-testid="badge-variance"]');
    this.auditResultsCard = page.locator('[data-testid="card-audit-results"]');
    this.sqftInput = page.locator('[data-testid="input-sqft"]');
    this.estimatedSqftDisplay = page.locator('[data-testid="text-estimated-sqft"]');
    this.actualSqftDisplay = page.locator('[data-testid="text-actual-sqft"]');
  }

  async goto() {
    await super.goto('/production');
    await this.page.waitForLoadState('networkidle');
  }

  async uploadRealWorksCSV(filePath: string): Promise<void> {
    const absolutePath = path.resolve(filePath);
    
    await this.uploadButton.click();
    await this.fileInput.setInputFiles(absolutePath);
    
    await this.page.waitForResponse(
      (resp) => resp.url().includes('/api/projects/upload') && resp.status() === 200,
      { timeout: 30000 }
    );
    
    await this.waitForToast('CSV uploaded');
  }

  async navigateToVarianceAudit() {
    await this.varianceAuditTab.click();
    await expect(this.auditResultsCard).toBeVisible();
  }

  async runVarianceAudit(projectId: number): Promise<{ variance: number; isOverrun: boolean }> {
    const auditButton = this.page.locator(`[data-testid="button-audit-${projectId}"]`);
    await auditButton.click();
    
    const response = await this.page.waitForResponse(
      (resp) => resp.url().includes('/api/projects/variance') && resp.status() === 200
    );
    
    const data = await response.json();
    await this.waitForToast();
    
    return {
      variance: data.variancePercent,
      isOverrun: data.isOverrun,
    };
  }

  async generateOverrunShieldReport(projectId: number): Promise<string> {
    const row = this.page.locator(`[data-testid="row-project-${projectId}"]`);
    await row.locator('[data-testid="button-overrun-shield"]').click();
    
    const [download] = await Promise.all([
      this.page.waitForEvent('download'),
      this.page.locator('[data-testid="button-confirm-generate"]').click(),
    ]);
    
    const downloadPath = await download.path();
    await this.waitForToast('Report generated');
    
    return downloadPath || '';
  }

  async getVarianceDisplay(projectId: number): Promise<string> {
    const badge = this.page.locator(`[data-testid="badge-variance-${projectId}"]`);
    return await badge.textContent() || '';
  }

  async selectProject(projectId: number) {
    const row = this.page.locator(`[data-testid="row-project-${projectId}"]`);
    await row.click();
  }

  async getProjectCount(): Promise<number> {
    const rows = this.projectTable.locator('tbody tr');
    return await rows.count();
  }
}
