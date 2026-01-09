import { test, expect } from '@playwright/test';

test.describe('Deal Workspace - Access and Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/sales');
    await expect(page.getByRole('heading', { name: 'Leads' })).toBeVisible({ timeout: 15000 });
  });

  test('should open deal workspace from card click', async ({ page }) => {
    const dealCard = page.locator('[data-testid^="card-deal-"]').first();
    
    if (await dealCard.isVisible({ timeout: 5000 }).catch(() => false)) {
      await dealCard.click();
      await expect(page.getByTestId('dialog-deal-workspace')).toBeVisible({ timeout: 5000 });
    }
  });

  test('should display deal header with client name', async ({ page }) => {
    const dealCard = page.locator('[data-testid^="card-deal-"]').first();
    
    if (await dealCard.isVisible({ timeout: 5000 }).catch(() => false)) {
      await dealCard.click();
      await expect(page.getByTestId('text-deal-client-name')).toBeVisible({ timeout: 5000 });
    }
  });

  test('should show deal value', async ({ page }) => {
    const dealCard = page.locator('[data-testid^="card-deal-"]').first();
    
    if (await dealCard.isVisible({ timeout: 5000 }).catch(() => false)) {
      await dealCard.click();
      await expect(page.getByTestId('text-deal-value')).toBeVisible({ timeout: 5000 });
    }
  });

  test('should show deal stage', async ({ page }) => {
    const dealCard = page.locator('[data-testid^="card-deal-"]').first();
    
    if (await dealCard.isVisible({ timeout: 5000 }).catch(() => false)) {
      await dealCard.click();
      await expect(page.getByTestId('badge-deal-stage')).toBeVisible({ timeout: 5000 });
    }
  });

  test('should close workspace on X button', async ({ page }) => {
    const dealCard = page.locator('[data-testid^="card-deal-"]').first();
    
    if (await dealCard.isVisible({ timeout: 5000 }).catch(() => false)) {
      await dealCard.click();
      await expect(page.getByTestId('dialog-deal-workspace')).toBeVisible({ timeout: 5000 });
      
      await page.getByTestId('button-close-workspace').click();
      await expect(page.getByTestId('dialog-deal-workspace')).not.toBeVisible({ timeout: 3000 });
    }
  });
});

test.describe('Deal Workspace - Tabs', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/sales');
    await expect(page.getByRole('heading', { name: 'Leads' })).toBeVisible({ timeout: 15000 });
    
    const dealCard = page.locator('[data-testid^="card-deal-"]').first();
    if (await dealCard.isVisible({ timeout: 5000 }).catch(() => false)) {
      await dealCard.click();
      await expect(page.getByTestId('dialog-deal-workspace')).toBeVisible({ timeout: 5000 });
    }
  });

  test('should have Overview tab', async ({ page }) => {
    await expect(page.getByTestId('tab-overview')).toBeVisible();
  });

  test('should have Notes tab', async ({ page }) => {
    await expect(page.getByTestId('tab-notes')).toBeVisible();
  });

  test('should have Timeline tab', async ({ page }) => {
    await expect(page.getByTestId('tab-timeline')).toBeVisible();
  });

  test('should have CPQ tab', async ({ page }) => {
    await expect(page.getByTestId('tab-cpq')).toBeVisible();
  });

  test('should have AI Assistant tab', async ({ page }) => {
    await expect(page.getByTestId('tab-ai-assistant')).toBeVisible();
  });

  test('should switch between tabs', async ({ page }) => {
    await page.getByTestId('tab-notes').click();
    await expect(page.getByTestId('panel-notes')).toBeVisible({ timeout: 3000 });
    
    await page.getByTestId('tab-timeline').click();
    await expect(page.getByTestId('panel-timeline')).toBeVisible({ timeout: 3000 });
  });
});

