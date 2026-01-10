# CRM UI Specification for CPQ Integration

**Version:** 1.0  
**Last Updated:** January 2026  
**Purpose:** Enable CRM to match CPQ UI layout with identical field structure and pricing preview

---

## Overview

The CPQ (Configure-Price-Quote) system uses a **two-panel layout** for quote creation:
- **Lead Panel** (amber) - Business info, contacts, lead source & tracking
- **Quote Panel** (blue) - Technical scoping, areas, pricing, and deliverables

The CRM should implement this as **two tabs** with a shared **Preview Panel** (pricing summary) visible on both tabs.

---

## Layout Structure

```
┌─────────────────────────────────────────────────────────────────────┐
│  [Back to CRM]                                                      │
│  Create Quote / Edit Quote                                          │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌─────────────────────────────────┐  ┌──────────────────────────┐  │
│  │  [Tab 1: Lead] [Tab 2: Quote]   │  │  PREVIEW PANEL           │  │
│  │                                 │  │  (Sticky sidebar)        │  │
│  │  ┌─────────────────────────┐    │  │                          │  │
│  │  │ Tab Content             │    │  │  ┌──────────────────┐    │  │
│  │  │ (see sections below)    │    │  │  │ Pricing Summary  │    │  │
│  │  │                         │    │  │  │                  │    │  │
│  │  │                         │    │  │  │ Line items       │    │  │
│  │  │                         │    │  │  │ Subtotals        │    │  │
│  │  │                         │    │  │  │ Total            │    │  │
│  │  │                         │    │  │  │                  │    │  │
│  │  │                         │    │  │  │ Cost Summary     │    │  │
│  │  │                         │    │  │  │ (Internal)       │    │  │
│  │  │                         │    │  │  └──────────────────┘    │  │
│  │  │                         │    │  │                          │  │
│  │  │                         │    │  │  ┌──────────────────┐    │  │
│  │  │                         │    │  │  │ Integrity Audit  │    │  │
│  │  │                         │    │  │  │ (After Save)     │    │  │
│  │  │                         │    │  │  └──────────────────┘    │  │
│  │  └─────────────────────────┘    │  │                          │  │
│  │                                 │  └──────────────────────────┘  │
│  │  ┌─────────────────────────┐    │                                │
│  │  │ Action Buttons          │    │                                │
│  │  │ Save | Export | PandaDoc│    │                                │
│  │  └─────────────────────────┘    │                                │
│  └─────────────────────────────────┘                                │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Tab 1: Lead / Business Info

### Section 1.1: Business Information (Card)

| Field | ID | Type | Required | Default | Validation | Notes |
|-------|-----|------|----------|---------|------------|-------|
| Client / Company Name | `clientName` | Text | No | `""` | Max 255 chars | Client or company name |
| Project Name | `projectName` | Text | **Yes** | `""` | Non-empty, max 255 | Block save when empty |
| Property Address | `projectAddress` | Text | **Yes** | `""` | Non-empty | Full address for travel calc |
| Specific Building | `specificBuilding` | Text | No | `""` | Max 255 | Building/unit details |

### Section 1.2: Contact Information (Card)

| Field | ID | Type | Required | Default | Validation | Notes |
|-------|-----|------|----------|---------|------------|-------|
| Primary Contact Name | `accountContact` | Text | No | `""` | Max 255 | Main contact person |
| Contact Email | `accountContactEmail` | Email | No | `""` | RFC 5322 email format | |
| Contact Phone | `accountContactPhone` | Tel | No | `""` | Phone format | Allow +, (), -, spaces |
| Design Pro Contact | `designProContact` | Text | No | `""` | | Architect/engineer |
| Design Pro Company | `designProCompanyContact` | Text | No | `""` | | If different from client |
| Other Contacts | `otherContact` | Text | No | `""` | | Additional contacts |

### Section 1.3: Lead Source & Tracking (Card)

| Field | ID | Type | Required | Default | Options/Validation |
|-------|-----|------|----------|---------|-------------------|
| Lead Source | `source` | Select | No | `""` | See options below |
| Source Details | `sourceNote` | Textarea | No | `""` | Referral notes |
| Assist | `assist` | Select | No | `""` | Same as source options |
| Probability | `probabilityOfClosing` | Slider | No | `"50"` | 0-100, step 5 |
| Project Status | `projectStatus` | Radio | No | `""` | proposal, inhand, urgent, other |
| Status Other | `projectStatusOther` | Text | Conditional | `""` | Show when status = "other" |

**Source/Assist Dropdown Options:**
```
ABM
Cold outreach
Referral - Client
Referral - Partner
Existing customer
CEU
Proof Vault
Spec/Standards
Podcast
Site/SEO
Permit trigger
Compliance trigger
Procurement trigger
Event/Conference
Social
Vendor Onboarding
Other
Unknown
```

### Section 1.4: Documentation (Card)

| Field | ID | Type | Required | Default | Notes |
|-------|-----|------|----------|---------|-------|
| Proof Links | `proofLinks` | Textarea | No | `""` | URLs to photos, plans, etc. |
| NDA / Documents | `ndaFiles` | File Upload | No | `[]` | Multi-file, PDF/DOC, max 25MB each |

---

## Tab 2: Quote / Scoping

### Section 2.1: Project Areas (Multi-Area Form)

Each quote can have **multiple areas**. Users can add/remove areas dynamically.

#### Area Fields

| Field | ID | Type | Required | Default | Options/Notes |
|-------|-----|------|----------|---------|---------------|
| Area Name | `name` | Text | No | `""` | Optional label |
| Building Type | `buildingType` | Select | **Yes** | `""` | See building types table |
| Square Feet | `squareFeet` | Number | **Yes** | `""` | Acres for landscape (types 14-15) |
| Scope | `scope` | Radio | No | `"full"` | full, interior, exterior, roof |
| Disciplines | `disciplines` | Checkbox Set | No | `[]` | architecture, structure, mepf, site |
| Discipline LoDs | `disciplineLods` | Per-discipline Select | No | `"300"` | 100, 200, 250, 300, 350, 400 |
| Mixed Interior LoD | `mixedInteriorLod` | Select | No | `"300"` | For mixed scope - interior LoD |
| Mixed Exterior LoD | `mixedExteriorLod` | Select | No | `"300"` | For mixed scope - exterior LoD |
| Number of Roofs | `numberOfRoofs` | Number | No | `0` | Roof count for pricing |
| Facades | `facades` | Array | No | `[]` | Dynamic list of facade labels |
| Grade Around Building | `gradeAroundBuilding` | Boolean | No | `false` | Include grade survey |
| Grade LoD | `gradeLod` | Select | No | `"300"` | 100, 200, 300, 350 |
| Include CAD | `includeCad` | Boolean | No | `false` | CAD deliverable flag |
| Additional Elevations | `additionalElevations` | Number | No | `0` | Extra elevation count |

**Building Types (Select Options):**

| Value | Label | Notes |
|-------|-------|-------|
| 1 | Commercial - Simple | |
| 2 | Residential - Standard | |
| 3 | Residential - Luxury | |
| 4 | Commercial / Office | |
| 5 | Retail / Restaurants | |
| 6 | Kitchen / Catering Facilities | |
| 7 | Education | |
| 8 | Hotel / Theatre / Museum | |
| 9 | Hospitals / Mixed Use | |
| 10 | Mechanical / Utility Rooms | |
| 11 | Warehouse / Storage | |
| 12 | Religious Buildings | |
| 13 | Infrastructure / Roads / Bridges | |
| 14 | Built Landscape | Input = Acres, auto-lock site discipline |
| 15 | Natural Landscape | Input = Acres, auto-lock site discipline |
| 16 | ACT (Above Ceiling Tiles) | Auto-lock mepf discipline |

**Discipline Options:**

| Value | Label |
|-------|-------|
| `architecture` | Architecture |
| `structure` | Structure |
| `mepf` | MEPF (MEP/FP) |
| `site` | Site/Topography |

**LoD Options:**

| Value | Label |
|-------|-------|
| `100` | LOD 100 |
| `200` | LOD 200 |
| `250` | LOD 250 |
| `300` | LOD 300 (default) |
| `350` | LOD 350 |
| `400` | LOD 400 |

#### Special Building Type Behavior

- **Types 14-15 (Landscape):** Auto-select `site` discipline only, input label changes to "Acres", convert to sqft (× 43,560)
- **Type 16 (ACT):** Auto-select `mepf` discipline only

### Section 2.2: Building Features (Card)

| Field | ID | Type | Required | Default |
|-------|-----|------|----------|---------|
| Has Basement | `hasBasement` | Boolean | No | `false` |
| Has Attic | `hasAttic` | Boolean | No | `false` |
| Project Notes | `notes` | Textarea | No | `""` |

### Section 2.3: Risk Factors (Checkbox Group)

| Field | ID | Premium | Notes |
|-------|-----|---------|-------|
| Flood Zone | `flood` | +7% | Applied to Architecture base |
| Occupied Building | `occupied` | +15% | Applied to Architecture base |
| Hazardous Materials | `hazardous` | +25% | Applied to Architecture base |
| No Power Available | `noPower` | +20% | Applied to Architecture base |

### Section 2.4: Travel Calculator (Card)

| Field | ID | Type | Required | Default | Notes |
|-------|-----|------|----------|---------|-------|
| Dispatch Location | `dispatch` | Select | **Yes** | `"troy"` | troy, brooklyn, woodstock |
| Project Address | (from Tab 1) | Read-only | - | - | Synced from `projectAddress` |
| Distance | `distance` | Number | Auto | `null` | Auto-calculated via API |
| Distance Calculated | `distanceCalculated` | Boolean | - | `false` | Flag for UI state |
| Custom Travel Cost | `customTravelCost` | Currency | No | `null` | Manual override |

**Dispatch Options:**

| Value | Label |
|-------|-------|
| `troy` | Troy, NY |
| `woodstock` | Woodstock, NY |
| `brooklyn` | Brooklyn, NY |

**Travel Calculation Logic:**
- Brooklyn: Tier-based pricing (Tier A/B/C based on sqft) + $4/mile over 20 miles
- Troy/Woodstock: $3/mile + $300/day surcharge if distance > 75 miles and scan days >= 2

### Section 2.5: Additional Services (Quantity Inputs)

| Service | ID | Unit | Rate | Notes |
|---------|-----|------|------|-------|
| Matterport Tours | `matterport` | sqft | $0.10/sqft | Enter total sqft |
| CAD Deliverable | `cadDeliverable` | sets | $300/set | Minimum $300 |
| Georeferencing | `georeferencing` | flat | $1,000 | Per building/site |
| Scanning Full Day | `scanningFullDay` | each | $2,500 | Up to 10 hrs on-site |
| Scanning Half Day | `scanningHalfDay` | each | $1,500 | Up to 4 hrs on-site |
| ACT Scope | `actSqft` | sqft | $5.00/sqft | Above ceiling tiles |
| Expedited Service | `expeditedService` | toggle | +20% | Of total quote |

### Section 2.6: Deliverables (Card)

| Field | ID | Type | Required | Default | Options |
|-------|-----|------|----------|---------|---------|
| BIM Deliverable | `bimDeliverable` | Checkbox Set | No | `[]` | Revit, Archicad, Sketchup, Rhino, Other |
| BIM Other | `bimDeliverableOther` | Text | Conditional | `""` | Show when Other checked |
| BIM Version | `bimVersion` | Text | No | `""` | e.g., "Revit 2024" |
| Custom Template | `customTemplate` | Radio | No | `""` | yes, no, other |
| Template Other | `customTemplateOther` | Text | Conditional | `""` | Show when other selected |
| Template Files | `customTemplateFiles` | File Upload | Conditional | `[]` | Show when yes selected |

### Section 2.7: Scope Assumptions (Card)

| Field | ID | Type | Required | Default |
|-------|-----|------|----------|---------|
| Sqft Assumptions | `sqftAssumptions` | Textarea | No | `""` |
| Sqft Files | `sqftAssumptionsFiles` | File Upload | No | `[]` |
| Project Notes | `projectNotes` | Textarea | No | `""` |
| Scoping Documents | `scopingDocuments` | File Upload | No | `[]` |
| Mixed Scope | `mixedScope` | Text | No | `""` |
| Insurance Requirements | `insuranceRequirements` | Textarea | No | `""` |

### Section 2.8: Project Timeline (Card)

| Field | ID | Type | Required | Default | Options |
|-------|-----|------|----------|---------|---------|
| Estimated Timeline | `estimatedTimeline` | Radio | No | `""` | 1week, 2weeks, 3weeks, 4weeks, 5weeks, 6weeks |
| Timeline Notes | `timelineNotes` | Textarea | No | `""` | |

### Section 2.9: Payment Terms (Card)

| Field | ID | Type | Required | Default | Options |
|-------|-----|------|----------|---------|---------|
| Payment Terms | `paymentTerms` | Radio | No | `""` | partner, owner, net30, net60, net90, other |
| Terms Other | `paymentTermsOther` | Text | Conditional | `""` | Show when other selected |
| Payment Notes | `paymentNotes` | Textarea | No | `""` | Additional notes |

**Payment Terms Options with Labels:**

| Value | Display Label | Premium |
|-------|---------------|---------|
| `partner` | Partner (no hold on production) | None |
| `owner` | Owner (hold if delay) | None |
| `net30` | Net 30 +5% | +5% surcharge |
| `net60` | Net 60 +10% | +10% surcharge |
| `net90` | Net 90 +15% | +15% surcharge |
| `other` | Other | Manual |

### Section 2.10: Internal Notes (Card - Internal Only)

These fields are for internal use and may be hidden from client-facing views.

| Field | ID | Type | Required | Default | Options/Notes |
|-------|-----|------|----------|---------|---------------|
| Assumed Gross Margin | `assumedGrossMargin` | Text | No | `""` | e.g., "45%" |
| Caveats for Profitability | `caveatsProfitability` | Textarea | No | `""` | Risk notes |
| Tier A Scanning Cost | `tierAScanningCost` | Radio | No | `""` | 3500, 7000, 10500, 15000, 18500, other |
| Scanning Cost Other | `tierAScanningCostOther` | Text | Conditional | `""` | Show when other |
| Tier A Modeling Cost | `tierAModelingCost` | Text | No | `""` | Currency input |
| Tier A Margin | `tierAMargin` | Select | No | `""` | 2.352, 2.5, 3, 3.5, 4 |

**Tier A Margin Options:**

| Value | Label |
|-------|-------|
| `2.352` | 2.352X (1.68 overhead × 1.4 min GM) |
| `2.5` | 2.5X |
| `3` | 3X |
| `3.5` | 3.5X |
| `4` | 4X |

---

## Preview Panel (Sidebar)

The Preview Panel is a **sticky sidebar** visible on both tabs, showing real-time pricing calculations.

### Pricing Summary Section

Displays line items grouped by category with real-time updates:

```
PRICING SUMMARY
───────────────────────────
Area 1: Commercial Office
  Architecture (3,000 sqft)     $4,500.00
                                $1.50/sqft
  Structure (3,000 sqft)        $2,250.00
                                $0.75/sqft
  MEPF (3,000 sqft)             $3,000.00
                                $1.00/sqft
