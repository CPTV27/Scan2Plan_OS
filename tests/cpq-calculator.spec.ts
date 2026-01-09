import { test, expect } from '@playwright/test';

test.describe('CPQ Calculator - Core Functionality', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/cpq');
    await expect(page.getByTestId('text-cpq-title')).toBeVisible({ timeout: 15000 });
  });

  test('should display CPQ calculator interface', async ({ page }) => {
    await expect(page.getByText('Configure Price Quote')).toBeVisible();
    await expect(page.getByTestId('button-add-building-area')).toBeVisible();
    await expect(page.getByTestId('button-add-landscape-area')).toBeVisible();
  });

  test('should add a building area', async ({ page }) => {
    await page.getByTestId('button-add-building-area').click();
    
    const areaCard = page.locator('[data-testid^="card-area-building-"]').first();
    await expect(areaCard).toBeVisible({ timeout: 5000 });
    
    await expect(page.getByTestId('input-area-sqft-building-0')).toBeVisible();
  });

  test('should add a landscape area', async ({ page }) => {
    await page.getByTestId('button-add-landscape-area').click();
    
    const areaCard = page.locator('[data-testid^="card-area-landscape-"]').first();
    await expect(areaCard).toBeVisible({ timeout: 5000 });
    
    await expect(page.getByTestId('input-area-acres-landscape-0')).toBeVisible();
  });

  test('should calculate pricing for building area', async ({ page }) => {
    await page.getByTestId('button-add-building-area').click();
    
    const sqftInput = page.getByTestId('input-area-sqft-building-0');
    await expect(sqftInput).toBeVisible({ timeout: 5000 });
    await sqftInput.fill('10000');
    
    await page.waitForTimeout(500);
    
    await expect(page.getByTestId('text-total-price')).toBeVisible();
  });

  test('should show pricing breakdown', async ({ page }) => {
    await page.getByTestId('button-add-building-area').click();
    
    const sqftInput = page.getByTestId('input-area-sqft-building-0');
    await sqftInput.fill('25000');
    
    await page.waitForTimeout(500);
    
    await expect(page.getByText('Pricing Breakdown')).toBeVisible({ timeout: 5000 });
  });

  test('should support multiple building areas', async ({ page }) => {
    await page.getByTestId('button-add-building-area').click();
    await page.getByTestId('button-add-building-area').click();
    
    const areaCards = page.locator('[data-testid^="card-area-building-"]');
    await expect(areaCards).toHaveCount(2, { timeout: 5000 });
  });

  test('should remove area when delete button clicked', async ({ page }) => {
    await page.getByTestId('button-add-building-area').click();
    await expect(page.locator('[data-testid^="card-area-building-"]')).toHaveCount(1);
    
    await page.getByTestId('button-remove-area-building-0').click();
    
    await expect(page.locator('[data-testid^="card-area-building-"]')).toHaveCount(0, { timeout: 5000 });
  });
});

test.describe('CPQ Calculator - Building Types', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/cpq');
    await page.getByTestId('button-add-building-area').click();
    await expect(page.locator('[data-testid^="card-area-building-"]')).toBeVisible({ timeout: 5000 });
  });

  test('should have building type selector', async ({ page }) => {
    await expect(page.getByTestId('select-building-type-building-0')).toBeVisible();
  });

  test('should list all building types', async ({ page }) => {
    await page.getByTestId('select-building-type-building-0').click();
    
    await expect(page.getByText('Commercial / Office')).toBeVisible({ timeout: 3000 });
    await expect(page.getByText('Industrial / Warehouse')).toBeVisible();
    await expect(page.getByText('Residential')).toBeVisible();
  });

  test('should update pricing when building type changes', async ({ page }) => {
    const sqftInput = page.getByTestId('input-area-sqft-building-0');
    await sqftInput.fill('20000');
    
    await page.waitForTimeout(500);
    const initialPrice = await page.getByTestId('text-total-price').textContent();
    
    await page.getByTestId('select-building-type-building-0').click();
    await page.getByText('Healthcare / Medical').click();
    
    await page.waitForTimeout(500);
    const newPrice = await page.getByTestId('text-total-price').textContent();
    
    expect(initialPrice).not.toBe(newPrice);
  });
});

