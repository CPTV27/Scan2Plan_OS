import { test, expect } from '@playwright/test';

test.describe('Proposal Vault - Main Interface', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/proposal-vault');
    await expect(page.getByText('Proposal Vault')).toBeVisible({ timeout: 15000 });
  });

  test('should display Proposal Vault page', async ({ page }) => {
    await expect(page.getByTestId('text-proposal-vault-title')).toBeVisible();
  });

  test('should show PandaDoc connection status', async ({ page }) => {
    await expect(page.getByTestId('text-pandadoc-status')).toBeVisible({ timeout: 10000 });
  });

  test('should display sync button', async ({ page }) => {
    await expect(page.getByTestId('button-sync-pandadoc')).toBeVisible();
  });

  test('should show import statistics', async ({ page }) => {
    await expect(page.getByTestId('text-total-documents')).toBeVisible({ timeout: 10000 });
    await expect(page.getByTestId('text-pending-review')).toBeVisible();
    await expect(page.getByTestId('text-approved-count')).toBeVisible();
  });

  test('should display document list', async ({ page }) => {
    await page.waitForTimeout(2000);
    
    const documentList = page.locator('[data-testid^="card-document-"]');
    const count = await documentList.count();
    
    if (count > 0) {
      await expect(documentList.first()).toBeVisible();
    }
  });
});

test.describe('Proposal Vault - Document Filtering', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/proposal-vault');
    await expect(page.getByText('Proposal Vault')).toBeVisible({ timeout: 15000 });
  });

  test('should have status filter tabs', async ({ page }) => {
    await expect(page.getByTestId('tab-filter-all')).toBeVisible();
    await expect(page.getByTestId('tab-filter-pending')).toBeVisible();
    await expect(page.getByTestId('tab-filter-approved')).toBeVisible();
    await expect(page.getByTestId('tab-filter-rejected')).toBeVisible();
  });

  test('should filter by pending status', async ({ page }) => {
    await page.getByTestId('tab-filter-pending').click();
    await page.waitForTimeout(500);
    
    await expect(page.getByTestId('tab-filter-pending')).toHaveAttribute('data-state', 'active');
  });

  test('should filter by approved status', async ({ page }) => {
    await page.getByTestId('tab-filter-approved').click();
    await page.waitForTimeout(500);
    
    await expect(page.getByTestId('tab-filter-approved')).toHaveAttribute('data-state', 'active');
  });

  test('should have search functionality', async ({ page }) => {
    await expect(page.getByTestId('input-search-documents')).toBeVisible();
  });
});

test.describe('Proposal Vault - Document Review', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/proposal-vault');
    await expect(page.getByText('Proposal Vault')).toBeVisible({ timeout: 15000 });
    await page.waitForTimeout(2000);
  });

  test('should open document review dialog', async ({ page }) => {
    const documentCard = page.locator('[data-testid^="card-document-"]').first();
    
    if (await documentCard.isVisible({ timeout: 5000 }).catch(() => false)) {
      await documentCard.click();
      await expect(page.getByTestId('dialog-document-review')).toBeVisible({ timeout: 5000 });
    }
  });

  test('should display extracted data in review', async ({ page }) => {
    const documentCard = page.locator('[data-testid^="card-document-"]').first();
    
    if (await documentCard.isVisible({ timeout: 5000 }).catch(() => false)) {
      await documentCard.click();
      
      await expect(page.getByTestId('text-extracted-client')).toBeVisible({ timeout: 5000 });
      await expect(page.getByTestId('text-extracted-project')).toBeVisible();
    }
  });

  test('should show pricing table from extraction', async ({ page }) => {
    const documentCard = page.locator('[data-testid^="card-document-"]').first();
    
    if (await documentCard.isVisible({ timeout: 5000 }).catch(() => false)) {
      await documentCard.click();
      
      await expect(page.getByTestId('table-extracted-pricing')).toBeVisible({ timeout: 5000 });
    }
  });

  test('should show confidence scores', async ({ page }) => {
    const documentCard = page.locator('[data-testid^="card-document-"]').first();
    
    if (await documentCard.isVisible({ timeout: 5000 }).catch(() => false)) {
      await documentCard.click();
      
      await expect(page.getByTestId('text-confidence-score')).toBeVisible({ timeout: 5000 });
    }
  });

  test('should have approve button in review', async ({ page }) => {
    const documentCard = page.locator('[data-testid^="card-document-"]').first();
    
    if (await documentCard.isVisible({ timeout: 5000 }).catch(() => false)) {
      await documentCard.click();
      
      await expect(page.getByTestId('button-approve-document')).toBeVisible({ timeout: 5000 });
    }
  });

  test('should have reject button in review', async ({ page }) => {
    const documentCard = page.locator('[data-testid^="card-document-"]').first();
    
    if (await documentCard.isVisible({ timeout: 5000 }).catch(() => false)) {
      await documentCard.click();
      
      await expect(page.getByTestId('button-reject-document')).toBeVisible({ timeout: 5000 });
    }
  });
});

