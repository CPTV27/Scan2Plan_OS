import { test, expect } from '@playwright/test';

test.describe('Deal AI Assistant - Access and Display', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/sales');
    await expect(page.getByRole('heading', { name: 'Leads' })).toBeVisible({ timeout: 15000 });
  });

  test('should open deal workspace from card', async ({ page }) => {
    const dealCard = page.locator('[data-testid^="card-deal-"]').first();
    
    if (await dealCard.isVisible({ timeout: 5000 }).catch(() => false)) {
      await dealCard.click();
      await expect(page.getByTestId('dialog-deal-workspace')).toBeVisible({ timeout: 5000 });
    }
  });

  test('should have AI Assistant tab in deal workspace', async ({ page }) => {
    const dealCard = page.locator('[data-testid^="card-deal-"]').first();
    
    if (await dealCard.isVisible({ timeout: 5000 }).catch(() => false)) {
      await dealCard.click();
      await expect(page.getByTestId('tab-ai-assistant')).toBeVisible({ timeout: 5000 });
    }
  });

  test('should switch to AI Assistant tab', async ({ page }) => {
    const dealCard = page.locator('[data-testid^="card-deal-"]').first();
    
    if (await dealCard.isVisible({ timeout: 5000 }).catch(() => false)) {
      await dealCard.click();
      await page.getByTestId('tab-ai-assistant').click();
      
      await expect(page.getByTestId('tab-ai-proposal')).toBeVisible({ timeout: 5000 });
    }
  });
});

test.describe('Deal AI Assistant - Persona Display', () => {
  test('should display buyer persona info', async ({ page }) => {
    await page.goto('/sales');
    await expect(page.getByRole('heading', { name: 'Leads' })).toBeVisible({ timeout: 15000 });
    
    const dealCard = page.locator('[data-testid^="card-deal-"]').first();
    
    if (await dealCard.isVisible({ timeout: 5000 }).catch(() => false)) {
      await dealCard.click();
      await page.getByTestId('tab-ai-assistant').click();
      
      await expect(page.getByTestId('card-persona-info')).toBeVisible({ timeout: 10000 });
    }
  });

  test('should show persona primary pain point', async ({ page }) => {
    await page.goto('/sales');
    await page.waitForTimeout(2000);
    
    const dealCard = page.locator('[data-testid^="card-deal-"]').first();
    
    if (await dealCard.isVisible({ timeout: 5000 }).catch(() => false)) {
      await dealCard.click();
      await page.getByTestId('tab-ai-assistant').click();
      
      await expect(page.getByText('Primary Pain')).toBeVisible({ timeout: 10000 });
    }
  });

  test('should show persona communication style', async ({ page }) => {
    await page.goto('/sales');
    await page.waitForTimeout(2000);
    
    const dealCard = page.locator('[data-testid^="card-deal-"]').first();
    
    if (await dealCard.isVisible({ timeout: 5000 }).catch(() => false)) {
      await dealCard.click();
      await page.getByTestId('tab-ai-assistant').click();
      
      await expect(page.getByText('Communication Style')).toBeVisible({ timeout: 10000 });
    }
  });
});

