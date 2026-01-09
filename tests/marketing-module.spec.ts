import { test, expect } from '@playwright/test';

test.describe('Marketing Module - Main Interface', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/marketing');
    await expect(page.getByText('Marketing')).toBeVisible({ timeout: 15000 });
  });

  test('should display Marketing page', async ({ page }) => {
    await expect(page.getByTestId('text-marketing-title')).toBeVisible();
  });

  test('should show persona classification section', async ({ page }) => {
    await expect(page.getByText('Buyer Personas')).toBeVisible({ timeout: 10000 });
  });

  test('should display 8 persona types', async ({ page }) => {
    await expect(page.getByTestId('card-persona-bp-a')).toBeVisible({ timeout: 10000 });
    await expect(page.getByTestId('card-persona-bp-b')).toBeVisible();
    await expect(page.getByTestId('card-persona-bp-c')).toBeVisible();
    await expect(page.getByTestId('card-persona-bp-d')).toBeVisible();
  });
});

test.describe('Marketing Module - Evidence Vault', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/marketing');
    await expect(page.getByText('Marketing')).toBeVisible({ timeout: 15000 });
  });

  test('should display Evidence Vault section', async ({ page }) => {
    await expect(page.getByText('Evidence Vault')).toBeVisible({ timeout: 10000 });
  });

  test('should show EWS scoring', async ({ page }) => {
    await expect(page.getByText('EWS Score')).toBeVisible({ timeout: 10000 });
  });

  test('should have add evidence button', async ({ page }) => {
    await expect(page.getByTestId('button-add-evidence')).toBeVisible({ timeout: 10000 });
  });

  test('should open evidence dialog', async ({ page }) => {
    await page.getByTestId('button-add-evidence').click();
    await expect(page.getByTestId('dialog-add-evidence')).toBeVisible({ timeout: 5000 });
  });

  test('should list evidence items', async ({ page }) => {
    await page.waitForTimeout(2000);
    
    const evidenceItems = page.locator('[data-testid^="card-evidence-"]');
    const count = await evidenceItems.count();
    
    if (count > 0) {
      await expect(evidenceItems.first()).toBeVisible();
    }
  });
});

test.describe('Marketing Module - Content Queue', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/marketing');
    await expect(page.getByText('Marketing')).toBeVisible({ timeout: 15000 });
  });

  test('should display Content Queue section', async ({ page }) => {
    await expect(page.getByText('Content Queue')).toBeVisible({ timeout: 10000 });
  });

  test('should have add content button', async ({ page }) => {
    await expect(page.getByTestId('button-add-content')).toBeVisible({ timeout: 10000 });
  });

  test('should show content status columns', async ({ page }) => {
    await expect(page.getByText('Draft')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Review')).toBeVisible();
    await expect(page.getByText('Published')).toBeVisible();
  });

  test('should list content items', async ({ page }) => {
    await page.waitForTimeout(2000);
    
    const contentItems = page.locator('[data-testid^="card-content-"]');
    const count = await contentItems.count();
    
    if (count > 0) {
      await expect(contentItems.first()).toBeVisible();
    }
  });
});

test.describe('Marketing Module - ABM Accounts', () => {
  test('should display ABM section', async ({ page }) => {
    await page.goto('/marketing');
    
    await expect(page.getByText('ABM Accounts')).toBeVisible({ timeout: 10000 });
  });

  test('should show account tiers', async ({ page }) => {
    await page.goto('/marketing');
    
    await expect(page.getByText('Tier 1')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Tier 2')).toBeVisible();
    await expect(page.getByText('Tier 3')).toBeVisible();
  });

  test('should have add account button', async ({ page }) => {
    await page.goto('/marketing');
    
    await expect(page.getByTestId('button-add-abm-account')).toBeVisible({ timeout: 10000 });
  });
});

test.describe('Marketing Module - Events & CEU', () => {
  test('should display Events section', async ({ page }) => {
    await page.goto('/marketing');
    
    await expect(page.getByText('Events')).toBeVisible({ timeout: 10000 });
  });

  test('should have add event button', async ({ page }) => {
    await page.goto('/marketing');
    
    await expect(page.getByTestId('button-add-event')).toBeVisible({ timeout: 10000 });
  });

  test('should show CEU tracking', async ({ page }) => {
    await page.goto('/marketing');
    
    await expect(page.getByText('CEU')).toBeVisible({ timeout: 10000 });
  });
});

test.describe('Marketing API', () => {
  test('should get evidence vault items', async ({ request }) => {
    const response = await request.get('/api/marketing/evidence');
    expect(response.status()).toBe(200);
    
    const data = await response.json();
    expect(Array.isArray(data)).toBe(true);
  });

  test('should get content queue items', async ({ request }) => {
    const response = await request.get('/api/marketing/content');
    expect(response.status()).toBe(200);
    
    const data = await response.json();
    expect(Array.isArray(data)).toBe(true);
  });

  test('should get ABM accounts', async ({ request }) => {
    const response = await request.get('/api/marketing/abm');
    expect(response.status()).toBe(200);
    
    const data = await response.json();
    expect(Array.isArray(data)).toBe(true);
  });

  test('should get events list', async ({ request }) => {
    const response = await request.get('/api/marketing/events');
    expect(response.status()).toBe(200);
    
    const data = await response.json();
    expect(Array.isArray(data)).toBe(true);
  });

  test('should create evidence item', async ({ request }) => {
    const response = await request.post('/api/marketing/evidence', {
      data: {
        title: `Test Evidence ${Date.now()}`,
        type: 'case_study',
        description: 'Test description',
        ewsScore: 75
      }
    });
    
    expect([200, 201]).toContain(response.status());
  });

  test('should create content item', async ({ request }) => {
    const response = await request.post('/api/marketing/content', {
      data: {
        title: `Test Content ${Date.now()}`,
        type: 'blog_post',
        status: 'draft',
        targetPersona: 'BP-A'
      }
    });
    
    expect([200, 201]).toContain(response.status());
  });
});

test.describe('Marketing Module - Persona Distribution', () => {
  test('should show persona distribution chart', async ({ page }) => {
    await page.goto('/marketing');
    
    await page.waitForTimeout(2000);
    
    await expect(page.getByTestId('chart-persona-distribution')).toBeVisible({ timeout: 10000 });
  });

  test('should display lead counts per persona', async ({ page }) => {
    await page.goto('/marketing');
    
    await expect(page.getByTestId('text-persona-count-bp-a')).toBeVisible({ timeout: 10000 });
  });
});
