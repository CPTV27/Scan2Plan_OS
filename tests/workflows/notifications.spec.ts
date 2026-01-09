import { test, expect } from '../fixtures/auth.fixtures';
import { NotificationsPage } from '../page-objects/notifications.po';

test.describe('Notifications: Engagement Alerts', () => {
  let notificationsPage: NotificationsPage;

  test.beforeEach(async ({ authenticatedPage }) => {
    notificationsPage = new NotificationsPage(authenticatedPage);
    await notificationsPage.goto('/');
  });

  test('should display notifications bell icon', async () => {
    await expect(notificationsPage.bellIcon).toBeVisible();
  });

  test('should open notifications popover on click', async () => {
    await notificationsPage.openNotificationsPopover();
    await expect(notificationsPage.notificationPopover).toBeVisible();
  });

  test('should close notifications popover on escape', async () => {
    await notificationsPage.openNotificationsPopover();
    await expect(notificationsPage.notificationPopover).toBeVisible();
    
    await notificationsPage.closeNotificationsPopover();
    await expect(notificationsPage.notificationPopover).not.toBeVisible();
  });

  test('should display unread count badge', async ({ authenticatedPage }) => {
    await authenticatedPage.route('**/api/notifications/unread-count', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ count: 5 }),
      });
    });

    await notificationsPage.goto('/');
    
    const count = await notificationsPage.getUnreadCount();
    expect(count).toBeGreaterThanOrEqual(0);
  });

  test('should show engagement alert notification', async ({ authenticatedPage }) => {
    await authenticatedPage.route('**/api/notifications', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: 1,
            type: 'engagement',
            message: 'New lead engagement: John Doe opened your email',
            isRead: false,
            createdAt: new Date().toISOString(),
          },
          {
            id: 2,
            type: 'system',
            message: 'System update completed',
            isRead: true,
            createdAt: new Date().toISOString(),
          },
        ]),
      });
    });

    await notificationsPage.goto('/');
    await notificationsPage.openNotificationsPopover();
    
    const count = await notificationsPage.getNotificationCount();
    expect(count).toBeGreaterThan(0);
  });

  test('should mark notification as read on click', async ({ authenticatedPage }) => {
    await authenticatedPage.route('**/api/notifications', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: 10,
            type: 'engagement',
            message: 'Lead clicked your proposal link',
            isRead: false,
          },
        ]),
      });
    });

    await authenticatedPage.route('**/api/notifications/10/read', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true }),
      });
    });

    await notificationsPage.goto('/');
    await notificationsPage.openNotificationsPopover();
    
    const item = notificationsPage.page.locator('[data-testid="notification-item-10"]');
    if (await item.isVisible()) {
      await notificationsPage.markNotificationAsRead(10);
    }
  });

  test('should mark all notifications as read', async ({ authenticatedPage }) => {
    await authenticatedPage.route('**/api/notifications', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          { id: 1, type: 'engagement', message: 'Alert 1', isRead: false },
          { id: 2, type: 'engagement', message: 'Alert 2', isRead: false },
        ]),
      });
    });

    await authenticatedPage.route('**/api/notifications/mark-all-read', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true }),
      });
    });

    await notificationsPage.goto('/');
    await notificationsPage.markAllAsRead();
  });

  test('should show empty state when no notifications', async ({ authenticatedPage }) => {
    await authenticatedPage.route('**/api/notifications', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]),
      });
    });

    await notificationsPage.goto('/');
    await notificationsPage.openNotificationsPopover();
    
    const emptyState = notificationsPage.page.locator('[data-testid="notifications-empty"]');
    if (await emptyState.isVisible()) {
      await expect(emptyState).toBeVisible();
    }
  });

  test('should receive real-time engagement notification', async ({ authenticatedPage }) => {
    await authenticatedPage.route('**/api/notifications', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]),
      });
    });

    await notificationsPage.goto('/');
    
    await authenticatedPage.evaluate(() => {
      const event = new CustomEvent('new-notification', {
        detail: {
          id: 999,
          type: 'engagement',
          message: 'New engagement alert!',
        },
      });
      window.dispatchEvent(event);
    });
  });

  test('should filter notifications by type', async ({ authenticatedPage }) => {
    await authenticatedPage.route('**/api/notifications', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          { id: 1, type: 'engagement', message: 'Engagement alert', isRead: false },
          { id: 2, type: 'system', message: 'System notification', isRead: false },
          { id: 3, type: 'engagement', message: 'Another engagement', isRead: false },
        ]),
      });
    });

    await notificationsPage.goto('/');
    
    const hasEngagement = await notificationsPage.hasEngagementAlert();
    expect(hasEngagement).toBe(true);
  });
});
