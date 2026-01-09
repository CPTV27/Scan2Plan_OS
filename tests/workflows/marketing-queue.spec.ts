import { test, expect, trackCreatedPost } from '../fixtures/auth.fixtures';
import { MarketingQueuePage } from '../page-objects/marketing-queue.po';

test.describe('Marketing Queue: Truth Loop → Auto-Generated Content', () => {
  let marketingPage: MarketingQueuePage;

  test.beforeEach(async ({ authenticatedPage }) => {
    marketingPage = new MarketingQueuePage(authenticatedPage);
    await marketingPage.goto();
  });

  test.afterEach(async ({ cleanup }) => {
    await cleanup();
  });

  test('should display marketing tabs correctly', async () => {
    await expect(marketingPage.contentQueueTab).toBeVisible();
    await expect(marketingPage.postedTab).toBeVisible();
    await expect(marketingPage.evidenceVaultTab).toBeVisible();
  });

  test('should navigate between marketing tabs', async () => {
    await marketingPage.navigateToContentQueue();
    await expect(marketingPage.page.locator('h3:has-text("Draft")')).toBeVisible();

    await marketingPage.navigateToPosted();
    await expect(marketingPage.page.locator('h3:has-text("Posted")')).toBeVisible();

    await marketingPage.navigateToEvidenceVault();
    await expect(marketingPage.page.locator('h3:has-text("Evidence Vault")')).toBeVisible();
  });

  test('should trigger Truth Loop and generate content', async ({ authenticatedPage }) => {
    await authenticatedPage.route('**/api/marketing/truth-loop', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          postId: 999,
          content: 'Auto-generated LinkedIn post content from Truth Loop',
          platform: 'linkedin',
          category: 'stat_bomb',
        }),
      });
    });

    await marketingPage.navigateToContentQueue();
    
    if (await marketingPage.triggerTruthLoopButton.isVisible()) {
      const postId = await marketingPage.triggerTruthLoop();
      trackCreatedPost(postId);
      expect(postId).toBe(999);
    }
  });

  test('should approve draft content', async ({ authenticatedPage }) => {
    await authenticatedPage.route('**/api/marketing-posts?status=draft', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: 1,
            content: 'Test draft post',
            platform: 'linkedin',
            status: 'draft',
            category: 'case_highlight',
          },
        ]),
      });
    });

    await authenticatedPage.route('**/api/marketing-posts/1', async (route) => {
      if (route.request().method() === 'PATCH') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ id: 1, status: 'approved' }),
        });
      }
    });

    await marketingPage.navigateToContentQueue();
    await marketingPage.approvePost(1);
  });

  test('should mark approved content as posted', async ({ authenticatedPage }) => {
    await authenticatedPage.route('**/api/marketing-posts?status=approved', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: 2,
            content: 'Approved post ready to publish',
            platform: 'linkedin',
            status: 'approved',
          },
        ]),
      });
    });

    await authenticatedPage.route('**/api/marketing-posts/2', async (route) => {
      if (route.request().method() === 'PATCH') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ id: 2, status: 'posted', postedAt: new Date().toISOString() }),
        });
      }
    });

    await marketingPage.navigateToContentQueue();
    
    const approvedSection = marketingPage.page.locator('h3:has-text("Approved")');
    if (await approvedSection.isVisible()) {
      await marketingPage.markAsPosted(2);
    }
  });

  test('should copy post content to clipboard', async ({ authenticatedPage }) => {
    await authenticatedPage.route('**/api/marketing-posts?status=draft', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: 3,
            content: 'Content to copy to clipboard',
            platform: 'linkedin',
            status: 'draft',
          },
        ]),
      });
    });

    await marketingPage.navigateToContentQueue();
    
    await authenticatedPage.context().grantPermissions(['clipboard-read', 'clipboard-write']);
    
    const copyBtn = marketingPage.page.locator('[data-testid="button-copy-3"]');
    if (await copyBtn.isVisible()) {
      await copyBtn.click();
      await marketingPage.waitForToast('Copied');
    }
  });

  test('should display Evidence Vault how-to card', async () => {
    await marketingPage.navigateToEvidenceVault();
    
    const howToCard = marketingPage.page.locator('[data-testid="card-evidence-vault-howto"]');
    await expect(howToCard).toBeVisible();
    await expect(howToCard).toContainText('Ammo Dump');
  });

  test('should add new hook to Evidence Vault', async ({ authenticatedPage }) => {
    await authenticatedPage.route('**/api/evidence-vault', async (route) => {
      if (route.request().method() === 'POST') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            id: 100,
            personaCode: 'BP8',
            hookContent: 'Test hook for influencer outreach',
            ewsScore: 5,
          }),
        });
      } else {
        await route.continue();
      }
    });

    const hookId = await marketingPage.addEvidenceHook(
      'BP8',
      'Test hook for influencer outreach',
      5
    );
    
    expect(hookId).toBe(100);
  });

  test('should show all 8 personas in Evidence Vault', async () => {
    await marketingPage.navigateToEvidenceVault();
    await marketingPage.addHookButton.click();
    
    await marketingPage.personaSelect.click();
    
    const personas = ['BP1', 'BP2', 'BP3', 'BP4', 'BP5', 'BP6', 'BP7', 'BP8'];
    for (const persona of personas) {
      const option = marketingPage.page.locator(`[role="option"]:has-text("${persona}")`);
      await expect(option).toBeVisible();
    }
  });

  test('complete marketing queue workflow', async ({ authenticatedPage }) => {
    await authenticatedPage.route('**/api/marketing/truth-loop', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          postId: 500,
          content: 'LinkedIn post: We found 15% variance in a 50k sqft project. Here\'s what we learned...',
          platform: 'linkedin',
        }),
      });
    });

    await authenticatedPage.route('**/api/marketing-posts?status=draft', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          { id: 500, content: 'LinkedIn post content', status: 'draft', platform: 'linkedin' },
        ]),
      });
    });

    await authenticatedPage.route('**/api/marketing-posts/500', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ id: 500, status: 'approved' }),
      });
    });

    await marketingPage.navigateToContentQueue();
    
    if (await marketingPage.triggerTruthLoopButton.isVisible()) {
      const postId = await marketingPage.triggerTruthLoop();
      trackCreatedPost(postId);
      
      await marketingPage.approvePost(postId);
    }
  });
});
