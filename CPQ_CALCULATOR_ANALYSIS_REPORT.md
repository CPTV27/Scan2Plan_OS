# CPQ Calculator Functionality Analysis Report
**Date:** January 14, 2026  
**Scope:** Analysis of CPQ pricing calculation logic, margin floor enforcement, travel cost logic, and pricing matrix queries  
**Status:** ANALYSIS ONLY - NO CODE CHANGES MADE

---

## Executive Summary

The CPQ (Configure-Price-Quote) calculator has a **critical architectural flaw** where all pricing calculations occur client-side without corresponding server-side validation. This creates security vulnerabilities and prevents proper audit trails. Additionally, several logic issues were identified that could affect margin enforcement, travel cost calculations, and landscape pricing.

**Critical Issues Found: 3**  
**High Priority Issues Found: 5**  
**Medium Priority Issues Found: 4**  
**Total Issues Found: 12**

---

## 1. PRICING CALCULATION LOGIC ANALYSIS

### Location
- **Client-side:** `client/src/features/cpq/pricing.ts` (1,223 lines)
- **Server-side:** `server/routes/cpq.ts` (912 lines)
- **Validation:** `server/validators/cpqValidator.ts` (242 lines)

### Architecture Overview
```
Client Flow:
  calculatePricing() 
    → Area calculations (BASE_RATES, LOD_MULTIPLIERS, SCOPE_MULTIPLIERS)
    → Travel cost calculation
    → Risk premiums (architecture only)
    → Payment term adjustments
    → Margin target adjustment
    → Submit to server

Server Flow:
  POST /api/cpq-quotes
    → normalizeQuoteData()
    → validateQuote() 
    → Store quote (no recalculation)
```

### Issue 1: ⚠️ CRITICAL - No Server-Side Pricing Calculation

**Severity:** CRITICAL  
**File:** `server/routes/cpq.ts` (lines 305-370, 395-436)

**Problem:**
- All pricing calculations happen client-side in `pricing.ts`
- Server only validates the final submitted numbers
- There is **NO server-side pricing engine** to verify calculations
- A malicious client could submit ANY price, and the server would accept it if:
  - Margin >= 40% (or has CEO override)
  - Dispatch location is valid
  - Areas array exists

**Impact:**
- Client-submitted prices are trusted without verification
- No audit trail of how prices were calculated
- Impossible to rebuild or verify quote accuracy from server logs
- Price integrity check in validator only works if `marginTarget` is provided (optional)

**Example Attack:**
```javascript
// Malicious client could submit:
POST /api/leads/123/cpq-quotes
{
  areas: [{buildingType: "1", squareFeet: "10000"}],
  totalClientPrice: 50000,    // Way too high - no one validates this
  totalUpteamCost: 2000,      // Extremely low - violates all pricing rules
  dispatchLocation: "WOODSTOCK"
}
// Server accepts if margin = (50000-2000)/50000 = 96% >= 40%
```

**Recommendation:**
- Implement server-side pricing engine that mirrors client logic
- Validate that submitted client prices match calculated prices (within tolerance)
- Add re-calculation endpoint for auditing purposes

---

### Issue 2: ⚠️ HIGH - Margin Floor Enforcement Has Bypass Vulnerability

**Severity:** HIGH  
**File:** `server/validators/cpqValidator.ts` (lines 84-98)  
**File:** `server/routes/cpq.ts` (lines 184-215)

**Problem:**
- CEO override allows bypassing the 40% margin floor
- But there is **NO role validation** that the person requesting the override is actually a CEO
- Anyone can pass `overrideApproved: true` and `overrideApprovedBy: "CEO"` without authentication