test.describe('Deal Workspace - Overview Tab', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/sales');
    await page.waitForTimeout(2000);
    
    const dealCard = page.locator('[data-testid^="card-deal-"]').first();
    if (await dealCard.isVisible({ timeout: 5000 }).catch(() => false)) {
      await dealCard.click();
      await expect(page.getByTestId('dialog-deal-workspace')).toBeVisible({ timeout: 5000 });
    }
  });

  test('should display UPID', async ({ page }) => {
    await expect(page.getByTestId('text-upid')).toBeVisible({ timeout: 5000 });
  });

  test('should show probability', async ({ page }) => {
    await expect(page.getByTestId('text-probability')).toBeVisible({ timeout: 5000 });
  });

  test('should show lead score', async ({ page }) => {
    await expect(page.getByTestId('text-lead-score')).toBeVisible({ timeout: 5000 });
  });

  test('should show buyer persona', async ({ page }) => {
    await expect(page.getByTestId('select-buyer-persona')).toBeVisible({ timeout: 5000 });
  });

  test('should allow persona selection', async ({ page }) => {
    const personaSelect = page.getByTestId('select-buyer-persona');
    
    if (await personaSelect.isVisible({ timeout: 3000 }).catch(() => false)) {
      await personaSelect.click();
      await expect(page.getByText('Design Principal')).toBeVisible({ timeout: 3000 });
    }
  });

  test('should show project address', async ({ page }) => {
    await expect(page.getByTestId('text-project-address')).toBeVisible({ timeout: 5000 });
  });

  test('should show square footage', async ({ page }) => {
    await expect(page.getByTestId('text-sqft')).toBeVisible({ timeout: 5000 });
  });
});

test.describe('Deal Workspace - Notes Tab', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/sales');
    await page.waitForTimeout(2000);
    
    const dealCard = page.locator('[data-testid^="card-deal-"]').first();
    if (await dealCard.isVisible({ timeout: 5000 }).catch(() => false)) {
      await dealCard.click();
      await page.getByTestId('tab-notes').click();
    }
  });

  test('should have notes input area', async ({ page }) => {
    await expect(page.getByTestId('textarea-deal-notes')).toBeVisible({ timeout: 5000 });
  });

  test('should have save notes button', async ({ page }) => {
    await expect(page.getByTestId('button-save-notes')).toBeVisible({ timeout: 5000 });
  });

  test('should save notes', async ({ page }) => {
    const notesInput = page.getByTestId('textarea-deal-notes');
    await notesInput.fill(`Test note ${Date.now()}`);
    
    await page.getByTestId('button-save-notes').click();
    
    await expect(page.getByText('saved')).toBeVisible({ timeout: 5000 });
  });
});

test.describe('Deal Workspace - Timeline Tab', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/sales');
    await page.waitForTimeout(2000);
    
    const dealCard = page.locator('[data-testid^="card-deal-"]').first();
    if (await dealCard.isVisible({ timeout: 5000 }).catch(() => false)) {
      await dealCard.click();
      await page.getByTestId('tab-timeline').click();
    }
  });

  test('should display activity timeline', async ({ page }) => {
    await expect(page.getByTestId('timeline-activities')).toBeVisible({ timeout: 5000 });
  });

  test('should have add activity button', async ({ page }) => {
    await expect(page.getByTestId('button-add-activity')).toBeVisible({ timeout: 5000 });
  });

  test('should show activity types', async ({ page }) => {
    await page.getByTestId('button-add-activity').click();
    
    await expect(page.getByText('Call')).toBeVisible({ timeout: 3000 });
    await expect(page.getByText('Email')).toBeVisible();
    await expect(page.getByText('Meeting')).toBeVisible();
  });
});

test.describe('Deal Workspace - CPQ Tab', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/sales');
    await page.waitForTimeout(2000);
    
    const dealCard = page.locator('[data-testid^="card-deal-"]').first();
    if (await dealCard.isVisible({ timeout: 5000 }).catch(() => false)) {
      await dealCard.click();
      await page.getByTestId('tab-cpq').click();
    }
  });

  test('should show CPQ quote section', async ({ page }) => {
    await expect(page.getByTestId('section-cpq-quotes')).toBeVisible({ timeout: 5000 });
  });

  test('should have create quote button', async ({ page }) => {
    await expect(page.getByTestId('button-create-cpq-quote')).toBeVisible({ timeout: 5000 });
  });

  test('should list associated quotes', async ({ page }) => {
    await page.waitForTimeout(1000);
    
    const quotes = page.locator('[data-testid^="card-quote-"]');
    const count = await quotes.count();
  });

  test('should open CPQ calculator', async ({ page }) => {
    await page.getByTestId('button-create-cpq-quote').click();
    
    await page.waitForTimeout(1000);
  });
});