───────────────────────────
Risk Premium (+15%)               $675.00
Travel (150 miles)                $450.00
───────────────────────────
Matterport (3,000 sqft)           $300.00
CAD Deliverable (2 sets)          $600.00
───────────────────────────
SUBTOTAL                        $11,775.00
Payment Discount (-5%)            -$588.75
───────────────────────────
TOTAL                           $11,186.25
═══════════════════════════
```

### Line Item Editing Behavior

Some line items support inline editing:

1. **Editable Items**: Click on the price to enter edit mode
2. **Edit Mode**: Shows input field with current value
3. **Save**: Press Enter or blur to save
4. **Per-Sqft Display**: Items with sqft in label show calculated rate below (e.g., "$1.50/sqft")
5. **Discount Styling**: Items with `isDiscount: true` show in green with minus sign
6. **Total Styling**: Items with `isTotal: true` show bold and larger font

### Line Item Structure

```typescript
interface PricingLineItem {
  label: string;           // Display text (includes sqft info)
  value: number;           // Dollar amount
  editable?: boolean;      // Allow inline editing
  isDiscount?: boolean;    // Show as negative/green
  isTotal?: boolean;       // Bold styling
  upteamCost?: number;     // Internal vendor cost
}
```

### Cost Summary Section (Internal Only)

Shows internal cost breakdown visible to staff only:

```
COST SUMMARY (Internal)
───────────────────────────
Total Client Price          $11,186.25
───────────────────────────
UPTEAM COST BREAKDOWN
  Architecture (3,000 sqft)   $2,925.00
                              $0.98/sqft
  Structure (3,000 sqft)      $1,462.50
                              $0.49/sqft
  MEPF (3,000 sqft)           $1,950.00
                              $0.65/sqft
