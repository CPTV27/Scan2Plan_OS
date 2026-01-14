# CPQ Pricing Validation Methodology

## Overview

This document outlines a comprehensive testing strategy for validating Scan2Plan quote builder pricing accuracy.

---

## 1. Automated Unit Testing (Existing)

**Location:** `client/src/features/cpq/pricing.test.ts`

**Run Command:**
```bash
npx vitest run client/src/features/cpq/pricing.test.ts
```

**Coverage (72 tests):**
- ✅ Area tier calculations (9 tiers: 0-5k through 100k+)
- ✅ Brooklyn travel tiers (Tier A/B/C base fees + mileage)
- ✅ Landscape pricing (built vs natural, 5 acre tiers)
- ✅ Risk premiums (Architecture-only stacking)
- ✅ LOD multipliers (1.0x → 1.5x)
- ✅ Scope discounts (interior/exterior/roof)
- ✅ Payment term adjustments (-5% prepaid, +3% Net60)
- ✅ Additional elevations tiered pricing
- ✅ Minimum project charge ($3,000)
- ✅ Margin gate (40% floor)

**When to Run:** Before every release, after any pricing logic change.

---

## 2. Golden Quote Regression Testing (NEW)

### Purpose
Create known-correct "golden quotes" with pre-calculated expected values. Any pricing changes that alter these outputs will fail the test.

### Implementation

Create `client/src/features/cpq/goldenQuotes.test.ts`:

```typescript
import { calculatePricing } from './pricing';

describe('Golden Quote Regression', () => {
  test('GQ-001: Standard 25k Office', () => {
    const result = calculatePricing(
      [{ 
        id: 'a1', name: 'Main', buildingType: '1',
        squareFeet: '25000', lod: '300', scope: 'full',
        disciplines: ['architecture']
      }],
      { dispatchLocation: 'woodstock', distance: 30 },
      { includeRisks: [] }
    );
    expect(result.totalClientPrice).toBe(EXPECTED_25K_OFFICE_PRICE);
    expect(result.profitMargin).toBeGreaterThanOrEqual(0.40);
  });
  
  // Add 5-10 golden quotes covering edge cases
});
```

### Golden Quote Matrix

| ID | Scenario | Sqft | LOD | Scope | Disciplines | Dispatch | Expected Total | Expected Margin |
|----|----------|------|-----|-------|-------------|----------|----------------|-----------------|
| GQ-001 | Standard Office | 25,000 | 300 | Full | Arch | Woodstock | $X,XXX | ≥40% |
| GQ-002 | Tier A Warehouse | 60,000 | 200 | Full | Arch+Struct | Brooklyn | $XX,XXX | ≥40% |
| GQ-003 | Landscape Natural | 5 acres | 300 | - | Site | - | $X,XXX | ≥40% |
| GQ-004 | Multi-Risk Historic | 15,000 | 350 | Full | Arch+MEP | Woodstock | $XX,XXX | ≥40% |
| GQ-005 | Minimum Charge | 1,000 | 200 | Interior | Arch | Brooklyn | $3,000 | ≥40% |

---

## 3. Manual Validation Protocol

### Step 1: Fresh Quote Verification
1. Create a new quote from scratch
2. Enter known test values (use Test 1.1 from checklist)
3. Screenshot the pricing breakdown
4. Manually calculate expected values
5. Compare and document any discrepancies

### Step 2: Pricing Breakdown Audit
For each line item, verify:
- [ ] Label is descriptive and correct
- [ ] Value matches hand calculation
- [ ] Discounts show as negative (red)
- [ ] Subtotals accumulate correctly
- [ ] Margin percentage accurate

### Step 3: Edge Case Testing
Test these specific boundaries:
- [ ] 4,999 sqft → 5,000 sqft (tier boundary)
- [ ] 49,999 sqft → 50,000 sqft (Tier A threshold)
- [ ] 19 miles → 20 miles Brooklyn (mileage start)
- [ ] 4.99 acres → 5.0 acres (landscape tier 2)
- [ ] Price exactly at $3,000 minimum

---

## 4. Browser Console Verification

Add temporary logging for debugging:

```typescript
// In calculatePricing(), add at the end:
console.log('Pricing Debug:', {
  inputs: { areas, travel, options },
  outputs: { totalClientPrice, totalUpteamCost, profitMargin },
  lineItems: items.map(i => `${i.label}: $${i.value}`)
});
```

View in DevTools Console during testing.

---

## 5. Snapshot Testing for Pricing Structures

Capture the full pricing result structure to detect unexpected changes:

```typescript
test('Pricing structure snapshot', () => {
  const result = calculatePricing([testArea], testTravel, {});
  expect(result).toMatchSnapshot();
});
```

Update snapshots intentionally when pricing changes are expected.

---

## 6. Database Cross-Reference

### Saved Quote Verification
1. Create and save a quote
2. Query database: `SELECT * FROM cpq_quotes WHERE id = X`
3. Verify `totalPrice`, `costBreakdown`, `profitMargin` match UI
4. Reload quote in UI and confirm values persist

### Historical Quote Audit
1. Select 5 random quotes from past 30 days
2. Recalculate using current pricing engine
3. Document any delta between stored and recalculated values
4. Investigate any discrepancy > $10

---

## 7. Comparative Testing

### A/B Environment Testing
1. Run pricing calculation on staging
2. Run same calculation on production
3. Compare results - should be identical if on same version

### Before/After Release Testing
1. Before deploying pricing changes, save 10 test quote results
2. After deployment, re-run same test cases
3. Document all changes and confirm they are intentional

---

## 8. Revenue Impact Analysis

Before releasing pricing changes, calculate:

```
Impact = (New Price - Old Price) / Old Price × 100

For each golden quote:
- GQ-001: Impact = X%
- GQ-002: Impact = X%
...

Average Impact: X%
Estimated monthly revenue change: $X,XXX
```

Require CEO approval for changes >5% average impact.

---

## 9. Test Execution Schedule

| Frequency | Test Type | Responsible |
|-----------|-----------|-------------|
| Every PR | Unit tests (CI) | Automated |
| Weekly | Golden quote regression | Dev team |
| Before release | Full manual checklist | QA |
| Monthly | Historical quote audit | Finance |
| Quarterly | Full pricing review | CEO + Dev |

---

## 10. Issue Tracking

When a pricing bug is found:

1. **Document the bug**
   - Input values
   - Expected output
   - Actual output
   - Screenshot

2. **Create a regression test** for the specific case

3. **Fix and verify** the fix passes all tests

4. **Update golden quotes** if expected values change

---

## Checklist Before Price Change Release

- [ ] All 72 unit tests pass
- [ ] All golden quote tests pass
- [ ] Manual checklist sections 1-10 verified
- [ ] Revenue impact calculated and approved
- [ ] Staging tested with real client data
- [ ] Rollback plan documented
