import { test, expect } from '@playwright/test';

test.describe('Deal Workspace - Access and Navigation', () => {
  test('should access deal workspace via direct URL', async ({ page }) => {
    const leadsResponse = await page.request.get('/api/leads');
    const leads = await leadsResponse.json();
    
    if (leads.length > 0) {
      await page.goto(`/deals/${leads[0].id}`);
      await page.waitForLoadState('networkidle');
      
      await expect(page.getByTestId('page-deal-workspace')).toBeVisible({ timeout: 15000 });
    }
  });

  test('should have back button', async ({ page }) => {
    const leadsResponse = await page.request.get('/api/leads');
    const leads = await leadsResponse.json();
    
    if (leads.length > 0) {
      await page.goto(`/deals/${leads[0].id}`);
      await page.waitForLoadState('networkidle');
      
      await expect(page.getByTestId('button-back')).toBeVisible({ timeout: 10000 });
    }
  });
});

test.describe('Deal Workspace - Tabs', () => {
  test.beforeEach(async ({ page }) => {
    const leadsResponse = await page.request.get('/api/leads');
    const leads = await leadsResponse.json();
    
    if (leads.length > 0) {
      await page.goto(`/deals/${leads[0].id}`);
      await page.waitForLoadState('networkidle');
    }
  });

  test('should have Lead tab', async ({ page }) => {
    await expect(page.getByTestId('tab-lead')).toBeVisible({ timeout: 10000 });
  });

  test('should have Quote tab', async ({ page }) => {
    await expect(page.getByTestId('tab-quote')).toBeVisible({ timeout: 10000 });
  });

  test('should have History tab', async ({ page }) => {
    await expect(page.getByTestId('tab-history')).toBeVisible({ timeout: 10000 });
  });

  test('should have AI Assistant tab', async ({ page }) => {
    await expect(page.getByTestId('tab-ai-assistant')).toBeVisible({ timeout: 10000 });
  });
});

test.describe('Deal Workspace - Lead Tab Fields', () => {
  test.beforeEach(async ({ page }) => {
    const leadsResponse = await page.request.get('/api/leads');
    const leads = await leadsResponse.json();
    
    if (leads.length > 0) {
      await page.goto(`/deals/${leads[0].id}`);
      await page.waitForLoadState('networkidle');
      await page.getByTestId('tab-lead').click();
    }
  });

  test('should have client name input', async ({ page }) => {
    await expect(page.getByTestId('input-client-name')).toBeVisible({ timeout: 10000 });
  });

  test('should have project name input', async ({ page }) => {
    await expect(page.getByTestId('input-project-name')).toBeVisible({ timeout: 10000 });
  });

  test('should have project address input', async ({ page }) => {
    await expect(page.getByTestId('input-project-address')).toBeVisible({ timeout: 10000 });
  });

  test('should have value input', async ({ page }) => {
    await expect(page.getByTestId('input-value')).toBeVisible({ timeout: 10000 });
  });

  test('should have probability input', async ({ page }) => {
    await expect(page.getByTestId('input-probability')).toBeVisible({ timeout: 10000 });
  });

  test('should have deal stage selector', async ({ page }) => {
    await expect(page.getByTestId('select-deal-stage')).toBeVisible({ timeout: 10000 });
  });

  test('should have lead source selector', async ({ page }) => {
    await expect(page.getByTestId('select-lead-source')).toBeVisible({ timeout: 10000 });
  });

  test('should have buyer persona selector', async ({ page }) => {
    await expect(page.getByTestId('select-buyer-persona')).toBeVisible({ timeout: 10000 });
  });

  test('should have notes input', async ({ page }) => {
    await expect(page.getByTestId('input-notes')).toBeVisible({ timeout: 10000 });
  });

  test('should have submit button', async ({ page }) => {
    await expect(page.getByTestId('button-submit-lead')).toBeVisible({ timeout: 10000 });
  });
});

test.describe('Deal Workspace - Action Buttons', () => {
  test.beforeEach(async ({ page }) => {
    const leadsResponse = await page.request.get('/api/leads');
    const leads = await leadsResponse.json();
    
    if (leads.length > 0) {
      await page.goto(`/deals/${leads[0].id}`);
      await page.waitForLoadState('networkidle');
    }
  });

  test('should have evidence vault button', async ({ page }) => {
    await expect(page.getByTestId('button-evidence-vault')).toBeVisible({ timeout: 10000 });
  });

  test('should have start quote button', async ({ page }) => {
    await expect(page.getByTestId('button-start-quote')).toBeVisible({ timeout: 10000 });
  });

  test('should have communicate button', async ({ page }) => {
    await expect(page.getByTestId('button-communicate')).toBeVisible({ timeout: 10000 });
  });

  test('should have generate UPID button', async ({ page }) => {
    await expect(page.getByTestId('button-generate-upid')).toBeVisible({ timeout: 10000 });
  });
});

test.describe('Deal Workspace - Quote Tab', () => {
  test.beforeEach(async ({ page }) => {
    const leadsResponse = await page.request.get('/api/leads');
    const leads = await leadsResponse.json();
    
    if (leads.length > 0) {
      await page.goto(`/deals/${leads[0].id}`);
      await page.waitForLoadState('networkidle');
      await page.getByTestId('tab-quote').click();
    }
  });

  test('should have version selector', async ({ page }) => {
    await expect(page.getByTestId('select-version')).toBeVisible({ timeout: 10000 });
  });

  test('should have create first quote button', async ({ page }) => {
    await expect(page.getByTestId('button-create-first-quote')).toBeVisible({ timeout: 10000 });
  });
});

test.describe('Deal Workspace API', () => {
  test('should get lead details', async ({ request }) => {
    const leadsResponse = await request.get('/api/leads');
    const leads = await leadsResponse.json();
    
    if (leads.length > 0) {
      const response = await request.get(`/api/leads/${leads[0].id}`);
      expect(response.status()).toBe(200);
    }
  });

  test('should update lead', async ({ request }) => {
    const leadsResponse = await request.get('/api/leads');
    const leads = await leadsResponse.json();
    
    if (leads.length > 0) {
      const response = await request.patch(`/api/leads/${leads[0].id}`, {
        data: { notes: `Updated ${Date.now()}` }
      });
      expect([200, 204]).toContain(response.status());
    }
  });
});
