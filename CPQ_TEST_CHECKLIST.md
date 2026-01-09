# CPQ Calculator Test Checklist

This document contains manual test cases for validating CPQ pricing logic and field persistence.

## Running Automated Tests

Run the full 72-test pricing engine suite with:

```bash
npx vitest run client/src/features/cpq/pricing.test.ts
```

The automated tests cover:
- Area tier calculations (0-5k, 5k-10k, 10k-20k, 20k-30k, 30k-40k, 40k-50k, 50k-75k, 75k-100k, 100k+)
- Brooklyn travel tiers ($0/$150/$300 base fees, mileage over 20)
- Landscape pricing (acres → sqft conversion, built vs natural rates)
- Risk premiums (Architecture only, 15-25% rates, stacking)
- Tier A project logic (50k+ sqft, margin multipliers, scanning costs)
- Scope discounts (interior/exterior/roof)
- Payment term premiums (prepaid -5%, net60 +3%)
- Additional elevations tiered pricing (5 tiers: $25/$20/$15/$10/$5)
- LOD multipliers (1.0x/1.3x/1.5x)
- Minimum project charge ($3,000)
- Margin gate (40% floor)

---

## 1. Standard Pricing Tests

### Test 1.1: Basic Office Building
| Field | Value |
|-------|-------|
| Building Type | Office/Commercial (Type 1) |
| Square Feet | 25,000 |
| LoD | 300 |
| Disciplines | Architecture |
| Scope | Full |
| Dispatch | Woodstock |
| Distance | 45 miles |

**Expected Results:**
- [ ] Base rate lookup from database (Office @ LoD 300)
- [ ] Travel cost = 45 miles x $3/mile = $135
- [ ] Total matches pricing breakdown
- [ ] Margin >= 40%

### Test 1.2: Multi-Discipline Project
| Field | Value |
|-------|-------|
| Building Type | Industrial (Type 9) |
| Square Feet | 40,000 |
| LoD | 200 |
| Disciplines | Architecture, Structural, MEP |
| Scope | Full |

**Expected Results:**
- [ ] Each discipline adds to modeling complexity
- [ ] MEP adds highest complexity multiplier
- [ ] All disciplines appear in pricing breakdown

---

## 2. Risk Premium Tests

### Test 2.1: Occupied Building Risk
| Field | Value |
|-------|-------|
| Building Type | Office |
| Square Feet | 15,000 |
| LoD | 300 |
| Risks | Occupied (+15%) |
| Disciplines | Architecture |

**Expected Results:**
- [ ] Risk premium applies ONLY to Architecture discipline
- [ ] Other disciplines (if selected) are NOT affected
- [ ] Risk appears as line item in breakdown

### Test 2.2: Multiple Risks
| Field | Value |
|-------|-------|
| Risks | Occupied (+15%), Hazmat (+20%), Rush (+25%) |
| Disciplines | Architecture, MEP |

**Expected Results:**
- [ ] Risk premiums stack on Architecture only
- [ ] MEP pricing unchanged by risks
- [ ] Total risk percentage shown correctly

---

## 3. Landscape Area Tests

### Test 3.1: Natural Landscape
| Field | Value |
|-------|-------|
| Area Type | Landscape |
| Building Type | Landscape - Natural |
| Acres | 5 |
| LoD | 300 |
| Disciplines | Site |

**Expected Results:**
- [ ] Uses $750/acre rate (LoD 300 Natural)
- [ ] 5 acres x $750 = $3,750
- [ ] Converts to sqft: 5 x 43,560 = 217,800 sqft
- [ ] Appears correctly in pricing breakdown

### Test 3.2: Built Landscape (Hardscape)
| Field | Value |
|-------|-------|
| Area Type | Landscape |
| Building Type | Landscape - Built |
| Acres | 2 |
| LoD | 200 |

**Expected Results:**
- [ ] Uses built landscape rate (higher than natural)
- [ ] Correct sqft conversion: 87,120 sqft
- [ ] Discipline is Site only

---

## 4. Tier A / Brooklyn Travel Tests