**Code Analysis:**
```typescript
// cpqValidator.ts line 84-90
if (grossMarginPercent < (MARGIN_FLOOR * 100) - EPSILON) {
  if (!quote.overrideApproved) {
    errors.push({
      code: "MARGIN_BELOW_FLOOR",
      message: `Gross margin ${grossMarginPercent.toFixed(1)}% is below the ${MARGIN_FLOOR * 100}% governance gate. CEO override required.`,
    });
    integrityStatus = "blocked";
  } else {
    // ACCEPTS OVERRIDE WITHOUT VERIFICATION
    warnings.push({
      code: "MARGIN_OVERRIDE_USED",
      message: `Quote saved with ${grossMarginPercent.toFixed(1)}% margin (below floor) via CEO override.`,
      details: { approvedBy: quote.overrideApprovedBy },
    });
    integrityStatus = "warning";
  }
}
```

**Issue Details:**
- The validator accepts `overrideApproved` as a boolean from the request
- No check that the authenticated user has `requireRole("ceo")`
- The override fields are stored but not audited
- Endpoint `PATCH /api/cpq-quotes/:id` accepts override without role verification (line 395)

**Test Coverage:**
- Test on line 134-147 of `cpqValidator.test.ts` shows override works, but doesn't test role validation

**Impact:**
- Sales reps could approve their own margin overrides
- No audit trail of who actually approved sub-40% margins
- Violates governance gate that requires CEO approval

**Recommendation:**
- Add middleware to extract `user` from `req` and verify `requireRole("ceo")`
- Only accept `overrideApprovedBy` from authenticated user's email/ID
- Timestamp overrides with exact approval time
- Create audit log of all overrides

---

### Issue 3: ⚠️ MEDIUM - Price Integrity Check is Optional

**Severity:** MEDIUM  
**File:** `server/validators/cpqValidator.ts` (lines 107-118)

**Problem:**
- Price integrity check only runs if `marginTarget` is provided
- If client submits quote without `marginTarget`, the check is skipped
- This is documented in the validator (line 195-206 of tests) but is a weakness

**Code:**
```typescript
// cpqValidator.ts line 107-118
if (quote.marginTarget) {
  const expectedClientPrice = quote.totalUpteamCost / (1 - quote.marginTarget);
  const variance = Math.abs(quote.totalClientPrice - expectedClientPrice) / expectedClientPrice;
  
  if (variance > PRICE_VARIANCE_TOLERANCE) {
    errors.push({
      code: "PRICE_INTEGRITY_FAILED",
      message: `Client price $${quote.totalClientPrice.toFixed(2)} doesn't match expected $${expectedClientPrice.toFixed(2)}...`,
    });
    integrityStatus = "blocked";
  }
}
```

**Problem:**
- Requires client to submit `marginTarget` for this check to run
- Client can skip the check by omitting `marginTarget`
- Makes pricing integrity optional, not mandatory

**Impact:**
- Prices without explicit margin targets bypass calculation verification
- Most quotes probably don't include margin target

**Recommendation:**
- Make price integrity check mandatory based on area calculations
- Server should calculate expected price from areas and compare

---

## 2. MARGIN FLOOR (40%) ENFORCEMENT ANALYSIS

### Margin Floor Definition
- **Location:** `shared/businessGoals.ts` line 14
- **Value:** 40% (0.40)
- **Guardrail:** 45% (0.45)
- **Tier A Threshold:** 50,000 sqft

```typescript
export const FY26_GOALS = {
  MARGIN_FLOOR: 0.40,              // 40% GM Gate - blocks proposal if below
  MARGIN_STRETCH: 0.45,            // 45% GM Target - ideal margin
  TIER_A_FLOOR: 50000,             // 50k sqft defines "Tier A" projects
}
```

### Margin Calculation Formula
**Location:** `cpqValidator.ts` line 79-80
```typescript
const grossMargin = quote.totalClientPrice - quote.totalUpteamCost;
const grossMarginPercent = (grossMargin / quote.totalClientPrice) * 100;
```

**Formula Check:** ✅ CORRECT
- Formula: `(clientPrice - cost) / clientPrice * 100`
- Example: $(10000 - 6000) / 10000 * 100 = 40%
- At exactly 40%: borderline passes (with epsilon tolerance)

### Issue 4: ⚠️ MEDIUM - Margin Floor Calculation Uses Epsilon Tolerance

**Severity:** MEDIUM  
**File:** `server/validators/cpqValidator.ts` (lines 82-84)

**Problem:**
- Epsilon tolerance for margin floor could cause inconsistency
- Using `EPSILON = 0.0001` (line 82)

**Code:**
```typescript
const EPSILON = 0.0001;

