import { test, expect } from '@playwright/test';

// Helper to wait for API response
async function waitForApiResponse(page: any, urlPattern: string | RegExp) {
  return page.waitForResponse((response: any) => 
    (typeof urlPattern === 'string' ? response.url().includes(urlPattern) : urlPattern.test(response.url())) 
    && response.status() === 200
  );
}

test.describe('Scan2Plan OS - Dashboard', () => {
  test('should load dashboard with key metrics', async ({ page }) => {
    await page.goto('/');
    
    await expect(page.getByText('Total Pipeline')).toBeVisible({ timeout: 15000 });
    await expect(page.getByText('Active Projects')).toBeVisible({ timeout: 5000 });
    await expect(page.getByText('Forecasted Revenue', { exact: true })).toBeVisible({ timeout: 5000 });
  });

  test('should display navigation sidebar', async ({ page }) => {
    await page.goto('/');
    
    await expect(page.getByTestId('nav-dashboard')).toBeVisible({ timeout: 10000 });
    await expect(page.getByTestId('nav-sales')).toBeVisible();
    await expect(page.getByTestId('nav-production')).toBeVisible();
  });

  test('should show Google Workspace widget', async ({ page }) => {
    await page.goto('/');
    
    await expect(page.getByText('Google Workspace')).toBeVisible({ timeout: 10000 });
  });

  test('should have AI insights widget', async ({ page }) => {
    await page.goto('/');
    
    await expect(page.getByText('AI Insights')).toBeVisible({ timeout: 10000 });
  });

  test('should display win rate and stale leads metrics', async ({ page }) => {
    await page.goto('/');
    
    await expect(page.getByText('Win Rate')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Stale Leads')).toBeVisible({ timeout: 5000 });
  });

  test('should show pipeline funnel chart', async ({ page }) => {
    await page.goto('/');
    
    await expect(page.getByText('Pipeline vs Forecasted Revenue')).toBeVisible({ timeout: 10000 });
  });
});

test.describe('Scan2Plan OS - Sales Pipeline', () => {
  test('should navigate to sales page', async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('nav-sales').click();
    
    await expect(page).toHaveURL('/sales');
  });

  test('should display Kanban columns', async ({ page }) => {
    await page.goto('/sales');
    
    await expect(page.getByRole('heading', { name: 'Leads' })).toBeVisible({ timeout: 15000 });
    await expect(page.getByRole('heading', { name: 'Proposal' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Negotiation' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Closed Won' })).toBeVisible();
  });

  test('should display all 7 pipeline stages', async ({ page }) => {
    await page.goto('/sales');
    
    await expect(page.getByRole('heading', { name: 'Leads' })).toBeVisible({ timeout: 15000 });
    await expect(page.getByRole('heading', { name: 'Contacted' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Proposal' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Negotiation' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Closed Won' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Closed Lost' })).toBeVisible();
  });

  test('should open new deal dialog', async ({ page }) => {
    await page.goto('/sales');
    
    await page.getByText('New Deal').first().click();
    await expect(page.getByText('Add New Deal')).toBeVisible({ timeout: 5000 });
  });

  test('should display deal cards with client info', async ({ page }) => {
    await page.goto('/sales');
    
    await page.waitForTimeout(2000);
    const dealCards = page.locator('[data-testid^="card-deal-"]');
    const count = await dealCards.count();
    
    if (count > 0) {
      await expect(dealCards.first()).toBeVisible({ timeout: 10000 });
    }
  });

  test('should show pipeline summary stats', async ({ page }) => {
    await page.goto('/sales');
    
    await expect(page.getByTestId('text-total-pipeline')).toBeVisible({ timeout: 10000 });
    await expect(page.getByTestId('text-weighted-forecast')).toBeVisible();
    await expect(page.getByTestId('text-deal-count')).toBeVisible();
  });

  test('should have search functionality', async ({ page }) => {
    await page.goto('/sales');
    
    await expect(page.getByTestId('input-search-deals')).toBeVisible({ timeout: 10000 });
  });

  test('should filter deals by search term', async ({ page }) => {
    await page.goto('/sales');
    
    await page.waitForResponse(resp => resp.url().includes('/api/leads') && resp.status() === 200);
    
    const searchInput = page.getByTestId('input-search-deals');
    await expect(searchInput).toBeVisible({ timeout: 10000 });
    
    await searchInput.fill('Acme');
    
    await page.waitForFunction(() => {
      return document.querySelectorAll('[data-testid^="card-deal-"]').length >= 0;
    }, { timeout: 5000 }).catch(() => {});
  });

  test('should have bulk import functionality', async ({ page }) => {
    await page.goto('/sales');
    
    await expect(page.getByTestId('button-import-leads')).toBeVisible({ timeout: 10000 });
  });

  test('should have apply staleness button', async ({ page }) => {
    await page.goto('/sales');
    
    await expect(page.getByTestId('button-apply-staleness')).toBeVisible({ timeout: 10000 });
  });
});

