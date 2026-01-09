# CPQ Scoping Fields - Complete Reference

This document provides a comprehensive list of all fields used in the Scan2Plan CPQ system. Use this to ensure the CRM has all required fields for complete integration.

---

## PostMessage Protocol

The CRM sends data to the CPQ via `window.postMessage()` with type `CPQ_SCOPING_PAYLOAD`:

```typescript
window.parent.postMessage({
  type: "CPQ_SCOPING_PAYLOAD",
  leadId: number,
  projectDetails: { ... },
  areas: [ ... ],
  risks: [ ... ],
  travel: { ... },
  services: { ... },
  scopingData: { ... }
}, "https://cpq.scan2plan.dev");
```

---

## 1. Project Details (`projectDetails`)

| Field | Type | Description | Example |
|-------|------|-------------|---------|
| `clientName` | string | Company/client name | "ACME Architecture" |
| `projectName` | string | Project name | "Office Renovation Phase 1" |
| `projectAddress` | string | Full street address | "123 Main St, Albany NY 12205" |
| `specificBuilding` | string | Building identifier | "Building A - East Wing" |
| `typeOfBuilding` | string | General building description | "5-story commercial office" |
| `hasBasement` | boolean | Has basement level | `true` |
| `hasAttic` | boolean | Has attic level | `true` |
| `notes` | string | General project notes | "Access via loading dock only" |

---

## 2. Areas (`areas[]`)

Each area is an object in the areas array. **Landscape areas (buildingType 14/15) use acres in `squareFeet` field.**

| Field | Type | Description | Example |
|-------|------|-------------|---------|
| `id` | string | Unique area identifier | "area-1" or timestamp |
| `name` | string | Area name/label | "Main Building" |
| `buildingType` | string | Building type ID (see table below) | "1" |
| `squareFeet` | string | Area size (sqft for buildings, **acres for landscape**) | "25000" or "2.5" |
| `scope` | string | Scan scope type | "full" \| "interior" \| "exterior" \| "mixed" |
| `disciplines` | string[] | Selected disciplines | ["arch", "structure", "mepf"] |
| `disciplineLods` | object | LoD per discipline | `{"arch": "300", "mepf": "200"}` |
| `mixedInteriorLod` | string | Interior LoD for mixed scope | "300" |
| `mixedExteriorLod` | string | Exterior LoD for mixed scope | "300" |
| `numberOfRoofs` | number | Roof/plan count | 2 |
| `facades` | Facade[] | Facade definitions (see below) | `[{type: "standard", lod: "300"}]` |
| `gradeAroundBuilding` | boolean | Include site grade | `true` |
| `gradeLod` | string | Grade LoD if included | "300" |
| `includeCad` | boolean | Include CAD package | `true` |
| `additionalElevations` | number | Extra interior CAD elevations | 15 |

### Building Type IDs

| ID | Building Type |
|----|---------------|
| 1 | Office Building |
| 2 | Educational |
| 3 | Healthcare |
| 4 | Industrial |
| 5 | Residential Multi-Family |
| 6 | Residential Single-Family |
| 7 | Retail |
| 8 | Hospitality |
| 9 | Mixed-Use |
| 10 | Warehouse |
| 11 | Religious |
| 12 | Government |
| 13 | Parking Structure |
| **14** | **Built Landscape** (uses acres) |
| **15** | **Natural Landscape** (uses acres) |
| 16 | ACT Ceilings Only |
| 17 | Matterport Only |

### Facade Object

```typescript
interface Facade {
  type: "standard" | "ornate" | "curtainwall";
  lod: "200" | "300" | "350";
}
```

### Disciplines

| ID | Display Name |
|----|--------------|
| `arch` | Architecture |
| `structure` | Structure |
| `mepf` | MEPF |
| `site` | Site/Topography |
| `matterport` | Matterport |

### Scope Types