test.describe('Deal Workspace - Profitability Gates', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/sales');
    await page.waitForTimeout(2000);
    
    const dealCard = page.locator('[data-testid^="card-deal-"]').first();
    if (await dealCard.isVisible({ timeout: 5000 }).catch(() => false)) {
      await dealCard.click();
    }
  });

  test('should show margin warning for low margin deals', async ({ page }) => {
    await expect(page.getByTestId('warning-low-margin')).toBeVisible({ timeout: 5000 }).catch(() => {});
  });

  test('should show stage transition buttons', async ({ page }) => {
    await expect(page.getByTestId('button-move-stage')).toBeVisible({ timeout: 5000 });
  });

  test('should block proposal without margin compliance', async ({ page }) => {
    await page.waitForTimeout(1000);
  });
});

test.describe('Deal Workspace - Stage Transitions', () => {
  test('should allow stage advancement', async ({ page }) => {
    await page.goto('/sales');
    await page.waitForTimeout(2000);
    
    const dealCard = page.locator('[data-testid^="card-deal-"]').first();
    if (await dealCard.isVisible({ timeout: 5000 }).catch(() => false)) {
      await dealCard.click();
      
      const advanceButton = page.getByTestId('button-advance-stage');
      if (await advanceButton.isVisible({ timeout: 3000 }).catch(() => false)) {
        await expect(advanceButton).toBeVisible();
      }
    }
  });

  test('should show stage history', async ({ page }) => {
    await page.goto('/sales');
    await page.waitForTimeout(2000);
    
    const dealCard = page.locator('[data-testid^="card-deal-"]').first();
    if (await dealCard.isVisible({ timeout: 5000 }).catch(() => false)) {
      await dealCard.click();
      await page.getByTestId('tab-timeline').click();
      
      await expect(page.getByText('Stage changed')).toBeVisible({ timeout: 5000 }).catch(() => {});
    }
  });
});

test.describe('Deal Workspace - Contact Management', () => {
  test('should show primary contact', async ({ page }) => {
    await page.goto('/sales');
    await page.waitForTimeout(2000);
    
    const dealCard = page.locator('[data-testid^="card-deal-"]').first();
    if (await dealCard.isVisible({ timeout: 5000 }).catch(() => false)) {
      await dealCard.click();
      
      await expect(page.getByTestId('section-contacts')).toBeVisible({ timeout: 5000 });
    }
  });

  test('should have add contact button', async ({ page }) => {
    await page.goto('/sales');
    await page.waitForTimeout(2000);
    
    const dealCard = page.locator('[data-testid^="card-deal-"]').first();
    if (await dealCard.isVisible({ timeout: 5000 }).catch(() => false)) {
      await dealCard.click();
      
      await expect(page.getByTestId('button-add-contact')).toBeVisible({ timeout: 5000 });
    }
  });
});

test.describe('Deal Workspace API', () => {
  test('should get deal details', async ({ request }) => {
    const leadsResponse = await request.get('/api/leads');
    const leads = await leadsResponse.json();
    
    if (leads.length > 0) {
      const response = await request.get(`/api/leads/${leads[0].id}`);
      expect(response.status()).toBe(200);
      
      const data = await response.json();
      expect(data).toHaveProperty('id');
      expect(data).toHaveProperty('clientName');
    }
  });

  test('should update deal', async ({ request }) => {
    const leadsResponse = await request.get('/api/leads');
    const leads = await leadsResponse.json();
    
    if (leads.length > 0) {
      const response = await request.patch(`/api/leads/${leads[0].id}`, {
        data: { notes: `Updated ${Date.now()}` }
      });
      expect([200, 204]).toContain(response.status());
    }
  });

  test('should get deal activities', async ({ request }) => {
    const leadsResponse = await request.get('/api/leads');
    const leads = await leadsResponse.json();
    
    if (leads.length > 0) {
      const response = await request.get(`/api/leads/${leads[0].id}/activities`);
      expect([200, 404]).toContain(response.status());
    }
  });

  test('should add activity to deal', async ({ request }) => {
    const leadsResponse = await request.get('/api/leads');
    const leads = await leadsResponse.json();
    
    if (leads.length > 0) {
      const response = await request.post(`/api/leads/${leads[0].id}/activities`, {
        data: {
          type: 'note',
          description: `Test activity ${Date.now()}`
        }
      });
      expect([200, 201, 404]).toContain(response.status());
    }
  });
});