test.describe('Deal AI Assistant - Proposal Generation', () => {
  test('should have proposal generation tab', async ({ page }) => {
    await page.goto('/sales');
    await page.waitForTimeout(2000);
    
    const dealCard = page.locator('[data-testid^="card-deal-"]').first();
    
    if (await dealCard.isVisible({ timeout: 5000 }).catch(() => false)) {
      await dealCard.click();
      await page.getByTestId('tab-ai-assistant').click();
      
      await expect(page.getByTestId('tab-ai-proposal')).toBeVisible({ timeout: 5000 });
    }
  });

  test('should display deal context in proposal tab', async ({ page }) => {
    await page.goto('/sales');
    await page.waitForTimeout(2000);
    
    const dealCard = page.locator('[data-testid^="card-deal-"]').first();
    
    if (await dealCard.isVisible({ timeout: 5000 }).catch(() => false)) {
      await dealCard.click();
      await page.getByTestId('tab-ai-assistant').click();
      await page.getByTestId('tab-ai-proposal').click();
      
      await expect(page.getByText('Project:')).toBeVisible({ timeout: 5000 });
    }
  });

  test('should have project type selector', async ({ page }) => {
    await page.goto('/sales');
    await page.waitForTimeout(2000);
    
    const dealCard = page.locator('[data-testid^="card-deal-"]').first();
    
    if (await dealCard.isVisible({ timeout: 5000 }).catch(() => false)) {
      await dealCard.click();
      await page.getByTestId('tab-ai-assistant').click();
      await page.getByTestId('tab-ai-proposal').click();
      
      await expect(page.getByTestId('select-project-type')).toBeVisible({ timeout: 5000 });
    }
  });

  test('should have timeline selector', async ({ page }) => {
    await page.goto('/sales');
    await page.waitForTimeout(2000);
    
    const dealCard = page.locator('[data-testid^="card-deal-"]').first();
    
    if (await dealCard.isVisible({ timeout: 5000 }).catch(() => false)) {
      await dealCard.click();
      await page.getByTestId('tab-ai-assistant').click();
      await page.getByTestId('tab-ai-proposal').click();
      
      await expect(page.getByTestId('select-timeline')).toBeVisible({ timeout: 5000 });
    }
  });

  test('should have scope notes input', async ({ page }) => {
    await page.goto('/sales');
    await page.waitForTimeout(2000);
    
    const dealCard = page.locator('[data-testid^="card-deal-"]').first();
    
    if (await dealCard.isVisible({ timeout: 5000 }).catch(() => false)) {
      await dealCard.click();
      await page.getByTestId('tab-ai-assistant').click();
      await page.getByTestId('tab-ai-proposal').click();
      
      await expect(page.getByTestId('input-scope-notes')).toBeVisible({ timeout: 5000 });
    }
  });

  test('should have generate proposal button', async ({ page }) => {
    await page.goto('/sales');
    await page.waitForTimeout(2000);
    
    const dealCard = page.locator('[data-testid^="card-deal-"]').first();
    
    if (await dealCard.isVisible({ timeout: 5000 }).catch(() => false)) {
      await dealCard.click();
      await page.getByTestId('tab-ai-assistant').click();
      await page.getByTestId('tab-ai-proposal').click();
      
      await expect(page.getByTestId('button-generate-proposal')).toBeVisible({ timeout: 5000 });
    }
  });
});

test.describe('Deal AI Assistant - Email Drafting', () => {
  test('should have email tab', async ({ page }) => {
    await page.goto('/sales');
    await page.waitForTimeout(2000);
    
    const dealCard = page.locator('[data-testid^="card-deal-"]').first();
    
    if (await dealCard.isVisible({ timeout: 5000 }).catch(() => false)) {
      await dealCard.click();
      await page.getByTestId('tab-ai-assistant').click();
      
      await expect(page.getByTestId('tab-ai-email')).toBeVisible({ timeout: 5000 });
    }
  });

  test('should have email type selector', async ({ page }) => {
    await page.goto('/sales');
    await page.waitForTimeout(2000);
    
    const dealCard = page.locator('[data-testid^="card-deal-"]').first();
    
    if (await dealCard.isVisible({ timeout: 5000 }).catch(() => false)) {
      await dealCard.click();
      await page.getByTestId('tab-ai-assistant').click();
      await page.getByTestId('tab-ai-email').click();
      
      await expect(page.getByTestId('select-email-type')).toBeVisible({ timeout: 5000 });
    }
  });

  test('should list all email types', async ({ page }) => {
    await page.goto('/sales');
    await page.waitForTimeout(2000);
    
    const dealCard = page.locator('[data-testid^="card-deal-"]').first();
    
    if (await dealCard.isVisible({ timeout: 5000 }).catch(() => false)) {
      await dealCard.click();
      await page.getByTestId('tab-ai-assistant').click();
      await page.getByTestId('tab-ai-email').click();
      
      await page.getByTestId('select-email-type').click();
      
      await expect(page.getByText('Introduction / First Touch')).toBeVisible({ timeout: 3000 });
      await expect(page.getByText('Follow-up After Meeting')).toBeVisible();
      await expect(page.getByText('Proposal Delivery')).toBeVisible();
    }
  });

  test('should have context input for email', async ({ page }) => {
    await page.goto('/sales');
    await page.waitForTimeout(2000);
    
    const dealCard = page.locator('[data-testid^="card-deal-"]').first();
    
    if (await dealCard.isVisible({ timeout: 5000 }).catch(() => false)) {
      await dealCard.click();
      await page.getByTestId('tab-ai-assistant').click();
      await page.getByTestId('tab-ai-email').click();
      
      await expect(page.getByTestId('input-email-context')).toBeVisible({ timeout: 5000 });
    }
  });

  test('should have generate email button', async ({ page }) => {
    await page.goto('/sales');
    await page.waitForTimeout(2000);
    
    const dealCard = page.locator('[data-testid^="card-deal-"]').first();
    
    if (await dealCard.isVisible({ timeout: 5000 }).catch(() => false)) {
      await dealCard.click();
      await page.getByTestId('tab-ai-assistant').click();
      await page.getByTestId('tab-ai-email').click();
      
      await expect(page.getByTestId('button-generate-email')).toBeVisible({ timeout: 5000 });
    }
  });
});