| Value | Description |
|-------|-------------|
| `full` | Full interior + exterior scan |
| `interior` | Interior only |
| `exterior` | Exterior only |
| `mixed` | Mixed scope (different LoDs for int/ext) |

---

## 3. Risks (`risks[]`)

Array of risk factor strings. These apply **risk premiums to Architecture discipline only**.

| Value | Description | Typical Premium |
|-------|-------------|-----------------|
| `occupied` | Occupied building | 15% |
| `hazardous` | Hazardous conditions | 25% |
| `no_power` | No power/HVAC | 20% |

**Example:**
```json
"risks": ["occupied", "hazardous"]
```

---

## 4. Travel (`travel`)

| Field | Type | Description | Example |
|-------|------|-------------|---------|
| `dispatchLocation` | string | Dispatch point | "troy" \| "brooklyn" \| "woodstock" |
| `distance` | number | Miles to project site | 45 |
| `customTravelCost` | number \| null | Override calculated travel | 500 |

### Travel Logic

- **Standard dispatch (Troy/Woodstock)**: $3/mile
- **Brooklyn dispatch**: Tiered base + $4/mile over 20 miles
  - Tier C (<10k sqft): $150 base
  - Tier B (10k-50k sqft): $300 base
  - Tier A (50k+ sqft): $0 base
- **Scan Day Fee**: $300/day at 75+ miles

---

## 5. Services (`services`)

Object with service keys and values (typically quantities or costs).

| Key | Description | Type |
|-----|-------------|------|
| `matterportSqft` | Matterport capture square footage | number |
| `virtualTour` | Virtual tour creation | number |
| `additionalFloorPlans` | Extra floor plan exports | number |

---

## 6. Scoping Data (`scopingData`)

### Deliverables

| Field | Type | Description | Options/Example |
|-------|------|-------------|-----------------|
| `interiorCadElevations` | string | Number of interior CAD elevations | "15" |
| `bimDeliverable` | string[] | BIM format(s) | ["Revit", "Archicad", "Sketchup", "Rhino", "Other"] |
| `bimDeliverableOther` | string | Other BIM format | "IFC" |
| `bimVersion` | string | BIM software version | "Revit 2024" |
| `customTemplate` | string | Template option | "yes" \| "no" \| "other" |
| `customTemplateOther` | string | Other template description | "Modified AIA template" |
| `customTemplateFiles` | File[] | Uploaded template files | (file array) |

### ACT Ceiling Pricing

| Field | Type | Description | Options |
|-------|------|-------------|---------|
| `aboveBelowACT` | string | ACT scan scope | "above" \| "below" \| "both" \| "other" |
| `aboveBelowACTOther` | string | Other ACT scope | "Partial ceiling only" |
| `actSqft` | string | ACT ceiling square footage | "5000" |

### Internal Notes & Assumptions

| Field | Type | Description |
|-------|------|-------------|
| `sqftAssumptions` | string | Square footage assumptions notes |
| `sqftAssumptionsFiles` | File[] | Supporting documents |
| `assumedGrossMargin` | string | Expected margin (e.g., "30%") |
| `caveatsProfitability` | string | Profitability risk factors |
| `projectNotes` | string | Additional internal notes |
| `scopingDocuments` | File[] | Uploaded scoping docs |
| `mixedScope` | string | Mixed scope description |
| `insuranceRequirements` | string | Special insurance needs |

### Tier A Pricing (Projects ≥50k sqft)

| Field | Type | Description | Options |
|-------|------|-------------|---------|
| `tierAScanningCost` | string | Scanning cost tier | "3500" \| "7000" \| "10500" \| "15000" \| "18500" \| "other" |
| `tierAScanningCostOther` | string | Custom scanning cost | "8000" |
| `tierAModelingCost` | string | Modeling cost estimate | "12500" |
| `tierAMargin` | string | Margin multiplier | "2.352" \| "2.5" \| "3" \| "3.5" \| "4" |

