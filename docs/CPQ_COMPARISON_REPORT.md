# CPQ Comparison Report Template

Use this document to validate Scan2Plan-OS CPQ against the original CPQ system. For each test case, configure both systems with identical parameters and record the results.

---

## Test Summary

| Test | Scenario | Expected | S2P-OS Result | Original CPQ | Match? |
|------|----------|----------|---------------|--------------|--------|
| 1 | Starter Interior (Min Floor) | ~$3,000 | | | |
| 2 | Multi-Discipline + Risk | ~$75,000 | | | |
| 3 | Exterior Retrofit | ~$8,500 | | | |
| 4 | Roof/Facade Package | ~$4,500 | | | |
| 5 | Landscape Campus | ~$7,500 | | | |
| 6 | Large Campus Mix | ~$165,000 | | | |
| 7 | Risk-Stacked Industrial | ~$95,000 | | | |
| 8 | Tier A Baseline | ~$225,420 | | | |
| 9 | Tier A High | ~$513,150 | | | |
| 10 | Mixed-Scope Specialty | ~$60,000 | | | |

---

## Pricing Constants Reference

### Base Rates (per sqft)
| Discipline | Rate |
|------------|------|
| Architecture | $2.50 |
| MEPF | $3.00 |
| Structure | $2.00 |
| Site | $1.50 |

### LOD Multipliers
| LOD | Multiplier |
|-----|------------|
| 200 | 1.0× |
| 300 | 1.3× |
| 350 | 1.5× |

### Scope Portions
| Scope | Portion |
|-------|---------|
| Full Building | 100% |
| Interior Only | 65% |
| Exterior Only | 35% |
| Roof/Facades | 35% |

### Special Rules
- **Minimum sqft floor**: 3,000 sqft (areas < 3k billed as 3k)
- **Up Team multiplier**: 0.65× (internal cost estimate)
- **Risk premiums**: Apply ONLY to Architecture discipline

### Travel Pricing
**Brooklyn Dispatch:**
| Tier | Sqft Range | Base Fee | Per Mile (>20mi) |
|------|------------|----------|------------------|
| C | < 10,000 | $150 | $4/mile |
| B | 10,000 - 49,999 | $300 | $4/mile |
| A | ≥ 50,000 | $0 | $4/mile |

**Other Locations:** $3/mile flat rate

### Services
| Service | Pricing |
|---------|---------|
| Matterport | $0.10/sqft |
| Georeferencing | $500 flat |

### Payment Terms
| Terms | Adjustment |
|-------|------------|
| Due on Receipt | 0% |
| Net 15 | 0% |
| Net 30 | +5% |
| Net 60 | +10% |
| Partner | -10% |

---

## Detailed Test Cases

### Test 1: Starter Interior (Minimum Floor Test)

**Purpose:** Validate minimum sqft floor applies (2,000 → 3,000)

| Parameter | Value |
|-----------|-------|
| Building Type | Residential Single Family |
| Square Feet | 2,000 |
| Scope | Interior Only |
| Disciplines | Architecture |
| Architecture LOD | 200 |
| Dispatch | Brooklyn, NY |
| Distance | 5 miles |
| Risk Factors | None |
| Services | None |
| Payment Terms | Due on Receipt |

**Expected Calculation:**
```
Architecture: 3,000 sqft × $2.50 × 1.0 (LOD 200) × 0.65 (Interior) = $4,875
                                                            ↓
                               Apply minimum floor: max(2000, 3000) = 3,000 sqft
                                                            ↓
                               3,000 × $2.50 × 1.0 × 0.65 = $4,875
                               
Travel (Brooklyn Tier C): $150 base (< 10k sqft, < 20 miles)

Grand Total: $4,875 + $150 = $5,025
```

**Results:**
| Metric | S2P-OS | Original | Match |
|--------|--------|----------|-------|
| Billed sqft | | | |
| Architecture cost | | | |
| Travel cost | | | |
| **Grand Total** | | | |

---

### Test 2: Multi-Discipline with Risk Premium

**Purpose:** Validate risk premium applies ONLY to Architecture, not other disciplines

| Parameter | Value |
|-----------|-------|
| Building Type | Office/Commercial |
| Square Feet | 18,500 |
| Scope | Full Building |
| Disciplines | Architecture, MEPF, Structure |
| All LODs | 300 |
| Dispatch | Brooklyn, NY |
| Distance | 35 miles |
| Risk Factors | Occupied Building (+15%) |
| Services | Matterport, Georeferencing |
| Payment Terms | Net 30 |

