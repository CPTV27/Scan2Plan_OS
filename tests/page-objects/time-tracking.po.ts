import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from './base.po';

export interface TimeEntry {
  projectId: number;
  role: 'scanning' | 'modeling' | 'qc' | 'admin';
  hours: number;
  notes?: string;
  date?: string;
}

export class TimeTrackingPage extends BasePage {
  readonly addEntryButton: Locator;
  readonly timeEntryDialog: Locator;
  readonly projectSelect: Locator;
  readonly roleSelect: Locator;
  readonly hoursInput: Locator;
  readonly notesInput: Locator;
  readonly dateInput: Locator;
  readonly saveEntryButton: Locator;
  readonly timeEntryTable: Locator;
  readonly totalHoursDisplay: Locator;
  readonly roleSummaryCards: Locator;

  constructor(page: Page) {
    super(page);
    this.addEntryButton = page.locator('[data-testid="button-add-time-entry"]');
    this.timeEntryDialog = page.locator('[data-testid="dialog-time-entry"]');
    this.projectSelect = page.locator('[data-testid="select-project"]');
    this.roleSelect = page.locator('[data-testid="select-role"]');
    this.hoursInput = page.locator('[data-testid="input-hours"]');
    this.notesInput = page.locator('[data-testid="input-notes"]');
    this.dateInput = page.locator('[data-testid="input-date"]');
    this.saveEntryButton = page.locator('[data-testid="button-save-time-entry"]');
    this.timeEntryTable = page.locator('[data-testid="table-time-entries"]');
    this.totalHoursDisplay = page.locator('[data-testid="text-total-hours"]');
    this.roleSummaryCards = page.locator('[data-testid^="card-role-summary-"]');
  }

  async goto() {
    await super.goto('/time-tracking');
    await this.page.waitForLoadState('networkidle');
  }

  async logTimeEntry(entry: TimeEntry): Promise<number> {
    await this.addEntryButton.click();
    await expect(this.timeEntryDialog).toBeVisible();

    await this.projectSelect.click();
    await this.page.locator(`[data-testid="option-project-${entry.projectId}"]`).click();

    await this.roleSelect.click();
    await this.page.locator(`[data-testid="option-role-${entry.role}"]`).click();

    await this.hoursInput.fill(entry.hours.toString());

    if (entry.notes) {
      await this.notesInput.fill(entry.notes);
    }

    if (entry.date) {
      await this.dateInput.fill(entry.date);
    }

    await this.saveEntryButton.click();

    const response = await this.page.waitForResponse(
      (resp) => resp.url().includes('/api/time-entries') && resp.request().method() === 'POST'
    );

    const data = await response.json();
    await this.waitForToast('Time logged');
    return data.id;
  }

  async logDualHatEntry(projectId: number, scanningHours: number, modelingHours: number): Promise<number[]> {
    const ids: number[] = [];

    if (scanningHours > 0) {
      const scanId = await this.logTimeEntry({
        projectId,
        role: 'scanning',
        hours: scanningHours,
        notes: 'Field scanning work',
      });
      ids.push(scanId);
    }

    if (modelingHours > 0) {
      const modelId = await this.logTimeEntry({
        projectId,
        role: 'modeling',
        hours: modelingHours,
        notes: 'BIM modeling work',
      });
      ids.push(modelId);
    }

    return ids;
  }

  async getTotalHours(): Promise<number> {
    const text = await this.totalHoursDisplay.textContent();
    return parseFloat(text?.replace(/[^\d.]/g, '') || '0');
  }

  async getHoursByRole(role: string): Promise<number> {
    const card = this.page.locator(`[data-testid="card-role-summary-${role}"]`);
    const hoursText = await card.locator('[data-testid="text-role-hours"]').textContent();
    return parseFloat(hoursText?.replace(/[^\d.]/g, '') || '0');
  }

  async getEntryCount(): Promise<number> {
    const rows = this.timeEntryTable.locator('tbody tr');
    return await rows.count();
  }

  async deleteTimeEntry(entryId: number) {
    const row = this.page.locator(`[data-testid="row-time-entry-${entryId}"]`);
    await row.locator('[data-testid="button-delete-entry"]').click();
    await this.page.locator('[data-testid="button-confirm-delete"]').click();
    await this.waitForToast('Entry deleted');
  }

  async editTimeEntry(entryId: number, updates: Partial<TimeEntry>) {
    const row = this.page.locator(`[data-testid="row-time-entry-${entryId}"]`);
    await row.locator('[data-testid="button-edit-entry"]').click();
    await expect(this.timeEntryDialog).toBeVisible();

    if (updates.hours !== undefined) {
      await this.hoursInput.clear();
      await this.hoursInput.fill(updates.hours.toString());
    }

    if (updates.notes) {
      await this.notesInput.clear();
      await this.notesInput.fill(updates.notes);
    }

    await this.saveEntryButton.click();
    await this.waitForToast('Entry updated');
  }
}
