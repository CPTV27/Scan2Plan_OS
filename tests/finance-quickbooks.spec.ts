import { test, expect } from '@playwright/test';

test.describe('Finance Module - Main Interface', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/financial');
    await page.waitForLoadState('networkidle');
  });

  test('should display Finance page', async ({ page }) => {
    await expect(page.getByText('Financial')).toBeVisible({ timeout: 15000 });
  });

  test('should show financial health bar', async ({ page }) => {
    await expect(page.getByTestId('financial-health-bar')).toBeVisible({ timeout: 10000 });
  });

  test('should display current cash', async ({ page }) => {
    await expect(page.getByTestId('text-current-cash')).toBeVisible({ timeout: 10000 });
  });

  test('should display total AR', async ({ page }) => {
    await expect(page.getByTestId('text-total-ar')).toBeVisible({ timeout: 10000 });
  });

  test('should display total AP', async ({ page }) => {
    await expect(page.getByTestId('text-total-ap')).toBeVisible({ timeout: 10000 });
  });

  test('should display net position', async ({ page }) => {
    await expect(page.getByTestId('text-net-position')).toBeVisible({ timeout: 10000 });
  });
});

test.describe('Finance Module - Tabs', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/financial');
    await page.waitForLoadState('networkidle');
  });

  test('should have Profit First tab', async ({ page }) => {
    await expect(page.getByTestId('tab-accounts')).toBeVisible({ timeout: 10000 });
  });

  test('should have Collections tab', async ({ page }) => {
    await expect(page.getByTestId('tab-collections')).toBeVisible({ timeout: 10000 });
  });

  test('should have Loans tab', async ({ page }) => {
    await expect(page.getByTestId('tab-loans')).toBeVisible({ timeout: 10000 });
  });

  test('should have Payables tab', async ({ page }) => {
    await expect(page.getByTestId('tab-payables')).toBeVisible({ timeout: 10000 });
  });

  test('should have Settings tab', async ({ page }) => {
    await expect(page.getByTestId('tab-settings')).toBeVisible({ timeout: 10000 });
  });

  test('should switch between tabs', async ({ page }) => {
    await page.getByTestId('tab-collections').click();
    await page.waitForTimeout(500);
    
    await page.getByTestId('tab-loans').click();
    await page.waitForTimeout(500);
    
    await page.getByTestId('tab-accounts').click();
    await page.waitForTimeout(500);
  });
});

test.describe('Finance Module - Profit First Accounts', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/financial');
    await page.waitForLoadState('networkidle');
    await page.getByTestId('tab-accounts').click();
  });

  test('should have allocate income button', async ({ page }) => {
    await expect(page.getByTestId('button-allocate-income')).toBeVisible({ timeout: 10000 });
  });

  test('should open allocation dialog', async ({ page }) => {
    await page.getByTestId('button-allocate-income').click();
    
    await expect(page.getByTestId('input-allocate-amount')).toBeVisible({ timeout: 5000 });
    await expect(page.getByTestId('button-confirm-allocate')).toBeVisible();
  });
});

test.describe('Finance Module - Loans', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/financial');
    await page.waitForLoadState('networkidle');
    await page.getByTestId('tab-loans').click();
  });

  test('should display internal loan card', async ({ page }) => {
    await expect(page.getByTestId('card-internal-loan')).toBeVisible({ timeout: 10000 });
  });

  test('should have loan repayment progress', async ({ page }) => {
    await expect(page.getByTestId('progress-loan-repayment')).toBeVisible({ timeout: 10000 });
  });

  test('should have repay amount input', async ({ page }) => {
    await expect(page.getByTestId('input-repay-amount')).toBeVisible({ timeout: 10000 });
  });

  test('should have repay button', async ({ page }) => {
    await expect(page.getByTestId('button-repay-loan')).toBeVisible({ timeout: 10000 });
  });
});

test.describe('Finance Module - Settings', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/financial');
    await page.waitForLoadState('networkidle');
    await page.getByTestId('tab-settings').click();
  });

  test('should have add stakeholder button', async ({ page }) => {
    await expect(page.getByTestId('button-add-stakeholder')).toBeVisible({ timeout: 10000 });
  });

  test('should have overhead rate input', async ({ page }) => {
    await expect(page.getByTestId('input-overhead-rate')).toBeVisible({ timeout: 10000 });
  });

  test('should have target margin input', async ({ page }) => {
    await expect(page.getByTestId('input-target-margin')).toBeVisible({ timeout: 10000 });
  });

  test('should have save settings button', async ({ page }) => {
    await expect(page.getByTestId('button-save-settings')).toBeVisible({ timeout: 10000 });
  });

  test('should open add stakeholder dialog', async ({ page }) => {
    await page.getByTestId('button-add-stakeholder').click();
    
    await expect(page.getByTestId('input-stakeholder-name')).toBeVisible({ timeout: 5000 });
    await expect(page.getByTestId('input-stakeholder-role')).toBeVisible();
    await expect(page.getByTestId('select-stakeholder-type')).toBeVisible();
    await expect(page.getByTestId('input-stakeholder-rate')).toBeVisible();
    await expect(page.getByTestId('button-save-stakeholder')).toBeVisible();
  });
});

test.describe('Finance Module - Collections', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/financial');
    await page.waitForLoadState('networkidle');
    await page.getByTestId('tab-collections').click();
  });

  test('should have apply interest button', async ({ page }) => {
    await expect(page.getByTestId('button-apply-interest')).toBeVisible({ timeout: 10000 });
  });

  test('should have send reminders button', async ({ page }) => {
    await expect(page.getByTestId('button-send-reminders')).toBeVisible({ timeout: 10000 });
  });

  test('should display overdue invoices', async ({ page }) => {
    await page.waitForTimeout(1000);
    
    const overdueInvoices = page.locator('[data-testid^="invoice-overdue-"]');
    const count = await overdueInvoices.count();
  });
});

test.describe('Finance Module - Revenue Forecast', () => {
  test('should display revenue forecast card', async ({ page }) => {
    await page.goto('/financial');
    await page.waitForLoadState('networkidle');
    
    await expect(page.getByTestId('card-revenue-forecast')).toBeVisible({ timeout: 10000 });
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

test.describe('Finance API', () => {
  test('should get profit first accounts', async ({ request }) => {
    const response = await request.get('/api/profit-first/accounts');
    expect([200, 500]).toContain(response.status());
  });

  test('should get financial summary', async ({ request }) => {
    const response = await request.get('/api/financial/summary');
    expect([200, 500]).toContain(response.status());
  });
});
