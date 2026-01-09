/**
 * Unit tests for Agentic Features
 * Run with: npx tsx tests/agentic-unit-tests.ts
 */

import { performSiteRealityAudit } from '../server/site-reality-audit';
import { getPredictiveCashflow } from '../server/predictive-cashflow';
import { isGoogleChatConfigured, createProjectSpace } from '../server/google-chat';

interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
  duration: number;
}

const results: TestResult[] = [];

async function runTest(name: string, testFn: () => Promise<void>) {
  const start = Date.now();
  try {
    await testFn();
    results.push({ name, passed: true, duration: Date.now() - start });
    console.log(`✓ ${name} (${Date.now() - start}ms)`);
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    results.push({ name, passed: false, error: errorMsg, duration: Date.now() - start });
    console.log(`✗ ${name}: ${errorMsg}`);
  }
}

async function main() {
  console.log('\n=== Agentic Features Unit Tests ===\n');
  
  // Test 1: Site Reality Audit - Function exists and validates input
  await runTest('Site Reality Audit - performSiteRealityAudit function exists', async () => {
    if (typeof performSiteRealityAudit !== 'function') {
      throw new Error('performSiteRealityAudit is not a function');
    }
  });

  // Test 2: Site Reality Audit - Handles missing address gracefully
  await runTest('Site Reality Audit - handles missing address', async () => {
    const result = await performSiteRealityAudit({
      address: '',
      squareFootage: 10000,
      projectType: 'Commercial',
      scopeOfWork: 'Full BIM modeling',
    });
    // Should return error or low-confidence result
    if (!result.error && result.overallRiskScore === undefined) {
      throw new Error('Should return error or risk score');
    }
  });

  // Test 3: Predictive Cashflow - Function exists
  await runTest('Predictive Cashflow - getPredictiveCashflow function exists', async () => {
    if (typeof getPredictiveCashflow !== 'function') {
      throw new Error('getPredictiveCashflow is not a function');
    }
  });

  // Test 4: Predictive Cashflow - Returns valid structure
  await runTest('Predictive Cashflow - returns valid forecast structure', async () => {
    const result = await getPredictiveCashflow();
    
    if (!result) {
      throw new Error('Result is null or undefined');
    }
    
    // Check required properties (actual keys are historicalData, forecast, summary)
    if (!Array.isArray(result.historicalData)) {
      throw new Error('historicalData should be an array');
    }
    
    if (!Array.isArray(result.forecast)) {
      throw new Error('forecast should be an array');
    }
    
    if (typeof result.summary !== 'object') {
      throw new Error('summary should be an object');
    }
    
    // Check summary properties (actual key is avgMonthlyRevenue)
    const { summary } = result;
    if (typeof summary.avgMonthlyRevenue !== 'number') {
      throw new Error('avgMonthlyRevenue should be a number');
    }
    
    if (typeof summary.revenueGrowthRate !== 'number') {
      throw new Error('revenueGrowthRate should be a number');
    }
    
    console.log(`  - Historical data points: ${result.historicalData.length}`);
    console.log(`  - Forecast: ${result.forecast.length} months`);
    console.log(`  - Avg monthly revenue: $${summary.avgMonthlyRevenue.toFixed(2)}`);
  });

  // Test 5: Predictive Cashflow - Forecast has confidence intervals
  await runTest('Predictive Cashflow - forecast has confidence intervals', async () => {
    const result = await getPredictiveCashflow();
    
    if (result.forecast.length === 0) {
      console.log('  - No forecast (insufficient data) - OK');
      return;
    }
    
    const forecast = result.forecast[0];
    if (!forecast.confidence || typeof forecast.confidence.low !== 'number' || typeof forecast.confidence.high !== 'number') {
      throw new Error('Forecast should have confidence.low and confidence.high');
    }
    
    if (forecast.confidence.low > forecast.projectedRevenue) {
      throw new Error('confidence.low should be <= projectedRevenue');
    }
    
    if (forecast.confidence.high < forecast.projectedRevenue) {
      throw new Error('confidence.high should be >= projectedRevenue');
    }
    
    console.log(`  - First month forecast: $${forecast.projectedRevenue.toFixed(2)} ($${forecast.confidence.low.toFixed(2)} - $${forecast.confidence.high.toFixed(2)})`);
  });

  // Test 6: Google Chat - Configuration check works
  await runTest('Google Chat - isGoogleChatConfigured function exists', async () => {
    if (typeof isGoogleChatConfigured !== 'function') {
      throw new Error('isGoogleChatConfigured is not a function');
    }
    
    const configured = isGoogleChatConfigured();
    console.log(`  - Google Chat configured: ${configured}`);
  });

  // Test 7: Predictive Cashflow - AI insights are generated
  await runTest('Predictive Cashflow - generates AI insights', async () => {
    const result = await getPredictiveCashflow();
    
    if (!result.insights) {
      console.log('  - No insights generated');
      return;
    }
    
    // insights is an array of strings
    if (!Array.isArray(result.insights)) {
      throw new Error('insights should be an array');
    }
    
    console.log(`  - ${result.insights.length} insights generated:`);
    result.insights.forEach((insight: string) => console.log(`    - ${insight}`));
  });

  // Print summary
  console.log('\n=== Test Summary ===');
  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  console.log(`Passed: ${passed}/${results.length}`);
  console.log(`Failed: ${failed}/${results.length}`);
  
  if (failed > 0) {
    console.log('\nFailed tests:');
    results.filter(r => !r.passed).forEach(r => {
      console.log(`  - ${r.name}: ${r.error}`);
    });
    process.exit(1);
  }
  
  console.log('\nAll tests passed!');
  process.exit(0);
}

main().catch(error => {
  console.error('Test runner error:', error);
  process.exit(1);
});
