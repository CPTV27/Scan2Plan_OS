import { test as base, expect, Page, APIRequestContext } from '@playwright/test';

export interface TestUser {
  id: string;
  username: string;
  role: 'admin' | 'field';
}

export interface TestFixtures {
  adminPage: Page;
  fieldPage: Page;
  authenticatedPage: Page;
  apiContext: APIRequestContext;
  testUser: TestUser;
  cleanup: () => Promise<void>;
}

export interface TestData {
  createdLeadIds: number[];
  createdProjectIds: number[];
  createdPostIds: number[];
  createdTimeEntryIds: number[];
}

const testData: TestData = {
  createdLeadIds: [],
  createdProjectIds: [],
  createdPostIds: [],
  createdTimeEntryIds: [],
};

export const test = base.extend<TestFixtures>({
  adminPage: async ({ browser }, use) => {
    const context = await browser.newContext({
      storageState: 'tests/.auth/admin.json',
    });
    const page = await context.newPage();
    await use(page);
    await context.close();
  },

  fieldPage: async ({ browser }, use) => {
    const context = await browser.newContext({
      storageState: 'tests/.auth/field.json',
    });
    const page = await context.newPage();
    await use(page);
    await context.close();
  },

  authenticatedPage: async ({ page }, use) => {
    await use(page);
  },

  apiContext: async ({ playwright }, use) => {
    const context = await playwright.request.newContext({
      baseURL: process.env.BASE_URL || 'http://localhost:5000',
    });
    await use(context);
    await context.dispose();
  },

  testUser: async ({}, use) => {
    await use({
      id: 'test-user-1',
      username: process.env.TEST_USER || 'testuser',
      role: 'admin',
    });
  },

  cleanup: async ({ apiContext }, use) => {
    await use(async () => {
      for (const id of testData.createdLeadIds) {
        try {
          await apiContext.delete(`/api/leads/${id}`);
        } catch (e) {}
      }
      for (const id of testData.createdProjectIds) {
        try {
          await apiContext.delete(`/api/projects/${id}`);
        } catch (e) {}
      }
      for (const id of testData.createdPostIds) {
        try {
          await apiContext.delete(`/api/marketing-posts/${id}`);
        } catch (e) {}
      }
      for (const id of testData.createdTimeEntryIds) {
        try {
          await apiContext.delete(`/api/time-entries/${id}`);
        } catch (e) {}
      }
      testData.createdLeadIds = [];
      testData.createdProjectIds = [];
      testData.createdPostIds = [];
      testData.createdTimeEntryIds = [];
    });
  },
});

export function trackCreatedLead(id: number) {
  testData.createdLeadIds.push(id);
}

export function trackCreatedProject(id: number) {
  testData.createdProjectIds.push(id);
}

export function trackCreatedPost(id: number) {
  testData.createdPostIds.push(id);
}

export function trackCreatedTimeEntry(id: number) {
  testData.createdTimeEntryIds.push(id);
}

export async function mockHubSpotAPI(page: Page) {
  await page.route('**/api/hubspot/**', async (route) => {
    const url = route.request().url();
    
    if (url.includes('/sync')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          synced: 1,
          hubspotId: 'hs_mock_' + Date.now(),
        }),
      });
    } else if (url.includes('/batch-sync')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          results: { synced: 5, failed: 0 },
        }),
      });
    } else {
      await route.continue();
    }
  });
}

export async function mockQuickBooksAPI(page: Page) {
  await page.route('**/api/quickbooks/**', async (route) => {
    const url = route.request().url();
    
    if (url.includes('/profit-first')) {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          operatingExpenses: 45000,
          ownersPay: 25000,
          profitAccount: 15000,
          taxAccount: 10000,
          revenueAccount: 120000,
        }),
      });
    } else {
      await route.continue();
    }
  });
}

export { expect };