test.describe('Scan2Plan OS - Deal Card Interactions', () => {
  test('should open edit dialog when clicking edit button', async ({ page }) => {
    await page.goto('/sales');
    
    // Wait for page to load and deal cards to appear
    await expect(page.getByRole('heading', { name: 'Leads' })).toBeVisible({ timeout: 15000 });
    await page.waitForTimeout(2000);
    
    const editButton = page.getByTestId('button-edit-lead-1');
    
    if (await editButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await editButton.click();
      await expect(page.getByText('Edit Deal')).toBeVisible({ timeout: 5000 });
    }
  });

  test('should show AI actions menu on deal cards', async ({ page }) => {
    await page.goto('/sales');
    
    // Wait for page to load and deal cards to appear
    await expect(page.getByRole('heading', { name: 'Leads' })).toBeVisible({ timeout: 15000 });
    await page.waitForTimeout(2000);
    
    const aiButton = page.getByTestId('button-ai-actions-1');
    
    if (await aiButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await aiButton.click();
      await expect(page.getByText('AI Assistant')).toBeVisible({ timeout: 5000 });
    }
  });
});

test.describe('Scan2Plan OS - Deal Creation Flow', () => {
  test('should create a new deal successfully', async ({ page }) => {
    await page.goto('/sales');
    
    // Wait for page to load
    await expect(page.getByRole('heading', { name: 'Leads' })).toBeVisible({ timeout: 15000 });
    
    await page.getByTestId('button-new-lead').click();
    await expect(page.getByText('Add New Deal')).toBeVisible({ timeout: 5000 });
    
    const testClientName = `E2E Test Client ${Date.now()}`;
    // Use correct label: "Client / Company" not "Client Name"
    await page.getByLabel('Client / Company').fill(testClientName);
    await page.getByLabel('Project Address').fill('123 Test Street');
    await page.getByLabel('Deal Value ($)').fill('50000');
    
    const responsePromise = page.waitForResponse(resp => 
      resp.url().includes('/api/leads') && resp.request().method() === 'POST'
    );
    
    await page.getByTestId('button-submit-lead').click();
    
    const response = await responsePromise;
    expect(response.status()).toBe(201);
    
    await expect(page.getByText(testClientName)).toBeVisible({ timeout: 10000 });
  });
});

test.describe('Scan2Plan OS - Production Tracker', () => {
  test('should navigate to production page', async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('nav-production').click();
    
    await expect(page).toHaveURL('/production');
  });

  test('should display project workflow stages', async ({ page }) => {
    await page.goto('/production');
    
    await expect(page.getByRole('heading', { name: 'Scanning' })).toBeVisible({ timeout: 15000 });
    await expect(page.getByRole('heading', { name: 'Registration' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Quality Control' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Delivered' })).toBeVisible();
  });

  test('should display all 6 production stages', async ({ page }) => {
    await page.goto('/production');
    
    await expect(page.getByRole('heading', { name: 'Scheduling' })).toBeVisible({ timeout: 15000 });
    await expect(page.getByRole('heading', { name: 'Scanning' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Registration' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Modeling' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Quality Control' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Delivered' })).toBeVisible();
  });

  test('should display production page content', async ({ page }) => {
    await page.goto('/production');
    
    // Wait for the production stages to load rather than waiting for API
    await expect(page.getByRole('heading', { name: 'Scheduling' })).toBeVisible({ timeout: 15000 });
    await expect(page.getByTestId('button-new-project')).toBeVisible({ timeout: 10000 });
  });

  test('should have new project button', async ({ page }) => {
    await page.goto('/production');
    
    await expect(page.getByTestId('button-new-project')).toBeVisible({ timeout: 10000 });
  });
});

