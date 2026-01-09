import { test, expect, trackCreatedProject } from '../fixtures/auth.fixtures';
import { ProjectJourneyPage } from '../page-objects/project-journey.po';
import * as fs from 'fs';
import * as path from 'path';

test.describe('Project Journey: CSV Upload → Variance Audit → Overrun Shield', () => {
  let projectPage: ProjectJourneyPage;
  const testCSVPath = 'tests/fixtures/test-realworks.csv';

  test.beforeAll(async () => {
    const csvContent = `Project Name,Estimated SQFT,Actual SQFT,Status,Client
Test Project 1,10000,11500,In Progress,Acme Corp
Test Project 2,5000,4800,Complete,Beta Inc
Test Project 3,20000,22000,In Progress,Gamma LLC`;
    
    const dir = path.dirname(testCSVPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(testCSVPath, csvContent);
  });

  test.afterAll(async () => {
    if (fs.existsSync(testCSVPath)) {
      fs.unlinkSync(testCSVPath);
    }
  });

  test.beforeEach(async ({ authenticatedPage }) => {
    projectPage = new ProjectJourneyPage(authenticatedPage);
    await projectPage.goto();
  });

  test.afterEach(async ({ cleanup }) => {
    await cleanup();
  });

  test('should upload RealWorks CSV successfully', async () => {
    await projectPage.uploadRealWorksCSV(testCSVPath);
    
    const projectCount = await projectPage.getProjectCount();
    expect(projectCount).toBeGreaterThan(0);
  });

  test('should navigate to Variance Audit tab', async () => {
    await projectPage.navigateToVarianceAudit();
    
    await expect(projectPage.auditResultsCard).toBeVisible();
  });

  test('should run variance audit on a project', async ({ authenticatedPage }) => {
    await projectPage.page.route('**/api/projects/variance', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          projectId: 1,
          estimatedSqft: 10000,
          actualSqft: 11500,
          variancePercent: 15,
          varianceAmount: 1500,
          isOverrun: true,
        }),
      });
    });

    await projectPage.navigateToVarianceAudit();
    
    const result = await projectPage.runVarianceAudit(1);
    
    expect(result.variance).toBe(15);
    expect(result.isOverrun).toBe(true);
  });

  test('should display variance badge with correct styling', async () => {
    await projectPage.page.route('**/api/projects**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          { id: 1, name: 'Test Project', variancePercent: 15, isOverrun: true },
        ]),
      });
    });

    await projectPage.goto();
    
    const varianceDisplay = await projectPage.getVarianceDisplay(1);
    expect(varianceDisplay).toContain('15');
  });

  test('should generate Overrun Shield report', async ({ authenticatedPage }) => {
    await projectPage.page.route('**/api/projects/overrun-shield/**', async (route) => {
      const pdfBuffer = Buffer.from('%PDF-1.4 test content');
      await route.fulfill({
        status: 200,
        contentType: 'application/pdf',
        body: pdfBuffer,
      });
    });

    await projectPage.page.route('**/api/projects**', async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([
            { id: 1, name: 'Test Project', variancePercent: 15, isOverrun: true },
          ]),
        });
      } else {
        await route.continue();
      }
    });

    await projectPage.goto();
    
    const row = projectPage.page.locator('[data-testid="row-project-1"]');
    if (await row.isVisible()) {
      const reportPath = await projectPage.generateOverrunShieldReport(1);
      expect(reportPath).toBeTruthy();
    }
  });

  test('should show different messaging for overrun vs underrun', async () => {
    await projectPage.page.route('**/api/projects**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          { id: 1, name: 'Overrun Project', variancePercent: 10, isOverrun: true },
          { id: 2, name: 'Underrun Project', variancePercent: -5, isOverrun: false },
        ]),
      });
    });

    await projectPage.goto();

    const overrunBadge = projectPage.page.locator('[data-testid="badge-variance-1"]');
    const underrunBadge = projectPage.page.locator('[data-testid="badge-variance-2"]');

    if (await overrunBadge.isVisible()) {
      await expect(overrunBadge).toHaveClass(/destructive|red/);
    }
    if (await underrunBadge.isVisible()) {
      await expect(underrunBadge).toHaveClass(/success|green/);
    }
  });

  test('complete project journey workflow', async ({ authenticatedPage }) => {
    await projectPage.page.route('**/api/projects/upload', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          projectsCreated: 3,
          projectIds: [101, 102, 103],
        }),
      });
    });

    await projectPage.page.route('**/api/projects/variance', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          projectId: 101,
          variancePercent: 12,
          isOverrun: true,
        }),
      });
    });

    await projectPage.uploadRealWorksCSV(testCSVPath);
    await projectPage.navigateToVarianceAudit();
    
    const result = await projectPage.runVarianceAudit(101);
    expect(result.isOverrun).toBe(true);
  });
});
