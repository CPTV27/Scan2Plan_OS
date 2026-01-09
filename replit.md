# Scan2Plan OS (CEO Hub) - Progress Report

## Overview
Scan2Plan OS is an enterprise-grade management system designed as a "Command Center" for CEOs of laser scanning and BIM businesses. It provides unified visibility and management across sales, production, finance, and marketing operations, leveraging AI-powered automation to streamline processes and enhance decision-making.

## User Preferences
- Preferred communication style: Simple, everyday language
- Design approach: Glassmorphism theme with dark/light mode support
- Technical decisions delegated to AI agent

## Technology Stack
- **Frontend:** React 18 + TypeScript, Vite, Wouter routing, TanStack Query, Shadcn/ui + Radix primitives, TailwindCSS
- **Backend:** Node.js + Express.js, Drizzle ORM, PostgreSQL, Zod validation
- **Auth:** Replit Auth (OpenID Connect) with PostgreSQL session storage
- **AI:** OpenAI GPT-4o-mini, Gemini integration available

---

## Current Implementation Status

### CPQ Calculator (Configure-Price-Quote) - FUNCTIONAL
**Location:** `client/src/features/cpq/Calculator.tsx`, `client/src/features/cpq/pricing.ts`

**Features Implemented:**
1. **Unified Areas Interface** - Building (sqft) and landscape (acres) areas coexist in same view
   - "Add Building Area" and "Add Landscape Area" buttons
   - Each area card renders appropriate fields based on kind (sqft vs acres)
   - Landscape acres auto-convert to sqft for pricing calculations (1 acre = 43,560 sqft)

2. **Pricing Modes:**
   - **Standard Pricing:** Uses building type multipliers, LOD factors, scope multipliers
   - **Tier A Pricing:** Large/complex projects ≥50k sqft - manual scanning + modeling costs with target margin

3. **Travel Pricing Logic:**
   - Brooklyn location: Tiered pricing (Tier A: ≥50k sqft no base, Tier B: 10k-49,999 sqft $300 base, Tier C: <10k sqft $150 base) + $4/mile over 20 miles
   - Other locations: Flat $3/mile

4. **Price Adjustment:** Visible line item in pricing breakdown showing percentage increase

5. **Margin Protection:** 40% margin floor (FY26_GOALS.MARGIN_FLOOR) blocks saves below threshold

6. **Disciplines:** Architecture, Structural, MEP, Site - each adds to modeling complexity

**Data Model:** `cpqQuotes` table with areas (JSON), pricingBreakdown (JSON), travel info, margin calculations

### QuickBooks Online Integration - FUNCTIONAL
**Location:** `server/quickbooks-client.ts`, `server/routes.ts`

**Features Implemented:**
1. OAuth 2.0 flow with token refresh
2. Customer sync (create/update)
3. Estimate creation from CPQ quotes
4. Real-time Balance Sheet and P&L access
5. Token persistence in PostgreSQL

### Sales Pipeline - FUNCTIONAL
**Location:** `client/src/pages/Pipeline.tsx`

**Features Implemented:**
1. 6-stage Kanban: Lead → Qualifying → Proposal → Negotiation → Closed Won → Closed Lost
2. Drag-and-drop deal movement
3. Lead scoring system
4. UPID (Universal Project ID) generation
5. Deal workspace with activity timeline
6. Integration with CPQ for quote creation

### Production Module - FUNCTIONAL
**Location:** `client/src/pages/production/`

**Features Implemented:**
1. 7-stage workflow Kanban
2. Hard gates enforcement
3. Margin tracking with color coding (green ≥50%, yellow 40-50%, red <40%)
4. Field Hub for technicians

### Financial Module - PARTIAL
**Location:** `client/src/pages/Finance.tsx`

**Features Implemented:**
1. Profit First dashboard with allocation buckets
2. QuickBooks connection status
3. Balance Sheet / P&L display (when QB connected)

**Needs Work:**
- Dual Hat Labor Tracking (schema exists, UI incomplete)
- True Net Profitability Calculator

### Marketing Module - PARTIAL
**Location:** `client/src/pages/Marketing.tsx`

**Features Implemented:**
1. 8-Persona Classification System
2. Evidence Vault with EWS scoring
3. Content Queue

**Needs Work:**
- Truth Loop Analytics
- Full GHL integration

### CEO Dashboard - FUNCTIONAL
**Location:** `client/src/pages/Dashboard.tsx`

**Features Implemented:**
1. Key metrics cards (revenue, deals, pipeline value)
2. Win rate tracking
3. Pipeline visualization
4. Recent activity feed

---

## Key Business Logic

### FY26 Goals (shared/businessGoals.ts)
```typescript
FY26_GOALS = {
  REVENUE: 500000,
  PROFIT: 200000,
  MARGIN_FLOOR: 0.40,  // 40% minimum margin
  WIN_RATE_TARGET: 0.35,
  AVG_DEAL_SIZE: 15000
}
```

### Pricing Formulas
- **Standard:** Base price × Building Type Multiplier × LOD Factor × Scope Multiplier + Discipline Costs
- **Tier A:** (Scanning Cost + Modeling Cost) × (1 + Target Margin)
- **Travel:** Location-based tiers + mileage over threshold

### Lead Scoring
- Base: 50 points
- Budget confirmed: +20
- Timeline defined: +15
- Decision maker engaged: +25
- Event attendance (CEU): +10

---

## External Integrations

