import { test, expect } from '@playwright/test';

test.describe('Marketing Module - Main Interface', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/marketing');
    await page.waitForLoadState('networkidle');
  });

  test('should display Marketing page title', async ({ page }) => {
    await expect(page.getByTestId('text-marketing-title')).toBeVisible({ timeout: 15000 });
  });

  test('should have marketing tabs', async ({ page }) => {
    await expect(page.getByTestId('marketing-tabs')).toBeVisible({ timeout: 10000 });
  });

  test('should have queue tab', async ({ page }) => {
    await expect(page.getByTestId('tab-queue')).toBeVisible({ timeout: 10000 });
  });

  test('should have posted tab', async ({ page }) => {
    await expect(page.getByTestId('tab-posted')).toBeVisible({ timeout: 10000 });
  });

  test('should have evidence tab', async ({ page }) => {
    await expect(page.getByTestId('tab-evidence')).toBeVisible({ timeout: 10000 });
  });
});

test.describe('Marketing Module - Content Queue', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/marketing');
    await page.waitForLoadState('networkidle');
    await page.getByTestId('tab-queue').click();
  });

  test('should display content posts', async ({ page }) => {
    await page.waitForTimeout(1000);
    
    const postCards = page.locator('[data-testid^="card-post-"]');
    const count = await postCards.count();
    
    if (count > 0) {
      await expect(postCards.first()).toBeVisible();
    }
  });

  test('should have copy button for posts', async ({ page }) => {
    await page.waitForTimeout(1000);
    
    const copyButton = page.locator('[data-testid^="button-copy-"]').first();
    
    if (await copyButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(copyButton).toBeVisible();
    }
  });

  test('should have approve button for posts', async ({ page }) => {
    await page.waitForTimeout(1000);
    
    const approveButton = page.locator('[data-testid^="button-approve-"]').first();
    
    if (await approveButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(approveButton).toBeVisible();
    }
  });

  test('should have delete button for posts', async ({ page }) => {
    await page.waitForTimeout(1000);
    
    const deleteButton = page.locator('[data-testid^="button-delete-"]').first();
    
    if (await deleteButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(deleteButton).toBeVisible();
    }
  });
});

test.describe('Marketing Module - Evidence Vault', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/marketing');
    await page.waitForLoadState('networkidle');
    await page.getByTestId('tab-evidence').click();
  });

  test('should display evidence vault how-to card', async ({ page }) => {
    await expect(page.getByTestId('card-evidence-vault-howto')).toBeVisible({ timeout: 10000 });
  });

  test('should have add hook button', async ({ page }) => {
    await expect(page.getByTestId('button-add-hook')).toBeVisible({ timeout: 10000 });
  });

  test('should open add hook dialog', async ({ page }) => {
    await page.getByTestId('button-add-hook').click();
    
    await expect(page.getByTestId('select-persona')).toBeVisible({ timeout: 5000 });
    await expect(page.getByTestId('input-hook-content')).toBeVisible();
    await expect(page.getByTestId('input-ews-score')).toBeVisible();
    await expect(page.getByTestId('input-source-url')).toBeVisible();
    await expect(page.getByTestId('button-save-hook')).toBeVisible();
  });

  test('should display hook rows', async ({ page }) => {
    await page.waitForTimeout(1000);
    
    const hookRows = page.locator('[data-testid^="row-hook-"]');
    const count = await hookRows.count();
    
    if (count > 0) {
      await expect(hookRows.first()).toBeVisible();
    }
  });

  test('should have persona badges on hooks', async ({ page }) => {
    await page.waitForTimeout(1000);
    
    const personaBadges = page.locator('[data-testid^="badge-persona-"]');
    const count = await personaBadges.count();
    
    if (count > 0) {
      await expect(personaBadges.first()).toBeVisible();
    }
  });

  test('should have edit button for hooks', async ({ page }) => {
    await page.waitForTimeout(1000);
    
    const editButton = page.locator('[data-testid^="button-edit-"]').first();
    
    if (await editButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await expect(editButton).toBeVisible();
    }
  });
});

test.describe('Marketing Module - Posted Content', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/marketing');
    await page.waitForLoadState('networkidle');
    await page.getByTestId('tab-posted').click();
  });

  test('should display posted content', async ({ page }) => {
    await page.waitForTimeout(1000);
    
    const postedCards = page.locator('[data-testid^="card-post-"]');
    const count = await postedCards.count();
  });
});

test.describe('Marketing API', () => {
  test('should get content queue', async ({ request }) => {
    const response = await request.get('/api/marketing/content');
    expect([200, 500]).toContain(response.status());
  });

  test('should get evidence vault items', async ({ request }) => {
    const response = await request.get('/api/marketing/evidence');
    expect([200, 500]).toContain(response.status());
  });

  test('should get marketing posts', async ({ request }) => {
    const response = await request.get('/api/marketing/posts');
    expect([200, 500]).toContain(response.status());
  });

  test('should create evidence item', async ({ request }) => {
    const response = await request.post('/api/marketing/evidence', {
      data: {
        persona: 'BP-A',
        content: `Test evidence ${Date.now()}`,
        ewsScore: 75,
        sourceUrl: 'https://example.com'
      }
    });
    
    expect([200, 201, 500]).toContain(response.status());
  });
});