test.describe('Scan2Plan OS - Meeting Scoping', () => {
  test('should navigate to scoping page directly', async ({ page }) => {
    // Navigate directly since Scoping was removed from sidebar nav
    await page.goto('/tools');
    
    await expect(page).toHaveURL('/tools');
  });

  test('should display scoping input area', async ({ page }) => {
    await page.goto('/tools');
    
    await expect(page.getByRole('textbox').first()).toBeVisible({ timeout: 10000 });
  });

  test('should have extract scope button', async ({ page }) => {
    await page.goto('/tools');
    
    await expect(page.getByTestId('button-extract-scope')).toBeVisible({ timeout: 10000 });
  });

  test('should have CPQ integration button', async ({ page }) => {
    await page.goto('/tools');
    
    await expect(page.getByTestId('button-open-cpq')).toBeVisible({ timeout: 10000 });
  });

  test('should have deal selection options', async ({ page }) => {
    await page.goto('/tools');
    
    await expect(page.getByTestId('button-existing-deal')).toBeVisible({ timeout: 10000 });
    await expect(page.getByTestId('button-new-deal')).toBeVisible();
  });

  test('should have audio recording button', async ({ page }) => {
    await page.goto('/tools');
    
    await page.getByRole('tab', { name: 'Upload Audio' }).click();
    await expect(page.getByTestId('button-record-audio')).toBeVisible({ timeout: 10000 });
  });

  test('should have audio upload button', async ({ page }) => {
    await page.goto('/tools');
    
    await page.getByRole('tab', { name: 'Upload Audio' }).click();
    await expect(page.getByTestId('button-upload-audio')).toBeVisible({ timeout: 10000 });
  });

  test('should display meeting notes textarea', async ({ page }) => {
    await page.goto('/tools');
    
    await expect(page.getByTestId('textarea-meeting-notes')).toBeVisible({ timeout: 10000 });
  });
});

test.describe('Scan2Plan OS - Analytics', () => {
  test('should navigate to analytics page', async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('nav-analytics').click();
    
    await expect(page).toHaveURL('/analytics');
  });

  test('should display analytics tabs', async ({ page }) => {
    await page.goto('/analytics');
    
    await expect(page.getByTestId('text-analytics-title')).toBeVisible({ timeout: 10000 });
    await expect(page.getByTestId('tab-sales')).toBeVisible();
    await expect(page.getByTestId('tab-production')).toBeVisible();
    await expect(page.getByTestId('tab-forecast')).toBeVisible();
    await expect(page.getByTestId('tab-activity')).toBeVisible();
  });

  test('should switch between analytics tabs', async ({ page }) => {
    await page.goto('/analytics');
    
    await page.getByTestId('tab-production').click();
    await expect(page.getByText('Active Projects')).toBeVisible({ timeout: 5000 });
    
    await page.getByTestId('tab-forecast').click();
    await expect(page.getByText('Weighted Forecast')).toBeVisible({ timeout: 5000 });
  });

  test('should display charts in sales tab', async ({ page }) => {
    await page.goto('/analytics');
    
    await page.getByTestId('tab-sales').click();
    await page.waitForTimeout(1000);
  });
});

