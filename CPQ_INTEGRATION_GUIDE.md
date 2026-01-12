# CPQ Integration Guide
## Scan2Plan OS - Configure, Price, Quote System
**Last Updated:** January 12, 2026 (v3.0 - Client-Side Pricing Only)

---

## Table of Contents
1. [System Overview](#1-system-overview)
2. [Architecture Diagram](#2-architecture-diagram)
3. [Data Flow](#3-data-flow)
4. [Database Schema](#4-database-schema)
5. [API Endpoints](#5-api-endpoints)
6. [Pricing Logic](#6-pricing-logic)
7. [Margin Target System](#7-margin-target-system)
8. [Integrity Checks](#8-integrity-checks)
9. [Future Improvements](#9-future-improvements)

---

## 1. System Overview

The CPQ (Configure, Price, Quote) system uses **100% client-side pricing**. All calculations happen in the browser using `pricing.ts`.

| Component | Location | Purpose |
|-----------|----------|---------|
| **Pricing Engine** | `client/src/features/cpq/pricing.ts` | Core pricing calculation logic |
| **Frontend Calculator** | `client/src/features/cpq/Calculator.tsx` | Standalone CPQ UI |
| **Deal Workspace** | `client/src/pages/DealWorkspace.tsx` | Embedded quote builder in deals |
| **Quote Storage** | `server/routes/cpq.ts` | Quote persistence (POST /api/cpq-quotes) |

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
│  │                                                                  │    │
│  │  calculatePricing(): Main entry point                           │    │
│  │  ├─ BUILDING_TYPES (16 types)                                   │    │
│  │  ├─ BASE_RATES per sqft                                         │    │
│  │  ├─ LOD_MULTIPLIERS (200, 300, 350)                            │    │
│  │  ├─ TRAVEL_RATES by dispatch location                           │    │
│  │  ├─ Risk premiums (Arch only)                                   │    │
│  │  └─ Margin formula: clientPrice = cost / (1 - marginTarget)    │    │
│  │                                                                  │    │
│  │  FY26 Guardrails:                                               │    │
│  │  ├─ 40% floor (BLOCKED if below)                                │    │
│  │  └─ 45% target (WARNING if 40-45%)                              │    │
│  │                                                                  │    │
│  └────────────────────────────────────────────────────────────────┘    │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
                              │
                              │ POST /api/cpq-quotes
                              │ (Save quote to database)
                              ▼
┌──────────────────────────────────────────────────────────────────────────┐
│                        BACKEND (Express.js)                              │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌────────────────────────────────────────────────────────────────┐     │
│  │              server/routes/cpq.ts                               │     │
│  │                                                                  │     │
│  │  POST /api/leads/:id/cpq-quotes                                 │     │
│  │  ├─ Receives complete pricing from frontend                     │     │
│  │  ├─ Validates required fields                                   │     │
│  │  ├─ Saves quote to database                                     │     │
│  │  └─ Supports versioning                                         │     │
│  │                                                                  │     │
│  │  GET /api/leads/:id/cpq-quotes                                  │     │
│  │  └─ Returns all quotes for a lead                               │     │
│  │                                                                  │     │
│  │  PATCH /api/cpq-quotes/:id                                      │     │
│  │  └─ Updates existing quote                                      │     │
│  │                                                                  │     │
│  │  NO external CPQ calls - pricing is 100% client-side            │     │
│  │                                                                  │     │
│  └────────────────────────────────────────────────────────────────┘     │
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

2. Frontend calls calculatePricing() from pricing.ts
   ├─ Input: areas, dispatchLocation, distance, risks, marginTarget
   └─ Calculation happens entirely in browser

3. pricing.ts returns PricingResult
   {
     lineItems: [...],
     totalClientPrice: 90909,
     totalUpteamCost: 50000,
     grossMarginPercent: 45.0,
     integrityStatus: "passed",
     integrityFlags: []
   }

4. UI displays pricing immediately (no network call needed)
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
     areas: [...],
     dispatchLocation: "WOODSTOCK",
     distance: 150,
     risks: {...},
     paymentTerms: "standard"
   }

3. Backend validates and saves to cpq_quotes table
   ├─ Generates quote number
   ├─ Creates version history
   └─ Returns saved quote
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
  
  -- Pricing (calculated client-side, stored here)
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
  disciplines: string[];       // ["arch", "mepf", "struct", "civil"]
  scope?: string;              // "full", "interior", "exterior"
  
  // Per-discipline LoD
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
  gradeAroundBuilding?: boolean;
  gradeLod?: string;
  
  // Landscape areas
  kind?: "standard" | "landscape";  // Inferred from buildingType
}
```

---

## 5. API Endpoints

### CPQ Routes (server/routes/cpq.ts)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/leads/:id/cpq-quotes` | User (CEO/Sales) | Create new quote for lead |
| GET | `/api/leads/:id/cpq-quotes` | User (CEO/Sales) | List quotes for lead |
| GET | `/api/cpq-quotes/:id` | User (CEO/Sales) | Get single quote |
| PATCH | `/api/cpq-quotes/:id` | User (CEO/Sales) | Update quote |
| DELETE | `/api/cpq-quotes/:id` | User (CEO/Sales) | Delete quote |
| POST | `/api/cpq-quotes/:id/versions` | User (CEO/Sales) | Create version |
| POST | `/api/cpq-quotes/:id/generate-link` | User (CEO/Sales) | Generate magic link |
| POST | `/api/cpq/calculate-distance` | User (CEO/Sales) | Google Maps distance calc |

### External Webhooks (for integrations calling INTO CRM)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/cpq/sync-quote` | API Key (CPQ_API_KEY) | Sync quote from external system |
| POST | `/api/cpq/update-status` | API Key (CRM_API_KEY) | Update quote status |

---

## 6. Pricing Logic

### Building Types

| ID | Type | Base Rate (per sqft) |
|----|------|---------------------|
| 1 | Office/Commercial | $0.12 |
| 2 | Industrial | $0.08 |
| 3 | Healthcare | $0.18 |
| 4 | Educational | $0.14 |
| 5 | Retail | $0.10 |
| ... | ... | ... |

### LOD Multipliers

| LOD | Multiplier |
|-----|------------|
| 200 | 1.0 |
| 300 | 1.5 |
| 350 | 2.0 |

### Discipline Rates

| Discipline | Rate Modifier |
|------------|---------------|
| Architecture | 1.0 |
| MEP/F | 1.2 |
| Structural | 0.8 |
| Civil | 0.6 |

---

## 7. Margin Target System

The margin slider allows adjusting the target gross margin (35%-60%).

### Formula
```
clientPrice = upteamCost / (1 - marginTarget)

Example:
- Cost: $50,000
- Margin Target: 45%
- Client Price: $50,000 / (1 - 0.45) = $90,909
- Gross Margin: $40,909 (45%)
```

### Guardrails

| Level | Threshold | Status | Action |
|-------|-----------|--------|--------|
| Floor | < 40% | BLOCKED | Cannot save quote |
| Guardrail | 40-45% | WARNING | Can save with warning badge |
| Target | ≥ 45% | PASSED | Normal operation |

---

## 8. Integrity Checks

Integrity checks run client-side during `calculatePricing()`:

| Check | Condition | Status |
|-------|-----------|--------|
| Margin Floor | margin < 40% | BLOCKED |
| Margin Warning | 40% ≤ margin < 45% | WARNING |
| Travel Missing | Fly-out with $0 travel | WARNING |
| LoD 350 Premium | LoD 350 without markup | WARNING |

The integrity status is included in the pricing result and displayed in the UI.

---

## 9. Future Improvements

1. **Server-side validation**: Add backend validation as a safety net
2. **Pricing audit trail**: Log all pricing calculations for compliance
3. **A/B testing**: Support multiple pricing strategies
4. **API rate caching**: Cache Google Maps distance calculations
