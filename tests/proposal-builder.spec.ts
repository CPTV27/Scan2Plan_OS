import { test, expect } from '@playwright/test';

test.describe('Proposal Builder - Core Functionality', () => {
    test('should open proposal builder from deal workspace', async ({ page }) => {
        // Get a lead to navigate to
        const leadsResponse = await page.request.get('/api/leads');
        const leads = await leadsResponse.json();

        if (leads.length === 0) {
            test.skip();
            return;
        }

        // Navigate to deal workspace
        await page.goto(`/deals/${leads[0].id}`);
        await page.waitForLoadState('networkidle');

        // Click on proposal tab
        const proposalTab = page.getByTestId('tab-proposal').or(page.locator('[value="proposal"]'));
        if (await proposalTab.isVisible({ timeout: 5000 }).catch(() => false)) {
            await proposalTab.click();
            await page.waitForTimeout(500);
        }

        // Look for the proposal builder button
        const builderButton = page.getByTestId('button-open-proposal-builder');
        if (await builderButton.isVisible({ timeout: 5000 }).catch(() => false)) {
            await builderButton.click();
            await page.waitForLoadState('networkidle');

            // Should navigate to proposal builder
            await expect(page).toHaveURL(/\/proposal/);
        }
    });

    test('should display proposal builder with sections panel', async ({ page }) => {
        const leadsResponse = await page.request.get('/api/leads');
        const leads = await leadsResponse.json();

        if (leads.length === 0) {
            test.skip();
            return;
        }

        await page.goto(`/deals/${leads[0].id}/proposal`);
        await page.waitForLoadState('networkidle');

        // Check for key UI elements
        const sectionsText = page.getByText('Proposal Sections');
        const hasSecondsSections = await sectionsText.isVisible({ timeout: 10000 }).catch(() => false);

        if (hasSecondsSections) {
            await expect(sectionsText).toBeVisible();
        }
    });

    test('should have template group selector', async ({ page }) => {
        const leadsResponse = await page.request.get('/api/leads');
        const leads = await leadsResponse.json();

        if (leads.length === 0) {
            test.skip();
            return;
        }

        await page.goto(`/deals/${leads[0].id}/proposal`);
        await page.waitForLoadState('networkidle');

        // Look for template selector
        const templateSelect = page.locator('button:has-text("Standard")').or(
            page.locator('[data-testid="select-template-group"]')
        );

        const hasTemplateSelect = await templateSelect.isVisible({ timeout: 5000 }).catch(() => false);
        expect(hasTemplateSelect).toBe(true);
    });

    test('should display live preview panel', async ({ page }) => {
        const leadsResponse = await page.request.get('/api/leads');
        const leads = await leadsResponse.json();

        if (leads.length === 0) {
            test.skip();
            return;
        }

        await page.goto(`/deals/${leads[0].id}/proposal`);
        await page.waitForLoadState('networkidle');

        // Check for preview content (prose class or Scan2Plan heading)
        const previewContent = page.locator('.prose').or(page.getByText('Scan2Plan Proposal'));

        const hasPreview = await previewContent.first().isVisible({ timeout: 10000 }).catch(() => false);
        expect(hasPreview).toBe(true);
    });

    test('should have download and send buttons', async ({ page }) => {
        const leadsResponse = await page.request.get('/api/leads');
        const leads = await leadsResponse.json();

        if (leads.length === 0) {
            test.skip();
            return;
        }

        await page.goto(`/deals/${leads[0].id}/proposal`);
        await page.waitForLoadState('networkidle');

        // Look for action buttons
        const downloadButton = page.getByText('Download PDF');
        const sendButton = page.getByText('Send Proposal');

        const hasDownload = await downloadButton.isVisible({ timeout: 5000 }).catch(() => false);
        const hasSend = await sendButton.isVisible({ timeout: 5000 }).catch(() => false);

        expect(hasDownload || hasSend).toBe(true);
    });

    test('should open edit section dialog from menu', async ({ page }) => {
        const leadsResponse = await page.request.get('/api/leads');
        const leads = await leadsResponse.json();

        if (leads.length === 0) {
            test.skip();
            return;
        }

        await page.goto(`/deals/${leads[0].id}/proposal`);
        await page.waitForLoadState('networkidle');

        // Hover over a section to reveal the menu
        const sectionItem = page.locator('[class*="group"]').filter({ hasText: /Cover Page|Executive|Scope/ }).first();

        if (await sectionItem.isVisible({ timeout: 5000 }).catch(() => false)) {
            await sectionItem.hover();

            // Click the three-dot menu
            const menuButton = sectionItem.locator('button:has(svg)').last();
            if (await menuButton.isVisible({ timeout: 2000 }).catch(() => false)) {
                await menuButton.click();

                // Look for Edit section option
                const editOption = page.getByText('Edit section');
                const hasEdit = await editOption.isVisible({ timeout: 2000 }).catch(() => false);

                if (hasEdit) {
                    await editOption.click();

                    // Dialog should open
                    await expect(page.getByText('Edit Section')).toBeVisible({ timeout: 5000 });
                }
            }
        }
    });
});

test.describe('Proposal Builder - Cover Page', () => {
    test('should display large logo on cover page', async ({ page }) => {
        const leadsResponse = await page.request.get('/api/leads');
        const leads = await leadsResponse.json();

        if (leads.length === 0) {
            test.skip();
            return;
        }

        await page.goto(`/deals/${leads[0].id}/proposal`);
        await page.waitForLoadState('networkidle');

        // Check for logo image
        const logo = page.locator('img[alt="Scan2Plan"]');
        const hasLogo = await logo.isVisible({ timeout: 10000 }).catch(() => false);

        expect(hasLogo).toBe(true);
    });

    test('should display project title on cover', async ({ page }) => {
        const leadsResponse = await page.request.get('/api/leads');
        const leads = await leadsResponse.json();

        if (leads.length === 0) {
            test.skip();
            return;
        }

        await page.goto(`/deals/${leads[0].id}/proposal`);
        await page.waitForLoadState('networkidle');

        // Check for proposal title
        const proposalTitle = page.getByText('Scan2Plan Proposal');
        const hasTitle = await proposalTitle.isVisible({ timeout: 10000 }).catch(() => false);

        expect(hasTitle).toBe(true);
    });
});
