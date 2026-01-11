# CPQ Integration Guide
## Scan2Plan OS - Configure, Price, Quote System
**Last Updated:** January 11, 2026

---

## Table of Contents
1. [System Overview](#1-system-overview)
2. [Architecture Diagram](#2-architecture-diagram)
3. [Data Flow](#3-data-flow)
4. [Database Schema](#4-database-schema)
5. [API Endpoints](#5-api-endpoints)
6. [Pricing Logic](#6-pricing-logic)
7. [Margin Target System](#7-margin-target-system)
8. [Known Issues & Challenges](#8-known-issues--challenges)
9. [Future Improvements](#9-future-improvements)

---

## 1. System Overview

The CPQ (Configure, Price, Quote) system is a hybrid architecture:

| Component | Location | Purpose |
|-----------|----------|---------|
| **External CPQ Service** | `https://scan2plan-cpq.replit.app` | Core pricing calculation engine |
| **CRM Backend (Proxy)** | `server/routes/cpq.ts` | Proxies requests, applies margin adjustments |
| **Frontend Calculator** | `client/src/features/cpq/Calculator.tsx` | Full standalone CPQ UI |
| **Deal Workspace** | `client/src/pages/DealWorkspace.tsx` | Embedded quote builder in lead detail |
| **Pricing Utilities** | `client/src/features/cpq/pricing.ts` | Static pricing tables, type definitions |

### Key Business Rules
- **40% Margin Floor** (FY26_GOALS.MARGIN_FLOOR): Quotes below this are BLOCKED
- **45% Guardrail**: Quotes between 40-45% show WARNING but can be saved
- **Tier A Threshold**: Deals over $100K get additional scrutiny
- **Test Jobs**: All test emails use `chase@scan2plan.io`

---

## 2. Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           FRONTEND (React)                               │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌──────────────────────┐     ┌───────────────────────────────────┐    │
│  │  DealWorkspace.tsx   │     │     Calculator.tsx (Standalone)   │    │
│  │  - Embedded sidebar  │     │     - Full CPQ interface          │    │
│  │  - Margin slider     │     │     - Area configuration          │    │
│  │  - Quick calculate   │     │     - Risk factors                │    │
│  └──────────┬───────────┘     └───────────────┬───────────────────┘    │
│             │                                  │                         │
│             └─────────────┬────────────────────┘                        │
│                           │                                              │
│                           ▼                                              │
│  ┌────────────────────────────────────────────────────────────────┐    │
│  │                    pricing.ts (Client-side)                     │    │
│  │  - BUILDING_TYPES (16 types)                                    │    │
│  │  - BASE_RATES per sqft                                          │    │
│  │  - LOD_MULTIPLIERS                                              │    │
│  │  - TRAVEL_RATES by dispatch location                            │    │
│  └────────────────────────────────────────────────────────────────┘    │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ POST /api/cpq/calculate
                                    │ { areas, marginTarget, risks, ... }
                                    ▼
┌──────────────────────────────────────────────────────────────────────────┐
│                        BACKEND (Express.js)                              │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌────────────────────────────────────────────────────────────────┐     │
│  │              server/routes/cpq.ts                               │     │
│  │                                                                  │     │
│  │  POST /api/cpq/calculate                                        │     │
│  │  ├─ Proxy to External CPQ (CPQ_BASE_URL)                        │     │
│  │  ├─ Apply marginTarget adjustment (post-proxy)                  │     │
│  │  │   └─ clientPrice = upteamCost / (1 - marginTarget)          │     │
│  │  ├─ Recalculate totals and grossMarginPercent                   │     │
│  │  └─ Apply integrity checks (40% floor, 45% guardrail)          │     │
│  │                                                                  │     │
│  │  POST /api/leads/:id/cpq-quotes                                 │     │
│  │  ├─ Extract areas from requestData (if nested)                  │     │
│  │  ├─ Normalize dispatch locations (uppercase)                    │     │
│  │  └─ Save quote to database                                      │     │
│  │                                                                  │     │
│  └────────────────────────────────────────────────────────────────┘     │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ POST ${CPQ_BASE_URL}/api/pricing/calculate
                                    │ Authorization: Bearer ${CPQ_API_KEY}
                                    ▼
┌──────────────────────────────────────────────────────────────────────────┐
│                    EXTERNAL CPQ SERVICE                                  │
│                    (scan2plan-cpq.replit.app)                           │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  - Calculates base pricing from areas, building types, LOD              │
│  - Returns lineItems with upteamCost and clientPrice                    │
│  - Returns subtotals, totals, integrityStatus                           │
│  - Does NOT apply marginTarget (CRM does this post-response)            │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Data Flow

### Calculate Price Flow

```
1. User configures areas in UI
   ├─ Building type, sqft, LOD per discipline
   ├─ Risk factors (ACT, complex geometry, etc.)
   ├─ Dispatch location and distance
   └─ Margin target slider (35%-60%)

2. Frontend sends POST /api/cpq/calculate
   {
     areas: [...],
     dispatchLocation: "WOODSTOCK",
     distance: 150,
     risks: { act: true, complexGeometry: false, ... },
     marginTarget: 0.45,  // <-- Slider value
     services: { matterport: false, actScan: false }
   }

3. Backend proxies to External CPQ
   → POST https://scan2plan-cpq.replit.app/api/pricing/calculate

4. External CPQ returns base pricing
   {
     success: true,
     lineItems: [
       { id: "area-0-arch", upteamCost: 5000, clientPrice: 7500, ... },
       ...
     ],
     totalClientPrice: 75000,
     totalUpteamCost: 50000,
     grossMarginPercent: 33.3,  // Based on external calculation
     integrityStatus: "blocked"
   }

5. Backend applies marginTarget adjustment
   ├─ For each lineItem: clientPrice = upteamCost / (1 - 0.45)
   ├─ Recalculates totalClientPrice, grossMargin, grossMarginPercent
   ├─ New margin: 45% (based on slider)
   └─ Updates integrityStatus: "passed" (>= 40%)

6. Response sent to frontend
   {
     success: true,
     lineItems: [...], // With adjusted clientPrice
     totalClientPrice: 90909,  // Adjusted
     totalUpteamCost: 50000,   // Unchanged
     grossMarginPercent: 45.0, // Matches slider
     integrityStatus: "passed",
     integrityFlags: []
   }
```

### Save Quote Flow

```
1. User clicks "Save Quote" (only enabled if integrityStatus !== "blocked")

2. Frontend sends POST /api/leads/:id/cpq-quotes
   {
     leadId: 74,
     totalPrice: 90909,
     totalCost: 50000,
     grossMargin: 40909,
     grossMarginPercent: 45.0,
     lineItems: [...],
     subtotals: { modeling: 80000, travel: 5909, ... },
     integrityStatus: "passed",
     integrityFlags: [],
     requestData: {
       areas: [...],        // <-- Areas nested here!
       dispatchLocation: "WOODSTOCK",
       distance: 150,
       risks: {...},
       paymentTerms: "standard"
     }
   }

3. Backend extracts areas from requestData
   const areas = normalizedData.areas || normalizedData.requestData?.areas || [];

4. Quote saved to cpq_quotes table
```

---

## 4. Database Schema

### cpq_quotes Table

```sql
CREATE TABLE cpq_quotes (
  id SERIAL PRIMARY KEY,
  lead_id INTEGER REFERENCES leads(id),
  quote_number TEXT NOT NULL,
  
  -- Project Info
  client_name TEXT,
  project_name TEXT NOT NULL,
  project_address TEXT NOT NULL,
  specific_building TEXT,
  type_of_building TEXT NOT NULL,
  has_basement BOOLEAN DEFAULT false,
  has_attic BOOLEAN DEFAULT false,
  notes TEXT,
  
  -- Areas Configuration (JSONB - NOT NULL!)
  scoping_mode BOOLEAN DEFAULT false,
  areas JSONB NOT NULL,           -- Array of Area objects
  risks JSONB DEFAULT '[]',       -- Array of Risk factors
  
  -- Travel
  dispatch_location TEXT NOT NULL,
  distance INTEGER,
  custom_travel_cost DECIMAL(12,2),
  
  -- Services & Scoping
  services JSONB DEFAULT '{}',
  scoping_data JSONB,
  
  -- Pricing
  total_price DECIMAL(12,2),
  pricing_breakdown JSONB,
  
  -- Versioning
  parent_quote_id INTEGER,
  version_number INTEGER DEFAULT 1,
  version_name TEXT,
  is_latest BOOLEAN DEFAULT true,
  
  -- Additional fields
  travel JSONB,
  payment_terms TEXT DEFAULT 'standard',
  
  -- RFI Fields
  site_status TEXT,
  mep_scope TEXT,
  act_scanning TEXT,
  scanning_only TEXT,
  act_scanning_notes TEXT,
  
  -- Client Portal (Magic Link)
  client_token TEXT,
  client_token_expires_at TIMESTAMP,
  client_status TEXT DEFAULT 'pending',
  
  -- External Integration
  external_cpq_id TEXT,
  external_cpq_url TEXT,
  
  -- Audit
  created_by TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### Area Object Structure (JSONB)

```typescript
interface Area {
  id: string;
  name: string;
  buildingType: string;        // "1" through "16"
  squareFeet: string;          // For standard; acres for landscape (14-15)
  lod: string;                 // Default: "200", "300", "350", etc.
  disciplines: string[];       // ["architecture", "mepf", "structure", "site"]
  scope?: string;              // "full", "interior", "exterior"
  
  // Per-discipline LoD (CPQ-aligned)
  disciplineLods?: {
    [discipline: string]: {
      discipline: string;
      lod: string;
      scope?: string;
    }
  };
  
  // Optional features
  includeCadDeliverable?: boolean;
  additionalElevations?: number;
  numberOfRoofs?: number;
  facades?: Facade[];
  gradeAroundBuilding?: boolean;
  gradeLod?: string;
  
  // Landscape areas
  boundary?: { lat: number; lng: number }[];
  boundaryImageUrl?: string;
  kind?: "standard" | "landscape";  // Inferred from buildingType
}
```

---

## 5. API Endpoints

### CPQ Routes (server/routes/cpq.ts)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/cpq/calculate` | User | Proxy to external CPQ + margin adjustment |
| POST | `/api/leads/:id/cpq-quotes` | User (CEO/Sales) | Create new quote for lead |
| GET | `/api/leads/:id/cpq-quotes` | User (CEO/Sales) | List quotes for lead |
| GET | `/api/cpq-quotes/:id` | User (CEO/Sales) | Get single quote |
| PATCH | `/api/cpq-quotes/:id` | User (CEO/Sales) | Update quote |
| DELETE | `/api/cpq-quotes/:id` | User (CEO/Sales) | Delete quote |
| POST | `/api/cpq-quotes/:id/versions` | User (CEO/Sales) | Create version |
| POST | `/api/cpq-quotes/:id/generate-link` | User (CEO/Sales) | Generate magic link |
| POST | `/api/cpq/calculate-distance` | User (CEO/Sales) | Google Maps distance calc |

### External CPQ Webhooks (CRM ← CPQ)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/cpq/leads/:leadId` | CRM_API_KEY | External CPQ fetches lead details |
| POST | `/api/cpq/quotes/webhook` | CRM_API_KEY | External CPQ posts completed quote |
| GET | `/api/cpq/config` | CRM_API_KEY | Returns CRM capabilities |

---

## 6. Pricing Logic

### Building Types (16 total)

| ID | Type | Base Rate Multiplier |
|----|------|---------------------|
| 1 | Commercial - Simple | 1.0x |
| 2 | Residential - Standard | 0.8x |
| 3 | Residential - Luxury | 0.9x |
| 4 | Commercial / Office | 0.7x |
| 5 | Retail / Restaurants | 0.95x |
| 6 | Kitchen / Catering | 1.4x |
| 7 | Education | 1.0x |
| 8 | Hotel / Theatre / Museum | 1.1x |
| 9 | Hospitals / Mixed Use | 1.3x |
| 10 | Mechanical / Utility Rooms | 0.6x |
| 11 | Warehouse / Storage | 0.5x |
| 12 | Religious Buildings | 1.0x |
| 13 | Infrastructure / Roads | 0.8x |
| 14 | Built Landscape | Special (per acre) |
| 15 | Natural Landscape | Special (per acre) |
| 16 | ACT (Above Ceiling Tiles) | 1.5x |

### LOD Multipliers

| LOD | Multiplier | Description |
|-----|------------|-------------|
| 100 | 0.5x | Conceptual |
| 200 | 1.0x | Design Development (baseline) |
| 250 | 1.25x | Enhanced Design |
| 300 | 1.5x | Construction Documents |
| 350 | 2.0x | Fabrication Ready |
| 400 | 2.5x | As-Built |

### Pricing Formula

```
Base Price = sqft × buildingTypeRate × disciplineRate
LOD Adjusted = Base Price × lodMultiplier
Risk Adjusted = LOD Adjusted × (1 + riskFactors)
Travel Added = Risk Adjusted + travelCost

Client Price = upteamCost / (1 - marginTarget)
```

---

## 7. Margin Target System

### Slider Configuration
- **Range:** 35% to 60%
- **Default:** 45%
- **Step:** 1%
- **Location:** DealWorkspace.tsx pricing sidebar

### Margin Formula

```typescript
clientPrice = upteamCost / (1 - marginTarget)

// Example: upteamCost = $50,000, marginTarget = 0.45 (45%)
clientPrice = 50000 / (1 - 0.45) = 50000 / 0.55 = $90,909
grossMargin = 90909 - 50000 = $40,909
grossMarginPercent = 40909 / 90909 × 100 = 45%
```

### Integrity Thresholds

| Margin | Status | Action |
|--------|--------|--------|
| < 40% | `blocked` | Save button disabled, error message |
| 40-45% | `warning` | Save enabled, warning displayed |
| ≥ 45% | `passed` | Save enabled, no warnings |

### Post-Proxy Normalization (Backend)

```typescript
// server/routes/cpq.ts - POST /api/cpq/calculate

// After receiving response from external CPQ:
if (marginTarget >= 0.35 && marginTarget <= 0.60) {
  // Recalculate each line item
  data.lineItems = data.lineItems.map(item => {
    if (item.category !== "total" && item.upteamCost) {
      return {
        ...item,
        clientPrice: item.upteamCost / (1 - marginTarget)
      };
    }
    return item;
  });
  
  // Recalculate totals
  data.totalClientPrice = sum(lineItems.clientPrice);
  data.grossMargin = data.totalClientPrice - data.totalUpteamCost;
  data.grossMarginPercent = (data.grossMargin / data.totalClientPrice) * 100;
  
  // Update integrity status
  if (data.grossMarginPercent < 40) {
    data.integrityStatus = "blocked";
  } else if (data.grossMarginPercent < 45) {
    data.integrityStatus = "warning";
  } else {
    data.integrityStatus = "passed";
  }
}
```

---

## 8. Known Issues & Challenges

### Issue 1: Areas Extraction from requestData
**Status:** FIXED (January 11, 2026)

**Problem:** Frontend sends `areas` nested inside `requestData`, but database requires `areas` at top level.

**Solution:**
```typescript
// Extract areas from requestData if not at top level
const areas = normalizedData.areas || normalizedData.requestData?.areas || [];
```

### Issue 2: External CPQ Not Using marginTarget
**Status:** RESOLVED via Post-Proxy Normalization

**Problem:** External CPQ service ignores marginTarget, returns fixed margin.

**Solution:** Backend applies margin adjustment after receiving external CPQ response.

### Issue 3: Dispatch Location Case Sensitivity
**Status:** Handled

**Problem:** Legacy systems use uppercase (WOODSTOCK), CPQ uses lowercase (woodstock).

**Solution:** 
- UI displays lowercase
- Backend normalizes to uppercase for persistence
- `normalizeDispatchLocation()` and `toUppercaseDispatchLocation()` helpers

### Issue 4: Dual Pricing Engines
**Challenge:** Both client-side (pricing.ts) and server-side (external CPQ) pricing exist.

**Current State:** 
- External CPQ is authoritative for pricing
- Client-side pricing.ts contains static tables for reference/validation
- Post-proxy adjustment reconciles margin differences

---

## 9. Future Improvements

### Priority 1: Consolidate Pricing Engine
- Remove dependency on external CPQ service
- Move all pricing calculation to client-side (pricing.ts)
- Backend only handles quote persistence

### Priority 2: Real-time Margin Preview
- Calculate margin in frontend before API call
- Show instant feedback as slider moves
- Only call API on explicit "Calculate" button

### Priority 3: Tier A Auto-Detection
- Automatically flag quotes over $100K
- Require approval workflow for large deals
- Track approval chain in database

### Priority 4: Version Comparison
- Side-by-side quote version comparison
- Highlight pricing differences
- Track change history

### Priority 5: QuickBooks Sync
- Auto-create QBO estimate on quote save
- Sync line items to QBO
- Track estimate status back to CRM

---

## Environment Variables

| Variable | Purpose | Required |
|----------|---------|----------|
| `CPQ_API_KEY` | Auth token for external CPQ | Yes |
| `CPQ_BASE_URL` | External CPQ URL (default: scan2plan-cpq.replit.app) | No |
| `CRM_API_KEY` | Auth for external CPQ → CRM calls | Yes |
| `GOOGLE_MAPS_API_KEY` | Distance calculation | Yes |

---

## File Reference

| File | Purpose |
|------|---------|
| `server/routes/cpq.ts` | All CPQ API endpoints |
| `client/src/features/cpq/Calculator.tsx` | Standalone CPQ UI |
| `client/src/features/cpq/pricing.ts` | Pricing tables, types, utilities |
| `client/src/pages/DealWorkspace.tsx` | Embedded quote builder |
| `shared/schema.ts` | Database schema (cpq_quotes table) |
| `shared/businessGoals.ts` | FY26 margin thresholds |

---

*This document is intended for debugging and architectural review. Last updated January 11, 2026.*