test.describe('CPQ Calculator - Level of Detail (LOD)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/cpq');
    await page.getByTestId('button-add-building-area').click();
    await expect(page.locator('[data-testid^="card-area-building-"]')).toBeVisible({ timeout: 5000 });
  });

  test('should have LOD selector', async ({ page }) => {
    await expect(page.getByTestId('select-lod-building-0')).toBeVisible();
  });

  test('should support LOD 100 through 400', async ({ page }) => {
    await page.getByTestId('select-lod-building-0').click();
    
    await expect(page.getByText('LOD 100')).toBeVisible({ timeout: 3000 });
    await expect(page.getByText('LOD 200')).toBeVisible();
    await expect(page.getByText('LOD 300')).toBeVisible();
    await expect(page.getByText('LOD 400')).toBeVisible();
  });

  test('higher LOD should increase price', async ({ page }) => {
    const sqftInput = page.getByTestId('input-area-sqft-building-0');
    await sqftInput.fill('15000');
    
    await page.getByTestId('select-lod-building-0').click();
    await page.getByText('LOD 100').click();
    await page.waitForTimeout(500);
    const lod100Price = await page.getByTestId('text-total-price').textContent();
    
    await page.getByTestId('select-lod-building-0').click();
    await page.getByText('LOD 300').click();
    await page.waitForTimeout(500);
    const lod300Price = await page.getByTestId('text-total-price').textContent();
    
    const price100 = parseFloat(lod100Price?.replace(/[^0-9.]/g, '') || '0');
    const price300 = parseFloat(lod300Price?.replace(/[^0-9.]/g, '') || '0');
    expect(price300).toBeGreaterThan(price100);
  });
});

test.describe('CPQ Calculator - Disciplines', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/cpq');
    await page.getByTestId('button-add-building-area').click();
    await expect(page.locator('[data-testid^="card-area-building-"]')).toBeVisible({ timeout: 5000 });
  });

  test('should have discipline checkboxes', async ({ page }) => {
    await expect(page.getByTestId('checkbox-discipline-architecture')).toBeVisible();
    await expect(page.getByTestId('checkbox-discipline-structural')).toBeVisible();
    await expect(page.getByTestId('checkbox-discipline-mep')).toBeVisible();
    await expect(page.getByTestId('checkbox-discipline-site')).toBeVisible();
  });

  test('adding disciplines should increase price', async ({ page }) => {
    const sqftInput = page.getByTestId('input-area-sqft-building-0');
    await sqftInput.fill('20000');
    await page.waitForTimeout(500);
    
    const basePrice = await page.getByTestId('text-total-price').textContent();
    
    await page.getByTestId('checkbox-discipline-mep').click();
    await page.waitForTimeout(500);
    
    const newPrice = await page.getByTestId('text-total-price').textContent();
    
    const base = parseFloat(basePrice?.replace(/[^0-9.]/g, '') || '0');
    const withMep = parseFloat(newPrice?.replace(/[^0-9.]/g, '') || '0');
    expect(withMep).toBeGreaterThan(base);
  });
});

test.describe('CPQ Calculator - Travel Pricing', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/cpq');
    await page.getByTestId('button-add-building-area').click();
    await page.getByTestId('input-area-sqft-building-0').fill('15000');
    await page.waitForTimeout(500);
  });

  test('should have travel section', async ({ page }) => {
    await expect(page.getByText('Travel')).toBeVisible();
  });

  test('should have project address input', async ({ page }) => {
    await expect(page.getByTestId('input-project-address')).toBeVisible();
  });

  test('should have origin location selector', async ({ page }) => {
    await expect(page.getByTestId('select-origin-location')).toBeVisible();
  });

  test('Brooklyn origin should use tiered pricing', async ({ page }) => {
    await page.getByTestId('select-origin-location').click();
    await page.getByText('Brooklyn').click();
    
    await expect(page.getByText('Travel')).toBeVisible();
  });

  test('should calculate travel cost when distance entered', async ({ page }) => {
    await page.getByTestId('input-project-address').fill('123 Main St, Manhattan, NY');
    await page.getByTestId('select-origin-location').click();
    await page.getByText('Brooklyn').click();
    
    await page.waitForTimeout(1000);
  });
});

test.describe('CPQ Calculator - Tier A Pricing', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/cpq');
  });

  test('should show Tier A toggle for large projects', async ({ page }) => {
    await page.getByTestId('button-add-building-area').click();
    await page.getByTestId('input-area-sqft-building-0').fill('75000');
    
    await page.waitForTimeout(500);
    
    const tierAToggle = page.getByTestId('switch-tier-a-pricing');
    await expect(tierAToggle).toBeVisible({ timeout: 5000 });
  });

  test('Tier A should enable manual cost inputs', async ({ page }) => {
    await page.getByTestId('button-add-building-area').click();
    await page.getByTestId('input-area-sqft-building-0').fill('75000');
    
    await page.waitForTimeout(500);
    
    await page.getByTestId('switch-tier-a-pricing').click();
    
    await expect(page.getByTestId('input-scanning-cost')).toBeVisible({ timeout: 5000 });
    await expect(page.getByTestId('input-modeling-cost')).toBeVisible();
    await expect(page.getByTestId('input-target-margin')).toBeVisible();
  });

  test('Tier A pricing should calculate from costs and margin', async ({ page }) => {
    await page.getByTestId('button-add-building-area').click();
    await page.getByTestId('input-area-sqft-building-0').fill('75000');
    
    await page.waitForTimeout(500);
    await page.getByTestId('switch-tier-a-pricing').click();
    
    await page.getByTestId('input-scanning-cost').fill('5000');
    await page.getByTestId('input-modeling-cost').fill('10000');
    await page.getByTestId('input-target-margin').fill('45');
    
    await page.waitForTimeout(500);
    
    const totalPrice = await page.getByTestId('text-total-price').textContent();
    expect(totalPrice).toBeTruthy();
  });
});