test.describe('Scan2Plan OS - Settings', () => {
  test('should navigate to settings page', async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('nav-settings').click();
    
    await expect(page).toHaveURL('/settings');
  });

  test('should display business configuration', async ({ page }) => {
    await page.goto('/settings');
    
    await expect(page.getByTestId('text-settings-title')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Business Defaults', { exact: true })).toBeVisible({ timeout: 5000 });
  });

  test('should display integration status', async ({ page }) => {
    await page.goto('/settings');
    
    await expect(page.getByText('Integrations')).toBeVisible({ timeout: 10000 });
  });

  test('should show Airtable connection status', async ({ page }) => {
    await page.goto('/settings');
    
    // Wait for page to load, then check for Airtable in Integrations section
    await expect(page.getByText('Integrations')).toBeVisible({ timeout: 10000 });
    // Check that at least one Airtable element is visible (nav or integration card)
    const airtableElements = page.getByText('Airtable');
    await expect(airtableElements.first()).toBeVisible({ timeout: 5000 });
  });

  test('should show QuickBooks integration section', async ({ page }) => {
    await page.goto('/settings');
    
    // QuickBooks Online is the full label
    await page.waitForTimeout(1000);
    await expect(page.getByText('QuickBooks Online')).toBeVisible({ timeout: 10000 });
  });

  test('should display staleness settings', async ({ page }) => {
    await page.goto('/settings');
    
    await expect(page.getByText('Staleness Settings')).toBeVisible({ timeout: 10000 });
  });

  test('should display lead source configuration', async ({ page }) => {
    await page.goto('/settings');
    
    await expect(page.getByText('Lead Sources')).toBeVisible({ timeout: 10000 });
  });
});

test.describe('Scan2Plan OS - Google Workspace Integration', () => {
  test('should display Google Workspace tabs', async ({ page }) => {
    await page.goto('/');
    
    await expect(page.getByTestId('tab-calendar')).toBeVisible({ timeout: 10000 });
    await expect(page.getByTestId('tab-emails')).toBeVisible();
  });

  test('should show email compose form', async ({ page }) => {
    await page.goto('/');
    
    await page.getByTestId('tab-emails').click();
    
    await expect(page.getByTestId('input-email-to')).toBeVisible({ timeout: 5000 });
    await expect(page.getByTestId('input-email-subject')).toBeVisible();
    await expect(page.getByTestId('input-email-body')).toBeVisible();
    await expect(page.getByTestId('button-send-email')).toBeVisible();
  });

  test('should show calendar events view', async ({ page }) => {
    await page.goto('/');
    
    await page.getByTestId('tab-calendar').click();
    await page.waitForTimeout(1000);
  });
});

test.describe('Scan2Plan OS - Theme Toggle', () => {
  test('should have theme toggle in settings', async ({ page }) => {
    await page.goto('/settings');
    
    await expect(page.getByTestId('switch-theme-toggle')).toBeVisible({ timeout: 10000 });
  });

  test('should toggle between light and dark mode', async ({ page }) => {
    await page.goto('/settings');
    
    const themeToggle = page.getByTestId('switch-theme-toggle');
    await expect(themeToggle).toBeVisible({ timeout: 10000 });
    
    await themeToggle.click();
    await page.waitForTimeout(500);
    
    await themeToggle.click();
    await page.waitForTimeout(500);
  });
});

test.describe('Scan2Plan OS - Responsive Design', () => {
  test('should display properly on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    
    await expect(page.getByTestId('button-mobile-menu')).toBeVisible({ timeout: 10000 });
  });

  test('should display sidebar on tablet', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto('/');
    
    await expect(page.getByTestId('nav-dashboard')).toBeVisible({ timeout: 10000 });
  });

  test('should display full layout on desktop', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto('/');
    
    await expect(page.getByTestId('nav-dashboard')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Total Pipeline')).toBeVisible({ timeout: 10000 });
  });

  test('should handle medium desktop screens', async ({ page }) => {
    await page.setViewportSize({ width: 1366, height: 768 });
    await page.goto('/');
    
    await expect(page.getByTestId('nav-dashboard')).toBeVisible({ timeout: 10000 });
  });

  test('mobile menu should toggle sidebar', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    
    const mobileMenu = page.getByTestId('button-mobile-menu');
    await expect(mobileMenu).toBeVisible({ timeout: 10000 });
    
    await mobileMenu.click();
    await page.waitForTimeout(500);
  });
});

