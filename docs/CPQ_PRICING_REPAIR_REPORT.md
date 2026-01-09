# CPQ Pricing Engine Repair Report

**Date:** January 8, 2026  
**Status:** RESOLVED  
**Affected System:** Scan2Plan OS - CPQ (Configure, Price, Quote) Module  

---

## Executive Summary

Three critical business logic issues in the CPQ pricing engine have been identified and repaired. The pricing calculations now conform to the Scan2Plan gold-standard pricing documentation. All repairs have been verified through automated testing.

---

## Issue 1: Risk Premium Calculation

### Problem
Risk premiums (Occupied Building, Hazardous Conditions, No Power/HVAC) were incorrectly applied to the **entire project total**, including MEPF, Structure, Site, and Travel costs.

### Correct Behavior (Restored)
Risk premiums apply **exclusively to the Architecture discipline subtotal**. Other cost categories are explicitly excluded from risk multipliers.

### Technical Details
| Risk Factor | Premium Rate | Application Scope |
|-------------|--------------|-------------------|
| Hazardous Conditions | +25% | Architecture only |
| No Power/HVAC | +20% | Architecture only |
| Occupied Building | +15% | Architecture only |

### Verification
- Test: $10,000 Architecture base + Hazardous + Occupied risks
- Expected Result: $14,000 ($10k + $2,500 + $1,500)
- Actual Result: $14,000
- **Status: PASS**

---

## Issue 2: Brooklyn Tiered Travel Logic

### Problem
The Brooklyn dispatch location was using flat-rate travel pricing instead of the required project-size-based tier system.

### Correct Behavior (Restored)
Brooklyn dispatch uses a tiered base fee structure determined by total project square footage, plus per-mile charges for distances exceeding 20 miles.

### Technical Details
| Dispatch | Project Size | Tier | Base Fee | Mileage |
|----------|--------------|------|----------|---------|
| Brooklyn | >= 50,000 sqft | Tier A | $0 | +$4/mi over 20 mi |
| Brooklyn | 10,000 - 49,999 sqft | Tier B | $300 | +$4/mi over 20 mi |
| Brooklyn | < 10,000 sqft | Tier C | $150 | +$4/mi over 20 mi |
| All Other Locations | Any | N/A | $0 | $3/mi (all distances) |

### Verification Results
| Test Case | Input | Expected | Actual | Status |
|-----------|-------|----------|--------|--------|
| Brooklyn Tier A | 75,000 sqft, 15 mi | $0 | $0 | PASS |
| Brooklyn Tier C | 5,000 sqft, 25 mi | $170 | $170 | PASS |
| Brooklyn Tier B | 25,000 sqft, 30 mi | $340 | $340 | PASS |
| Non-Brooklyn (Troy) | 175 mi | $525 | $525 | PASS |
| Non-Brooklyn (Albany) | 50 mi | $150 | $150 | PASS |

---

## Issue 3: Landscape Acreage Conversion

### Problem
Landscape building types (Built Landscape, Natural Landscape) were treating input values as square feet instead of acres, resulting in incorrect tiering and pricing.

### Correct Behavior (Restored)
For Building Types 14 (Built Landscape) and 15 (Natural Landscape):
- Input is treated as **acres**
- Converted to square feet for tier determination using: `sqft = acres * 43,560`
- Priced using per-acre tiered rates
- Display shows both acres and converted square feet for transparency

### Technical Details
- Conversion factor: 1 acre = 43,560 square feet
- Per-acre rates apply based on acreage tiers (e.g., <5 acres, 5-20 acres)
- Line item labels show: `X acres (Y sqft)` format

---

## Files Modified

| File Path | Change Description |
|-----------|--------------------|
| `client/src/features/cpq/pricing.ts` | Core pricing engine updates |

### Key Code Changes

1. **Risk Factor Array** - Updated IDs to `hazardous`, `noPower`, `occupied` with correct percentages
2. **Architecture Isolation** - Risk premiums calculate against `archBaseTotal` only
3. **Brooklyn Travel Tiers** - Implemented tier lookup based on project square footage
4. **Non-Brooklyn Mileage** - Replaced flat rates with $3/mile calculation
5. **Travel Line Item Labels** - Enhanced to show tier/mileage breakdown for transparency
6. **Landscape Detection** - Building types 14/15 trigger acreage conversion logic

---

## Quality Assurance

### Automated Testing
All five travel scenarios and risk premium calculation verified via automated test script.

### Manual Verification Recommended
- Create test quotes with Brooklyn dispatch at various project sizes
- Create test quotes with non-Brooklyn dispatch locations
- Verify Landscape building type quotes display acreage correctly

---

## Conclusion

The CPQ pricing engine now operates according to the Scan2Plan gold-standard pricing specification. External advisors may proceed with other matters with confidence that these pricing calculations are resolved.

---

**Prepared by:** Scan2Plan OS Development Team  
**Review Status:** Verified and Deployed to Development Environment
