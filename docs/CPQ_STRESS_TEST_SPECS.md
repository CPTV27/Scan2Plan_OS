# CPQ Stress Test Specifications

**Purpose:** Validate pricing logic consistency between Scan2Plan-OS CPQ and the original CPQ system.  
**Created:** January 10, 2026  
**Total Tests:** 10 scenarios ranging from $3,000 to $250,000+

---

## Pricing Constants Reference

| Constant | Value | Description |
|----------|-------|-------------|
| MIN_SQFT_FLOOR | 3,000 | Minimum billable sqft |
| UPTEAM_MULTIPLIER | 0.65 | Internal cost multiplier |
| ACT_RATE_PER_SQFT | $2.00 | Above Ceiling Tile rate |
| MATTERPORT_RATE | $0.10/sqft | Virtual tour rate |
| SQFT_PER_ACRE | 43,560 | Landscape conversion |

### Base Rates (per sqft at LOD 200)
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
| Full | 100% |
| Interior | 65% |
| Exterior | 35% |
| Roof | 35% |

### Risk Premiums (Architecture ONLY)
| Risk | Premium |
|------|---------|
| occupied | +15% |
| hazardous | +25% |
| no_power | +20% |

### Travel Rates
**Brooklyn Dispatch:**
| Tier | Sqft Range | Base Fee | Extra Miles |
|------|------------|----------|-------------|
| Tier C | < 10k | $150 | $4/mi over 20mi |
| Tier B | 10k-50k | $300 | $4/mi over 20mi |
| Tier A | 50k+ | $0 | $4/mi over 20mi |

**Standard Dispatch (Troy/Woodstock/Boise):**
- $3/mile flat rate
- +$300 scan day fee if ≥75 miles

### Payment Term Premiums
| Term | Premium |
|------|---------|
| partner | 0% |
| owner | 0% |
| net30 | +5% |
| net60 | +10% |
| net90 | +15% |

---

## TEST CASE 1: Starter Interior (Minimum Charge Test)

### Configuration
```json
{
  "testName": "CPQ Test 1: Starter Interior",
  "targetPrice": "$3,000 (minimum charge)",
  "areas": [{
    "name": "Small Residential Unit",
    "buildingType": "2",
    "buildingTypeLabel": "Residential Single Family",
    "squareFeet": 2000,
    "effectiveSqft": 3000,
    "scope": "interior",
    "disciplines": ["arch"],
    "disciplineLods": { "arch": "200" }
  }],
  "risks": [],
  "travel": {
    "dispatchLocation": "brooklyn",
    "distance": 5
  },
  "paymentTerms": "partner",
  "services": []
}
```

### Expected Calculation
```
ARCHITECTURE:
  Effective Sqft: 3,000 (minimum applied, actual is 2,000)
  Base Rate: $2.50/sqft
  LOD 200: × 1.0
  Interior Scope: × 0.65
  = 3,000 × $2.50 × 1.0 × 0.65 = $4,875

TRAVEL (Brooklyn Tier C, < 10k sqft):
  Base Fee: $150
  Distance: 5 miles (no extra miles, < 20mi threshold)
  = $150

SUBTOTAL: $4,875 + $150 = $5,025

MINIMUM CHARGE: $3,000 (if subtotal < $3,000, use minimum)
Result: $5,025 > $3,000, so NO minimum applied

INTERNAL COSTS:
  Up Team: $4,875 × 0.65 = $3,169
  Scanning: 1 day × $600 = $600 (3k sqft = 1 day)
  
EXPECTED TOTAL: $5,025
EXPECTED MARGIN: $5,025 - $3,769 = $1,256 (25%)
```

---

## TEST CASE 2: Multi-Discipline Mid

### Configuration
```json
{
  "testName": "CPQ Test 2: Multi-Discipline Mid",
  "targetPrice": "$35,000 - $45,000",
  "areas": [{
    "name": "Downtown Office Building",
    "buildingType": "1",
    "buildingTypeLabel": "Office/Commercial",
    "squareFeet": 18500,
    "scope": "full",
    "disciplines": ["arch", "mepf", "structure"],
    "disciplineLods": { "arch": "300", "mepf": "300", "structure": "300" }
  }],
  "risks": ["occupied"],
  "travel": {
    "dispatchLocation": "brooklyn",
    "distance": 35
  },
  "paymentTerms": "net30",
  "services": ["matterport", "georeferencing"]
}
```