**Formula:** `Client Price = (Scanning + Modeling) × Margin`

### Project Timeline

| Field | Type | Description | Options |
|-------|------|-------------|---------|
| `estimatedTimeline` | string | Estimated delivery | "1week" \| "2weeks" \| "3weeks" \| "4weeks" \| "5weeks" \| "6weeks" |
| `timelineOther` | string | Custom timeline | (not currently used) |
| `timelineNotes` | string | Timeline notes/caveats |

### Payment Terms

| Field | Type | Description | Options |
|-------|------|-------------|---------|
| `paymentTerms` | string | Payment structure | "partner" \| "owner" \| "net30" \| "net60" \| "net90" \| "other" |
| `paymentTermsOther` | string | Custom payment terms | "Net 45" |
| `paymentNotes` | string | Payment notes |

**Payment Terms Details:**
- `partner` = No hold on production
- `owner` = Hold if payment delay
- `net30` = Net 30 +5% fee
- `net60` = Net 60 +10% fee
- `net90` = Net 90 +15% fee

### Contacts & Communication

| Field | Type | Description |
|-------|------|-------------|
| `accountContact` | string | Primary account contact name |
| `accountContactEmail` | string | Account contact email |
| `accountContactPhone` | string | Account contact phone |
| `phoneNumber` | string | Additional phone number |
| `designProContact` | string | Design professional contact |
| `designProCompanyContact` | string | Design pro company info |
| `otherContact` | string | Other contact info |
| `proofLinks` | string | Links to proof documents/photos |
| `ndaFiles` | File[] | Uploaded NDA files |

### Lead Tracking

| Field | Type | Description | Options |
|-------|------|-------------|---------|
| `source` | string | Lead source | See options below |
| `sourceNote` | string | Source details |
| `assist` | string | Assist attribution | Same as source options |
| `probabilityOfClosing` | string | Win probability (0-100) | "50" |
| `projectStatus` | string | Current status | "proposal" \| "inhand" \| "urgent" \| "other" |
| `projectStatusOther` | string | Custom status | "Pending approval" |

**Source/Assist Options:**
- ABM
- Cold outreach
- Referral - Client
- Referral - Partner
- Existing customer
- CEU
- Proof Vault
- Spec/Standards
- Podcast
- Site/SEO
- Permit trigger
- Compliance trigger
- Procurement trigger
- Event/Conference
- Social
- Vendor Onboarding
- Other
- Unknown

---

## 7. Complete Payload Example

