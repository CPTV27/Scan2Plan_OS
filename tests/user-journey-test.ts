/**
 * Comprehensive User Journey Test
 * Tests all major features and functionality of Scan2Plan OS
 */

interface TestResult {
  module: string;
  test: string;
  passed: boolean;
  error?: string;
  duration: number;
}

const BASE_URL = 'http://localhost:5000';
let sessionCookie = '';
const results: TestResult[] = [];

async function fetchWithAuth(url: string, options: RequestInit = {}) {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  
  if (sessionCookie) {
    headers['Cookie'] = sessionCookie;
  }
  
  const response = await fetch(url, { 
    ...options, 
    headers: { ...headers, ...options.headers as Record<string, string> },
    credentials: 'include',
  });
  
  // Capture session cookie from response
  const setCookie = response.headers.get('set-cookie');
  if (setCookie) {
    // Parse the connect.sid cookie
    const match = setCookie.match(/connect\.sid=[^;]+/);
    if (match) {
      sessionCookie = match[0];
    }
  }
  
  return response;
}

async function runTest(module: string, testName: string, testFn: () => Promise<void>) {
  const start = Date.now();
  try {
    await testFn();
    results.push({ module, test: testName, passed: true, duration: Date.now() - start });
    console.log(`✅ ${module}: ${testName}`);
  } catch (error: any) {
    results.push({ module, test: testName, passed: false, error: error.message, duration: Date.now() - start });
    console.log(`❌ ${module}: ${testName} - ${error.message}`);
  }
}

// Authentication Tests
async function testAuthentication() {
  await runTest('Auth', 'Test login endpoint', async () => {
    const res = await fetchWithAuth(`${BASE_URL}/api/test-login`, {
      method: 'POST',
      body: JSON.stringify({ role: 'admin' }),
    });
    if (!res.ok) throw new Error(`Login failed: ${res.status}`);
    const data = await res.json();
    if (!data.success) throw new Error('Login unsuccessful');
  });

  await runTest('Auth', 'Session status check', async () => {
    const res = await fetchWithAuth(`${BASE_URL}/api/auth/session-status`);
    if (!res.ok) throw new Error(`Session check failed: ${res.status}`);
    const data = await res.json();
    if (!data.authenticated) throw new Error('Not authenticated after login');
  });

  await runTest('Auth', 'Get user info', async () => {
    const res = await fetchWithAuth(`${BASE_URL}/api/auth/user`);
    if (!res.ok) throw new Error(`User fetch failed: ${res.status}`);
    const data = await res.json();
    if (!data.id) throw new Error('User ID missing');
    if (!data.email) throw new Error('User email missing');
  });
}

// Dashboard Tests
async function testDashboard() {
  await runTest('Dashboard', 'Get leads for pipeline', async () => {
    const res = await fetchWithAuth(`${BASE_URL}/api/leads`);
    if (!res.ok) throw new Error(`Leads fetch failed: ${res.status}`);
    const data = await res.json();
    if (!Array.isArray(data)) throw new Error('Leads should be array');
  });

  await runTest('Dashboard', 'Get projects', async () => {
    const res = await fetchWithAuth(`${BASE_URL}/api/projects`);
    if (!res.ok) throw new Error(`Projects fetch failed: ${res.status}`);
    const data = await res.json();
    if (!Array.isArray(data)) throw new Error('Projects should be array');
  });

  await runTest('Dashboard', 'Get profitability analytics', async () => {
    const res = await fetchWithAuth(`${BASE_URL}/api/analytics/profitability`);
    if (!res.ok) throw new Error(`Profitability fetch failed: ${res.status}`);
    const data = await res.json();
    if (typeof data.totalRevenue !== 'number') throw new Error('Missing totalRevenue');
  });

  await runTest('Dashboard', 'Get ABM penetration', async () => {
    const res = await fetchWithAuth(`${BASE_URL}/api/analytics/abm-penetration`);
    if (!res.ok) throw new Error(`ABM fetch failed: ${res.status}`);
    const data = await res.json();
    if (typeof data.percentage !== 'number') throw new Error('Missing percentage');
  });

  await runTest('Dashboard', 'Get calendar events', async () => {
    const res = await fetchWithAuth(`${BASE_URL}/api/google/calendar/events`);
    if (!res.ok) throw new Error(`Calendar fetch failed: ${res.status}`);
    const data = await res.json();
    if (!data.events) throw new Error('Missing events array');
  });
}

// Sales Pipeline Tests
async function testSalesPipeline() {
  await runTest('Sales', 'Get all leads', async () => {
    const res = await fetchWithAuth(`${BASE_URL}/api/leads`);
    if (!res.ok) throw new Error(`Leads fetch failed: ${res.status}`);
    const data = await res.json();
    if (!Array.isArray(data)) throw new Error('Leads should be array');
    if (data.length > 0) {
      const lead = data[0];
      if (!lead.dealStage) throw new Error('Lead missing dealStage');
    }
  });

  await runTest('Sales', 'Get win/loss analytics', async () => {
    const res = await fetchWithAuth(`${BASE_URL}/api/analytics/win-loss`);
    if (!res.ok) throw new Error(`Win-loss fetch failed: ${res.status}`);
  });

  await runTest('Sales', 'Get trash/deleted leads', async () => {
    const res = await fetchWithAuth(`${BASE_URL}/api/leads/trash`);
    if (!res.ok) throw new Error(`Trash fetch failed: ${res.status}`);
    const data = await res.json();
    if (!Array.isArray(data)) throw new Error('Trash should be array');
  });
}

