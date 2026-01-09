import { test, expect, mockHubSpotAPI } from '../fixtures/auth.fixtures';
import { AuthPage } from '../page-objects/auth.po';

test.describe('Authentication & Mode Toggle', () => {
  test.beforeEach(async ({ page }) => {
    await mockHubSpotAPI(page);
  });

  test('should display login button when not authenticated', async ({ browser }) => {
    const context = await browser.newContext({ storageState: undefined });
    const page = await context.newPage();
    const authPage = new AuthPage(page);
    
    await authPage.goto('/');
    
    await expect(authPage.loginButton).toBeVisible();
    await context.close();
  });

  test('should show user avatar after authentication', async ({ authenticatedPage }) => {
    const authPage = new AuthPage(authenticatedPage);
    
    await authPage.goto('/');
    
    const isLoggedIn = await authPage.isLoggedIn();
    expect(isLoggedIn).toBe(true);
  });

  test('should toggle between Admin and Field modes', async ({ authenticatedPage }) => {
    const authPage = new AuthPage(authenticatedPage);
    
    await authPage.goto('/');
    
    await authPage.switchToAdminMode();
    let mode = await authPage.getCurrentMode();
    expect(mode).toContain('admin');
    
    await authPage.switchToFieldMode();
    mode = await authPage.getCurrentMode();
    expect(mode).toContain('field');
  });

  test('should persist mode selection across navigation', async ({ authenticatedPage }) => {
    const authPage = new AuthPage(authenticatedPage);
    
    await authPage.goto('/');
    await authPage.switchToFieldMode();
    
    await authPage.navigateTo('production');
    await authPage.page.waitForLoadState('networkidle');
    
    const mode = await authPage.getCurrentMode();
    expect(mode).toContain('field');
  });

  test('should show different UI elements based on mode', async ({ authenticatedPage }) => {
    const authPage = new AuthPage(authenticatedPage);
    
    await authPage.goto('/');
    
    await authPage.switchToAdminMode();
    const adminElements = authPage.page.locator('[data-admin-only="true"]');
    
    await authPage.switchToFieldMode();
    const fieldElements = authPage.page.locator('[data-field-only="true"]');
  });

  test('should handle logout correctly', async ({ authenticatedPage }) => {
    const authPage = new AuthPage(authenticatedPage);
    
    await authPage.goto('/');
    
    if (await authPage.logoutButton.isVisible()) {
      await authPage.logout();
      await expect(authPage.loginButton).toBeVisible();
    }
  });
});
