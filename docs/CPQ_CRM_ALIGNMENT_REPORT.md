# CPQ/CRM Alignment Report

**Version:** 1.0  
**Generated:** January 2026  
**Purpose:** Comprehensive field and pricing breakdown specification for CPQ/CRM alignment verification

---

## Table of Contents

1. [Identifier Ownership](#identifier-ownership)
2. [Quote Builder UI Fields](#quote-builder-ui-fields)
3. [Pricing Breakdown Structure](#pricing-breakdown-structure)
4. [API Request/Response Format](#api-requestresponse-format)
5. [Business Rules](#business-rules)
6. [Data Flow Diagram](#data-flow-diagram)

---

## Identifier Ownership

| Identifier | Owner | Format | Notes |
|------------|-------|--------|-------|
| Lead/Project ID | CRM | Integer (`1`, `2`, `3`...) | Auto-increment primary key |
| Quote ID | CPQ | Integer | CPQ's internal database ID |
| Quote Number | CPQ | String (`Q-2026-0045`) | Display format for proposals |
| UPID | CRM | String (`UPID-2026-001234`) | Universal Project ID for tracking |

**Flow:**
```
CRM creates lead (leadId: 123)
  → User opens Quote Builder
  → Quote Builder sends leadId to CPQ
  → CPQ returns: quoteId, quoteNumber, pricing
  → CRM stores quote reference with leadId link
```

---

## Quote Builder UI Fields

### Section 1: Project Areas

The Quote Builder supports multiple areas per quote. Each area has these fields:

| Field | ID | Type | Required | Default | Options/Validation |
|-------|-----|------|----------|---------|-------------------|
| Area Name | `name` | Text | No | `"Area 1"` | Max 100 chars |
| Kind | `kind` | Select | Yes | `"standard"` | `standard`, `landscape` |
| Building Type | `buildingType` | Select | Yes | `"1"` | See Building Types table |
| Square Feet / Acres | `squareFeet` | Text | Yes | `""` | Numeric; Landscape uses acres |
| Level of Detail | `lod` | Select | No | `"200"` | `200`, `300`, `350` |
| Scope | `scope` | Select | No | `"full"` | `full`, `interior`, `exterior`, `roof`, `facade` |
| Disciplines | `disciplines` | Checkbox Array | No | `["architecture"]` | Multi-select |
| CAD Deliverable | `includeCadDeliverable` | Boolean | No | `false` | Adds CAD package pricing |
| Additional Elevations | `additionalElevations` | Number | No | `0` | Count of extra interior elevations |
| Number of Roofs | `numberOfRoofs` | Number | No | `0` | For roof scope |
| Facades | `facades` | Array | No | `[]` | List of facade definitions |
| Grade Around Building | `gradeAroundBuilding` | Boolean | No | `false` | Include grade survey |
| Grade LoD | `gradeLod` | Select | No | `"300"` | `200`, `300`, `350` |

#### Building Types

| ID | Label | Unit | Notes |
|----|-------|------|-------|
| 1 | Office/Commercial | sqft | Standard building |
| 2 | Residential Single Family | sqft | Standard building |
| 3 | Residential Multi-Family | sqft | Standard building |
| 4 | Industrial/Warehouse | sqft | Standard building |
| 5 | Retail | sqft | Standard building |
| 6 | Healthcare | sqft | Higher complexity rates |
| 7 | Education K-12 | sqft | Standard building |
| 8 | Higher Education | sqft | Standard building |
| 9 | Hospitality | sqft | Standard building |
| 10 | Mixed Use | sqft | Standard building |
| 11 | Religious/Cultural | sqft | Standard building |
| 12 | Government/Civic | sqft | Standard building |
| 13 | Data Center | sqft | Higher complexity rates |
| 14 | Landscape - Built | **acres** | Auto-selects site discipline |
| 15 | Landscape - Natural | **acres** | Auto-selects site discipline |
| 16 | ACT Modeling | sqft | Auto-selects MEPF discipline |

#### Discipline Options

| ID | Label |
|----|-------|
| `architecture` | Architecture |
| `structure` | Structure |
| `mepf` | MEP/F (Mechanical, Electrical, Plumbing, Fire) |
| `site` | Site/Topography |

#### Level of Detail (LoD) Options

| ID | Label | Multiplier |
|----|-------|------------|
| `200` | LOD 200 | 1.0x (base) |
| `300` | LOD 300 | 1.3x |
| `350` | LOD 350 | 1.5x |

#### Scope Options

| ID | Label | Interior % | Exterior % |
|----|-------|-----------|-----------|
| `full` | Full (Interior + Exterior) | 65% | 35% |
| `interior` | Interior Only | 65% | 0% |
| `exterior` | Exterior Only | 0% | 35% |
| `roof` | Roof & Facades | 0% | 35% |
| `facade` | Facade Only | 0% | 25% |

---

### Section 2: Building Features

| Field | ID | Type | Default |
|-------|-----|------|---------|
| Has Basement | `hasBasement` | Boolean | `false` |
| Has Attic | `hasAttic` | Boolean | `false` |

---

### Section 3: Risk Factors

| Field | ID | Premium | Applied To |
|-------|-----|---------|-----------|
| Hazardous Conditions | `hazardous` | +25% | Architecture only |
| No Power/HVAC | `noPower` | +20% | Architecture only |
| Occupied Building | `occupied` | +15% | Architecture only |
| High Security Facility | `security` | +10% | Architecture only |
| Historic Preservation | `historic` | +12% | Architecture only |
| High-Rise (10+ floors) | `height` | +10% | Architecture only |

**Important:** Risk premiums apply ONLY to the Architecture discipline base cost. MEPF, Structure, Site, Travel, and services are excluded.

---

### Section 4: Travel Configuration

| Field | ID | Type | Required | Default |
|-------|-----|------|----------|---------|
| Dispatch Location | `dispatchLocation` | Select | Yes | `"WOODSTOCK"` |
| Distance (miles) | `distance` | Number | No | Auto-calculated |
| Custom Travel Cost | `customTravelCost` | Number | No | `null` (override) |

#### Dispatch Location Options

| ID | Label | Address |
|----|-------|---------|
| `WOODSTOCK` | Woodstock, NY | 3272 Rt 212, Bearsville, NY 12409 |
| `BROOKLYN` | Brooklyn, NY | 176 Borinquen Place, Brooklyn, NY 11211 |
| `TROY` | Troy, NY | 188 1st St, Troy, NY 12180 |
| `FLY_OUT` | Fly-Out (Air Travel) | N/A - manual entry |

#### Travel Pricing Logic

**Brooklyn Dispatch (Tiered by Project Size):**
| Tier | Project Size | Base Fee | Per-Mile Rate |
|------|-------------|----------|---------------|
| A | >= 50,000 sqft | $0 | $4/mile over 20 mi |
| B | 10,000 - 49,999 sqft | $300 | $4/mile over 20 mi |
| C | < 10,000 sqft | $150 | $4/mile over 20 mi |

**Other Dispatch Locations (Troy, Woodstock):**
- $0 base + $3/mile for all distances

---

### Section 5: Additional Services

| Service | ID | Rate | Unit |
|---------|-----|------|------|
| Matterport Capture | `matterport` | $0.10/sqft | Per sqft entered |
| Georeferencing | `georeferencing` | $500 flat | Per project |
| Scanning - Full Day | `scanningFullDay` | $2,500 | Per day |
| Scanning - Half Day | `scanningHalfDay` | $1,500 | Per half-day |

---

### Section 6: Tier A Pricing (Large Projects)

For projects >= 50,000 sqft, Tier A manual pricing is available:

| Field | ID | Type | Options |
|-------|-----|------|---------|
| Scanning Cost | `tierAScanningCost` | Select | `3500`, `7000`, `10500`, `15000`, `18500`, `other` |
| Scanning Cost Other | `tierAScanningCostOther` | Number | Manual entry |
| Modeling Cost | `tierAModelingCost` | Number | Manual entry |
| Margin Multiplier | `tierAMargin` | Select | `2.352`, `2.5`, `3`, `3.5`, `4` |

**Tier A Margin Options:**
| Value | Label |
|-------|-------|
| `2.352` | 2.352X (1.68 overhead x 1.4 min GM) |
| `2.5` | 2.5X |
| `3` | 3X |
| `3.5` | 3.5X |
| `4` | 4X |

---

### Section 7: Deliverables

| Field | ID | Type | Options |
|-------|-----|------|---------|
| BIM Deliverable | `bimDeliverable` | Checkbox Array | Revit, Archicad, Sketchup, Rhino, Other |
| BIM Other | `bimDeliverableOther` | Text | If "Other" selected |
| BIM Version | `bimVersion` | Text | e.g., "Revit 2024" |
| Custom Template | `customTemplate` | Select | `yes`, `no`, `other` |
| Template Other | `customTemplateOther` | Text | If "other" selected |

---

### Section 8: Payment Terms

| Value | Label | Premium |
|-------|-------|---------|
| `partner` | Partner (no hold on production) | None |
| `owner` | Owner (hold if delay) | None |
| `net30` | Net 30 | +5% surcharge |
| `net60` | Net 60 | +10% surcharge |
| `net90` | Net 90 | +15% surcharge |

---

### Section 9: Internal Notes

| Field | ID | Type | Notes |
|-------|-----|------|-------|
| SQFT Assumptions | `sqftAssumptions` | Textarea | Documentation |
| Assumed Gross Margin | `assumedGrossMargin` | Text | e.g., "45%" |
| Caveats for Profitability | `caveatsProfitability` | Textarea | Risk notes |
| Mixed Scope | `mixedScope` | Text | Scope clarifications |
| Insurance Requirements | `insuranceRequirements` | Textarea | COI requirements |

---

### Section 10: Timeline

| Field | ID | Type | Options |
|-------|-----|------|---------|
| Estimated Timeline | `estimatedTimeline` | Select | 1-6 weeks |
| Timeline Notes | `timelineNotes` | Textarea | Additional notes |

---

### Section 11: ACT Ceiling Options

| Field | ID | Type | Options |
|-------|-----|------|---------|
| ACT Scanning | `actScanning` | Select | `yes`, `no`, `other`, `ask_client` |
| ACT Scanning Notes | `actScanningNotes` | Textarea | If "other" |
| Above/Below ACT | `aboveBelowACT` | Select | `above`, `below`, `both`, `other` |
| ACT SQFT | `actSqft` | Number | Square feet for ACT scope |

---

### Section 12: Contacts

| Field | ID | Type |
|-------|-----|------|
| Account Contact | `accountContact` | Text |
| Account Contact Email | `accountContactEmail` | Email |
| Account Contact Phone | `accountContactPhone` | Phone |
| Design Pro Contact | `designProContact` | Text |
| Design Pro Company | `designProCompanyContact` | Text |
| Other Contact | `otherContact` | Text |
| Proof Links | `proofLinks` | Textarea (URLs) |

---

## Pricing Breakdown Structure

### Line Item Format

```typescript
interface PricingLineItem {
  label: string;           // Display text (includes sqft/discipline info)
  value: number;           // Dollar amount
  editable?: boolean;      // Allow inline editing
  isDiscount?: boolean;    // Show as negative/green
  isTotal?: boolean;       // Bold styling
  upteamCost?: number;     // Internal vendor cost
}
```

### Pricing Result Structure

```typescript
interface PricingResult {
  items: PricingLineItem[];        // All line items
  subtotal: number;                // Before adjustments
  totalClientPrice: number;        // Final quote amount
  totalUpteamCost: number;         // Internal costs
  profitMargin: number;            // Dollar profit
  
  // Discipline breakdowns for QBO sync
  disciplineTotals: {
    architecture: number;
    mep: number;
    structural: number;
    site: number;
    travel: number;
    services: number;
    risk: number;
    scanning: number;
  };
  
  // Scanning estimate
  scanningEstimate?: {
    totalSqft: number;
    scanDays: number;
    dailyRate: number;
    scanningCost: number;
    hotelPerDiemDays: number;
    hotelPerDiemCost: number;
    totalScanningCost: number;
  };
}
```

### Sample Pricing Breakdown Display

```
PRICING SUMMARY
-------------------------------
Area 1: Commercial Office (15,000 sqft)
  Architecture (LOD 300)           $14,625.00
                                   $0.975/sqft
  Structure (LOD 300)              $8,775.00
                                   $0.585/sqft
  MEPF (LOD 300)                   $13,650.00
                                   $0.91/sqft
-------------------------------
Risk Premium (Occupied +15%)       $2,193.75
                                   (on Architecture only)
-------------------------------
Travel (Brooklyn → 45 mi)          $400.00
  Base: $300 (Tier B)
  Mileage: $100 (25 mi × $4)
-------------------------------
Matterport (15,000 sqft)           $1,500.00
                                   $0.10/sqft
-------------------------------
SUBTOTAL                           $41,143.75
Payment Premium (Net 30 +5%)       $2,057.19
-------------------------------
TOTAL                              $43,200.94
===============================

COST SUMMARY (Internal)
-------------------------------
Total Client Price                 $43,200.94
-------------------------------
Architecture Cost                  $9,506.25
Structure Cost                     $5,703.75
MEPF Cost                          $8,872.50
-------------------------------
Total Upteam Cost                  $24,082.50
-------------------------------
Profit Margin                      $19,118.44
                                   44.2% GM
```

---

## API Request/Response Format

### Calculate Pricing Request

```
POST /api/pricing/calculate
Authorization: Bearer {CPQ_API_KEY}
Content-Type: application/json
```

```json
{
  "leadId": 123,
  "clientName": "ABC Architecture",
  "projectName": "Office Renovation",
  "projectAddress": "123 Main St, New York, NY",
  
  "areas": [
    {
      "id": "1",
      "name": "Main Building",
      "kind": "standard",
      "buildingType": "1",
      "squareFeet": "15000",
      "lod": "300",
      "scope": "full",
      "disciplines": ["architecture", "structure", "mepf"]
    }
  ],
  
  "risks": ["occupied"],
  
  "dispatchLocation": "BROOKLYN",
  "distance": 45,
  "customTravelCost": null,
  
  "services": {
    "matterport": 15000
  },
  
  "paymentTerms": "net30"
}
```

### Calculate Pricing Response

```json
{
  "success": true,
  
  "totalClientPrice": 43200.94,
  "totalUpteamCost": 24082.50,
  "grossMargin": 19118.44,
  "grossMarginPercent": 44.2,
  
  "lineItems": [
    {
      "id": "area-0-arch",
      "label": "Main Building - Architecture (15,000 sqft, LOD 300)",
      "category": "discipline",
      "clientPrice": 14625.00,
      "upteamCost": 9506.25,
      "details": {
        "sqft": 15000,
        "discipline": "architecture",
        "lod": "300",
        "scope": "full",
        "clientRate": 0.975,
        "upteamRate": 0.634
      }
    },
    {
      "id": "risk-occupied",
      "label": "Risk Premium (Occupied +15%)",
      "category": "risk",
      "clientPrice": 2193.75,
      "upteamCost": 0,
      "details": {
        "appliedTo": "architecture",
        "rate": 0.15
      }
    },
    {
      "id": "travel",
      "label": "Travel - Brooklyn (45 mi)",
      "category": "travel",
      "clientPrice": 400.00,
      "upteamCost": 0,
      "details": {
        "baseFee": 300,
        "mileageFee": 100,
        "tier": "B"
      }
    },
    {
      "id": "service-matterport",
      "label": "Matterport (15,000 sqft)",
      "category": "service",
      "clientPrice": 1500.00,
      "upteamCost": 0
    },
    {
      "id": "payment-premium",
      "label": "Payment Premium (Net 30 +5%)",
      "category": "adjustment",
      "clientPrice": 2057.19,
      "upteamCost": 0
    },
    {
      "id": "total",
      "label": "Total",
      "category": "total",
      "clientPrice": 43200.94,
      "upteamCost": 24082.50
    }
  ],
  
  "subtotals": {
    "modeling": 37050.00,
    "travel": 400.00,
    "riskPremiums": 2193.75,
    "services": 1500.00,
    "paymentPremium": 2057.19
  },
  
  "integrityStatus": "pass",
  "integrityFlags": [],
  
  "calculatedAt": "2026-01-10T15:30:00.000Z",
  "engineVersion": "1.0.0"
}
```

---

## Business Rules

### Margin Gate (FY26)

| Rule | Threshold | Action |
|------|-----------|--------|
| Margin Floor | < 40% gross margin | Block save, require price adjustment |
| Margin Warning | < 50% gross margin | Show warning, allow save |

**Minimum Project Charge:** $3,000

### Tier A Auto-Detection

Projects >= 50,000 sqft are automatically flagged as "Tier A" candidates.

### Landscape Conversion

Landscape areas (types 14, 15) input in acres, converted to sqft:
```
sqft = acres × 43,560
```

### Price Adjustment

When margin is below 40%, users can apply a price adjustment percentage:
```
adjustedPrice = basePrice × (1 + adjustmentPercent / 100)
```

This appears as a visible line item: "Price Adjustment (+X%)"

---

## Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         CRM (Scan2Plan OS)                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────┐     ┌─────────────────┐     ┌──────────────┐  │
│  │  Sales      │────>│  Deal Workspace │────>│ Quote Builder│  │
│  │  Pipeline   │     │                 │     │              │  │
│  │             │     │  Lead Details   │     │  Areas       │  │
│  │  leadId: 123│     │  leadId: 123    │     │  Risks       │  │
│  └─────────────┘     └─────────────────┘     │  Travel      │  │
│                                              │  Services    │  │
│                                              └──────┬───────┘  │
│                                                     │          │
│                                                     │ POST     │
│                                                     │ /api/cpq/│
│                                                     │ calculate│
│                                                     ▼          │
└─────────────────────────────────────────────────────┬──────────┘
                                                      │
                    ┌─────────────────────────────────┘
                    │
                    ▼
┌─────────────────────────────────────────────────────────────────┐
│                    CPQ API (External)                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  POST /api/pricing/calculate                                    │
│                                                                 │
│  Request:                      Response:                        │
│  {                             {                                │
│    "leadId": 123,                "totalClientPrice": 43200.94,  │
│    "areas": [...],               "totalUpteamCost": 24082.50,   │
│    "risks": [...],               "grossMarginPercent": 44.2,    │
│    "travel": {...},              "lineItems": [...],            │
│    "services": {...}             "integrityStatus": "pass"      │
│  }                             }                                │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
                                                      │
                    ┌─────────────────────────────────┘
                    │ Response
                    ▼
┌─────────────────────────────────────────────────────────────────┐
│                    CRM Quote Storage                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  cpqQuotes table:                                               │
│  ┌────────────────────────────────────────────────────────┐     │
│  │ id | leadId | areas | pricingBreakdown | totalPrice... │     │
│  │ 45 |   123  | JSON  |       JSON       |  43200.94     │     │
│  └────────────────────────────────────────────────────────┘     │
│                                                                 │
│  Exports to:                                                    │
│  - PandaDoc proposals                                           │
│  - QuickBooks estimates                                         │
│  - PDF scope documents                                          │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Test IDs Reference

For automated testing, these data-testid attributes are used:

| Element | Test ID Pattern |
|---------|-----------------|
| Add Building Area | `button-add-building-area` |
| Add Landscape Area | `button-add-landscape-area` |
| Area Card | `card-area-{kindIndex}` |
| Square Feet Input | `input-sqft-{kindIndex}` |
| Building Type Select | `select-building-type-{kindIndex}` |
| Calculate Price Button | `button-calculate-price` |
| Save Quote Button | `button-save-quote` |
| Total Price Display | `text-total-price` |
| Margin Display | `text-margin-percent` |
| Travel Address Input | `input-travel-address` |
| Project Address Input | `input-project-address` |

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | Jan 2026 | Initial alignment report |

---

## Contact

For questions about this specification, contact the development team.
