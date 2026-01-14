# Scan2Plan OS - QA Testing Strategy

## Executive Summary

This document outlines a comprehensive QA testing strategy for Scan2Plan OS, covering automated testing, manual testing, integration testing, and production monitoring.

---

## 1. Testing Pyramid

```
                 ┌─────────────────┐
                 │   E2E Tests     │  ← Few, slow, expensive
                 │   (Browser)     │
                 └───────┬─────────┘
               ┌─────────┴─────────┐
               │  Integration Tests │  ← Medium count
               │  (API + Database) │
               └─────────┬─────────┘
         ┌───────────────┴───────────────┐
         │         Unit Tests            │  ← Many, fast, cheap
         │  (Functions, Components, Logic)│
         └───────────────────────────────┘
```

---

## 2. Module Coverage Matrix

| Module | Unit Tests | Integration | E2E | Priority |
|--------|------------|-------------|-----|----------|
| **CPQ/Quote Builder** | ✅ 72 tests | 🔲 | 🔲 | HIGH |
| **Proposal Builder** | 🔲 | 🔲 | ✅ 7 tests | HIGH |
| **Deal Workspace** | 🔲 | 🔲 | ✅ 6 tests | HIGH |
| **Field Ops Mobile** | 🔲 | ✅ 5 tests | ✅ 25 tests | HIGH |
| **Sales Pipeline** | 🔲 | 🔲 | ✅ 14 tests | MEDIUM |
| **Production** | 🔲 | 🔲 | ✅ 6 tests | MEDIUM |
| **Analytics** | 🔲 | 🔲 | ✅ 5 tests | LOW |
| **Settings** | 🔲 | 🔲 | ✅ 7 tests | MEDIUM |
| **Authentication** | 🔲 | 🔲 | 🔲 | HIGH |
| **Financial** | 🔲 | 🔲 | ✅ 8 tests | MEDIUM |

---

## 3. Automated Unit Testing

### Current Coverage
- **CPQ Pricing Engine**: 72 tests passing
- **Run command**: `npx vitest run`

### Recommended Additions

#### 3.1 Proposal Builder Tests
```typescript
// client/src/features/proposals/proposals.test.ts
describe('Proposal Builder', () => {
  test('should substitute template variables correctly');
  test('should build sections from template group');
  test('should filter cover page from content sections');
  test('should save edited section content');
});
```

#### 3.2 Deal Workspace Tests
```typescript
// client/src/features/deals/deals.test.ts
describe('Deal Workspace', () => {
  test('should calculate quote badge total');
  test('should persist lead field changes');
  test('should toggle tabs correctly');
});
```

#### 3.3 API Route Tests
```typescript
// server/routes/__tests__/leads.test.ts
describe('Leads API', () => {
  test('GET /api/leads returns paginated results');
  test('POST /api/leads creates new lead');
  test('PATCH /api/leads/:id updates lead fields');
  test('DELETE /api/leads/:id soft-deletes lead');
});
```

---

## 4. Integration Testing

### 4.1 Database Integration Tests
Test that business logic correctly persists to and reads from the database.

```typescript
// server/__tests__/integration/quotes.test.ts
describe('Quote Persistence', () => {
  test('should save quote with all areas');
  test('should calculate and persist margin correctly');
  test('should associate quote with lead');
  test('should create version history on update');
});
```

### 4.2 API Integration Tests
```bash
# Using supertest with actual database
npm run test:integration
```

---

## 5. End-to-End Testing (Playwright)

### 5.1 Setup
```bash
npm install -D @playwright/test
npx playwright install
```

### 5.2 Critical User Flows

#### Flow 1: Create Quote
```typescript
// e2e/quote-creation.spec.ts
test('complete quote creation flow', async ({ page }) => {
  await page.goto('/sales');
  await page.click('[data-testid="pipeline-lead-card"]');
  await page.click('[data-testid="tab-quote"]');
  await page.fill('[data-testid="input-square-feet"]', '25000');
  await page.selectOption('[data-testid="select-building-type"]', 'office');
  await page.click('[data-testid="button-save-quote"]');
  await expect(page.locator('[data-testid="quote-total"]')).toContainText('$');
});
```

#### Flow 2: Create Proposal
```typescript
// e2e/proposal-creation.spec.ts
test('proposal builder edit and preview', async ({ page }) => {
  await page.goto('/deals/1/proposal');
  await page.click('[data-testid="section-menu"]');
  await page.click('[data-testid="menu-edit-section"]');
  await page.fill('[data-testid="section-content"]', 'Updated content');
  await page.click('[data-testid="button-save-section"]');
  await expect(page.locator('.prose')).toContainText('Updated content');
});
```

#### Flow 3: Full Deal Lifecycle
```typescript
// e2e/deal-lifecycle.spec.ts
test('lead → quote → proposal → won', async ({ page }) => {
  // Create lead
  await page.goto('/sales');
  await page.click('[data-testid="button-new-lead"]');
  await page.fill('[data-testid="input-client-name"]', 'Test Client');
  await page.click('[data-testid="button-save-lead"]');
  
  // Add quote
  await page.click('[data-testid="tab-quote"]');
  // ... fill quote details
  
  // Generate proposal
  await page.click('[data-testid="tab-proposal"]');
  await page.click('[data-testid="button-open-proposal-builder"]');
  // ... customize and send
  
  // Mark as won
  await page.click('[data-testid="button-mark-won"]');
  await expect(page.locator('[data-testid="lead-status"]')).toContainText('Won');
});
```

