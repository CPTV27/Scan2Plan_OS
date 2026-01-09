import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from './base.po';

export class MarketingQueuePage extends BasePage {
  readonly contentQueueTab: Locator;
  readonly postedTab: Locator;
  readonly evidenceVaultTab: Locator;
  readonly triggerTruthLoopButton: Locator;
  readonly postCards: Locator;
  readonly approveButton: Locator;
  readonly markPostedButton: Locator;
  readonly copyButton: Locator;
  readonly deleteButton: Locator;
  readonly addHookButton: Locator;
  readonly hookTable: Locator;
  readonly personaSelect: Locator;
  readonly hookContentInput: Locator;
  readonly ewsScoreInput: Locator;
  readonly saveHookButton: Locator;

  constructor(page: Page) {
    super(page);
    this.contentQueueTab = page.locator('[data-testid="tab-queue"]');
    this.postedTab = page.locator('[data-testid="tab-posted"]');
    this.evidenceVaultTab = page.locator('[data-testid="tab-evidence"]');
    this.triggerTruthLoopButton = page.locator('[data-testid="button-trigger-truth-loop"]');
    this.postCards = page.locator('[data-testid^="card-post-"]');
    this.approveButton = page.locator('[data-testid^="button-approve-"]');
    this.markPostedButton = page.locator('[data-testid^="button-posted-"]');
    this.copyButton = page.locator('[data-testid^="button-copy-"]');
    this.deleteButton = page.locator('[data-testid^="button-delete-"]');
    this.addHookButton = page.locator('[data-testid="button-add-hook"]');
    this.hookTable = page.locator('table');
    this.personaSelect = page.locator('[data-testid="select-persona"]');
    this.hookContentInput = page.locator('[data-testid="input-hook-content"]');
    this.ewsScoreInput = page.locator('[data-testid="input-ews-score"]');
    this.saveHookButton = page.locator('[data-testid="button-save-hook"]');
  }

  async goto() {
    await super.goto('/marketing');
    await this.page.waitForSelector('[data-testid="marketing-tabs"]', { timeout: 10000 });
  }

  async navigateToContentQueue() {
    await this.contentQueueTab.click();
    await this.page.waitForLoadState('networkidle');
  }

  async navigateToPosted() {
    await this.postedTab.click();
    await this.page.waitForLoadState('networkidle');
  }

  async navigateToEvidenceVault() {
    await this.evidenceVaultTab.click();
    await this.page.waitForLoadState('networkidle');
  }

  async triggerTruthLoop(): Promise<number> {
    await this.triggerTruthLoopButton.click();
    
    const response = await this.page.waitForResponse(
      (resp) => resp.url().includes('/api/marketing/truth-loop') && resp.status() === 200,
      { timeout: 30000 }
    );
    
    const data = await response.json();
    await this.waitForToast('Content generated');
    return data.postId;
  }

  async approvePost(postId: number) {
    const approveBtn = this.page.locator(`[data-testid="button-approve-${postId}"]`);
    await approveBtn.click();
    await this.waitForToast('Status updated');
  }

  async markAsPosted(postId: number) {
    const postedBtn = this.page.locator(`[data-testid="button-posted-${postId}"]`);
    await postedBtn.click();
    await this.waitForToast('Status updated');
  }

  async copyPostContent(postId: number): Promise<string> {
    const copyBtn = this.page.locator(`[data-testid="button-copy-${postId}"]`);
    await copyBtn.click();
    await this.waitForToast('Copied');
    return await this.page.evaluate(() => navigator.clipboard.readText());
  }

  async deletePost(postId: number) {
    const deleteBtn = this.page.locator(`[data-testid="button-delete-${postId}"]`);
    await deleteBtn.click();
    await this.waitForToast('Deleted');
  }

  async getPostCount(): Promise<number> {
    return await this.postCards.count();
  }

  async getPostContent(postId: number): Promise<string> {
    const card = this.page.locator(`[data-testid="card-post-${postId}"]`);
    const content = card.locator('.bg-muted\\/50');
    return await content.textContent() || '';
  }

  async addEvidenceHook(personaCode: string, hookContent: string, ewsScore: number): Promise<number> {
    await this.navigateToEvidenceVault();
    await this.addHookButton.click();
    
    await this.personaSelect.click();
    await this.page.locator(`[role="option"]:has-text("${personaCode}")`).click();
    
    await this.hookContentInput.fill(hookContent);
    await this.ewsScoreInput.fill(ewsScore.toString());
    
    await this.saveHookButton.click();
    
    const response = await this.page.waitForResponse(
      (resp) => resp.url().includes('/api/evidence-vault') && resp.request().method() === 'POST'
    );
    
    const data = await response.json();
    await this.waitForToast('Hook added');
    return data.id;
  }

  async getHookCount(): Promise<number> {
    await this.navigateToEvidenceVault();
    const rows = this.hookTable.locator('tbody tr');
    return await rows.count();
  }
}