### Expected Calculation
```
ARCHITECTURE (with occupied risk):
  18,500 sqft × $2.50 × 1.3 (LOD 300) × 1.0 (full scope) = $60,125
  + Occupied Risk (+15%): $60,125 × 0.15 = $9,019
  Architecture Total: $69,144

MEPF:
  18,500 × $3.00 × 1.3 × 1.0 = $72,150

STRUCTURE:
  18,500 × $2.00 × 1.3 × 1.0 = $48,100

DISCIPLINE SUBTOTAL: $69,144 + $72,150 + $48,100 = $189,394

SERVICES:
  Matterport: 18,500 × $0.10 = $1,850
  Georeferencing: $500 flat
  Services Total: $2,350

TRAVEL (Brooklyn Tier B, 10k-50k sqft):
  Base Fee: $300
  Extra Miles: (35 - 20) × $4 = $60
  Travel Total: $360

SUBTOTAL: $189,394 + $2,350 + $360 = $192,104

PAYMENT TERMS (Net 30 +5%):
  $192,104 × 0.05 = $9,605

EXPECTED TOTAL: $192,104 + $9,605 = $201,709

INTERNAL COSTS:
  Up Team: $189,394 × 0.65 = $123,106
  Scanning: 2 days × $600 + 1 hotel × $300 = $1,500
  Total Internal: $124,606
  
EXPECTED MARGIN: $201,709 - $124,606 = $77,103 (38%)
```

---

## TEST CASE 3: Exterior Retrofit

### Configuration
```json
{
  "testName": "CPQ Test 3: Exterior Retrofit",
  "targetPrice": "$25,000 - $35,000",
  "areas": [{
    "name": "Retail Facade Renovation",
    "buildingType": "5",
    "buildingTypeLabel": "Retail",
    "squareFeet": 12000,
    "scope": "exterior",
    "disciplines": ["arch"],
    "disciplineLods": { "arch": "350" }
  }],
  "risks": [],
  "travel": {
    "dispatchLocation": "troy",
    "distance": 120
  },
  "paymentTerms": "owner",
  "services": []
}
```

### Expected Calculation
```
ARCHITECTURE (Exterior Only):
  12,000 sqft × $2.50 × 1.5 (LOD 350) × 0.35 (exterior) = $15,750

TRAVEL (Standard - Troy dispatch):
  Base: 120 × $3 = $360
  Scan Day Fee (≥75 mi): $300
  Travel Total: $660

EXPECTED TOTAL: $15,750 + $660 = $16,410

INTERNAL COSTS:
  Up Team: $15,750 × 0.65 = $10,238
  Scanning: 2 days × $600 + 1 hotel × $300 = $1,500
  Total Internal: $11,738
  
EXPECTED MARGIN: $16,410 - $11,738 = $4,672 (28%)
```

---

## TEST CASE 4: Roof/Facade Package

### Configuration
```json
{
  "testName": "CPQ Test 4: Roof/Facade Package",
  "targetPrice": "~$15,000",
  "areas": [{
    "name": "Mixed Use Rooftop Survey",
    "buildingType": "10",
    "buildingTypeLabel": "Mixed Use",
    "squareFeet": 6500,
    "scope": "roof",
    "disciplines": ["arch"],
    "disciplineLods": { "arch": "300" }
  }],
  "risks": [],
  "travel": {
    "dispatchLocation": "brooklyn",
    "distance": 8
  },
  "paymentTerms": "partner",
  "services": [],
  "cadDeliverable": "basic_architecture"
}
```

### Expected Calculation
```
ARCHITECTURE (Roof Scope):
  6,500 sqft × $2.50 × 1.3 (LOD 300) × 0.35 (roof) = $7,394

CAD DELIVERABLE (Basic Architecture):
  6,500 × $0.03 = $195

TRAVEL (Brooklyn Tier C, < 10k sqft):
  Base Fee: $150
  Distance: 8 miles (no extra, < 20mi)
  Travel Total: $150

EXPECTED TOTAL: $7,394 + $195 + $150 = $7,739

INTERNAL COSTS:
  Up Team: $7,394 × 0.65 = $4,806
  Scanning: 1 day × $600 = $600
  Total Internal: $5,406
  
EXPECTED MARGIN: $7,739 - $5,406 = $2,333 (30%)
```

---

## TEST CASE 5: Landscape Campus

