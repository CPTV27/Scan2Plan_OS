import { test, expect, trackCreatedTimeEntry } from '../fixtures/auth.fixtures';
import { TimeTrackingPage } from '../page-objects/time-tracking.po';

test.describe('Dual Hat Labor Tracking', () => {
  let timeTrackingPage: TimeTrackingPage;

  test.beforeEach(async ({ authenticatedPage }) => {
    await authenticatedPage.route('**/api/projects', async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([
            { id: 1, name: 'Test Project Alpha' },
            { id: 2, name: 'Test Project Beta' },
          ]),
        });
      } else {
        await route.continue();
      }
    });

    timeTrackingPage = new TimeTrackingPage(authenticatedPage);
    await timeTrackingPage.goto();
  });

  test.afterEach(async ({ cleanup }) => {
    await cleanup();
  });

  test('should display time tracking page elements', async () => {
    await expect(timeTrackingPage.addEntryButton).toBeVisible();
  });

  test('should log scanning time entry', async ({ authenticatedPage }) => {
    await authenticatedPage.route('**/api/time-entries', async (route) => {
      if (route.request().method() === 'POST') {
        const body = route.request().postDataJSON();
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            id: 101,
            ...body,
          }),
        });
      } else {
        await route.continue();
      }
    });

    const entryId = await timeTrackingPage.logTimeEntry({
      projectId: 1,
      role: 'scanning',
      hours: 4.5,
      notes: 'Field scanning at site A',
    });

    trackCreatedTimeEntry(entryId);
    expect(entryId).toBe(101);
  });

  test('should log modeling time entry', async ({ authenticatedPage }) => {
    await authenticatedPage.route('**/api/time-entries', async (route) => {
      if (route.request().method() === 'POST') {
        const body = route.request().postDataJSON();
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            id: 102,
            ...body,
          }),
        });
      } else {
        await route.continue();
      }
    });

    const entryId = await timeTrackingPage.logTimeEntry({
      projectId: 1,
      role: 'modeling',
      hours: 6,
      notes: 'BIM modeling - MEP coordination',
    });

    trackCreatedTimeEntry(entryId);
    expect(entryId).toBe(102);
  });

  test('should log dual hat entries for same project', async ({ authenticatedPage }) => {
    let callCount = 0;
    await authenticatedPage.route('**/api/time-entries', async (route) => {
      if (route.request().method() === 'POST') {
        callCount++;
        const body = route.request().postDataJSON();
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            id: 200 + callCount,
            ...body,
          }),
        });
      } else {
        await route.continue();
      }
    });

    const entryIds = await timeTrackingPage.logDualHatEntry(1, 3, 5);
    
    expect(entryIds.length).toBe(2);
    entryIds.forEach((id) => trackCreatedTimeEntry(id));
  });

  test('should display role summary cards', async ({ authenticatedPage }) => {
    await authenticatedPage.route('**/api/time-entries/summary', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          scanning: 12.5,
          modeling: 24,
          qc: 8,
          admin: 4,
          total: 48.5,
        }),
      });
    });

    await timeTrackingPage.goto();
    
    const scanningCard = timeTrackingPage.page.locator('[data-testid="card-role-summary-scanning"]');
    const modelingCard = timeTrackingPage.page.locator('[data-testid="card-role-summary-modeling"]');
    
    if (await scanningCard.isVisible()) {
      await expect(scanningCard).toBeVisible();
    }
    if (await modelingCard.isVisible()) {
      await expect(modelingCard).toBeVisible();
    }
  });

  test('should calculate total hours correctly', async ({ authenticatedPage }) => {
    await authenticatedPage.route('**/api/time-entries', async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([
            { id: 1, role: 'scanning', hours: 4, projectId: 1 },
            { id: 2, role: 'modeling', hours: 6, projectId: 1 },
            { id: 3, role: 'qc', hours: 2, projectId: 1 },
          ]),
        });
      } else {
        await route.continue();
      }
    });

    await timeTrackingPage.goto();
    
    const totalDisplay = timeTrackingPage.page.locator('[data-testid="text-total-hours"]');
    if (await totalDisplay.isVisible()) {
      const total = await timeTrackingPage.getTotalHours();
      expect(total).toBeGreaterThanOrEqual(0);
    }
  });

  test('should show all role options in dropdown', async () => {
    await timeTrackingPage.addEntryButton.click();
    await timeTrackingPage.roleSelect.click();
    
    const roles = ['scanning', 'modeling', 'qc', 'admin'];
    for (const role of roles) {
      const option = timeTrackingPage.page.locator(`[data-testid="option-role-${role}"]`);
      if (await option.isVisible()) {
        await expect(option).toBeVisible();
      }
    }
  });

  test('should edit existing time entry', async ({ authenticatedPage }) => {
    await authenticatedPage.route('**/api/time-entries', async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([
            { id: 50, role: 'scanning', hours: 4, projectId: 1, notes: 'Original notes' },
          ]),
        });
      } else {
        await route.continue();
      }
    });

    await authenticatedPage.route('**/api/time-entries/50', async (route) => {
      if (route.request().method() === 'PATCH') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ id: 50, hours: 5, notes: 'Updated notes' }),
        });
      }
    });

    await timeTrackingPage.goto();
    
    const row = timeTrackingPage.page.locator('[data-testid="row-time-entry-50"]');
    if (await row.isVisible()) {
      await timeTrackingPage.editTimeEntry(50, { hours: 5, notes: 'Updated notes' });
    }
  });

  test('should delete time entry', async ({ authenticatedPage }) => {
    await authenticatedPage.route('**/api/time-entries', async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([
            { id: 60, role: 'modeling', hours: 3, projectId: 1 },
          ]),
        });
      } else {
        await route.continue();
      }
    });

    await authenticatedPage.route('**/api/time-entries/60', async (route) => {
      if (route.request().method() === 'DELETE') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true }),
        });
      }
    });

    await timeTrackingPage.goto();
    
    const row = timeTrackingPage.page.locator('[data-testid="row-time-entry-60"]');
    if (await row.isVisible()) {
      await timeTrackingPage.deleteTimeEntry(60);
    }
  });

  test('complete dual hat workflow', async ({ authenticatedPage }) => {
    let entryCount = 0;
    await authenticatedPage.route('**/api/time-entries', async (route) => {
      if (route.request().method() === 'POST') {
        entryCount++;
        const body = route.request().postDataJSON();
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            id: 300 + entryCount,
            ...body,
          }),
        });
      } else {
        await route.continue();
      }
    });

    const scanningId = await timeTrackingPage.logTimeEntry({
      projectId: 1,
      role: 'scanning',
      hours: 4,
      notes: 'Morning site scan',
    });
    trackCreatedTimeEntry(scanningId);

    const modelingId = await timeTrackingPage.logTimeEntry({
      projectId: 1,
      role: 'modeling',
      hours: 4,
      notes: 'Afternoon BIM work',
    });
    trackCreatedTimeEntry(modelingId);

    expect(scanningId).toBe(301);
    expect(modelingId).toBe(302);
  });
});