if (grossMarginPercent < (MARGIN_FLOOR * 100) - EPSILON) {
  // BLOCKED
} else {
  // PASS
}
```

**Issue Details:**
- At 40% exactly: `40.0 < 40.0 - 0.0001` → `40.0 < 39.9999` → FALSE (PASSES)
- This epsilon tolerance allows quotes slightly below 40% to pass (up to 39.9999%)
- Why epsilon exists: floating point precision
- But inconsistent with test expectations

**Test Coverage:**
- Test line 109-119: expects quote at exactly 40% margin to pass ✅
- But doesn't test 39.99% or 40.0001%

**Impact:**
- Minor: allows quotes 0.01% below floor due to floating point tolerance
- Consistent with floating point best practices
- Not a major issue but worth documenting

**Recommendation:**
- Document why epsilon is 0.0001 (floating point tolerance)
- Consider using larger epsilon (e.g., 0.01) to catch edge cases
- Or use floor division instead of floating point

---

### Issue 5: ⚠️ HIGH - Client-Side Margin Calculation Differs from Server

**Severity:** HIGH  
**File:** `client/src/features/cpq/pricing.ts` (lines 1076-1097)

**Problem:**
- Client calculates margin differently than server validator
- Client: uses `pricing.profitMargin` (absolute value) and `calculateMarginPercent()`
- Server: uses `grossMarginPercent` from submitted values

**Client Code (lines 1076-1088):**
```typescript
export function calculateMarginPercent(pricing: PricingResult): number {
  if (pricing.totalClientPrice <= 0) return 0;
  return ((pricing.totalClientPrice - pricing.totalUpteamCost) / pricing.totalClientPrice) * 100;
}

export function passesMarginGate(pricing: PricingResult): boolean {
  const marginPercent = calculateMarginPercent(pricing);
  return marginPercent >= (FY26_GOALS.MARGIN_FLOOR * 100);
}
```

**Server Code (lines 79-84 of cpqValidator.ts):**
```typescript
const grossMargin = quote.totalClientPrice - quote.totalUpteamCost;
const grossMarginPercent = (grossMargin / quote.totalClientPrice) * 100;