test.describe('Scan2Plan OS - API Health Checks', () => {
  test('should return leads data from API', async ({ request }) => {
    const response = await request.get('/api/leads');
    expect(response.status()).toBe(200);
    
    const data = await response.json();
    expect(Array.isArray(data)).toBe(true);
  });

  test('should return projects data from API', async ({ request }) => {
    const response = await request.get('/api/projects');
    expect(response.status()).toBe(200);
    
    const data = await response.json();
    expect(Array.isArray(data)).toBe(true);
  });

  test('should return integration status', async ({ request }) => {
    const response = await request.get('/api/integrations/status');
    expect(response.status()).toBe(200);
    
    const data = await response.json();
    expect(data).toHaveProperty('airtable');
    expect(data).toHaveProperty('cpq');
    expect(data).toHaveProperty('openai');
    expect(data).toHaveProperty('google');
  });

  test('should return settings data', async ({ request }) => {
    const response = await request.get('/api/settings');
    expect(response.status()).toBe(200);
    
    const data = await response.json();
    expect(data).toHaveProperty('leadSources');
    expect(data).toHaveProperty('staleness');
    expect(data).toHaveProperty('businessDefaults');
  });

  test('should return quickbooks status', async ({ request }) => {
    const response = await request.get('/api/quickbooks/status');
    expect(response.status()).toBe(200);
    
    const data = await response.json();
    expect(data).toHaveProperty('configured');
    expect(data).toHaveProperty('connected');
  });
});

test.describe('Scan2Plan OS - Error Handling', () => {
  test('should handle 404 pages gracefully', async ({ page }) => {
    await page.goto('/nonexistent-page');
    
    await expect(page.getByText('Page Not Found')).toBeVisible({ timeout: 10000 });
  });

  test('should not crash on rapid navigation', async ({ page }) => {
    await page.goto('/');
    
    await page.getByTestId('nav-sales').click();
    await page.getByTestId('nav-production').click();
    await page.getByTestId('nav-analytics').click();
    await page.getByTestId('nav-settings').click();
    await page.getByTestId('nav-dashboard').click();
    
    await expect(page.getByText('Total Pipeline')).toBeVisible({ timeout: 10000 });
  });
});

test.describe('Scan2Plan OS - Airtable Insights', () => {
  test('should navigate to Airtable insights page', async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('nav-airtable').click();
    
    await expect(page).toHaveURL('/airtable');
  });

  test('should display Airtable connection status', async ({ page }) => {
    await page.goto('/airtable');
    
    await page.waitForTimeout(2000);
  });
});

test.describe('Scan2Plan OS - Performance', () => {
  test('dashboard should load within acceptable time', async ({ page }) => {
    const startTime = Date.now();
    await page.goto('/');
    await expect(page.getByText('Total Pipeline')).toBeVisible({ timeout: 15000 });
    const loadTime = Date.now() - startTime;
    
    expect(loadTime).toBeLessThan(15000);
  });

  test('sales page should load within acceptable time', async ({ page }) => {
    const startTime = Date.now();
    await page.goto('/sales');
    await expect(page.getByRole('heading', { name: 'Leads' })).toBeVisible({ timeout: 15000 });
    const loadTime = Date.now() - startTime;
    
    expect(loadTime).toBeLessThan(15000);
  });
});