```typescript
{
  type: "CPQ_SCOPING_PAYLOAD",
  leadId: 12345,

  projectDetails: {
    clientName: "Smith Architecture",
    projectName: "Main Street Renovation",
    projectAddress: "456 Main St, Troy NY 12180",
    specificBuilding: "Building A",
    typeOfBuilding: "Commercial Office",
    hasBasement: true,
    hasAttic: false,
    notes: "Weekend access only"
  },

  areas: [
    {
      id: "area-1",
      name: "Main Building",
      buildingType: "1",           // Office Building
      squareFeet: "75000",
      scope: "full",
      disciplines: ["arch", "structure", "mepf"],
      disciplineLods: {
        "arch": "300",
        "structure": "200",
        "mepf": "200"
      },
      mixedInteriorLod: "300",
      mixedExteriorLod: "300",
      numberOfRoofs: 1,
      facades: [
        { type: "standard", lod: "300" }
      ],
      gradeAroundBuilding: true,
      gradeLod: "300",
      includeCad: true,
      additionalElevations: 10
    },
    {
      id: "area-2",
      name: "Parking Lot",
      buildingType: "14",          // Built Landscape
      squareFeet: "2.5",           // ACRES, not sqft!
      scope: "full",
      disciplines: ["site"],       // Auto-locked for landscape
      disciplineLods: { "site": "300" },
      mixedInteriorLod: "300",
      mixedExteriorLod: "300",
      numberOfRoofs: 0,
      facades: [],
      gradeAroundBuilding: false,
      gradeLod: "300",
      includeCad: false,
      additionalElevations: 0
    }
  ],

  risks: ["occupied"],

  travel: {
    dispatchLocation: "troy",
    distance: 35,
    customTravelCost: null
  },

  services: {},

  scopingData: {
    // Deliverables
    interiorCadElevations: "10",
    bimDeliverable: ["Revit"],
    bimDeliverableOther: "",
    bimVersion: "Revit 2024",
    customTemplate: "no",
    customTemplateOther: "",

    // ACT
    aboveBelowACT: "",
    aboveBelowACTOther: "",
    actSqft: "",

    // Internal
    sqftAssumptions: "Based on floor plans provided",
    assumedGrossMargin: "45%",
    caveatsProfitability: "",
    projectNotes: "Priority client",
    mixedScope: "",
    insuranceRequirements: "$2M umbrella required",

    // Tier A (projects 50k+ sqft)
    tierAScanningCost: "7000",
    tierAScanningCostOther: "",
    tierAModelingCost: "15000",
    tierAMargin: "3",

    // Timeline
    estimatedTimeline: "3weeks",
    timelineOther: "",
    timelineNotes: "Rush if possible",

    // Payment
    paymentTerms: "partner",
    paymentTermsOther: "",
    paymentNotes: "",

    // Contacts
    accountContact: "John Smith",
    accountContactEmail: "john@smitharch.com",
    accountContactPhone: "518-555-1234",
    phoneNumber: "",
    designProContact: "Jane Doe",
    designProCompanyContact: "Smith Architecture LLC",
    otherContact: "",
    proofLinks: "https://drive.google.com/...",

    // Lead Tracking
    source: "Referral - Client",
    sourceNote: "Referred by ABC Corp",
    assist: "",
    probabilityOfClosing: "75",
    projectStatus: "proposal",
    projectStatusOther: ""
  }
}
```

---

## 8. Special Logic Notes

### Landscape Areas (Building Types 14, 15)
- `squareFeet` field contains **acres** (decimal), not square feet
- Auto-locked to `disciplines: ["site"]`
- Auto-locked to `scope: "full"`
- Conversion: `acres × 43,560 = sqft`
- Uses hardcoded per-acre tiered pricing

### Risk Premiums
- Applied to **Architecture discipline subtotal ONLY**
- NOT applied to entire project total
- Calculated as: `archTotal × (1 + occupied% + hazardous% + noPower%)`

### Tier A Projects (≥50,000 sqft)
- Uses fixed scanning cost options instead of matrix pricing
- Uses manual modeling cost from reference spreadsheet
- Uses margin multipliers (2.352X - 4X)
- Brooklyn travel has $0 base fee

### Brooklyn Travel Tiers
- Tier C (<10k sqft): $150 base + $4/mi over 20mi
- Tier B (10k-50k sqft): $300 base + $4/mi over 20mi
- Tier A (50k+ sqft): $0 base + $4/mi over 20mi

---

## 9. CRM Implementation Checklist

- [ ] Send `CPQ_SCOPING_PAYLOAD` message type
- [ ] Include `leadId` for quote linking
- [ ] All `projectDetails` fields populated
- [ ] Areas array with all required fields
- [ ] Building type IDs match CPQ (1-17)
- [ ] Landscape areas use acres in `squareFeet`
- [ ] Disciplines use correct IDs (arch, structure, mepf, site, matterport)
- [ ] LoDs use string values ("200", "300", "350")
- [ ] Risks array uses correct values (occupied, hazardous, no_power)
- [ ] Travel object with dispatchLocation and distance
- [ ] All scopingData fields mapped
- [ ] Payment terms use correct values
- [ ] Source/assist use correct dropdown values
- [ ] Probability is string "0"-"100"
- [ ] Project status uses correct values

---

*This document covers all CPQ scoping fields for Scan2Plan CRM integration.*