───────────────────────────
Total Upteam Cost             $6,337.50
───────────────────────────
Profit Margin                 $4,848.75
                              76.5% markup
```

---

## Integrity Audit Panel

Displayed after quote is saved, showing validation status.

### Audit Status Types

| Status | Badge Color | Icon | Meaning |
|--------|-------------|------|---------|
| `pass` | Green | ShieldCheck | All checks passed |
| `warning` | Yellow | ShieldAlert | Non-blocking issues |
| `blocked` | Red | Shield | Requires override to export |

### Integrity Flags Structure

```typescript
interface IntegrityFlag {
  code: string;            // e.g., "MARGIN_BELOW_FLOOR"
  severity: 'info' | 'warning' | 'error';
  category: string;        // e.g., "margin", "travel"
  title: string;           // Short description
  message: string;         // Detailed explanation
  details?: Record<string, any>;  // Additional data
}
```

### Validation Checks

| Check | Severity | Threshold | Action |
|-------|----------|-----------|--------|
| Margin Floor | Error | < 40% gross margin | Block exports |
| Margin Warning | Warning | < 50% gross margin | Show warning |
| Travel Required | Warning | Fly-out without travel cost | Show warning |
| LoD 350 Premium | Info | LoD 350 selected | Verify premium applied |
| Historical Variance | Warning/Error | > 15%/30% from historical | Show/block |

### Override Request Flow

1. **Trigger**: User clicks "Request Override" button on blocked quote
2. **Modal**: Dialog appears with:
   - Title: "Request Override"
   - Description: Explains the blocked status
   - Required Field: `justification` (Textarea, min 10 characters)
   - Buttons: "Submit Request" (primary), "Cancel" (secondary)
3. **Submit**: Creates override request in `audit_exceptions` database table
4. **Admin Review**: Admin views pending overrides at `/api/integrity/overrides/pending`
5. **Approval**: Admin approves/rejects via `PATCH /api/integrity/overrides/:id`
6. **Unlock**: Approved overrides set `overrideApproved: true`, enabling exports

### Export Gating Logic

Exports are blocked when all three conditions are true:

```typescript
const isExportBlocked = 
  existingQuote?.integrityStatus === 'blocked' && 
  existingQuote?.requiresOverride === true && 
  existingQuote?.overrideApproved !== true;