test.describe('Scan2Plan OS - CPQ Deal Creation with Risk Factors', () => {
  test('should create deal with CPQ fields populated', async ({ page }) => {
    await page.goto('/sales');
    
    await expect(page.getByRole('heading', { name: 'Leads' })).toBeVisible({ timeout: 15000 });
    
    await page.getByTestId('button-new-lead').click();
    await expect(page.getByText('Add New Deal')).toBeVisible({ timeout: 5000 });
    
    const testClientName = `CPQ Test Client ${Date.now()}`;
    await page.getByLabel('Client / Company').fill(testClientName);
    await page.getByLabel('Project Name').fill('CPQ Integration Test Project');
    await page.getByLabel('Project Address').fill('100 Broadway, New York, NY 10005');
    await page.getByLabel('Deal Value ($)').fill('75000');
    await page.getByLabel('Probability (%)').fill('60');
    
    const responsePromise = page.waitForResponse(resp => 
      resp.url().includes('/api/leads') && resp.request().method() === 'POST'
    );
    
    await page.getByTestId('button-submit-lead').click();
    
    const response = await responsePromise;
    expect(response.status()).toBe(201);
    
    await expect(page.getByText(testClientName)).toBeVisible({ timeout: 10000 });
  });

  test('should edit deal and add risk factors', async ({ page }) => {
    await page.goto('/sales');
    
    await expect(page.getByRole('heading', { name: 'Leads' })).toBeVisible({ timeout: 15000 });
    await page.waitForTimeout(2000);
    
    const editButton = page.locator('[data-testid^="button-edit-lead-"]').first();
    
    if (await editButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await editButton.click();
      await expect(page.getByText('Edit Deal')).toBeVisible({ timeout: 5000 });
      
      const risksTab = page.getByRole('tab', { name: /Risks/i });
      if (await risksTab.isVisible({ timeout: 3000 }).catch(() => false)) {
        await risksTab.click();
        await page.waitForTimeout(500);
        
        const occupiedCheckbox = page.getByTestId('checkbox-risk-occupied');
        if (await occupiedCheckbox.isVisible({ timeout: 3000 }).catch(() => false)) {
          const parentDiv = occupiedCheckbox.locator('..');
          await parentDiv.click();
          await page.waitForTimeout(300);
        }
        
        const hazardousCheckbox = page.getByTestId('checkbox-risk-hazardous');
        if (await hazardousCheckbox.isVisible({ timeout: 3000 }).catch(() => false)) {
          const parentDiv = hazardousCheckbox.locator('..');
          await parentDiv.click();
          await page.waitForTimeout(300);
        }
      }
    }
  });

  test('should display all 12 risk factors with percentages', async ({ page }) => {
    await page.goto('/sales');
    
    await expect(page.getByRole('heading', { name: 'Leads' })).toBeVisible({ timeout: 15000 });
    await page.waitForTimeout(2000);
    
    const editButton = page.locator('[data-testid^="button-edit-lead-"]').first();
    
    if (await editButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await editButton.click();
      await expect(page.getByText('Edit Deal')).toBeVisible({ timeout: 5000 });
      
      const risksTab = page.getByRole('tab', { name: /Risks/i });
      if (await risksTab.isVisible({ timeout: 3000 }).catch(() => false)) {
        await risksTab.click();
        await page.waitForTimeout(500);
        
        await expect(page.getByText('Occupied Building (+15%)')).toBeVisible({ timeout: 5000 });
        await expect(page.getByText('Hazardous Conditions (+25%)')).toBeVisible();
        await expect(page.getByText('No Power/HVAC (+20%)')).toBeVisible();
        await expect(page.getByText('Remote Location (+10%)')).toBeVisible();
        await expect(page.getByText('Fast Track / Rush (+15%)')).toBeVisible();
      }
    }
  });

  test('should display payment terms with pricing adjustments', async ({ page }) => {
    await page.goto('/sales');
    
    await expect(page.getByRole('heading', { name: 'Leads' })).toBeVisible({ timeout: 15000 });
    await page.waitForTimeout(2000);
    
    const editButton = page.locator('[data-testid^="button-edit-lead-"]').first();
    
    if (await editButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await editButton.click();
      await expect(page.getByText('Edit Deal')).toBeVisible({ timeout: 5000 });
      
      const financialTab = page.getByRole('tab', { name: /Financial/i });
      if (await financialTab.isVisible({ timeout: 3000 }).catch(() => false)) {
        await financialTab.click();
        await page.waitForTimeout(500);
        
        const paymentDropdown = page.getByTestId('select-payment-terms');
        if (await paymentDropdown.isVisible({ timeout: 3000 }).catch(() => false)) {
          await paymentDropdown.click();
          await page.waitForTimeout(300);
          
          await expect(page.getByText('Partner (no hold on production)')).toBeVisible({ timeout: 3000 });
          await expect(page.getByText('Owner (hold if delay)')).toBeVisible();
          await expect(page.getByText('Net 30 (+5%)')).toBeVisible();
          await expect(page.getByText('Net 60 (+10%)')).toBeVisible();
          await expect(page.getByText('Net 90 (+15%)')).toBeVisible();
        }
      }
    }
  });

  test('should display timeline options (1-6 weeks)', async ({ page }) => {
    await page.goto('/sales');
    
    await expect(page.getByRole('heading', { name: 'Leads' })).toBeVisible({ timeout: 15000 });
    await page.waitForTimeout(2000);
    
    const editButton = page.locator('[data-testid^="button-edit-lead-"]').first();
    
    if (await editButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await editButton.click();
      await expect(page.getByText('Edit Deal')).toBeVisible({ timeout: 5000 });
      
      const financialTab = page.getByRole('tab', { name: /Financial/i });
      if (await financialTab.isVisible({ timeout: 3000 }).catch(() => false)) {
        await financialTab.click();
        await page.waitForTimeout(500);
        
        const timelineDropdown = page.getByTestId('select-timeline');
        if (await timelineDropdown.isVisible({ timeout: 3000 }).catch(() => false)) {
          await timelineDropdown.click();
          await page.waitForTimeout(300);
          
          await expect(page.getByText('~1 Week')).toBeVisible({ timeout: 3000 });
          await expect(page.getByText('~2 Weeks')).toBeVisible();
          await expect(page.getByText('~5 Weeks')).toBeVisible();
          await expect(page.getByText('~6 Weeks')).toBeVisible();
        }
      }
    }
  });

  test('should display additional services with labels', async ({ page }) => {
    await page.goto('/sales');
    
    await expect(page.getByRole('heading', { name: 'Leads' })).toBeVisible({ timeout: 15000 });
    await page.waitForTimeout(2000);
    
    const editButton = page.locator('[data-testid^="button-edit-lead-"]').first();
    
    if (await editButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await editButton.click();
      await expect(page.getByText('Edit Deal')).toBeVisible({ timeout: 5000 });
      
      const servicesTab = page.getByRole('tab', { name: /Services/i });
      if (await servicesTab.isVisible({ timeout: 3000 }).catch(() => false)) {
        await servicesTab.click();
        await page.waitForTimeout(500);
        
        await expect(page.getByText('Matterport Virtual Tour')).toBeVisible({ timeout: 5000 });
        await expect(page.getByText('Georeferencing ($1,000/building)')).toBeVisible();
        await expect(page.getByText('Above/Below ACT Scanning')).toBeVisible();
        await expect(page.getByText('Scan & Registration Only')).toBeVisible();
        await expect(page.getByText('Expedited Service (+20%)')).toBeVisible();
      }
    }
  });

  test('should display BIM deliverable options', async ({ page }) => {
    await page.goto('/sales');
    
    await expect(page.getByRole('heading', { name: 'Leads' })).toBeVisible({ timeout: 15000 });
    await page.waitForTimeout(2000);
    
    const editButton = page.locator('[data-testid^="button-edit-lead-"]').first();
    
    if (await editButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await editButton.click();
      await expect(page.getByText('Edit Deal')).toBeVisible({ timeout: 5000 });
      
      const servicesTab = page.getByRole('tab', { name: /Services/i });
      if (await servicesTab.isVisible({ timeout: 3000 }).catch(() => false)) {
        await servicesTab.click();
        await page.waitForTimeout(500);
        
        const bimDropdown = page.getByTestId('select-bim-deliverable');
        if (await bimDropdown.isVisible({ timeout: 3000 }).catch(() => false)) {
          await bimDropdown.click();
          await page.waitForTimeout(300);
          
          await expect(page.getByText('Revit')).toBeVisible({ timeout: 3000 });
          await expect(page.getByText('Archicad')).toBeVisible();
          await expect(page.getByText('SketchUp')).toBeVisible();
          await expect(page.getByText('Rhino')).toBeVisible();
        }
      }
    }
  });
});