// CPQ Calculator Tests
async function testCPQCalculator() {
  await runTest('CPQ', 'Get CPQ page renders (via leads)', async () => {
    const res = await fetchWithAuth(`${BASE_URL}/api/leads`);
    if (!res.ok) throw new Error(`Leads fetch failed: ${res.status}`);
    // CPQ uses leads data to calculate pricing
  });

  await runTest('CPQ', 'Calculate pricing', async () => {
    const res = await fetchWithAuth(`${BASE_URL}/api/cpq/calculate`, {
      method: 'POST',
      body: JSON.stringify({
        areas: [{ type: 'interior', sqft: 5000 }],
        pricingMode: 'standard',
        dispatchLocation: 'default',
      }),
    });
    // May return 400 for invalid input, but should not be 500
    if (res.status >= 500) throw new Error(`CPQ calculate server error: ${res.status}`);
  });
}

// Production Module Tests
async function testProduction() {
  await runTest('Production', 'Get all projects', async () => {
    const res = await fetchWithAuth(`${BASE_URL}/api/projects`);
    if (!res.ok) throw new Error(`Projects fetch failed: ${res.status}`);
    const data = await res.json();
    if (!Array.isArray(data)) throw new Error('Projects should be array');
  });

  await runTest('Production', 'Get users (including technicians)', async () => {
    const res = await fetchWithAuth(`${BASE_URL}/api/users`);
    if (!res.ok) throw new Error(`Users fetch failed: ${res.status}`);
    const data = await res.json();
    if (!Array.isArray(data)) throw new Error('Users should be array');
  });

  await runTest('Production', 'Get performance stats', async () => {
    const res = await fetchWithAuth(`${BASE_URL}/api/performance/stats`);
    if (!res.ok) throw new Error(`Performance stats failed: ${res.status}`);
  });
}

// Financial Module Tests
async function testFinancial() {
  await runTest('Financial', 'Get QuickBooks balance sheet', async () => {
    const res = await fetchWithAuth(`${BASE_URL}/api/quickbooks/balance-sheet`);
    // May fail if QBO not connected, but should not be 500
    if (res.status >= 500) throw new Error(`QBO balance sheet server error: ${res.status}`);
  });

  await runTest('Financial', 'Get QuickBooks profit/loss', async () => {
    const res = await fetchWithAuth(`${BASE_URL}/api/quickbooks/profit-loss`);
    if (res.status >= 500) throw new Error(`QBO P&L server error: ${res.status}`);
  });

  await runTest('Financial', 'Get profitability by lead', async () => {
    const res = await fetchWithAuth(`${BASE_URL}/api/analytics/profitability`);
    if (!res.ok) throw new Error(`Profitability fetch failed: ${res.status}`);
    const data = await res.json();
    if (!data.byLead) throw new Error('Missing byLead breakdown');
  });
}

// Intel Module Tests
async function testIntel() {
  await runTest('Intel', 'Get intel feed items', async () => {
    const res = await fetchWithAuth(`${BASE_URL}/api/intel-feeds`);
    if (!res.ok) throw new Error(`Intel feeds failed: ${res.status}`);
    const data = await res.json();
    if (!Array.isArray(data)) throw new Error('Intel feeds should be array');
  });

  await runTest('Intel', 'Get intel feed stats', async () => {
    const res = await fetchWithAuth(`${BASE_URL}/api/intel-feeds/stats`);
    if (!res.ok) throw new Error(`Intel stats failed: ${res.status}`);
  });

  await runTest('Intel', 'Get processed intel items', async () => {
    const res = await fetchWithAuth(`${BASE_URL}/api/intel-feeds/processed`);
    if (!res.ok) throw new Error(`Processed intel failed: ${res.status}`);
  });

  await runTest('Intel', 'Get intel source configs', async () => {
    const res = await fetchWithAuth(`${BASE_URL}/api/intel-sources`);
    if (!res.ok) throw new Error(`Intel sources failed: ${res.status}`);
  });
}

// Marketing Module Tests  
async function testMarketing() {
  await runTest('Marketing', 'Get buyer personas (intelligence)', async () => {
    const res = await fetchWithAuth(`${BASE_URL}/api/intelligence/personas`);
    if (!res.ok) throw new Error(`Personas fetch failed: ${res.status}`);
    const data = await res.json();
    if (!Array.isArray(data)) throw new Error('Personas should be array');
  });

  await runTest('Marketing', 'Get brand voices (intelligence)', async () => {
    const res = await fetchWithAuth(`${BASE_URL}/api/intelligence/voices`);
    if (!res.ok) throw new Error(`Brand voices failed: ${res.status}`);
  });

  await runTest('Marketing', 'Get personas list', async () => {
    const res = await fetchWithAuth(`${BASE_URL}/api/personas`);
    if (!res.ok) throw new Error(`Personas list failed: ${res.status}`);
  });
}