### Configuration
```json
{
  "testName": "CPQ Test 5: Landscape Campus",
  "targetPrice": "~$20,000",
  "areas": [{
    "name": "Corporate Campus Grounds",
    "buildingType": "14",
    "buildingTypeLabel": "Landscape - Built",
    "acres": 3.2,
    "scope": "full",
    "disciplines": ["site"],
    "disciplineLods": { "site": "300" }
  }],
  "risks": [],
  "travel": {
    "dispatchLocation": "troy",
    "distance": 45
  },
  "paymentTerms": "net30",
  "services": []
}
```

### Expected Calculation
```
LANDSCAPE (Built, LOD 300 - Tiered Rates):
  Tier 0 (0-5 acres): First 3.2 acres at $1,000/acre
  = 3.2 × $1,000 = $3,200

TRAVEL (Standard - Troy dispatch):
  Base: 45 × $3 = $135
  Scan Day Fee: $0 (< 75 mi)
  Travel Total: $135

PAYMENT TERMS (Net 30 +5%):
  ($3,200 + $135) × 0.05 = $167

EXPECTED TOTAL: $3,200 + $135 + $167 = $3,502

Note: Landscape projects typically have different cost structures.
Actual pricing may vary based on terrain complexity.
```

---

## TEST CASE 6: Large Campus Mix (Multi-Area)

### Configuration
```json
{
  "testName": "CPQ Test 6: Large Campus Mix",
  "targetPrice": "$90,000 - $110,000",
  "areas": [
    {
      "name": "Hospital Main Building",
      "buildingType": "6",
      "buildingTypeLabel": "Healthcare",
      "squareFeet": 45000,
      "scope": "interior",
      "disciplines": ["arch", "mepf"],
      "disciplineLods": { "arch": "350", "mepf": "350" }
    },
    {
      "name": "Hospital Grounds",
      "buildingType": "15",
      "buildingTypeLabel": "Landscape - Natural",
      "acres": 1.5,
      "scope": "full",
      "disciplines": ["site"],
      "disciplineLods": { "site": "200" }
    }
  ],
  "risks": ["occupied"],
  "travel": {
    "dispatchLocation": "custom",
    "customTravelCost": 4500
  },
  "paymentTerms": "net60",
  "services": ["matterport"]
}
```

### Expected Calculation
```
AREA 1 - HOSPITAL (Interior, 45k sqft):
  Architecture: 45,000 × $2.50 × 1.5 (LOD 350) × 0.65 (interior) = $109,688
  + Occupied Risk: $109,688 × 0.15 = $16,453
  Architecture Total: $126,141
  
  MEPF: 45,000 × $3.00 × 1.5 × 0.65 = $131,625
  
  Area 1 Subtotal: $257,766

AREA 2 - LANDSCAPE (Natural, 1.5 acres):
  LOD 200 Rate: $625/acre
  = 1.5 × $625 = $938

DISCIPLINE SUBTOTAL: $257,766 + $938 = $258,704

SERVICES:
  Matterport (building only): 45,000 × $0.10 = $4,500

TRAVEL (Custom Override):
  Custom: $4,500

SUBTOTAL: $258,704 + $4,500 + $4,500 = $267,704

PAYMENT TERMS (Net 60 +10%):
  $267,704 × 0.10 = $26,770

EXPECTED TOTAL: $267,704 + $26,770 = $294,474

INTERNAL COSTS:
  Up Team: $258,704 × 0.65 = $168,158
  Scanning: 5 days × $600 + 4 hotels × $300 = $4,200
  Total Internal: $172,358
  
EXPECTED MARGIN: $294,474 - $172,358 = $122,116 (41%)
```

---

## TEST CASE 7: Risk-Stacked Industrial

### Configuration
```json
{
  "testName": "CPQ Test 7: Risk-Stacked Industrial",
  "targetPrice": "$120,000 - $150,000",
  "areas": [{
    "name": "Chemical Processing Warehouse",
    "buildingType": "4",
    "buildingTypeLabel": "Industrial/Warehouse",
    "squareFeet": 55000,
    "scope": "full",
    "disciplines": ["arch", "structure", "site"],
    "disciplineLods": { "arch": "200", "structure": "200", "site": "200" }
  }],
  "risks": ["hazardous", "no_power", "height"],
  "travel": {
    "dispatchLocation": "boise",
    "distance": 400
  },
  "paymentTerms": "net30",
  "services": []
}
```