**Expected Calculation:**
```
Architecture: 18,500 × $2.50 × 1.3 (LOD 300) × 1.0 (Full) = $60,125
  + Risk Premium (Occupied): $60,125 × 15% = $9,019
  Architecture Total: $69,144

MEPF: 18,500 × $3.00 × 1.3 × 1.0 = $72,150 (NO risk premium)

Structure: 18,500 × $2.00 × 1.3 × 1.0 = $48,100 (NO risk premium)

Subtotal Disciplines: $69,144 + $72,150 + $48,100 = $189,394

Matterport: 18,500 × $0.10 = $1,850
Georeferencing: $500

Travel (Brooklyn Tier B): $300 base + (35 - 20) × $4 = $360

Subtotal: $189,394 + $1,850 + $500 + $360 = $192,104

Payment Terms (Net 30 +5%): $192,104 × 1.05 = $201,709

Grand Total: ~$201,709
```

**Results:**
| Metric | S2P-OS | Original | Match |
|--------|--------|----------|-------|
| Architecture (with risk) | | | |
| MEPF (no risk) | | | |
| Structure (no risk) | | | |
| Matterport | | | |
| Georeferencing | | | |
| Travel | | | |
| Net 30 adjustment | | | |
| **Grand Total** | | | |

---

### Test 3: Exterior Retrofit

**Purpose:** Validate exterior-only scope (35%)

| Parameter | Value |
|-----------|-------|
| Building Type | Retail/Storefront |
| Square Feet | 12,000 |
| Scope | Exterior Only |
| Disciplines | Architecture |
| Architecture LOD | 350 |
| Dispatch | Troy, NY |
| Distance | 120 miles |
| Risk Factors | None |
| Services | None |
| Payment Terms | Due on Receipt |

**Expected Calculation:**
```
Architecture: 12,000 × $2.50 × 1.5 (LOD 350) × 0.35 (Exterior) = $15,750

Travel (Troy): 120 × $3/mile = $360

Grand Total: $15,750 + $360 = $16,110
```

**Results:**
| Metric | S2P-OS | Original | Match |
|--------|--------|----------|-------|
| Architecture cost | | | |
| Travel cost | | | |
| **Grand Total** | | | |

---

### Test 4: Roof/Facade Package

**Purpose:** Validate roof scope uses 35% portion

| Parameter | Value |
|-----------|-------|
| Building Type | Mixed Use |
| Square Feet | 6,500 |
| Scope | Roof/Facades Only |
| Disciplines | Architecture |
| Architecture LOD | 300 |
| Dispatch | Brooklyn, NY |
| Distance | 8 miles |
| Risk Factors | None |
| Services | None |
| Payment Terms | Due on Receipt |
| BIM Deliverable | CAD |

**Expected Calculation:**
```
Architecture: 6,500 × $2.50 × 1.3 (LOD 300) × 0.35 (Roof) = $7,394

Travel (Brooklyn Tier C): $150 base (< 10k sqft, < 20 miles)

Grand Total: $7,394 + $150 = $7,544
```

**Results:**
| Metric | S2P-OS | Original | Match |
|--------|--------|----------|-------|
| Architecture cost | | | |
| Travel cost | | | |
| **Grand Total** | | | |

---

### Test 5: Landscape Campus

**Purpose:** Validate landscape/site pricing with acre-to-sqft conversion

| Parameter | Value |
|-----------|-------|
| Area Type | Landscape |
| Acres | 3.2 |
| Landscape Type | Built (parking, hardscape) |
| Disciplines | Site |
| Site LOD | 300 |
| Dispatch | Troy, NY |
| Distance | 45 miles |
| Risk Factors | None |
| Services | None |
| Payment Terms | Net 30 |

**Expected Calculation:**
```
Acres to sqft: 3.2 × 43,560 = 139,392 sqft

Site: 139,392 × $1.50 × 1.3 (LOD 300) = $271,814
  (Note: Landscape may have different rate - verify with original)

Travel (Troy): 45 × $3/mile = $135

Subtotal: $271,814 + $135 = $271,949

Payment Terms (Net 30 +5%): $271,949 × 1.05 = $285,546

Grand Total: ~$285,546
```

**Results:**
| Metric | S2P-OS | Original | Match |
|--------|--------|----------|-------|
| Calculated sqft | | | |
| Site cost | | | |
| Travel cost | | | |
| Net 30 adjustment | | | |
| **Grand Total** | | | |