### Test 4.1: Tier A Project (>=50k sqft from Brooklyn)
| Field | Value |
|-------|-------|
| Square Feet | 60,000 |
| Dispatch | Brooklyn |
| Distance | 25 miles |

**Expected Results:**
- [ ] Tier A detected (>=50k sqft)
- [ ] Travel base = $0 (Tier A)
- [ ] Mileage = (25-20) x $4/mile = $20
- [ ] Total travel = $20

### Test 4.2: Tier B Project (10k-49,999 sqft from Brooklyn)
| Field | Value |
|-------|-------|
| Square Feet | 25,000 |
| Dispatch | Brooklyn |
| Distance | 35 miles |

**Expected Results:**
- [ ] Tier B detected
- [ ] Travel base = $300
- [ ] Mileage = (35-20) x $4/mile = $60
- [ ] Total travel = $360

### Test 4.3: Tier C Project (<10k sqft from Brooklyn)
| Field | Value |
|-------|-------|
| Square Feet | 8,000 |
| Dispatch | Brooklyn |
| Distance | 40 miles |

**Expected Results:**
- [ ] Tier C detected
- [ ] Travel base = $150
- [ ] Mileage = (40-20) x $4/mile = $80
- [ ] Total travel = $230

### Test 4.4: Woodstock (Flat Rate)
| Field | Value |
|-------|-------|
| Square Feet | 25,000 |
| Dispatch | Woodstock |
| Distance | 80 miles |

**Expected Results:**
- [ ] Flat rate applies (not tiered)
- [ ] Travel = 80 miles x $3/mile = $240
- [ ] No base fee
- [ ] Scan day fee may apply ($300)

---

## 5. Margin Gate Tests

### Test 5.1: Below 40% Margin Detection
| Scenario | Test |
|----------|------|
| Quote with margin < 40% | System detects violation |

**Expected Results:**
- [ ] `passesMarginGate()` returns false
- [ ] `getMarginGateError()` returns error message
- [ ] `getMarginStatus()` returns status: "blocked"
- [ ] UI shows margin indicator in red

### Test 5.2: Healthy Margin Detection
| Field | Value |
|-------|-------|
| Margin | >= 40% |

**Expected Results:**
- [ ] `passesMarginGate()` returns true
- [ ] `getMarginGateError()` returns null
- [ ] `getMarginStatus()` returns status: "healthy" or "excellent"
- [ ] UI shows margin indicator in green

---

## 6. Scoping Fields Persistence Tests

### Test 6.1: Project Details
| Field | Value |
|-------|-------|
| Specific Building | Building A - East Wing |
| Type of Building | 5-story commercial office |

**Expected Results:**
- [ ] Fields save to database
- [ ] Fields reload when quote reopened
- [ ] Values appear in scopingData JSON

### Test 6.2: Deliverables
| Field | Value |
|-------|-------|
| Interior CAD Elevations | 15 |
| BIM Deliverable | Revit, Archicad |
| BIM Version | Revit 2024 |
| Custom Template | Yes |

**Expected Results:**
- [ ] Multi-select BIM formats persist as array
- [ ] All values save and reload correctly
- [ ] Custom template other field shows when "other" selected

### Test 6.3: Contacts
| Field | Value |
|-------|-------|
| Account Contact | John Smith |
| Account Email | john@example.com |
| Account Phone | 555-123-4567 |
| Design Pro | Jane Architect |
| Design Pro Company | ABC Architects |

**Expected Results:**
- [ ] All contact fields persist
- [ ] Email format validates (if validation exists)
- [ ] Phone numbers preserved as entered

### Test 6.4: Lead Tracking
| Field | Value |
|-------|-------|
| Source | Referral - Client |
| Source Note | Referred by Acme Corp |
| Assist | CEU |
| Probability | 75% |
| Project Status | In-Hand |
| Timeline | 3 weeks |

**Expected Results:**
- [ ] Source dropdown shows all 18 options
- [ ] Assist attribution saves separately from source
- [ ] Probability saves as number
- [ ] Timeline dropdown saves correctly

---

## 7. PostMessage Integration Tests