if (grossMarginPercent < (MARGIN_FLOOR * 100) - EPSILON) {
```

**Analysis:** Both formulas are identical, but:
- Client uses `passesMarginGate()` for UI feedback
- Server uses validator for final acceptance
- If client-side calculation shows 41% margin, but server receives values that calculate to 39%, there's a discrepancy

**Impact:**
- Users see different margin percentages in UI vs server validation
- Could cause confusion when override is needed

---

## 3. TRAVEL COST LOGIC ANALYSIS

### Travel Cost Implementation
**Location:** `client/src/features/cpq/pricing.ts` (lines 544-579)

### Travel Tier Configuration
```typescript
const BROOKLYN_TRAVEL_TIERS = {
  tierA: { minSqft: 50000, baseFee: 0 },      // >= 50,000 sqft: No base fee
  tierB: { minSqft: 10000, baseFee: 300 },    // 10,000 - 49,999 sqft: $300 base
  tierC: { minSqft: 0, baseFee: 150 },        // < 10,000 sqft: $150 base
};

const OTHER_DISPATCH_BASE_FEE = 0;
const OTHER_DISPATCH_PER_MILE_RATE = 3;

const BROOKLYN_MILEAGE_THRESHOLD = 20;
const BROOKLYN_PER_MILE_RATE = 4;
```

### Function: `calculateTravelCost()`

**Code (lines 547-579):**
```typescript
export function calculateTravelCost(
  distance: number,
  dispatchLocation: string,
  projectTotalSqft: number,
  customCost?: number
): number {
  if (customCost !== undefined && customCost > 0) {
    return customCost;
  }

  // Check if Brooklyn dispatch (case-insensitive match)
  const isBrooklyn = dispatchLocation.toLowerCase().includes("brooklyn");

  if (isBrooklyn) {
    let baseFee = BROOKLYN_TRAVEL_TIERS.tierC.baseFee; // Default: < 10k sqft

    if (projectTotalSqft >= BROOKLYN_TRAVEL_TIERS.tierA.minSqft) {
      baseFee = BROOKLYN_TRAVEL_TIERS.tierA.baseFee; // >= 50k: $0
    } else if (projectTotalSqft >= BROOKLYN_TRAVEL_TIERS.tierB.minSqft) {
      baseFee = BROOKLYN_TRAVEL_TIERS.tierB.baseFee; // 10k-49,999: $300
    }

    const additionalMiles = Math.max(0, distance - BROOKLYN_MILEAGE_THRESHOLD);
    const mileageCost = additionalMiles * BROOKLYN_PER_MILE_RATE;

    return baseFee + mileageCost;
  }

  return OTHER_DISPATCH_BASE_FEE + (distance * OTHER_DISPATCH_PER_MILE_RATE);
}
```

### Issue 6: ⚠️ HIGH - Brooklyn Dispatch Detection Uses String Include

**Severity:** HIGH  
**File:** `client/src/features/cpq/pricing.ts` (line 558)

**Problem:**
- Uses `.includes("brooklyn")` which could match unintended strings
- Valid dispatch locations: `["TROY", "WOODSTOCK", "BROOKLYN", "FLY_OUT"]`
- Validator normalizes to uppercase (line 49 of validator)
- But pricing.ts receives the string after normalization

**Code:**
```typescript
const isBrooklyn = dispatchLocation.toLowerCase().includes("brooklyn");
```

**Edge Cases:**
- "BROOKLYN_OFFICE" → matches brooklyn (WRONG)
- "NEW_BROOKLYN" → matches brooklyn (WRONG)
- "BROOKLYN" → matches brooklyn (CORRECT)

**Example Attack:**
```javascript
// If someone submits: "BROOKLYN_STAGING"
const isBrooklyn = "brooklyn_staging".includes("brooklyn"); // TRUE
// Would apply Brooklyn pricing even though it's invalid location
```

**Impact:**
- Travel cost could be calculated for invalid dispatch locations
- Server validator will reject the quote for invalid dispatch location
- But client pricing already calculated it (UI shows wrong cost)
- Creates discrepancy between client UI and server validation

**Test Coverage:**
- Validator tests dispatch location validation (line 209-237 of test file)
- But no tests validate the string matching logic in calculateTravelCost

**Recommendation:**
- Change from `.includes()` to exact match: `dispatchLocation === "BROOKLYN"`
- Or use a set lookup: `["BROOKLYN"].includes(dispatchLocation)`

---

### Issue 7: ⚠️ MEDIUM - Travel Upteam Cost Calculation is Inconsistent

**Severity:** MEDIUM  
**File:** `client/src/features/cpq/pricing.ts` (lines 877-883)

**Problem:**
- Travel costs use different upteam multiplier than other services
- Most services use: `UPTEAM_MULTIPLIER = 0.65` (line 360)
- Travel uses: `0.8` multiplier (line 880)

**Code (lines 877-883):**
```typescript
items.push({
  label: travelLabel,
  value: travelCost,
  upteamCost: Math.round(travelCost * 0.8 * 100) / 100, // Travel has higher margin
});
travelTotal = travelCost;
upteamCost += travelCost * 0.8;
```

**Analysis:**
- Travel client price: $100 (example)
- Travel upteam cost: $80 (0.8 * 100)
- Travel margin: 20% (($100 - $80) / $100)
- Other services: 35% margin (($100 - $65) / $100)

**Why This Matters:**
- Comments say "Travel has higher margin" (line 880)
- But 20% margin < 35% margin from other services
- Actually has LOWER margin, not higher
- Comment is incorrect or logic is wrong

**Test Coverage:**
- No tests verify the upteam cost multiplier for travel
- No tests verify margin calculation includes travel correctly

**Recommendation:**
- Clarify if travel should have different margin (20% vs 35%)
- Update comment to match logic
- Add tests for travel cost margin calculation

---

### Issue 8: ⚠️ MEDIUM - Scanning Cost Not Visible to Client

**Severity:** MEDIUM  
**File:** `client/src/features/cpq/pricing.ts` (lines 887-908)

**Problem:**
- Scanning estimate calculated and added to upteam costs
- But NOT added to client-facing line items
- Client price doesn't include scanning costs

**Code (lines 887-908):**
```typescript
// Calculate scanning estimate (for non-Tier A projects only)
const scanDays = Math.max(1, Math.ceil(projectTotalSqft / SCANNING_SQFT_PER_DAY));
const baseScanningCost = scanDays * SCANNING_DAILY_RATE;
const hotelPerDiemDays = Math.max(0, scanDays - 1);
const hotelPerDiemCost = hotelPerDiemDays * HOTEL_PER_DIEM_DAILY;
const totalScanningCost = baseScanningCost + hotelPerDiemCost;

// Add scanning cost to internal (upteam) costs - this is our cost, not client-facing
// Scanning is 100% internal cost (no markup in this line)
upteamCost += totalScanningCost;
```

**Constants:**
```typescript
const SCANNING_DAILY_RATE = 600;        // $600/day for scanning
const SCANNING_SQFT_PER_DAY = 10000;    // 1 day per 10,000 sqft
const HOTEL_PER_DIEM_DAILY = 300;       // $300/day for hotel + per diem
```

**Example:**
- 20,000 sqft project
- Scan days: 2 days
- Scanning cost: 2 * $600 = $1,200
- Hotel per diem: 1 * $300 = $300
- Total internal cost: $1,500
- **Client has NO idea this cost exists** (not in line items)

**Impact:**
- Quote appears profitable but includes hidden $1,500+ internal cost
- Margin calculation includes scanning but client doesn't see why
- No transparency about cost structure
- Tier A projects manually specify scanning cost, Tier B projects auto-calculate it

**Recommendation:**
- Show scanning as line item in quote (optional visibility flag?)
- Or ensure client cost includes labor estimate
- Document that scanning is always internal cost

---

## 4. PRICING MATRIX QUERIES ANALYSIS

### Current Implementation: ❌ NO DATABASE QUERIES

**Finding:** Pricing is **hardcoded in constants**, not stored in database or loaded from CSVs.

**Location of Hardcoded Pricing:**
- `client/src/features/cpq/pricing.ts` (lines 167-350)

**Hardcoded Constants:**
```typescript
// BASE RATES (Line 267-281)
const BASE_RATES: Record<string, Record<string, number>> = {
  "1": { architecture: 0.25, mepf: 0.30, structure: 0.20, site: 0.15 },
  "2": { architecture: 0.20, mepf: 0.25, structure: 0.18, site: 0.12 },
  // ... 11 more building types
};

// LOD MULTIPLIERS (Line 284-291)
const LOD_MULTIPLIERS: Record<string, number> = {
  "100": 0.7,
  "200": 1.0,
  "250": 1.15,
  "300": 1.3,
  "350": 1.5,
  "400": 1.8,
};

// SCOPE MULTIPLIERS (Line 295-301)
const SCOPE_MULTIPLIERS: Record<string, { interior: number; exterior: number }> = {
  full: { interior: 0.65, exterior: 0.35 },
  interior: { interior: 0.65, exterior: 0 },
  exterior: { interior: 0, exterior: 0.35 },
  roof: { interior: 0, exterior: 0.35 },
  facade: { interior: 0, exterior: 0.25 },
};

// AREA TIERS (Line 304-314) 
const AREA_TIERS = [
  { min: 0, max: 5000, tier: "0-5k", multiplier: 1.0 },
  { min: 5000, max: 10000, tier: "5k-10k", multiplier: 0.95 },
  // ... more tiers
];

// LANDSCAPE RATES (Line 226-237)
export const LANDSCAPE_RATES: Record<string, Record<string, { tier1: number; ... }>> = {
  built: {
    "200": { tier1: 175, tier2: 125, tier3: 75, tier4: 50, tier5: 40 },
    // ...
  },
};
```

### Issue 9: ⚠️ CRITICAL - No Database Pricing Matrix

**Severity:** CRITICAL  
**Location:** `client/src/features/cpq/pricing.ts`

**Problem:**
- Pricing matrix CSVs exist in repo root but are NEVER loaded or used:
  ```
  - Pricing Matrix 2025 Last Edited 03.07 - BS3D PRICING SCAN ONLY.csv
  - Pricing Matrix 2025 Last Edited 03.07 - S2P PRICING SCANNING AND MISC.csv
  - Pricing Matrix 2025 Last Edited 03.07 - SCAN 2 PLAN PRICES - Mar 25.csv
  - Pricing Matrix 2025 Last Edited 03.07 - UppT PRICING LANDSCAPE.csv
  - etc. (8 total)
  ```
- All pricing is hardcoded constants in JavaScript
- No database queries for pricing
- No pricing configuration API endpoints

**Implications:**
1. **Can't Update Pricing Without Deploying Code**
   - Want to change architecture rate from $0.25 to $0.30?
   - Must modify code, commit, redeploy
   - Takes 5-10 minutes vs 30 seconds in a database

2. **No Pricing Audit Trail**
   - Can't track when prices changed
   - Can't revert to previous pricing
   - No version history

3. **CSV Files Are Out of Sync**
   - CSVs in repo haven't been loaded or validated
   - No way to know if hardcoded values match the CSV
   - Could have manual updates in one place but not the other

4. **No Per-Client Custom Pricing**
   - Can't implement client-specific rates
   - Can't do volume discounts dynamically
   - All customers get exact same rates

**Example Discrepancy Check:**
- CSV file: "Pricing Matrix 2025 Last Edited 03.07 - SCAN 2 PLAN PRICES - Mar 25.csv"
- Hardcoded BASE_RATES for building type "4" (Commercial/Office): 
  - Architecture: 0.25/sqft
  - MEPF: 0.22/sqft
- Is this in sync with the CSV? **UNKNOWN** - no mechanism to verify

**Recommendation:**
- Load pricing from database, not hardcoded constants
- Create admin UI for pricing configuration
- Implement pricing version history
- Validate CSV imports
- Add pricing API endpoint
- Support per-client custom rates

---

### Issue 10: ⚠️ MEDIUM - Landscape Rates Not Validated

**Severity:** MEDIUM  
**File:** `client/src/features/cpq/pricing.ts` (lines 212-237)

**Problem:**
- Landscape pricing rates defined client-side
- No validation that submitted landscape rates match expected rates
- Server doesn't validate landscape cost is correct

**Landscape Rate Tiers:**
```typescript
export const LANDSCAPE_RATES: Record<string, Record<string, ...>> = {
  built: {
    "200": { tier1: 175, tier2: 125, tier3: 75, tier4: 50, tier5: 40 },
    "300": { tier1: 200, tier2: 150, tier3: 100, tier4: 75, tier5: 55 },
    "350": { tier1: 250, tier2: 200, tier3: 150, tier4: 100, tier5: 65 },
  },
  natural: {
    "200": { tier1: 125, tier2: 75, tier3: 50, tier4: 40, tier5: 35 },
    "300": { tier1: 150, tier2: 100, tier3: 75, tier4: 55, tier5: 50 },
    "350": { tier1: 200, tier2: 150, tier3: 100, tier4: 65, tier5: 60 },
  },
};

export const LANDSCAPE_MINIMUM = 300;
```

**Function (lines 244-263):**
```typescript
export function calculateLandscapePrice(
  type: "built" | "natural",
  acres: number,
  lod: "200" | "300" | "350"
): number {
  if (acres <= 0) return 0;

  const rates = LANDSCAPE_RATES[type]?.[lod];
  if (!rates) return 0;

  let rate: number;
  if (acres <= 5) rate = rates.tier1;
  else if (acres <= 20) rate = rates.tier2;
  else if (acres <= 50) rate = rates.tier3;
  else if (acres <= 100) rate = rates.tier4;
  else rate = rates.tier5;

  const total = rate * acres;
  return Math.max(total, LANDSCAPE_MINIMUM);
}
```

**Issue Details:**
- Minimum landscape price: $300
- But validation doesn't enforce this minimum
- Server doesn't validate landscape calculation
- If client submits landscape area with $100 total cost, it's accepted

**Impact:**
- Landscape quotes could be dramatically underpriced
- No audit of landscape pricing accuracy
- Minimum is enforced in calculation but not validated

**Recommendation:**
- Add landscape pricing validation to cpqValidator
- Validate submitted landscape cost >= calculated cost (within tolerance)
- Implement server-side landscape pricing calculation

---

## 5. ADDITIONAL FINDINGS

### Issue 11: ⚠️ MEDIUM - Discipline LoD Configuration Not Validated

**Severity:** MEDIUM  
**File:** `client/src/features/cpq/pricing.ts` (lines 79-80)

**Problem:**
- Areas can have `disciplineLods` which override per-discipline LoD
- Complex structure allows flexibility but isn't validated
- Server doesn't validate LoD values

**Code (lines 659-662):**
```typescript
disciplines.forEach((discipline) => {
  const disciplineLodConfig = area.disciplineLods?.[discipline];
  const lod = disciplineLodConfig?.lod || area.lod || "200";
  // Falls back to "200" if LoD is missing/invalid
```

**Allowed LoD Values:** "100", "200", "250", "300", "350", "400"

**Issue:**
- If LoD is "999", code silently falls back to "200"
- No error raised for invalid LoD
- Pricing calculation happens with different LoD than submitted
- Validator doesn't catch this

**Recommendation:**
- Validate LoD values against LOD_OPTIONS
- Reject invalid LoD values with error
- Log when fallback is used

---

### Issue 12: ⚠️ LOW - Price Adjustment Line Item Might Not Display

**Severity:** LOW  
**File:** `client/src/features/cpq/pricing.ts` (lines 1026-1032)

**Problem:**
- When margin target adjustment is < $0.01, no line item is added
- Could silently adjust pricing without showing adjustment

**Code:**
```typescript
if (Math.abs(priceAdjustment) > 0.01) {
  items.push({
    label: `Margin Target Adjustment (${(validMarginTarget * 100).toFixed(1)}%)`,
    value: priceAdjustment,
    isDiscount: priceAdjustment < 0,
  });
}
```

**Impact:**
- Very small price adjustments (< $0.01) might not show in quote
- Transparency issue for audit
- Likely a rounding artifact, not major issue

**Recommendation:**
- Always show margin adjustment (even if $0.00)
- Or document why it's hidden below threshold

---

## Summary Table

| Issue # | Severity | Category | Component | Description |
|---------|----------|----------|-----------|-------------|
| 1 | CRITICAL | Architecture | Server Routes | No server-side pricing calculation - all client-side |
| 2 | HIGH | Governance | Validator | CEO override not validated at route level |
| 3 | MEDIUM | Validation | Validator | Price integrity check is optional (requires marginTarget) |
| 4 | MEDIUM | Precision | Validator | Epsilon tolerance allows 40% floor to be slightly breached |
| 5 | HIGH | Calculation | Pricing Engine | Client margin calculation differs in implementation from server |
| 6 | HIGH | Logic | Travel Costs | Brooklyn dispatch detection uses `.includes()` instead of exact match |
| 7 | MEDIUM | Margin | Travel Costs | Travel cost upteam multiplier (0.8) is inconsistent with other services (0.65) |
| 8 | MEDIUM | Transparency | Pricing | Scanning costs hidden from client - not in line items |
| 9 | CRITICAL | Data Management | Pricing Matrix | Pricing is hardcoded - no database/dynamic configuration |
| 10 | MEDIUM | Validation | Landscape Pricing | Landscape rates not validated on server |
| 11 | MEDIUM | Validation | Discipline Config | Discipline LoD configuration not validated - silently falls back |
| 12 | LOW | Transparency | Pricing | Price adjustments < $0.01 don't display as line item |

---

## Recommended Action Plan

### Immediate (Critical Security)
1. **Implement server-side pricing calculation** - mirror client logic on server
2. **Add CEO role validation for overrides** - verify requester is actually CEO
3. **Implement pricing database** - move constants to database with audit trail

### Short-term (High Priority)
4. **Fix Brooklyn dispatch detection** - use exact string match
5. **Validate all pricing inputs server-side** - don't trust client numbers
6. **Document margin calculation differences** - ensure consistency

### Medium-term (Code Quality)
7. **Add travel cost margin documentation** - clarify why 20% vs 35%
8. **Show scanning costs in quote** - transparency for client
9. **Implement landscape pricing validation** - server-side checks
10. **Validate discipline LoD values** - reject invalid configurations

### Long-term (System Improvements)
11. **Load pricing from database** - support dynamic updates
12. **Implement pricing version history** - audit trail for changes
13. **Create pricing admin UI** - manage rates without code changes
14. **Support custom client pricing** - volume discounts, special rates

---

## Testing Recommendations

### Unit Tests to Add
```typescript
// Test server-side pricing calculation
test('calculateServerPricing should match client calculation', () => {
  const areas = [{ buildingType: '1', squareFeet: '10000', disciplines: ['architecture'] }];
  const clientResult = calculatePricing(areas, {}, travel, []);
  const serverResult = calculateServerPricing(areas, {}, travel, []); // new function
  expect(clientResult.totalClientPrice).toBeCloseTo(serverResult.totalClientPrice, 2);
});

// Test CEO override validation
test('override should only be accepted from CEO role', async () => {
  const salesRep = { role: 'sales' };
  const override = { overrideApproved: true, overrideApprovedBy: 'Admin' };
  expect(() => validateCEOOverride(override, salesRep)).toThrow();
});

// Test Brooklyn dispatch exact match
test('calculateTravelCost should not match BROOKLYN_OFFICE', () => {
  const cost = calculateTravelCost(15, 'BROOKLYN_OFFICE', 5000);
  // Should use Troy/other location rates, not Brooklyn
});
```

### Integration Tests
- Submit quote with malicious client pricing, verify server rejects
- Submit override without CEO role, verify rejection
- Update pricing matrix, verify all new quotes use new rates

---

## Conclusion

The CPQ Calculator has a **critical architectural issue** where pricing is calculated entirely client-side without server validation. Combined with weak authorization controls on overrides and hardcoded pricing, this creates multiple security and maintainability vulnerabilities.

The margin floor enforcement logic itself is sound, but is undermined by the lack of server-side pricing validation and insufficient authorization checks.

**Priority 1 Action:** Implement server-side pricing calculation and validation before allowing production quotes below the 40% margin floor.

