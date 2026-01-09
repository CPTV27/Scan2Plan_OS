import { chromium, FullConfig } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

async function globalSetup(config: FullConfig) {
  const baseURL = config.projects[0]?.use?.baseURL || 'http://localhost:5000';
  
  const authDir = 'tests/.auth';
  if (!fs.existsSync(authDir)) {
    fs.mkdirSync(authDir, { recursive: true });
  }
  
  const browser = await chromium.launch();

  await createAuthState(browser, baseURL, 'admin', path.join(authDir, 'admin.json'));
  await createAuthState(browser, baseURL, 'field', path.join(authDir, 'field.json'));

  await browser.close();
  console.log('Global setup complete - auth states created');
}

async function createAuthState(
  browser: ReturnType<typeof chromium.launch> extends Promise<infer T> ? T : never,
  baseURL: string,
  role: 'admin' | 'field',
  storagePath: string
) {
  const context = await browser.newContext({
    ignoreHTTPSErrors: true,
  });
  const page = await context.newPage();

  try {
    await page.goto(baseURL);
    await page.waitForLoadState('networkidle');

    const response = await page.request.post(`${baseURL}/api/test-login`, {
      headers: { 'Content-Type': 'application/json' },
      data: { role },
    });

    if (!response.ok()) {
      console.warn(`Test login for ${role} failed, creating empty auth state`);
      await context.storageState({ path: storagePath });
      await context.close();
      return;
    }

    console.log(`Playwright ${role} user authenticated successfully`);

    await page.goto(baseURL);
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(500);

    const cookies = await context.cookies();
    console.log(`Captured ${cookies.length} cookies for ${role} session`);

    await context.storageState({ path: storagePath });
    
    const savedState = JSON.parse(fs.readFileSync(storagePath, 'utf-8'));
    console.log(`${role} storage state saved with ${savedState.cookies?.length || 0} cookies`);
  } catch (error) {
    console.warn(`Error creating ${role} auth state:`, error);
    fs.writeFileSync(storagePath, JSON.stringify({ cookies: [], origins: [] }));
  }

  await context.close();
}

export default globalSetup;
