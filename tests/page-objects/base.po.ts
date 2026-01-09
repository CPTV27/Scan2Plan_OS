import { Page, Locator, expect } from '@playwright/test';

export class BasePage {
  readonly page: Page;
  readonly sidebar: Locator;
  readonly sidebarTrigger: Locator;
  readonly themeToggle: Locator;
  readonly notificationsBell: Locator;
  readonly toastContainer: Locator;

  constructor(page: Page) {
    this.page = page;
    this.sidebar = page.locator('[data-testid="sidebar"]');
    this.sidebarTrigger = page.locator('[data-testid="button-sidebar-toggle"]');
    this.themeToggle = page.locator('[data-testid="button-theme-toggle"]');
    this.notificationsBell = page.locator('[data-testid="button-notifications"]');
    this.toastContainer = page.locator('[data-testid="toast"]');
  }

  async goto(path: string = '/') {
    await this.page.goto(path);
    await this.page.waitForLoadState('networkidle');
  }

  async navigateTo(menuItem: string) {
    const link = this.page.locator(`[data-testid="nav-${menuItem.toLowerCase().replace(/\s+/g, '-')}"]`);
    await link.click();
    await this.page.waitForLoadState('networkidle');
  }

  async waitForToast(message?: string) {
    const toast = this.page.locator('[role="status"]').first();
    await expect(toast).toBeVisible({ timeout: 5000 });
    if (message) {
      await expect(toast).toContainText(message);
    }
    return toast;
  }

  async dismissToast() {
    const closeButton = this.page.locator('[role="status"] button[aria-label="Close"]').first();
    if (await closeButton.isVisible()) {
      await closeButton.click();
    }
  }

  async toggleSidebar() {
    await this.sidebarTrigger.click();
  }

  async toggleTheme() {
    await this.themeToggle.click();
  }

  async openNotifications() {
    await this.notificationsBell.click();
  }

  async waitForNetworkIdle() {
    await this.page.waitForLoadState('networkidle');
  }

  async screenshot(name: string) {
    await this.page.screenshot({ path: `tests/screenshots/${name}.png`, fullPage: true });
  }
}