---

## 6. Manual QA Checklists

### 6.1 Pre-Release Checklist

#### Authentication
- [ ] Login with valid credentials
- [ ] Login with invalid credentials shows error
- [ ] Logout clears session
- [ ] Protected routes redirect to login

#### Sales Pipeline
- [ ] Leads display in correct stages
- [ ] Drag-and-drop updates stage
- [ ] Lead details load correctly
- [ ] Search/filter works

#### Quote Builder
- [ ] All building types available
- [ ] Square footage calculates pricing
- [ ] LOD multipliers apply correctly
- [ ] Payment terms adjust total
- [ ] Risk premiums apply to Architecture only
- [ ] Margin indicator shows correct status

#### Proposal Builder
- [ ] Template groups load
- [ ] Sections display in order
- [ ] Preview renders markdown
- [ ] Edit section saves changes
- [ ] PDF download works
- [ ] Send proposal works

#### Production
- [ ] Projects list loads
- [ ] Mission brief generates
- [ ] Status updates persist

---

## 7. Regression Testing

### 7.1 Golden Datasets
Maintain a set of "golden" test cases with known expected outputs:

| Test Case | Input | Expected Output | Last Verified |
|-----------|-------|-----------------|---------------|
| GQ-001 | 25k Office, LOD 300, Arch | $X,XXX | 2026-01-13 |
| GQ-002 | 60k Warehouse, Brooklyn | $XX,XXX | 2026-01-13 |
| GQ-003 | 5 Acre Natural Landscape | $X,XXX | 2026-01-13 |

### 7.2 Run Before Each Release
```bash
# Run all automated tests
npm run test

# Run E2E tests
npm run test:e2e

# Run golden quote verification
npm run test:golden
```

---

## 8. Performance Testing

### 8.1 Load Testing
```javascript
// Using k6 or artillery
export default function() {
  http.get('https://api.scan2plan.io/api/leads');
  http.get('https://api.scan2plan.io/api/cpq-quotes');
}
```

### 8.2 Performance Budgets
| Metric | Target | Alert |
|--------|--------|-------|
| Page Load (LCP) | < 2.5s | > 4s |
| Time to Interactive | < 3s | > 5s |
| API Response | < 200ms | > 1s |
| Quote Calculation | < 50ms | > 200ms |

---

## 9. Test Environment Strategy

| Environment | Purpose | Data | Testing |
|-------------|---------|------|---------|
| **Local** | Development | Seed data | Unit tests |
| **Preview** | PR review | Cloned prod | Integration |
| **Staging** | Pre-release | Sanitized prod | E2E, Manual |
| **Production** | Live | Real data | Monitoring only |

---

## 10. CI/CD Integration

### GitHub Actions Workflow
```yaml
# .github/workflows/test.yml
name: Test Suite
on: [push, pull_request]

jobs:
  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci
      - run: npm run test
      
  e2e-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci
      - run: npx playwright install
      - run: npm run test:e2e
```

---

## 11. Bug Tracking & Reporting

### Bug Report Template
```markdown
## Bug Description
[Clear description]

## Steps to Reproduce
1. Go to '...'
2. Click on '...'
3. See error

## Expected Behavior
[What should happen]

## Actual Behavior
[What actually happens]

## Screenshots
[If applicable]

## Environment
- Browser: Chrome/Safari/Firefox
- Device: Desktop/Mobile
- User Role: CEO/Sales/Production
```

---

## 12. Test Execution Schedule

| Frequency | Test Type | Owner | Duration |
|-----------|-----------|-------|----------|
| On every commit | Unit tests | CI | ~2 min |
| On every PR | Integration | CI | ~5 min |
| Daily | E2E smoke test | CI | ~10 min |
| Before release | Full regression | QA | ~2 hours |
| Weekly | Performance | DevOps | ~30 min |

---

## 13. Next Steps (Recommended Order)

1. **Week 1**: Add Playwright E2E for critical flows (auth, quote, proposal)
2. **Week 2**: Add API integration tests for major endpoints
3. **Week 3**: Set up CI/CD pipeline with GitHub Actions
4. **Week 4**: Add Performance monitoring (Sentry, Datadog)
5. **Ongoing**: Expand unit test coverage to 80%+

---

## 14. Tools & Dependencies

| Tool | Purpose | Status |
|------|---------|--------|
| **Vitest** | Unit testing | ✅ Installed |
| **Playwright** | E2E testing | 🔲 To install |
| **Supertest** | API testing | 🔲 To install |
| **MSW** | API mocking | 🔲 To install |
| **Testing Library** | React testing | 🔲 To install |
| **k6/Artillery** | Load testing | 🔲 Optional |

---

## 15. Field Ops Mobile Test Coverage

### Test File: `tests/field-ops-mobile.spec.ts`

| Category | Tests | Description |
|----------|-------|-------------|
| Mobile UI | 10 | Layout, tabs, Quick Actions |
| Time Tracking | 2 | GPS clock-in, geolocation mock |
| Voice Notes | 2 | Recording UI, textarea |
| API Endpoints | 5 | /transcribe, /mission-logs, /field-support |
| Desktop Compat | 2 | Large viewport layout |
| Responsive | 4 | iPhone SE, 12 Pro, Pixel 5, Tablet |
| Error Handling | 2 | Rapid navigation, No Mission state |
| Performance | 2 | Load time, tab switch latency |

**Run with:** `npx playwright test tests/field-ops-mobile.spec.ts`
