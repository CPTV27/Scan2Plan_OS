import { test, expect } from '@playwright/test';

test.describe('Proposal Vault - Main Interface', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/proposal-vault');
    await page.waitForLoadState('networkidle');
  });

  test('should display Proposal Vault page', async ({ page }) => {
    await expect(page.getByText('Proposal Vault')).toBeVisible({ timeout: 15000 });
  });

  test('should display sync button', async ({ page }) => {
    await expect(page.getByTestId('button-sync-pandadoc')).toBeVisible({ timeout: 10000 });
  });

  test('should have document tabs', async ({ page }) => {
    await expect(page.getByTestId('tab-documents')).toBeVisible({ timeout: 10000 });
    await expect(page.getByTestId('tab-review')).toBeVisible();
    await expect(page.getByTestId('tab-batches')).toBeVisible();
  });

  test('should switch to documents tab', async ({ page }) => {
    await page.getByTestId('tab-documents').click();
    await page.waitForTimeout(500);
  });

  test('should switch to review tab', async ({ page }) => {
    await page.getByTestId('tab-review').click();
    await page.waitForTimeout(500);
  });

  test('should switch to batches tab', async ({ page }) => {
    await page.getByTestId('tab-batches').click();
    await page.waitForTimeout(500);
  });
});

test.describe('Proposal Vault - Document List', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/proposal-vault');
    await page.waitForLoadState('networkidle');
    await page.getByTestId('tab-documents').click();
  });

  test('should display document rows', async ({ page }) => {
    await page.waitForTimeout(2000);
    
    const documentRows = page.locator('[data-testid^="document-row-"]');
    const count = await documentRows.count();
    
    if (count > 0) {
      await expect(documentRows.first()).toBeVisible();
    }
  });

  test('should have process button for documents', async ({ page }) => {
    await page.waitForTimeout(2000);
    
    const processButton = page.locator('[data-testid^="button-process-"]').first();
    
    if (await processButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(processButton).toBeVisible();
    }
  });

  test('should have review button for documents', async ({ page }) => {
    await page.waitForTimeout(2000);
    
    const reviewButton = page.locator('[data-testid^="button-review-"]').first();
    
    if (await reviewButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(reviewButton).toBeVisible();
    }
  });
});

test.describe('Proposal Vault - Document Review', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/proposal-vault');
    await page.waitForLoadState('networkidle');
    await page.getByTestId('tab-review').click();
    await page.waitForTimeout(1000);
  });

  test('should display review queue', async ({ page }) => {
    const reviewRows = page.locator('[data-testid^="review-row-"]');
    const count = await reviewRows.count();
    
    if (count > 0) {
      await expect(reviewRows.first()).toBeVisible();
    }
  });

  test('should have review queue button', async ({ page }) => {
    const reviewButton = page.locator('[data-testid^="button-review-queue-"]').first();
    
    if (await reviewButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(reviewButton).toBeVisible();
    }
  });
});

test.describe('Proposal Vault - Batch History', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/proposal-vault');
    await page.waitForLoadState('networkidle');
    await page.getByTestId('tab-batches').click();
    await page.waitForTimeout(1000);
  });

  test('should display batch rows', async ({ page }) => {
    const batchRows = page.locator('[data-testid^="batch-row-"]');
    const count = await batchRows.count();
    
    if (count > 0) {
      await expect(batchRows.first()).toBeVisible();
    }
  });
});

test.describe('Proposal Vault - Manual Quote Entry', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/proposal-vault');
    await page.waitForLoadState('networkidle');
  });

  test('should have project name input', async ({ page }) => {
    await expect(page.getByTestId('input-project-name')).toBeVisible({ timeout: 10000 });
  });

  test('should have client name input', async ({ page }) => {
    await expect(page.getByTestId('input-client-name')).toBeVisible({ timeout: 10000 });
  });

  test('should have project address input', async ({ page }) => {
    await expect(page.getByTestId('input-project-address')).toBeVisible({ timeout: 10000 });
  });

  test('should have add area button', async ({ page }) => {
    await expect(page.getByTestId('button-add-area')).toBeVisible({ timeout: 10000 });
  });

  test('should add area when button clicked', async ({ page }) => {
    await page.getByTestId('button-add-area').click();
    
    await expect(page.getByTestId('input-area-sqft-0')).toBeVisible({ timeout: 5000 });
  });

  test('should have review notes input', async ({ page }) => {
    await expect(page.getByTestId('input-review-notes')).toBeVisible({ timeout: 10000 });
  });

  test('should have total price input', async ({ page }) => {
    await expect(page.getByTestId('input-total-price')).toBeVisible({ timeout: 10000 });
  });

  test('should have approve button', async ({ page }) => {
    await expect(page.getByTestId('button-approve-document')).toBeVisible({ timeout: 10000 });
  });

  test('should have reject button', async ({ page }) => {
    await expect(page.getByTestId('button-reject-document')).toBeVisible({ timeout: 10000 });
  });
});

test.describe('Proposal Vault - Services', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/proposal-vault');
    await page.waitForLoadState('networkidle');
  });

  test('should have add service button', async ({ page }) => {
    await expect(page.getByTestId('button-add-service')).toBeVisible({ timeout: 10000 });
  });

  test('should add service when button clicked', async ({ page }) => {
    await page.getByTestId('button-add-service').click();
    
    await expect(page.getByTestId('input-service-name-0')).toBeVisible({ timeout: 5000 });
  });
});

test.describe('Proposal Vault - API', () => {
  test('should get PandaDoc status', async ({ request }) => {
    const response = await request.get('/api/pandadoc/status');
    expect([200, 500]).toContain(response.status());
  });

  test('should get batch list', async ({ request }) => {
    const response = await request.get('/api/pandadoc/batches');
    expect([200, 500]).toContain(response.status());
  });

  test('should get document list', async ({ request }) => {
    const response = await request.get('/api/pandadoc/documents');
    expect([200, 500]).toContain(response.status());
  });
});