---

### Test 6: Large Campus Mix (Multi-Area)

**Purpose:** Validate multi-area quote with building + landscape

| Area 1 | Value |
|--------|-------|
| Building Type | Healthcare/Medical |
| Square Feet | 45,000 |
| Scope | Interior Only |
| Disciplines | Architecture, MEPF |
| LODs | 350 |

| Area 2 | Value |
|--------|-------|
| Area Type | Landscape |
| Acres | 1.5 |
| Landscape Type | Natural |
| Disciplines | Site |
| Site LOD | 300 |

| Common | Value |
|--------|-------|
| Custom Travel | $4,500 |
| Services | Matterport |
| Payment Terms | Net 60 |

**Expected Calculation:**
```
Area 1 - Healthcare Interior:
  Architecture: 45,000 × $2.50 × 1.5 × 0.65 = $109,688
  MEPF: 45,000 × $3.00 × 1.5 × 0.65 = $131,625
  Subtotal: $241,313

Area 2 - Natural Landscape:
  sqft: 1.5 × 43,560 = 65,340 sqft
  Site: 65,340 × $1.50 × 1.3 = $127,413

Matterport: (45,000 + 65,340) × $0.10 = $11,034

Travel: $4,500 (custom)

Subtotal: $241,313 + $127,413 + $11,034 + $4,500 = $384,260

Payment Terms (Net 60 +10%): $384,260 × 1.10 = $422,686

Grand Total: ~$422,686
```

**Results:**
| Metric | S2P-OS | Original | Match |
|--------|--------|----------|-------|
| Area 1 subtotal | | | |
| Area 2 subtotal | | | |
| Matterport | | | |
| Travel | | | |
| Net 60 adjustment | | | |
| **Grand Total** | | | |

---

### Test 7: Risk-Stacked Industrial

**Purpose:** Validate multiple risk premiums stack correctly

| Parameter | Value |
|-----------|-------|
| Building Type | Industrial/Warehouse |
| Square Feet | 55,000 |
| Scope | Full Building |
| Disciplines | Architecture, Structure, Site |
| All LODs | 200 |
| Dispatch | Boise, ID |
| Distance | 400 miles |
| Risk Factors | Hazardous (+25%), No Power (+10%), Height (+15%) |
| Services | None |
| Payment Terms | Net 30 |

**Expected Calculation:**
```
Architecture: 55,000 × $2.50 × 1.0 = $137,500
  + Hazardous (+25%): $34,375
  + No Power (+10%): $13,750
  + Height (+15%): $20,625
  Architecture with risks: $206,250

Structure: 55,000 × $2.00 × 1.0 = $110,000 (NO risk premiums)

Site: 55,000 × $1.50 × 1.0 = $82,500 (NO risk premiums)

Subtotal: $206,250 + $110,000 + $82,500 = $398,750

Travel (Other): 400 × $3/mile = $1,200

Subtotal: $398,750 + $1,200 = $399,950

Payment Terms (Net 30 +5%): $399,950 × 1.05 = $419,948

Grand Total: ~$419,948
```

**Results:**
| Metric | S2P-OS | Original | Match |
|--------|--------|----------|-------|
| Architecture (with all risks) | | | |
| Risk breakdown | | | |
| Structure (no risk) | | | |
| Site (no risk) | | | |
| Travel | | | |
| Net 30 adjustment | | | |
| **Grand Total** | | | |

---

### Test 8: Tier A Baseline

**Purpose:** Validate Tier A manual pricing mode triggers at 50k+ sqft

| Parameter | Value |
|-----------|-------|
| Building Type | Office/Commercial |
| Square Feet | 80,000 |
| Pricing Mode | Tier A (Manual) |
| Scanning Cost | $35,000 |
| Modeling Cost | $55,000 |
| Target Margin | 2.5× |
| Dispatch | Brooklyn, NY |
| Distance | 50 miles |
| Risk Factors | None |
| Services | None |
| Payment Terms | Due on Receipt |

**Expected Calculation:**
```
Base Cost: $35,000 + $55,000 = $90,000

Margin Applied: $90,000 × 2.5 = $225,000

Travel (Brooklyn Tier A): $0 base + (50 - 20) × $4 = $120

Grand Total: $225,000 + $120 = $225,120

Internal Margin: ($225,120 - $90,000) / $225,120 = 60%
```

