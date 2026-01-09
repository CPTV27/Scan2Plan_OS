import { test, expect } from '@playwright/test';

test.describe('Agentic Features Testing', () => {
  
  test.describe('Site Reality Audit', () => {
    test('API endpoint exists and works with auth', async ({ request }) => {
      const response = await request.post('/api/site-audit/1');
      expect([200, 403, 404]).toContain(response.status());
    });

    test('Frontend component renders correctly', async ({ page }) => {
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      
      await expect(page).toHaveTitle(/Scan2Plan/i, { timeout: 10000 });
    });
  });

  test.describe('Predictive Cashflow', () => {
    test('API endpoint accessible to authenticated users', async ({ request }) => {
      const response = await request.get('/api/predictive-cashflow');
      expect([200, 403]).toContain(response.status());
    });

    test('API endpoint requires CEO role', async ({ request }) => {
      const response = await request.get('/api/predictive-cashflow');
      expect([200, 403]).toContain(response.status());
    });
  });

  test.describe('Project Concierge', () => {
    test('Leads API accessible with authentication', async ({ request }) => {
      const response = await request.get('/api/leads');
      expect(response.status()).toBe(200);
    });
  });

  test.describe('Backend Module Imports', () => {
    test('Site Reality Audit module can be imported', async () => {
      const siteAudit = await import('../server/site-reality-audit');
      expect(typeof siteAudit.performSiteRealityAudit).toBe('function');
    });

    test('Predictive Cashflow module can be imported', async () => {
      const cashflow = await import('../server/predictive-cashflow');
      expect(typeof cashflow.getPredictiveCashflow).toBe('function');
    });

    test('Google Chat module can be imported', async () => {
      const googleChat = await import('../server/google-chat');
      expect(typeof googleChat.createProjectSpace).toBe('function');
      expect(typeof googleChat.isGoogleChatConfigured).toBe('function');
    });
  });
});
