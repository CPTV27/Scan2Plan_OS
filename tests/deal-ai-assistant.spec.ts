import { test, expect } from '@playwright/test';

test.describe('Deal AI Assistant - Access via Deal Workspace', () => {
  test('should navigate to deal workspace', async ({ page }) => {
    const leadsResponse = await page.request.get('/api/leads');
    const leads = await leadsResponse.json();
    
    if (leads.length > 0) {
      await page.goto(`/deals/${leads[0].id}`);
      await page.waitForLoadState('networkidle');
      
      await expect(page.getByTestId('page-deal-workspace')).toBeVisible({ timeout: 15000 });
    }
  });

  test('should have AI Assistant tab', async ({ page }) => {
    const leadsResponse = await page.request.get('/api/leads');
    const leads = await leadsResponse.json();
    
    if (leads.length > 0) {
      await page.goto(`/deals/${leads[0].id}`);
      await page.waitForLoadState('networkidle');
      
      await expect(page.getByTestId('tab-ai-assistant')).toBeVisible({ timeout: 10000 });
    }
  });

  test('should switch to AI Assistant tab', async ({ page }) => {
    const leadsResponse = await page.request.get('/api/leads');
    const leads = await leadsResponse.json();
    
    if (leads.length > 0) {
      await page.goto(`/deals/${leads[0].id}`);
      await page.waitForLoadState('networkidle');
      
      await page.getByTestId('tab-ai-assistant').click();
      await page.waitForTimeout(500);
      
      await expect(page.getByTestId('tab-ai-proposal')).toBeVisible({ timeout: 5000 });
    }
  });
});

test.describe('Deal AI Assistant - Sub-tabs', () => {
  test.beforeEach(async ({ page }) => {
    const leadsResponse = await page.request.get('/api/leads');
    const leads = await leadsResponse.json();
    
    if (leads.length > 0) {
      await page.goto(`/deals/${leads[0].id}`);
      await page.waitForLoadState('networkidle');
      await page.getByTestId('tab-ai-assistant').click();
      await page.waitForTimeout(500);
    }
  });

  test('should have proposal tab', async ({ page }) => {
    await expect(page.getByTestId('tab-ai-proposal')).toBeVisible({ timeout: 10000 });
  });

  test('should have email tab', async ({ page }) => {
    await expect(page.getByTestId('tab-ai-email')).toBeVisible({ timeout: 10000 });
  });

  test('should have objection tab', async ({ page }) => {
    await expect(page.getByTestId('tab-ai-objection')).toBeVisible({ timeout: 10000 });
  });
});

test.describe('Deal AI Assistant - Proposal Generation', () => {
  test.beforeEach(async ({ page }) => {
    const leadsResponse = await page.request.get('/api/leads');
    const leads = await leadsResponse.json();
    
    if (leads.length > 0) {
      await page.goto(`/deals/${leads[0].id}`);
      await page.waitForLoadState('networkidle');
      await page.getByTestId('tab-ai-assistant').click();
      await page.getByTestId('tab-ai-proposal').click();
      await page.waitForTimeout(500);
    }
  });

  test('should have project type selector', async ({ page }) => {
    await expect(page.getByTestId('select-project-type')).toBeVisible({ timeout: 10000 });
  });

  test('should have timeline selector', async ({ page }) => {
    await expect(page.getByTestId('select-timeline')).toBeVisible({ timeout: 10000 });
  });

  test('should have scope notes input', async ({ page }) => {
    await expect(page.getByTestId('input-scope-notes')).toBeVisible({ timeout: 10000 });
  });

  test('should have generate proposal button', async ({ page }) => {
    await expect(page.getByTestId('button-generate-proposal')).toBeVisible({ timeout: 10000 });
  });
});

test.describe('Deal AI Assistant - Email Drafting', () => {
  test.beforeEach(async ({ page }) => {
    const leadsResponse = await page.request.get('/api/leads');
    const leads = await leadsResponse.json();
    
    if (leads.length > 0) {
      await page.goto(`/deals/${leads[0].id}`);
      await page.waitForLoadState('networkidle');
      await page.getByTestId('tab-ai-assistant').click();
      await page.getByTestId('tab-ai-email').click();
      await page.waitForTimeout(500);
    }
  });

  test('should have email type selector', async ({ page }) => {
    await expect(page.getByTestId('select-email-type')).toBeVisible({ timeout: 10000 });
  });

  test('should have email context input', async ({ page }) => {
    await expect(page.getByTestId('input-email-context')).toBeVisible({ timeout: 10000 });
  });

  test('should have generate email button', async ({ page }) => {
    await expect(page.getByTestId('button-generate-email')).toBeVisible({ timeout: 10000 });
  });
});

test.describe('Deal AI Assistant - Objection Handling', () => {
  test.beforeEach(async ({ page }) => {
    const leadsResponse = await page.request.get('/api/leads');
    const leads = await leadsResponse.json();
    
    if (leads.length > 0) {
      await page.goto(`/deals/${leads[0].id}`);
      await page.waitForLoadState('networkidle');
      await page.getByTestId('tab-ai-assistant').click();
      await page.getByTestId('tab-ai-objection').click();
      await page.waitForTimeout(500);
    }
  });

  test('should have objection input', async ({ page }) => {
    await expect(page.getByTestId('input-objection')).toBeVisible({ timeout: 10000 });
  });

  test('should have generate response button', async ({ page }) => {
    await expect(page.getByTestId('button-generate-response')).toBeVisible({ timeout: 10000 });
  });
});

test.describe('Deal AI Assistant - Content Actions', () => {
  test('should have copy content button', async ({ page }) => {
    const leadsResponse = await page.request.get('/api/leads');
    const leads = await leadsResponse.json();
    
    if (leads.length > 0) {
      await page.goto(`/deals/${leads[0].id}`);
      await page.waitForLoadState('networkidle');
      await page.getByTestId('tab-ai-assistant').click();
      await page.waitForTimeout(500);
      
      await expect(page.getByTestId('button-copy-content')).toBeVisible({ timeout: 10000 });
    }
  });
});
