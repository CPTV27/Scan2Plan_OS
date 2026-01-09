import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from './base.po';

export class AuthPage extends BasePage {
  readonly loginButton: Locator;
  readonly logoutButton: Locator;
  readonly userAvatar: Locator;
  readonly adminModeToggle: Locator;
  readonly fieldModeToggle: Locator;
  readonly modeIndicator: Locator;

  constructor(page: Page) {
    super(page);
    this.loginButton = page.locator('[data-testid="button-login"]');
    this.logoutButton = page.locator('[data-testid="button-logout"]');
    this.userAvatar = page.locator('[data-testid="user-avatar"]');
    this.adminModeToggle = page.locator('[data-testid="toggle-admin-mode"]');
    this.fieldModeToggle = page.locator('[data-testid="toggle-field-mode"]');
    this.modeIndicator = page.locator('[data-testid="mode-indicator"]');
  }

  async login() {
    await this.goto('/');
    if (await this.loginButton.isVisible()) {
      await this.loginButton.click();
      await this.page.waitForURL('**/*');
    }
  }

  async logout() {
    await this.logoutButton.click();
    await expect(this.loginButton).toBeVisible();
  }

  async switchToAdminMode() {
    if (await this.adminModeToggle.isVisible()) {
      await this.adminModeToggle.click();
      await expect(this.modeIndicator).toContainText(/admin/i);
    }
  }

  async switchToFieldMode() {
    if (await this.fieldModeToggle.isVisible()) {
      await this.fieldModeToggle.click();
      await expect(this.modeIndicator).toContainText(/field/i);
    }
  }

  async isLoggedIn(): Promise<boolean> {
    return await this.userAvatar.isVisible();
  }

  async getCurrentMode(): Promise<string> {
    const text = await this.modeIndicator.textContent();
    return text?.toLowerCase() || '';
  }
}