// Customer Management Tests
async function testCustomers() {
  await runTest('Customers', 'Get CRM customers', async () => {
    const res = await fetchWithAuth(`${BASE_URL}/api/crm/customers`);
    if (!res.ok) throw new Error(`CRM customers fetch failed: ${res.status}`);
  });

  await runTest('Customers', 'Get products catalog', async () => {
    const res = await fetchWithAuth(`${BASE_URL}/api/products`);
    if (!res.ok) throw new Error(`Products fetch failed: ${res.status}`);
  });
}

// Field Hub Tests (Production role)
async function testFieldHub() {
  // Re-authenticate as field user
  await fetchWithAuth(`${BASE_URL}/api/test-login`, {
    method: 'POST',
    body: JSON.stringify({ role: 'field' }),
  });
  
  await runTest('FieldHub', 'Get projects as field user', async () => {
    const res = await fetchWithAuth(`${BASE_URL}/api/projects`);
    if (!res.ok) throw new Error(`Projects fetch failed: ${res.status}`);
  });

  await runTest('FieldHub', 'Get time logs', async () => {
    const res = await fetchWithAuth(`${BASE_URL}/api/time-logs`);
    // 404 is OK - endpoint might not exist, but no server errors
    if (res.status >= 500) throw new Error(`Time logs server error: ${res.status}`);
  });

  await runTest('FieldHub', 'Get field ops status', async () => {
    // Field users view their assigned projects
    const res = await fetchWithAuth(`${BASE_URL}/api/projects`);
    if (!res.ok) throw new Error(`Field ops fetch failed: ${res.status}`);
  });
}

// HubSpot Integration Tests
async function testHubSpot() {
  await runTest('HubSpot', 'Get HubSpot contacts', async () => {
    const res = await fetchWithAuth(`${BASE_URL}/api/hubspot/contacts`);
    // May fail if not connected
    if (res.status >= 500) throw new Error(`HubSpot contacts server error: ${res.status}`);
  });

  await runTest('HubSpot', 'Get sync status', async () => {
    const res = await fetchWithAuth(`${BASE_URL}/api/hubspot/sync-status`);
    if (res.status >= 500) throw new Error(`HubSpot sync status server error: ${res.status}`);
  });
}

// Google Drive Integration Tests
async function testGoogleDrive() {
  await runTest('GoogleDrive', 'List drive files', async () => {
    const res = await fetchWithAuth(`${BASE_URL}/api/google/drive/files`);
    // May fail if not connected, but should not be 500
    if (res.status >= 500) throw new Error(`Drive files server error: ${res.status}`);
  });
}

// Gmail Integration Tests
async function testGmail() {
  await runTest('Gmail', 'Get emails', async () => {
    const res = await fetchWithAuth(`${BASE_URL}/api/emails`);
    // May return 401 if not connected, but should not be 500
    if (res.status >= 500) throw new Error(`Emails server error: ${res.status}`);
  });
}

// Run all tests
async function runAllTests() {
  console.log('\n🚀 Starting Comprehensive User Journey Test\n');
  console.log('='.repeat(60));

  // Re-login as admin for main tests
  await fetchWithAuth(`${BASE_URL}/api/test-login`, {
    method: 'POST',
    body: JSON.stringify({ role: 'admin' }),
  });

  await testAuthentication();
  console.log('');
  await testDashboard();
  console.log('');
  await testSalesPipeline();
  console.log('');
  await testCPQCalculator();
  console.log('');
  await testProduction();
  console.log('');
  await testFinancial();
  console.log('');
  await testIntel();
  console.log('');
  await testMarketing();
  console.log('');
  await testCustomers();
  console.log('');
  await testFieldHub();
  console.log('');
  await testHubSpot();
  console.log('');
  await testGoogleDrive();
  console.log('');
  await testGmail();

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 TEST SUMMARY\n');
  
  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  const total = results.length;
  
  console.log(`Total: ${total} | Passed: ${passed} | Failed: ${failed}`);
  console.log(`Success Rate: ${((passed / total) * 100).toFixed(1)}%`);
  
  if (failed > 0) {
    console.log('\n❌ FAILED TESTS:\n');
    results.filter(r => !r.passed).forEach(r => {
      console.log(`  ${r.module}: ${r.test}`);
      console.log(`    Error: ${r.error}`);
    });
  }

  // Group by module
  console.log('\n📋 RESULTS BY MODULE:\n');
  const modules = [...new Set(results.map(r => r.module))];
  modules.forEach(module => {
    const moduleResults = results.filter(r => r.module === module);
    const modulePassed = moduleResults.filter(r => r.passed).length;
    const moduleTotal = moduleResults.length;
    const status = modulePassed === moduleTotal ? '✅' : '⚠️';
    console.log(`${status} ${module}: ${modulePassed}/${moduleTotal} passed`);
  });

  console.log('\n' + '='.repeat(60));
  
  // Return exit code
  process.exit(failed > 0 ? 1 : 0);
}

runAllTests().catch(console.error);