### Expected Calculation
```
ARCHITECTURE (with stacked risks):
  Base: 55,000 × $2.50 × 1.0 (LOD 200) × 1.0 (full) = $137,500
  + Hazardous (+25%): $137,500 × 0.25 = $34,375
  + No Power (+20%): $137,500 × 0.20 = $27,500
  + Height (+10%): $137,500 × 0.10 = $13,750
  Architecture Total: $137,500 + $34,375 + $27,500 + $13,750 = $213,125

STRUCTURE:
  55,000 × $2.00 × 1.0 × 1.0 = $110,000

SITE:
  55,000 × $1.50 × 1.0 × 1.0 = $82,500

DISCIPLINE SUBTOTAL: $213,125 + $110,000 + $82,500 = $405,625

TRAVEL (Standard - Boise dispatch):
  Base: 400 × $3 = $1,200
  Scan Day Fee (≥75 mi): $300
  Travel Total: $1,500

SUBTOTAL: $405,625 + $1,500 = $407,125

PAYMENT TERMS (Net 30 +5%):
  $407,125 × 0.05 = $20,356

EXPECTED TOTAL: $407,125 + $20,356 = $427,481

INTERNAL COSTS:
  Up Team: $405,625 × 0.65 = $263,656
  Scanning: 6 days × $600 + 5 hotels × $300 = $5,100
  Total Internal: $268,756
  
EXPECTED MARGIN: $427,481 - $268,756 = $158,725 (37%)
```

---

## TEST CASE 8: Tier A Baseline

### Configuration
```json
{
  "testName": "CPQ Test 8: Tier A Baseline",
  "targetPrice": "~$140,000",
  "isTierA": true,
  "areas": [{
    "name": "Corporate Headquarters",
    "buildingType": "1",
    "buildingTypeLabel": "Office/Commercial",
    "squareFeet": 80000,
    "scope": "full",
    "disciplines": ["arch", "mepf"],
    "disciplineLods": { "arch": "300", "mepf": "300" }
  }],
  "tierAInputs": {
    "scanningCost": 35000,
    "modelingCost": 55000,
    "marginMultiplier": 2.5
  },
  "risks": [],
  "travel": {
    "dispatchLocation": "brooklyn",
    "distance": 50
  },
  "paymentTerms": "partner",
  "services": []
}
```

### Expected Calculation
```
TIER A FORMULA:
  Total Costs: $35,000 (scanning) + $55,000 (modeling) = $90,000
  Margin Multiplier: 2.5× (corresponds to ~60% margin)
  
  Client Price = $90,000 × 2.5 = $225,000

TRAVEL (Brooklyn Tier A, ≥50k sqft):
  Base Fee: $0
  Extra Miles: (50 - 20) × $4 = $120
  Travel Total: $120

EXPECTED TOTAL: $225,000 + $120 = $225,120

INTERNAL COSTS:
  Scanning: $35,000
  Modeling: $55,000
  Total Internal: $90,000
  
EXPECTED MARGIN: $225,120 - $90,000 = $135,120 (60%)
```

---

## TEST CASE 9: Tier A High

### Configuration
```json
{
  "testName": "CPQ Test 9: Tier A High",
  "targetPrice": "$220,000 - $250,000+",
  "isTierA": true,
  "areas": [{
    "name": "Enterprise Data Center",
    "buildingType": "13",
    "buildingTypeLabel": "Data Center",
    "squareFeet": 150000,
    "scope": "full",
    "disciplines": ["arch", "mepf", "structure"],
    "disciplineLods": { "arch": "350", "mepf": "350", "structure": "350" }
  }],
  "tierAInputs": {
    "scanningCost": 70000,
    "modelingCost": 95000,
    "marginMultiplier": 3.0
  },
  "risks": ["security"],
  "travel": {
    "dispatchLocation": "custom",
    "customTravelCost": 8500
  },
  "paymentTerms": "net60",
  "services": ["matterport", "georeferencing"]
}
```

### Expected Calculation
```
TIER A FORMULA:
  Total Costs: $70,000 (scanning) + $95,000 (modeling) = $165,000
  Margin Multiplier: 3.0× (corresponds to ~67% margin)
  
  Client Price = $165,000 × 3.0 = $495,000

SERVICES:
  Matterport: 150,000 × $0.10 = $15,000
  Georeferencing: $500
  Services Total: $15,500

TRAVEL (Custom Override):
  Custom: $8,500

SUBTOTAL: $495,000 + $15,500 + $8,500 = $519,000

PAYMENT TERMS (Net 60 +10%):
  $519,000 × 0.10 = $51,900

EXPECTED TOTAL: $519,000 + $51,900 = $570,900

INTERNAL COSTS:
  Scanning: $70,000
  Modeling: $95,000
  Total Internal: $165,000
  
EXPECTED MARGIN: $570,900 - $165,000 = $405,900 (71%)
```

