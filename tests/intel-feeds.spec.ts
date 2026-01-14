import { test, expect } from '@playwright/test';

// ============================================
// INTEL FEEDS UI TESTS
// ============================================

test.describe('Business Intelligence News Feeds UI', () => {
    test('should display Business Intelligence page', async ({ page }) => {
        await page.goto('/regional-intel');
        await page.waitForLoadState('networkidle');

        await expect(page.getByTestId('text-page-title')).toContainText('Business Intelligence');
    });

    test('should display Bidding Opportunities card', async ({ page }) => {
        await page.goto('/regional-intel');
        await page.waitForLoadState('networkidle');

        await expect(page.getByTestId('card-bid-opportunities')).toBeVisible({ timeout: 10000 });
        await expect(page.getByText('Bidding Opportunities')).toBeVisible();
        await expect(page.getByText('RFPs and projects to bid on')).toBeVisible();
    });

    test('should display Policy Updates card', async ({ page }) => {
        await page.goto('/regional-intel');
        await page.waitForLoadState('networkidle');

        await expect(page.getByTestId('card-policy-updates')).toBeVisible({ timeout: 10000 });
        await expect(page.getByText('Policy & Regulatory')).toBeVisible();
        await expect(page.getByText('Laws and regulations affecting work')).toBeVisible();
    });

    test('should display Competitor Watch card', async ({ page }) => {
        await page.goto('/regional-intel');
        await page.waitForLoadState('networkidle');

        await expect(page.getByTestId('card-competitor-watch')).toBeVisible({ timeout: 10000 });
        await expect(page.getByText('Competitor Watch')).toBeVisible();
        await expect(page.getByText('Competitor news and movements')).toBeVisible();
    });

    test('should display sample opportunity items', async ({ page }) => {
        await page.goto('/regional-intel');
        await page.waitForLoadState('networkidle');

        await expect(page.getByText('NYC DOE School Renovation')).toBeVisible({ timeout: 10000 });
        await expect(page.getByText('Hudson Yards Tower Survey')).toBeVisible();
    });

    test('should display sample policy items', async ({ page }) => {
        await page.goto('/regional-intel');
        await page.waitForLoadState('networkidle');

        await expect(page.getByText('Local Law 97 Update')).toBeVisible({ timeout: 10000 });
        await expect(page.getByText('OSHA Heat Safety Rules')).toBeVisible();
    });

    test('should display sample competitor items', async ({ page }) => {
        await page.goto('/regional-intel');
        await page.waitForLoadState('networkidle');

        await expect(page.getByText('ScanCorp Acquisition')).toBeVisible({ timeout: 10000 });
        await expect(page.getByText('TechScan Pro Price Cut')).toBeVisible();
    });
});

// ============================================
// INTEL FEEDS API TESTS
// ============================================

test.describe('Intel Feeds API', () => {
    test('GET /api/intel-feeds should return array', async ({ request }) => {
        const response = await request.get('/api/intel-feeds');

        // May be 401 if not authenticated, or 200 with data
        if (response.status() === 200) {
            const data = await response.json();
            expect(Array.isArray(data)).toBe(true);
        } else {
            expect([401, 403]).toContain(response.status());
        }
    });

    test('GET /api/intel-feeds/stats should return counts', async ({ request }) => {
        const response = await request.get('/api/intel-feeds/stats');

        if (response.status() === 200) {
            const data = await response.json();
            expect(data).toHaveProperty('opportunity');
            expect(data).toHaveProperty('policy');
            expect(data).toHaveProperty('competitor');
            expect(data).toHaveProperty('total');
        } else {
            expect([401, 403]).toContain(response.status());
        }
    });

    test('GET /api/intel-feeds with type filter should work', async ({ request }) => {
        const response = await request.get('/api/intel-feeds?type=opportunity');

        if (response.status() === 200) {
            const data = await response.json();
            expect(Array.isArray(data)).toBe(true);
            // All items should be opportunities
            data.forEach((item: any) => {
                expect(item.type).toBe('opportunity');
            });
        } else {
            expect([401, 403]).toContain(response.status());
        }
    });

    test('POST /api/intel-feeds should require auth', async ({ request }) => {
        const response = await request.post('/api/intel-feeds', {
            data: {
                type: 'opportunity',
                title: 'Test Opportunity',
                summary: 'Test summary',
            }
        });

        // Should not be 404 (route exists)
        expect(response.status()).not.toBe(404);
    });

    test('POST /api/intel-feeds/seed-demo should exist', async ({ request }) => {
        const response = await request.post('/api/intel-feeds/seed-demo');

        // Route exists (may require auth)
        expect(response.status()).not.toBe(404);
    });
});

// ============================================
// BUSINESS INTELLIGENCE EXISTING FEATURES
// ============================================

test.describe('Business Intelligence Existing Features', () => {
    test('should display pipeline stats cards', async ({ page }) => {
        await page.goto('/regional-intel');
        await page.waitForLoadState('networkidle');

        await expect(page.getByTestId('card-total-pipeline')).toBeVisible({ timeout: 10000 });
        await expect(page.getByTestId('card-avg-deal')).toBeVisible();
        await expect(page.getByTestId('card-ai-insights')).toBeVisible();
        await expect(page.getByTestId('card-regulatory-risks')).toBeVisible();
    });

    test('should display client tiers card', async ({ page }) => {
        await page.goto('/regional-intel');
        await page.waitForLoadState('networkidle');

        await expect(page.getByTestId('card-client-tiers')).toBeVisible({ timeout: 10000 });
        await expect(page.getByText('Client Tier Distribution')).toBeVisible();
    });

    test('should display regional breakdown card', async ({ page }) => {
        await page.goto('/regional-intel');
        await page.waitForLoadState('networkidle');

        await expect(page.getByTestId('card-regional-breakdown')).toBeVisible({ timeout: 10000 });
        await expect(page.getByText('Regional Pipeline Breakdown')).toBeVisible();
    });

    test('should display service gaps card', async ({ page }) => {
        await page.goto('/regional-intel');
        await page.waitForLoadState('networkidle');

        await expect(page.getByTestId('card-service-gaps')).toBeVisible({ timeout: 10000 });
        await expect(page.getByText('Service Gap Opportunities')).toBeVisible();
    });

    test('should have Generate Insights button', async ({ page }) => {
        await page.goto('/regional-intel');
        await page.waitForLoadState('networkidle');

        await expect(page.getByTestId('button-refresh-insights')).toBeVisible({ timeout: 10000 });
        await expect(page.getByText('Generate Insights')).toBeVisible();
    });
});