**Results:**
| Metric | S2P-OS | Original | Match |
|--------|--------|----------|-------|
| Tier A triggered? | | | |
| Scanning cost | | | |
| Modeling cost | | | |
| Margin multiplier | | | |
| Price before travel | | | |
| Travel | | | |
| **Grand Total** | | | |
| **Profit Margin %** | | | |

---

### Test 9: Tier A High (Maximum)

**Purpose:** Validate Tier A with services and custom travel

| Parameter | Value |
|-----------|-------|
| Building Type | Data Center |
| Square Feet | 150,000 |
| Pricing Mode | Tier A (Manual) |
| Scanning Cost | $70,000 |
| Modeling Cost | $95,000 |
| Target Margin | 3.0× |
| Custom Travel | $8,500 |
| Services | Matterport, Georeferencing |
| Payment Terms | Net 60 |

**Expected Calculation:**
```
Base Cost: $70,000 + $95,000 = $165,000

Margin Applied: $165,000 × 3.0 = $495,000

Matterport: 150,000 × $0.10 = $15,000
Georeferencing: $500

Travel: $8,500 (custom)

Subtotal: $495,000 + $15,000 + $500 + $8,500 = $519,000

Payment Terms (Net 60 +10%): $519,000 × 1.10 = $570,900

Grand Total: ~$570,900

Internal Margin: Higher due to 3.0× multiplier
```

**Results:**
| Metric | S2P-OS | Original | Match |
|--------|--------|----------|-------|
| Scanning cost | | | |
| Modeling cost | | | |
| Margin multiplier | | | |
| Matterport | | | |
| Georeferencing | | | |
| Travel | | | |
| Net 60 adjustment | | | |
| **Grand Total** | | | |

---

### Test 10: Mixed-Scope Specialty

**Purpose:** Validate mixed interior/exterior LODs and ACT ceiling pricing

| Parameter | Value |
|-----------|-------|
| Building Type | Hospitality |
| Square Feet | 28,000 |
| Scope | Full Building (Mixed LODs) |
| Interior LOD | 300 |
| Exterior LOD | 350 |
| Disciplines | Architecture, Site |
| ACT Ceiling sqft | 5,000 |
| Dispatch | Brooklyn, NY |
| Distance | 8 miles |
| Risk Factors | Occupied Building (+15%) |
| Services | None |
| Payment Terms | Net 30 |

**Expected Calculation:**
```
Architecture Interior: 28,000 × $2.50 × 1.3 × 0.65 = $59,150
Architecture Exterior: 28,000 × $2.50 × 1.5 × 0.35 = $36,750
Architecture Subtotal: $95,900
  + Occupied Risk (+15%): $14,385
  Architecture Total: $110,285

Site: 28,000 × $1.50 × 1.3 = $54,600 (NO risk)

ACT Ceiling: 5,000 sqft × TBD rate = $???

Subtotal: $110,285 + $54,600 + ACT = $164,885 + ACT

Travel (Brooklyn Tier B): $300 base (10k-50k sqft, < 20 miles)

Subtotal: $165,185 + ACT

Payment Terms (Net 30 +5%): × 1.05

Grand Total: TBD (depends on ACT rate)
```

**Results:**
| Metric | S2P-OS | Original | Match |
|--------|--------|----------|-------|
| Arch Interior | | | |
| Arch Exterior | | | |
| Risk premium | | | |
| Site | | | |
| ACT ceiling | | | |
| Travel | | | |
| Net 30 adjustment | | | |
| **Grand Total** | | | |

---

## Comparison Notes

### Discrepancies Found

| Test | Field | S2P-OS Value | Original Value | Difference | Root Cause |
|------|-------|--------------|----------------|------------|------------|
| | | | | | |
| | | | | | |
| | | | | | |

### Formula Differences

Document any differences in how the two systems calculate pricing:

1. **Minimum sqft floor:** 
   - S2P-OS: _______
   - Original: _______

2. **Risk premium application:**
   - S2P-OS: _______
   - Original: _______

3. **Travel tiers:**
   - S2P-OS: _______
   - Original: _______

4. **Tier A threshold:**
   - S2P-OS: _______
   - Original: _______

### Recommendations

Based on comparison testing:

1. [ ] _______________________
2. [ ] _______________________
3. [ ] _______________________

---

## Sign-Off

| Role | Name | Date | Signature |
|------|------|------|-----------|
| Tester | | | |
| Reviewer | | | |
| Approved By | | | |

---

*Document generated: January 10, 2026*
*Version: 1.0*
