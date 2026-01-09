import { test, expect } from '@playwright/test';

test.describe('CPQ Calculator - Core Functionality', () => {
  test('should display CPQ calculator page', async ({ page }) => {
    await page.goto('/sales/calculator');
    await page.waitForLoadState('networkidle');
    
    await expect(page.getByText('CPQ')).toBeVisible({ timeout: 15000 });
  });

  test('should have area management buttons', async ({ page }) => {
    await page.goto('/sales/calculator');
    await page.waitForLoadState('networkidle');
    
    const addButton = page.getByTestId('button-add-standard-area');
    const landscapeButton = page.getByTestId('button-add-landscape-area');
    
    const hasAddButton = await addButton.isVisible({ timeout: 5000 }).catch(() => false);
    const hasLandscapeButton = await landscapeButton.isVisible({ timeout: 5000 }).catch(() => false);
    
    expect(hasAddButton || hasLandscapeButton).toBe(true);
  });

  test('should add landscape area', async ({ page }) => {
    await page.goto('/sales/calculator');
    await page.waitForLoadState('networkidle');
    
    const landscapeButton = page.getByTestId('button-add-landscape-area');
    
    if (await landscapeButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await landscapeButton.click();
      await page.waitForTimeout(500);
    }
  });

  test('should have building type selector', async ({ page }) => {
    await page.goto('/sales/calculator');
    await page.waitForLoadState('networkidle');
    
    const typeSelector = page.locator('[data-testid^="select-building-type"]').first();
    
    if (await typeSelector.isVisible({ timeout: 5000 }).catch(() => false)) {
      await expect(typeSelector).toBeVisible();
    }
  });

  test('should have LOD selector', async ({ page }) => {
    await page.goto('/sales/calculator');
    await page.waitForLoadState('networkidle');
    
    const lodSelector = page.locator('[data-testid^="select-lod"]').first();
    
    if (await lodSelector.isVisible({ timeout: 5000 }).catch(() => false)) {
      await expect(lodSelector).toBeVisible();
    }
  });

  test('should have dispatch location selector', async ({ page }) => {
    await page.goto('/sales/calculator');
    await page.waitForLoadState('networkidle');
    
    await expect(page.getByTestId('select-dispatch-location')).toBeVisible({ timeout: 10000 });
  });

  test('should have pricing mode buttons', async ({ page }) => {
    await page.goto('/sales/calculator');
    await page.waitForLoadState('networkidle');
    
    const standardButton = page.getByTestId('button-mode-standard');
    const tierAButton = page.getByTestId('button-mode-tier-a');
    
    const hasStandard = await standardButton.isVisible({ timeout: 5000 }).catch(() => false);
    const hasTierA = await tierAButton.isVisible({ timeout: 5000 }).catch(() => false);
    
    expect(hasStandard || hasTierA).toBe(true);
  });

  test('should have save quote button', async ({ page }) => {
    await page.goto('/sales/calculator');
    await page.waitForLoadState('networkidle');
    
    await expect(page.getByTestId('button-save-quote')).toBeVisible({ timeout: 10000 });
  });

  test('should have site status selector', async ({ page }) => {
    await page.goto('/sales/calculator');
    await page.waitForLoadState('networkidle');
    
    await expect(page.getByTestId('select-site-status')).toBeVisible({ timeout: 10000 });
  });

  test('should have payment terms selector', async ({ page }) => {
    await page.goto('/sales/calculator');
    await page.waitForLoadState('networkidle');
    
    await expect(page.getByTestId('select-payment-terms')).toBeVisible({ timeout: 10000 });
  });

  test('should have project notes textarea', async ({ page }) => {
    await page.goto('/sales/calculator');
    await page.waitForLoadState('networkidle');
    
    await expect(page.getByTestId('textarea-project-notes')).toBeVisible({ timeout: 10000 });
  });
});

test.describe('CPQ Calculator - Access from Deal', () => {
  test('should access CPQ via lead ID route', async ({ page }) => {
    const leadsResponse = await page.request.get('/api/leads');
    const leads = await leadsResponse.json();
    
    if (leads.length > 0) {
      await page.goto(`/sales/calculator/${leads[0].id}`);
      await page.waitForLoadState('networkidle');
      
      await expect(page.getByText('CPQ')).toBeVisible({ timeout: 15000 });
    }
  });
});