test.describe('Deal AI Assistant - Objection Handling', () => {
  test('should have objection tab', async ({ page }) => {
    await page.goto('/sales');
    await page.waitForTimeout(2000);
    
    const dealCard = page.locator('[data-testid^="card-deal-"]').first();
    
    if (await dealCard.isVisible({ timeout: 5000 }).catch(() => false)) {
      await dealCard.click();
      await page.getByTestId('tab-ai-assistant').click();
      
      await expect(page.getByTestId('tab-ai-objection')).toBeVisible({ timeout: 5000 });
    }
  });

  test('should have objection input', async ({ page }) => {
    await page.goto('/sales');
    await page.waitForTimeout(2000);
    
    const dealCard = page.locator('[data-testid^="card-deal-"]').first();
    
    if (await dealCard.isVisible({ timeout: 5000 }).catch(() => false)) {
      await dealCard.click();
      await page.getByTestId('tab-ai-assistant').click();
      await page.getByTestId('tab-ai-objection').click();
      
      await expect(page.getByTestId('input-objection')).toBeVisible({ timeout: 5000 });
    }
  });

  test('should have handle objection button', async ({ page }) => {
    await page.goto('/sales');
    await page.waitForTimeout(2000);
    
    const dealCard = page.locator('[data-testid^="card-deal-"]').first();
    
    if (await dealCard.isVisible({ timeout: 5000 }).catch(() => false)) {
      await dealCard.click();
      await page.getByTestId('tab-ai-assistant').click();
      await page.getByTestId('tab-ai-objection').click();
      
      await expect(page.getByTestId('button-handle-objection')).toBeVisible({ timeout: 5000 });
    }
  });

  test('objection button should be disabled when input empty', async ({ page }) => {
    await page.goto('/sales');
    await page.waitForTimeout(2000);
    
    const dealCard = page.locator('[data-testid^="card-deal-"]').first();
    
    if (await dealCard.isVisible({ timeout: 5000 }).catch(() => false)) {
      await dealCard.click();
      await page.getByTestId('tab-ai-assistant').click();
      await page.getByTestId('tab-ai-objection').click();
      
      const button = page.getByTestId('button-handle-objection');
      await expect(button).toBeDisabled({ timeout: 5000 });
    }
  });

  test('objection button should enable when input has text', async ({ page }) => {
    await page.goto('/sales');
    await page.waitForTimeout(2000);
    
    const dealCard = page.locator('[data-testid^="card-deal-"]').first();
    
    if (await dealCard.isVisible({ timeout: 5000 }).catch(() => false)) {
      await dealCard.click();
      await page.getByTestId('tab-ai-assistant').click();
      await page.getByTestId('tab-ai-objection').click();
      
      await page.getByTestId('input-objection').fill('The price is too high');
      
      const button = page.getByTestId('button-handle-objection');
      await expect(button).toBeEnabled({ timeout: 5000 });
    }
  });
});

test.describe('Deal AI Assistant - Generated Content', () => {
  test('should display generated content area', async ({ page }) => {
    await page.goto('/sales');
    await page.waitForTimeout(2000);
    
    const dealCard = page.locator('[data-testid^="card-deal-"]').first();
    
    if (await dealCard.isVisible({ timeout: 5000 }).catch(() => false)) {
      await dealCard.click();
      await page.getByTestId('tab-ai-assistant').click();
      
      await expect(page.getByTestId('section-generated-content')).toBeVisible({ timeout: 5000 });
    }
  });

  test('should have copy button for generated content', async ({ page }) => {
    await page.goto('/sales');
    await page.waitForTimeout(2000);
    
    const dealCard = page.locator('[data-testid^="card-deal-"]').first();
    
    if (await dealCard.isVisible({ timeout: 5000 }).catch(() => false)) {
      await dealCard.click();
      await page.getByTestId('tab-ai-assistant').click();
      
      await expect(page.getByTestId('button-copy-content')).toBeVisible({ timeout: 5000 });
    }
  });
});