| Service | Status | Purpose |
|---------|--------|---------|
| QuickBooks Online | ✅ Connected | Accounting, estimates, financial reports |
| Google Maps API | ✅ Configured | Distance calculations, travel pricing |
| Google Solar API | ✅ Configured | Building insights |
| Google Drive | ✅ Configured | Document storage |
| Google Calendar | ✅ Configured | Event management |
| Gmail | ✅ Configured | Email integration |
| HubSpot | ✅ Configured | CRM sync |
| Airtable | 🔑 Key Required | Project handoff sync |
| PandaDoc | 🔑 Key Required | Document signing |
| GoHighLevel | ❌ Not Configured | CRM, marketing automation |

---

## Database Schema Highlights

**Core Tables:**
- `users` - Authentication, roles (ceo, sales, production, accounting)
- `leads` - Sales pipeline with UPID, scoring, persona
- `cpqQuotes` - Quote configurations with areas, pricing, margins
- `productionJobs` - 7-stage workflow tracking
- `evidenceVault` - Marketing assets with EWS scoring
- `events` - CEU tracking, education-led sales
- `abmAccounts` - Account-based marketing tiers

**Session Management:**
- `sessions` - PostgreSQL session storage for auth

---

## Recent Changes (January 2026)

1. **CPQ Unified Areas View** - Combined building and landscape areas into single interface
2. **Price Adjustment Persistence** - Now saved as visible line item in pricingBreakdown
3. **Test ID Refactoring** - Uses kindIndex for backwards-compatible automation
4. **CPQ Scoping Fields (CRM Integration)** - Comprehensive scoping data for full CRM integration
   - Project Details: specificBuilding, typeOfBuilding
   - Deliverables: interiorCadElevations, BIM formats multi-select, bimVersion, customTemplate
   - ACT Ceiling: aboveBelowACT scope, actSqft
   - Internal Notes: sqftAssumptions, assumedGrossMargin, caveatsProfitability, mixedScope, insuranceRequirements
   - Contacts: account, design pro, other contacts with email/phone, proof links
   - Lead Tracking: 18 source options, assist attribution, probability, project status
   - Timeline: estimated timeline, notes
   - PostMessage handler for CPQ_SCOPING_PAYLOAD (origin-validated security)
   - All fields persist in `scopingData` JSON field on cpqQuotes table

5. **Profitability Gates System** - Server-side enforcement of business rules
   - **GM Hard Gate:** Blocks proposal generation if margin < 40% (FY26_GOALS.MARGIN_FLOOR)
   - **Auto Tier A Flagging:** Leads with sqft >= 50K auto-flagged as "Tier A" with priority 5
   - **Attribution Gate:** Blocks Closed Won stage transition without lead source attribution
   - **Estimator Card (Soft):** Recommends estimator card for Tier A deals, doesn't block proposals
   - UI feedback in DealWorkspace shows warnings when gates would block actions
   - Gate module: `server/lib/profitabilityGates.ts`
   - Error codes: GM_GATE_BLOCKED, ATTRIBUTION_REQUIRED, ESTIMATOR_CARD_RECOMMENDED

6. **S2P Academy Expansion** - New "AI & Tools" documentation tab
   - Profitability Gates guide with step-by-step fix instructions
   - All 6 AI features documented with use cases and best practices
   - CPQ Calculator guide (areas, pricing modes, travel, disciplines)
   - Location: `client/src/pages/HelpCenter.tsx`

7. **PandaDoc Proposal Vault** - Batch import proposals from PandaDoc
   - **Sync from PandaDoc:** Fetches all completed proposals via PandaDoc API
   - **AI Extraction:** Parses pricing tables, client info, project details with confidence scoring
   - **Review Workflow:** Side-by-side view of extracted data vs original, editable fields
   - **Quote Creation:** Approved documents create CPQ quotes automatically
   - **Status Tracking:** Pending → Extracted → Approved/Rejected pipeline
   - Database: `pandadoc_import_batches`, `pandadoc_documents` tables
   - API: `server/lib/pandadoc-client.ts`, `server/routes/pandadoc.ts`
   - UI: `client/src/pages/ProposalVault.tsx`

---

## Areas Needing Attention

### High Priority
1. **GHL Integration** - GoHighLevel API key needed for full CRM sync
2. **Production Hard Gates** - Business rules need configuration
3. **Financial Reports** - P&L visualization needs polish

### Medium Priority
1. **Truth Loop Analytics** - Marketing effectiveness tracking
2. **Dual Hat Labor** - Time tracking for multi-role employees
3. **Point Cloud Delivery** - Potree integration for digital twins

### Low Priority
1. **S2P Academy** - Training content population
2. **Regional Intelligence** - Geographic market analysis
3. **Mobile optimization** - Field Hub responsive improvements

---

## File Structure

```
client/src/
├── features/cpq/          # CPQ Calculator module
│   ├── Calculator.tsx     # Main quote builder UI
│   └── pricing.ts         # Pricing logic and formulas
├── pages/
│   ├── Dashboard.tsx      # CEO command center
│   ├── Pipeline.tsx       # Sales Kanban
│   ├── Finance.tsx        # Profit First dashboard
│   ├── Marketing.tsx      # Growth engine
│   └── production/        # Production workflows
├── components/ui/         # Shadcn components
└── lib/                   # Utilities, API client

server/
├── routes.ts              # Express API endpoints
├── storage.ts             # Database interface
├── quickbooks-client.ts   # QB OAuth & API
└── auth.ts                # Replit Auth setup

shared/
├── schema.ts              # Drizzle ORM models
└── businessGoals.ts       # FY26 targets
```

---

## Questions for Guidance

1. What should be the next priority module to complete?
2. Are there gaps in the CPQ pricing logic for the laser scanning industry?
3. How should the Truth Loop analytics connect marketing spend to closed deals?
4. Best approach for Potree point cloud integration?
5. Should production hard gates be configurable per-project or global?