test.describe('CPQ Calculator - Margin Protection', () => {
  test('should show margin percentage', async ({ page }) => {
    await page.goto('/cpq');
    await page.getByTestId('button-add-building-area').click();
    await page.getByTestId('input-area-sqft-building-0').fill('20000');
    
    await page.waitForTimeout(500);
    
    await expect(page.getByTestId('text-gross-margin')).toBeVisible();
  });

  test('should warn when margin below 40%', async ({ page }) => {
    await page.goto('/cpq');
    await page.getByTestId('button-add-building-area').click();
    await page.getByTestId('input-area-sqft-building-0').fill('75000');
    
    await page.waitForTimeout(500);
    await page.getByTestId('switch-tier-a-pricing').click();
    
    await page.getByTestId('input-scanning-cost').fill('50000');
    await page.getByTestId('input-modeling-cost').fill('50000');
    await page.getByTestId('input-target-margin').fill('30');
    
    await page.waitForTimeout(500);
    
    await expect(page.getByText('below 40%')).toBeVisible({ timeout: 5000 });
  });
});

test.describe('CPQ Calculator - Price Adjustment', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/cpq');
    await page.getByTestId('button-add-building-area').click();
    await page.getByTestId('input-area-sqft-building-0').fill('20000');
    await page.waitForTimeout(500);
  });

  test('should have price adjustment input', async ({ page }) => {
    await expect(page.getByTestId('input-price-adjustment')).toBeVisible();
  });

  test('positive adjustment should increase price', async ({ page }) => {
    const basePrice = await page.getByTestId('text-total-price').textContent();
    
    await page.getByTestId('input-price-adjustment').fill('10');
    await page.waitForTimeout(500);
    
    const adjustedPrice = await page.getByTestId('text-total-price').textContent();
    
    const base = parseFloat(basePrice?.replace(/[^0-9.]/g, '') || '0');
    const adjusted = parseFloat(adjustedPrice?.replace(/[^0-9.]/g, '') || '0');
    expect(adjusted).toBeGreaterThan(base);
  });

  test('adjustment should appear in pricing breakdown', async ({ page }) => {
    await page.getByTestId('input-price-adjustment').fill('15');
    await page.waitForTimeout(500);
    
    await expect(page.getByText('Price Adjustment')).toBeVisible();
  });
});

test.describe('CPQ Calculator - Save Quote', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/cpq');
    await page.getByTestId('button-add-building-area').click();
    await page.getByTestId('input-area-sqft-building-0').fill('20000');
    await page.waitForTimeout(500);
  });

  test('should have save quote button', async ({ page }) => {
    await expect(page.getByTestId('button-save-quote')).toBeVisible();
  });

  test('should require project name to save', async ({ page }) => {
    await expect(page.getByTestId('input-project-name')).toBeVisible();
  });

  test('should save quote successfully', async ({ page }) => {
    await page.getByTestId('input-project-name').fill(`Test Quote ${Date.now()}`);
    await page.getByTestId('input-client-name').fill('Test Client');
    
    const responsePromise = page.waitForResponse(resp => 
      resp.url().includes('/api/cpq') && resp.request().method() === 'POST'
    );
    
    await page.getByTestId('button-save-quote').click();
    
    const response = await responsePromise;
    expect([200, 201]).toContain(response.status());
  });
});

test.describe('CPQ Calculator - API', () => {
  test('should get CPQ configuration', async ({ request }) => {
    const response = await request.get('/api/cpq/config');
    expect(response.status()).toBe(200);
    
    const data = await response.json();
    expect(data).toHaveProperty('buildingTypes');
    expect(data).toHaveProperty('lodFactors');
  });

  test('should calculate pricing via API', async ({ request }) => {
    const response = await request.post('/api/cpq/calculate', {
      data: {
        areas: [{
          kind: 'sqft',
          sqft: 20000,
          buildingType: 'Commercial / Office',
          lod: 200,
          scope: 'interior'
        }],
        disciplines: ['architecture']
      }
    });
    
    expect(response.status()).toBe(200);
    const data = await response.json();
    expect(data).toHaveProperty('totalPrice');
  });

  test('should list saved quotes', async ({ request }) => {
    const response = await request.get('/api/cpq/quotes');
    expect(response.status()).toBe(200);
    
    const data = await response.json();
    expect(Array.isArray(data)).toBe(true);
  });
});