```

**Blocked State Effects:**
- Export Scope Doc: Disabled
- Create PandaDoc: Disabled
- Export QBO CSV: Disabled
- Export dropdown options: Disabled
- Tooltip: "Quote is blocked. Request override to export."

**Unblocked When:**
- `integrityStatus` is `pass` or `warning`
- OR `overrideApproved` is `true`

---

## Action Buttons

Located below the tab content area. Buttons are arranged in a horizontal flex layout with wrapping.

### Primary Actions (Always Visible)

| Button | Icon | Size | Action | Disabled When |
|--------|------|------|--------|---------------|
| Save Quote | Save | lg | Save quote to database, sync to CRM | Never (shows "Saving..." when pending) |
| Export Scope Doc | FileText | lg, outline | Generate PDF with scope details | `isExportBlocked` |
| Create PandaDoc | ExternalLink | lg, outline | Generate proposal in PandaDoc | `isExportBlocked` OR creating |
| Export QBO CSV | Download | lg, outline | QuickBooks invoice CSV | `isExportBlocked` |
| Open QuickBooks Import | ExternalLink | lg, outline | Opens QBO import page (external) | Never |
| More Export Options | Download | lg, outline | Opens dropdown menu | `isExportBlocked` |

### Export Dropdown Menu (More Export Options)

| Option | Icon | Action | Output |
|--------|------|--------|--------|
| Quote Only (Client) | FileText | `exportQuoteClient()` | PDF with client pricing only |
| Quote Only (Internal) | FileText | `exportQuoteInternal()` | PDF with internal costs + margins |
| --- Separator --- | | | |
| CRM Only | FileText | `exportCRMOnly()` | PDF with lead/contact/CRM data |
| --- Separator --- | | | |
| Export All (JSON) | FileText | `exportJSON()` | Full quote data as JSON file |

### Button State Behaviors

```typescript
// Disabled tooltip for blocked exports
title={isExportBlocked ? "Quote is blocked. Request override to export." : undefined}