---

## TEST CASE 10: Mixed-Scope Specialty

### Configuration
```json
{
  "testName": "CPQ Test 10: Mixed-Scope Specialty",
  "targetPrice": "$55,000 - $65,000",
  "areas": [{
    "name": "Boutique Hotel Renovation",
    "buildingType": "9",
    "buildingTypeLabel": "Hospitality",
    "squareFeet": 28000,
    "scope": "full",
    "disciplines": ["arch", "site"],
    "disciplineLods": { "arch": "300", "site": "300" },
    "mixedScope": {
      "interiorLod": "300",
      "exteriorLod": "350"
    }
  }],
  "risks": ["occupied"],
  "travel": {
    "dispatchLocation": "brooklyn",
    "distance": 8
  },
  "paymentTerms": "net30",
  "services": [],
  "actModeling": {
    "enabled": true,
    "sqft": 5000
  }
}
```

### Expected Calculation
```
ARCHITECTURE (Full Scope with Mixed LODs):
  Interior (70% of scope): 28,000 × $2.50 × 1.3 (LOD 300) × 0.70 = $63,700
  Exterior (30% of scope): 28,000 × $2.50 × 1.5 (LOD 350) × 0.30 = $31,500
  Base Architecture: $63,700 + $31,500 = $95,200
  
  + Occupied Risk (+15%): $95,200 × 0.15 = $14,280
  Architecture Total: $109,480

SITE:
  28,000 × $1.50 × 1.3 × 1.0 = $54,600

ACT MODELING:
  5,000 sqft × $2.00 = $10,000

DISCIPLINE SUBTOTAL: $109,480 + $54,600 + $10,000 = $174,080

TRAVEL (Brooklyn Tier B, 10k-50k sqft):
  Base Fee: $300
  Distance: 8 miles (no extra, < 20mi)
  Travel Total: $300

SUBTOTAL: $174,080 + $300 = $174,380

PAYMENT TERMS (Net 30 +5%):
  $174,380 × 0.05 = $8,719

EXPECTED TOTAL: $174,380 + $8,719 = $183,099

INTERNAL COSTS:
  Up Team: $174,080 × 0.65 = $113,152
  Scanning: 3 days × $600 + 2 hotels × $300 = $2,400
  Total Internal: $115,552
  
EXPECTED MARGIN: $183,099 - $115,552 = $67,547 (37%)
```

---

## Summary Table

| Test | Name | Total Sqft | Target | Key Validation |
|------|------|-----------|--------|----------------|
| 1 | Starter Interior | 2,000 | ~$5K | Min sqft floor (3k) |
| 2 | Multi-Discipline Mid | 18,500 | ~$200K | Multi-discipline + risk + services |
| 3 | Exterior Retrofit | 12,000 | ~$16K | Exterior scope + long travel |
| 4 | Roof/Facade | 6,500 | ~$8K | Roof scope + CAD |
| 5 | Landscape Campus | 3.2 ac | ~$3.5K | Landscape tiered pricing |
| 6 | Large Campus Mix | 45k + 1.5ac | ~$294K | Multi-area + custom travel |
| 7 | Risk-Stacked Industrial | 55,000 | ~$427K | Stacked risk premiums |
| 8 | Tier A Baseline | 80,000 | ~$225K | Manual Tier A pricing |
| 9 | Tier A High | 150,000 | ~$571K | Max Tier A + services |
| 10 | Mixed-Scope Specialty | 28,000 | ~$183K | Mixed LODs + ACT |

---

## Validation Checklist

For each test, verify:
- [ ] Discipline calculations match expected values
- [ ] LOD multipliers applied correctly
- [ ] Scope portions calculated accurately
- [ ] Risk premiums applied ONLY to Architecture
- [ ] Travel calculated correctly for dispatch location
- [ ] Payment terms premium applied
- [ ] Services priced correctly
- [ ] Internal costs (Up Team) at 65%
- [ ] Scanning estimates reasonable
- [ ] Profit margin above 40% floor (or flagged if below)

---

## Running the Tests

### In Original CPQ:
1. Open CPQ Calculator
2. Configure each test case using the JSON parameters above
3. Record the Grand Total and all line items
4. Compare against expected calculations

### In Scan2Plan-OS:
1. Navigate to Pipeline
2. Open each "CPQ Test #" lead
3. Click "Create Quote" to open CPQ Calculator
4. Configure using test parameters
5. Save quote and preview proposal
6. Compare results with original CPQ
