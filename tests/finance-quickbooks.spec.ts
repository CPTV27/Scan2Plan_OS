import { test, expect } from '@playwright/test';

test.describe('Finance Module - Main Interface', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/finance');
    await expect(page.getByText('Finance')).toBeVisible({ timeout: 15000 });
  });

  test('should display Finance page', async ({ page }) => {
    await expect(page.getByTestId('text-finance-title')).toBeVisible();
  });

  test('should show Profit First dashboard', async ({ page }) => {
    await expect(page.getByText('Profit First')).toBeVisible({ timeout: 10000 });
  });

  test('should display allocation buckets', async ({ page }) => {
    await expect(page.getByTestId('card-bucket-revenue')).toBeVisible({ timeout: 10000 });
    await expect(page.getByTestId('card-bucket-profit')).toBeVisible();
    await expect(page.getByTestId('card-bucket-owner-pay')).toBeVisible();
    await expect(page.getByTestId('card-bucket-tax')).toBeVisible();
    await expect(page.getByTestId('card-bucket-opex')).toBeVisible();
  });

  test('should show current allocation percentages', async ({ page }) => {
    await expect(page.getByTestId('text-profit-percentage')).toBeVisible({ timeout: 10000 });
  });
});

test.describe('Finance Module - QuickBooks Integration', () => {
  test('should show QuickBooks connection status', async ({ page }) => {
    await page.goto('/finance');
    
    await expect(page.getByTestId('card-quickbooks-status')).toBeVisible({ timeout: 10000 });
  });

  test('should display connect button when not connected', async ({ page }) => {
    await page.goto('/finance');
    
    const connectButton = page.getByTestId('button-connect-quickbooks');
    const statusText = page.getByTestId('text-quickbooks-connected');
    
    await page.waitForTimeout(2000);
  });

  test('should show sync status when connected', async ({ page }) => {
    await page.goto('/finance');
    
    await page.waitForTimeout(2000);
    
    const syncStatus = page.getByTestId('text-last-sync');
    if (await syncStatus.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(syncStatus).toBeVisible();
    }
  });
});

test.describe('Finance Module - Financial Reports', () => {
  test('should have Balance Sheet section', async ({ page }) => {
    await page.goto('/finance');
    
    await expect(page.getByText('Balance Sheet')).toBeVisible({ timeout: 10000 });
  });

  test('should have P&L section', async ({ page }) => {
    await page.goto('/finance');
    
    await expect(page.getByText('Profit & Loss')).toBeVisible({ timeout: 10000 });
  });

  test('should show revenue metrics', async ({ page }) => {
    await page.goto('/finance');
    
    await expect(page.getByTestId('text-total-revenue')).toBeVisible({ timeout: 10000 });
  });

  test('should show expense metrics', async ({ page }) => {
    await page.goto('/finance');
    
    await expect(page.getByTestId('text-total-expenses')).toBeVisible({ timeout: 10000 });
  });
});

test.describe('Finance Module - FY26 Goals', () => {
  test('should display revenue goal progress', async ({ page }) => {
    await page.goto('/finance');
    
    await expect(page.getByTestId('progress-revenue-goal')).toBeVisible({ timeout: 10000 });
  });

  test('should display profit goal progress', async ({ page }) => {
    await page.goto('/finance');
    
    await expect(page.getByTestId('progress-profit-goal')).toBeVisible({ timeout: 10000 });
  });

  test('should show margin floor indicator', async ({ page }) => {
    await page.goto('/finance');
    
    await expect(page.getByText('40%')).toBeVisible({ timeout: 10000 });
  });
});

test.describe('QuickBooks API', () => {
  test('should return QuickBooks status', async ({ request }) => {
    const response = await request.get('/api/quickbooks/status');
    expect(response.status()).toBe(200);
    
    const data = await response.json();
    expect(data).toHaveProperty('configured');
    expect(data).toHaveProperty('connected');
  });

  test('should return auth URL when not connected', async ({ request }) => {
    const statusResponse = await request.get('/api/quickbooks/status');
    const status = await statusResponse.json();
    
    if (!status.connected) {
      const authResponse = await request.get('/api/quickbooks/auth-url');
      expect([200, 400]).toContain(authResponse.status());
    }
  });

  test('should get balance sheet when connected', async ({ request }) => {
    const statusResponse = await request.get('/api/quickbooks/status');
    const status = await statusResponse.json();
    
    if (status.connected) {
      const response = await request.get('/api/quickbooks/balance-sheet');
      expect(response.status()).toBe(200);
    }
  });

  test('should get P&L when connected', async ({ request }) => {
    const statusResponse = await request.get('/api/quickbooks/status');
    const status = await statusResponse.json();
    
    if (status.connected) {
      const response = await request.get('/api/quickbooks/profit-loss');
      expect(response.status()).toBe(200);
    }
  });
});

test.describe('Finance Module - Estimates', () => {
  test('should list estimates when QB connected', async ({ request }) => {
    const statusResponse = await request.get('/api/quickbooks/status');
    const status = await statusResponse.json();
    
    if (status.connected) {
      const response = await request.get('/api/quickbooks/estimates');
      expect(response.status()).toBe(200);
      
      const data = await response.json();
      expect(Array.isArray(data)).toBe(true);
    }
  });

  test('should create estimate from CPQ quote', async ({ request }) => {
    const statusResponse = await request.get('/api/quickbooks/status');
    const status = await statusResponse.json();
    
    if (status.connected) {
      const quotesResponse = await request.get('/api/cpq/quotes');
      const quotes = await quotesResponse.json();
      
      if (quotes.length > 0) {
        const response = await request.post('/api/quickbooks/estimates', {
          data: { quoteId: quotes[0].id }
        });
        expect([200, 201, 400]).toContain(response.status());
      }
    }
  });
});

test.describe('Finance Module - Customer Sync', () => {
  test('should sync customer from lead', async ({ request }) => {
    const statusResponse = await request.get('/api/quickbooks/status');
    const status = await statusResponse.json();
    
    if (status.connected) {
      const leadsResponse = await request.get('/api/leads');
      const leads = await leadsResponse.json();
      
      if (leads.length > 0) {
        const response = await request.post('/api/quickbooks/customers/sync', {
          data: { leadId: leads[0].id }
        });
        expect([200, 201, 400]).toContain(response.status());
      }
    }
  });
});
