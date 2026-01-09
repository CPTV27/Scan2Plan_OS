import { test, expect } from '../fixtures/auth.fixtures';
import { BasePage } from '../page-objects/base.po';

test.describe('Visual Regression Tests', () => {
  test.describe.configure({ mode: 'parallel' });

  test.beforeEach(async ({ authenticatedPage }) => {
    await authenticatedPage.route('**/api/**', async (route) => {
      const url = route.request().url();
      
      if (url.includes('/api/deals/summary')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            totalDeals: 24,
            totalValue: 1250000,
            wonThisMonth: 3,
            avgDealSize: 52083,
          }),
        });
      } else if (url.includes('/api/revenue-forecast')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            monthly: [
              { month: 'Jan', forecast: 120000, actual: 115000 },
              { month: 'Feb', forecast: 135000, actual: 142000 },
              { month: 'Mar', forecast: 150000, actual: null },
            ],
          }),
        });
      } else if (url.includes('/api/projects')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([
            { id: 1, name: 'Project Alpha', status: 'in_progress', variancePercent: 5 },
            { id: 2, name: 'Project Beta', status: 'complete', variancePercent: -2 },
            { id: 3, name: 'Project Gamma', status: 'pending', variancePercent: 0 },
          ]),
        });
      } else if (url.includes('/api/marketing-posts')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([
            { id: 1, content: 'Sample post content', status: 'draft', platform: 'linkedin' },
            { id: 2, content: 'Another post', status: 'approved', platform: 'twitter' },
          ]),
        });
      } else {
        await route.continue();
      }
    });
  });

  test('Dashboard visual snapshot', async ({ authenticatedPage }) => {
    const basePage = new BasePage(authenticatedPage);
    await basePage.goto('/');
    await basePage.waitForNetworkIdle();
    
    await authenticatedPage.waitForTimeout(1000);
    
    await expect(authenticatedPage).toHaveScreenshot('dashboard.png', {
      fullPage: true,
      maxDiffPixelRatio: 0.05,
    });
  });

  test('Production Board visual snapshot', async ({ authenticatedPage }) => {
    const basePage = new BasePage(authenticatedPage);
    await basePage.goto('/production');
    await basePage.waitForNetworkIdle();
    
    await authenticatedPage.waitForTimeout(1000);
    
    await expect(authenticatedPage).toHaveScreenshot('production-board.png', {
      fullPage: true,
      maxDiffPixelRatio: 0.05,
    });
  });

  test('Marketing Queue visual snapshot', async ({ authenticatedPage }) => {
    const basePage = new BasePage(authenticatedPage);
    await basePage.goto('/marketing');
    await basePage.waitForNetworkIdle();
    
    await authenticatedPage.waitForTimeout(1000);
    
    await expect(authenticatedPage).toHaveScreenshot('marketing-queue.png', {
      fullPage: true,
      maxDiffPixelRatio: 0.05,
    });
  });

  test('Dashboard dark mode visual snapshot', async ({ authenticatedPage }) => {
    const basePage = new BasePage(authenticatedPage);
    await basePage.goto('/');
    await basePage.waitForNetworkIdle();
    
    await basePage.toggleTheme();
    await authenticatedPage.waitForTimeout(500);
    
    await expect(authenticatedPage).toHaveScreenshot('dashboard-dark.png', {
      fullPage: true,
      maxDiffPixelRatio: 0.05,
    });
  });

  test('Pipeline view visual snapshot', async ({ authenticatedPage }) => {
    await authenticatedPage.route('**/api/leads', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          { id: 1, contactName: 'John Doe', company: 'Acme Corp', buyerPersona: 'BP1' },
          { id: 2, contactName: 'Jane Smith', company: 'Beta Inc', buyerPersona: 'BP3' },
        ]),
      });
    });

    const basePage = new BasePage(authenticatedPage);
    await basePage.goto('/pipeline');
    await basePage.waitForNetworkIdle();
    
    await authenticatedPage.waitForTimeout(1000);
    
    await expect(authenticatedPage).toHaveScreenshot('pipeline.png', {
      fullPage: true,
      maxDiffPixelRatio: 0.05,
    });
  });

  test('Evidence Vault visual snapshot', async ({ authenticatedPage }) => {
    await authenticatedPage.route('**/api/evidence-vault', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          { id: 1, personaCode: 'BP1', hookContent: 'Sample hook 1', ewsScore: 5 },
          { id: 2, personaCode: 'BP5', hookContent: 'Sample hook 2', ewsScore: 4 },
          { id: 3, personaCode: 'BP8', hookContent: 'Sample hook 3', ewsScore: 5 },
        ]),
      });
    });

    const basePage = new BasePage(authenticatedPage);
    await basePage.goto('/marketing');
    await basePage.waitForNetworkIdle();
    
    const evidenceTab = authenticatedPage.locator('[data-testid="tab-evidence"]');
    await evidenceTab.click();
    await authenticatedPage.waitForTimeout(1000);
    
    await expect(authenticatedPage).toHaveScreenshot('evidence-vault.png', {
      fullPage: true,
      maxDiffPixelRatio: 0.05,
    });
  });

  test('Sidebar collapsed visual snapshot', async ({ authenticatedPage }) => {
    const basePage = new BasePage(authenticatedPage);
    await basePage.goto('/');
    await basePage.waitForNetworkIdle();
    
    await basePage.toggleSidebar();
    await authenticatedPage.waitForTimeout(500);
    
    await expect(authenticatedPage).toHaveScreenshot('sidebar-collapsed.png', {
      fullPage: true,
      maxDiffPixelRatio: 0.05,
    });
  });

  test('Mobile viewport visual snapshot', async ({ authenticatedPage }) => {
    await authenticatedPage.setViewportSize({ width: 375, height: 812 });
    
    const basePage = new BasePage(authenticatedPage);
    await basePage.goto('/');
    await basePage.waitForNetworkIdle();
    
    await authenticatedPage.waitForTimeout(1000);
    
    await expect(authenticatedPage).toHaveScreenshot('dashboard-mobile.png', {
      fullPage: true,
      maxDiffPixelRatio: 0.05,
    });
  });
});