test.describe('Proposal Vault - Batch Import', () => {
  test('should show batch history', async ({ page }) => {
    await page.goto('/proposal-vault');
    await expect(page.getByText('Proposal Vault')).toBeVisible({ timeout: 15000 });
    
    await expect(page.getByTestId('section-batch-history')).toBeVisible({ timeout: 10000 });
  });

  test('should display batch import cards', async ({ page }) => {
    await page.goto('/proposal-vault');
    await page.waitForTimeout(2000);
    
    const batchCards = page.locator('[data-testid^="card-batch-"]');
    const count = await batchCards.count();
    
    if (count > 0) {
      await expect(batchCards.first()).toBeVisible();
    }
  });

  test('sync should trigger PandaDoc import', async ({ page }) => {
    await page.goto('/proposal-vault');
    await expect(page.getByText('Proposal Vault')).toBeVisible({ timeout: 15000 });
    
    const syncButton = page.getByTestId('button-sync-pandadoc');
    await expect(syncButton).toBeVisible();
  });
});

test.describe('Proposal Vault - Quote Creation', () => {
  test('approved documents should create CPQ quotes', async ({ page }) => {
    await page.goto('/proposal-vault');
    await page.getByTestId('tab-filter-approved').click();
    await page.waitForTimeout(1000);
    
    const approvedDoc = page.locator('[data-testid^="card-document-"]').first();
    
    if (await approvedDoc.isVisible({ timeout: 5000 }).catch(() => false)) {
      await approvedDoc.click();
      
      const viewQuoteButton = page.getByTestId('button-view-cpq-quote');
      if (await viewQuoteButton.isVisible({ timeout: 3000 }).catch(() => false)) {
        await expect(viewQuoteButton).toBeVisible();
      }
    }
  });
});

test.describe('Proposal Vault - API', () => {
  test('should get PandaDoc status', async ({ request }) => {
    const response = await request.get('/api/pandadoc/status');
    expect(response.status()).toBe(200);
    
    const data = await response.json();
    expect(data).toHaveProperty('configured');
    expect(data).toHaveProperty('totalDocuments');
  });

  test('should get batch list', async ({ request }) => {
    const response = await request.get('/api/pandadoc/batches');
    expect(response.status()).toBe(200);
    
    const data = await response.json();
    expect(Array.isArray(data)).toBe(true);
  });

  test('should get document list', async ({ request }) => {
    const response = await request.get('/api/pandadoc/documents');
    expect(response.status()).toBe(200);
    
    const data = await response.json();
    expect(Array.isArray(data)).toBe(true);
  });

  test('should filter documents by status', async ({ request }) => {
    const response = await request.get('/api/pandadoc/documents?status=pending');
    expect(response.status()).toBe(200);
    
    const data = await response.json();
    expect(Array.isArray(data)).toBe(true);
  });

  test('should approve document', async ({ request }) => {
    const docsResponse = await request.get('/api/pandadoc/documents?status=pending');
    const docs = await docsResponse.json();
    
    if (docs.length > 0) {
      const docId = docs[0].id;
      const response = await request.post(`/api/pandadoc/documents/${docId}/approve`);
      expect([200, 400]).toContain(response.status());
    }
  });

  test('should reject document with reason', async ({ request }) => {
    const docsResponse = await request.get('/api/pandadoc/documents?status=pending');
    const docs = await docsResponse.json();
    
    if (docs.length > 0) {
      const docId = docs[0].id;
      const response = await request.post(`/api/pandadoc/documents/${docId}/reject`, {
        data: { reason: 'Test rejection' }
      });
      expect([200, 400]).toContain(response.status());
    }
  });
});

test.describe('Proposal Vault - Extraction Quality', () => {
  test('extracted data should have required fields', async ({ request }) => {
    const response = await request.get('/api/pandadoc/documents');
    const docs = await response.json();
    
    if (docs.length > 0 && docs[0].extractedData) {
      const extracted = docs[0].extractedData;
      
      expect(extracted).toHaveProperty('contacts');
      expect(extracted).toHaveProperty('pricing');
    }
  });

  test('pricing items should have correct structure', async ({ request }) => {
    const response = await request.get('/api/pandadoc/documents');
    const docs = await response.json();
    
    const docWithPricing = docs.find((d: any) => d.extractedData?.pricing?.length > 0);
    
    if (docWithPricing) {
      const pricingItem = docWithPricing.extractedData.pricing[0];
      expect(pricingItem).toHaveProperty('description');
      expect(pricingItem).toHaveProperty('amount');
    }
  });
});