### Test 7.1: Valid Origin Payload
**Send from:** Same origin (test-payload page)
**Payload:** Standard project payload

**Expected Results:**
- [ ] Toast shows "Scoping data received"
- [ ] All fields populate correctly
- [ ] Areas array creates correct area cards
- [ ] Travel config populates dispatch/distance

### Test 7.2: Invalid Origin Rejection
**Send from:** Different origin (if testable)

**Expected Results:**
- [ ] Console shows "Blocked postMessage from untrusted origin"
- [ ] No fields updated
- [ ] No toast notification

### Test 7.3: Full Payload Hydration
**Send:** allFieldsTest scenario

**Expected Results:**
- [ ] All 60+ fields populate
- [ ] Multiple areas created
- [ ] Landscape area shows acres
- [ ] Mixed scope fields populate
- [ ] All contacts fill in

---

## 8. Tier A Pricing Tests

### Test 8.1: Tier A Project Detection
| Field | Value |
|-------|-------|
| Total Sqft | >= 50,000 sqft |

**Expected Results:**
- [ ] System detects Tier A project automatically
- [ ] Tier A pricing panel becomes available
- [ ] Standard pricing can still be used if preferred

### Test 8.2: Tier A Margin Multipliers
| Multiplier | Expected Calculation |
|------------|----------------------|
| 2.352X (Standard) | Cost x 2.352 |
| 2.5X | Cost x 2.5 |
| 3.0X | Cost x 3.0 |
| 3.5X | Cost x 3.5 |
| 4.0X (Premium) | Cost x 4.0 |

**Expected Results:**
- [ ] Scanning cost presets: $3500, $7000, $10500, $15000, $18500
- [ ] Custom scanning cost option available
- [ ] clientPrice = (scanningCost + modelingCost) x marginMultiplier
- [ ] Travel cost added to totalWithTravel

---

## 9. Payment Terms Tests

### Test 9.1: Prepaid Discount
| Payment Terms | Adjustment |
|---------------|------------|
| Prepaid | -5% discount |

**Expected Results:**
- [ ] "Prepaid Discount (5%)" appears in pricing breakdown
- [ ] Total price reduced by 5%
- [ ] isDiscount flag set on line item

### Test 9.2: Extended Terms Surcharge
| Payment Terms | Adjustment |
|---------------|------------|
| Net 60 | +3% surcharge |

**Expected Results:**
- [ ] "Extended Terms Surcharge (3%)" appears in pricing breakdown
- [ ] Total price increased by 3%
- [ ] Margin calculation includes surcharge

---

## 10. Line Item Verification Tests

### Test 10.1: Travel Line Items
| Field | Expected |
|-------|----------|
| Travel from Woodstock | "Travel (Woodstock @ $3/mi)" appears |
| Travel from Brooklyn Tier B | "Travel (Brooklyn Tier B: $300 base + ...)" appears |

**Expected Results:**
- [ ] Travel line item shows dispatch location
- [ ] Travel line item shows pricing tier or rate
- [ ] Travel amount matches calculated value

### Test 10.2: Payment Terms Line Items
| Payment Terms | Expected Line Item |
|---------------|-------------------|
| Prepaid | "Prepaid Discount (5%)" with negative value |
| Net 60 | "Extended Terms Surcharge (3%)" with positive value |

**Expected Results:**
- [ ] Line item appears in pricing breakdown
- [ ] isDiscount flag set correctly for prepaid
- [ ] Amount calculated correctly from subtotal

---

## Golden Quote Verification

After any pricing changes, verify these reference quotes still calculate correctly:

| Quote Name | Expected Total | Expected Margin |
|------------|----------------|-----------------|
| Standard 25k Office | Check database | >= 40% |
| Tier A 60k Warehouse | Check database | >= 40% |
| 5 Acre Landscape | Check database | >= 40% |
| Mixed Scope Historic | Check database | >= 40% |
| All Fields Test | Check database | >= 40% |

---

## Test Execution Log

| Date | Tester | Tests Passed | Tests Failed | Notes |
|------|--------|--------------|--------------|-------|
| | | | | |
| | | | | |
| | | | | |