// PandaDoc loading state
{isCreatingPandaDoc ? (
  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
) : (
  <ExternalLink className="h-4 w-4 mr-2" />
)}
{isCreatingPandaDoc ? "Creating..." : "Create PandaDoc"}
```

### QuickBooks Import Link

Opens external URL: `https://qbo.intuit.com/app/dataimport/invoices`

---

## API Integration

### Stateless Pricing Calculation

CRM can call CPQ's pricing API to get real-time pricing:

```
POST /api/pricing/calculate
Authorization: Bearer {CPQ_API_KEY}
Content-Type: application/json

{
  "areas": [...],
  "risks": [...],
  "travel": {...},
  "services": {...},
  "paymentTerms": "..."
}
```

**Response includes:**
- `totalClientPrice` - Final quote amount
- `totalUpteamCost` - Internal vendor costs
- `grossMargin` - Profit margin percentage
- `lineItems` - Detailed pricing breakdown
- `integrityFlags` - Validation issues

### Quote Sync

After quote save, CPQ syncs to CRM:

```
POST /api/quotes/{id}/sync-to-crm
```

CRM can fetch quote details:

```
GET /api/crm/quotes/{id}
Authorization: Bearer {CPQ_API_KEY}
```

---

## State Synchronization

### Tab 1 → Tab 2 Data Flow

