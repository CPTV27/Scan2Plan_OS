import { Page, Locator, expect } from '@playwright/test';
import { BasePage } from './base.po';

export interface Notification {
  id: number;
  type: string;
  message: string;
  isRead: boolean;
}

export class NotificationsPage extends BasePage {
  readonly bellIcon: Locator;
  readonly notificationPopover: Locator;
  readonly notificationList: Locator;
  readonly notificationItems: Locator;
  readonly unreadBadge: Locator;
  readonly markAllReadButton: Locator;
  readonly clearAllButton: Locator;
  readonly emptyState: Locator;

  constructor(page: Page) {
    super(page);
    this.bellIcon = page.locator('[data-testid="button-notifications"]');
    this.notificationPopover = page.locator('[data-testid="popover-notifications"]');
    this.notificationList = page.locator('[data-testid="list-notifications"]');
    this.notificationItems = page.locator('[data-testid^="notification-item-"]');
    this.unreadBadge = page.locator('[data-testid="badge-unread-count"]');
    this.markAllReadButton = page.locator('[data-testid="button-mark-all-read"]');
    this.clearAllButton = page.locator('[data-testid="button-clear-all"]');
    this.emptyState = page.locator('[data-testid="notifications-empty"]');
  }

  async openNotificationsPopover() {
    await this.bellIcon.click();
    await expect(this.notificationPopover).toBeVisible();
  }

  async closeNotificationsPopover() {
    await this.page.keyboard.press('Escape');
    await expect(this.notificationPopover).not.toBeVisible();
  }

  async getUnreadCount(): Promise<number> {
    if (await this.unreadBadge.isVisible()) {
      const text = await this.unreadBadge.textContent();
      return parseInt(text || '0', 10);
    }
    return 0;
  }

  async getNotificationCount(): Promise<number> {
    await this.openNotificationsPopover();
    const count = await this.notificationItems.count();
    return count;
  }

  async markNotificationAsRead(notificationId: number) {
    const item = this.page.locator(`[data-testid="notification-item-${notificationId}"]`);
    await item.click();
  }

  async markAllAsRead() {
    await this.openNotificationsPopover();
    if (await this.markAllReadButton.isVisible()) {
      await this.markAllReadButton.click();
      await this.waitForToast('All marked as read');
    }
  }

  async clearAllNotifications() {
    await this.openNotificationsPopover();
    if (await this.clearAllButton.isVisible()) {
      await this.clearAllButton.click();
      await expect(this.emptyState).toBeVisible();
    }
  }

  async waitForNewNotification(type?: string): Promise<void> {
    const initialCount = await this.getUnreadCount();
    
    await this.page.waitForFunction(
      ([selector, count]) => {
        const badge = document.querySelector(selector);
        if (!badge) return false;
        const current = parseInt(badge.textContent || '0', 10);
        return current > count;
      },
      ['[data-testid="badge-unread-count"]', initialCount] as const,
      { timeout: 30000 }
    );
  }

  async getNotificationsByType(type: string): Promise<Locator[]> {
    await this.openNotificationsPopover();
    const items = this.page.locator(`[data-testid^="notification-item-"][data-type="${type}"]`);
    const count = await items.count();
    const result: Locator[] = [];
    for (let i = 0; i < count; i++) {
      result.push(items.nth(i));
    }
    return result;
  }

  async hasEngagementAlert(): Promise<boolean> {
    const alerts = await this.getNotificationsByType('engagement');
    return alerts.length > 0;
  }
}