The following fields from Tab 1 are used in Tab 2:

| Tab 1 Field | Tab 2 Usage |
|-------------|-------------|
| `projectAddress` | Travel Calculator distance calculation |
| `clientName` | PDF generation, PandaDoc |
| `projectName` | Quote identification |
| `accountContact` | Proposal recipient |
| `accountContactEmail` | PandaDoc recipient email |

### Real-Time Preview Updates

The Preview Panel updates whenever any of these change:
- Areas (building type, sqft, disciplines, LoDs)
- Risk factors
- Travel distance
- Additional services
- Payment terms

---

## File Upload Specifications

| Field | Max Size | Allowed Types | Multi-File |
|-------|----------|---------------|------------|
| `ndaFiles` | 25MB | PDF, DOC, DOCX | Yes |
| `customTemplateFiles` | 25MB | RVT, RTE, SKP | Yes |
| `sqftAssumptionsFiles` | 25MB | PDF, JPG, PNG | Yes |
| `scopingDocuments` | 25MB | PDF, DOC, JPG, PNG | Yes |

---

## Validation Summary

### Required Fields (Block Save)

- `projectName` - Must be non-empty
- `projectAddress` - Must be non-empty
- `buildingType` (per area) - Must be selected
- `squareFeet` (per area) - Must be > 0

### Conditional Fields

| Condition | Show Field |
|-----------|------------|
| `projectStatus === 'other'` | `projectStatusOther` |
| `customTemplate === 'yes'` | `customTemplateFiles` |
| `customTemplate === 'other'` | `customTemplateOther` |
| `bimDeliverable.includes('Other')` | `bimDeliverableOther` |
| `paymentTerms === 'other'` | `paymentTermsOther` |
| `tierAScanningCost === 'other'` | `tierAScanningCostOther` |

---

## Default Values Summary

```typescript
const defaults = {
  // Strings
  clientName: "",
  projectName: "",
  projectAddress: "",
  specificBuilding: "",
  accountContact: "",
  accountContactEmail: "",
  accountContactPhone: "",
  source: "",
  assist: "",
  projectStatus: "",

  // Numbers/Sliders
  probabilityOfClosing: "50",
  distance: null,
  customTravelCost: null,

  // Booleans
  hasBasement: false,
  hasAttic: false,
  distanceCalculated: false,

  // Arrays
  disciplines: [],
  risks: [],
  bimDeliverable: [],
  ndaFiles: [],
  customTemplateFiles: [],
  sqftAssumptionsFiles: [],
  scopingDocuments: [],

  // Area defaults
  areaDefaults: {
    id: "auto-generated",  // Use timestamp or UUID
    name: "",
    buildingType: "",
    squareFeet: "",
    scope: "full",
    disciplines: [],
    disciplineLods: {},  // Each discipline defaults to "300"
    mixedInteriorLod: "300",
    mixedExteriorLod: "300",
    numberOfRoofs: 0,
    facades: [],
    gradeAroundBuilding: false,
    gradeLod: "300",
    includeCad: false,
    additionalElevations: 0,
  }
};
```

---

## Component Reference

| CPQ Component | Purpose | Tab |
|---------------|---------|-----|
| `LeadFields.tsx` | Business info, contacts, lead tracking | Tab 1 |
| `ScopeFields.tsx` | Building features, deliverables, assumptions | Tab 2 |
| `InternalNotesFields.tsx` | Margin notes, Tier A pricing | Tab 2 |
| `QuoteFields.tsx` | Payment terms | Tab 2 |
| `AreaInput.tsx` | Project area form | Tab 2 |
| `RiskFactors.tsx` | Risk checkbox group | Tab 2 |
| `TravelCalculator.tsx` | Dispatch, distance, travel costs | Tab 2 |
| `AdditionalServices.tsx` | Add-on services | Tab 2 |
| `PricingSummary.tsx` | Preview panel pricing | Sidebar |
| `IntegrityAuditPanel.tsx` | Audit status & overrides | Sidebar |
