# Scan2Plan OS (CEO Hub) - Compressed replit.md

## Overview
Scan2Plan OS is an enterprise-grade management system designed as a "Command Center" for CEOs of laser scanning and BIM businesses. It provides unified visibility and management across sales, production, finance, and marketing operations. The system leverages AI-powered automation to streamline processes, enhance decision-making, and ensure margin protection with features like the CPQ Calculator, QuickBooks Online integration, and comprehensive sales and production pipelines. The project's ambition is to create a robust, AI-driven platform that supports business growth and operational efficiency in a specialized market.

## User Preferences
- Preferred communication style: Simple, everyday language
- Design approach: Glassmorphism theme with dark/light mode support
- Technical decisions delegated to AI agent

## System Architecture
Scan2Plan OS is built with a modern web stack, featuring a React 18 + TypeScript frontend utilizing Vite, Wouter for routing, TanStack Query for data fetching, and Shadcn/ui with Radix primitives styled by TailwindCSS. The backend is powered by Node.js + Express.js, using Drizzle ORM with PostgreSQL for data persistence and Zod for validation. Authentication is managed via Replit Auth (OpenID Connect) with PostgreSQL session storage. AI capabilities are integrated using OpenAI GPT-4o-mini, with Gemini integration available.

Key modules include:
- **CPQ Calculator:** Configures, prices, and quotes projects with unified area inputs, standard and Tier A pricing modes, travel cost logic, and a price adjustment mechanism. It enforces a 40% margin floor (FY26_GOALS.MARGIN_FLOOR) to protect profitability. Supports margin target slider (35%-60% range) with automatic client price calculation using formula: `clientPrice = cost / (1 - marginTarget)`. Includes guardrail warnings at 45% (BELOW_GUARDRAIL) and 40% (BELOW_FLOOR).
- **Sales Pipeline:** A 6-stage Kanban board (Lead to Closed) with drag-and-drop functionality, lead scoring, UPID generation, and a deal workspace.
- **Production Module:** A 7-stage workflow Kanban with hard gates and margin tracking.
- **Financial Module:** Integrates with QuickBooks for Balance Sheet/P&L display and features a Profit First dashboard.
- **Marketing Module:** Includes an 8-persona classification system and an Evidence Vault.
- **CEO Dashboard:** Provides key metrics, win rate tracking, pipeline visualization, and recent activity feeds.
- **Profitability Gates System:** Server-side enforcement of business rules, including a hard gate for minimum gross margin (40%), auto-flagging for large "Tier A" deals, and attribution requirements for deal progression.
- **PandaDoc Embedded Editor:** Direct PandaDoc proposal editing within Deal Workspace using E-Token authentication. Supports document creation from templates, inline editing with pricing tables, send for signature, and automatic deal closure on completion via webhook.
- **Cognitive Brand Engine:** An AI writing assistant enforcing brand governance with features like executive brief generation, buyer type adaptation, pain point selection, and AI-driven self-correction against red-line violations.
- **Buyer Persona Intelligence Engine:** Advanced AI content generation leveraging detailed psychological profiles, communication preferences, and solution mappings for four distinct buyer personas (Design Principal, Project Architect, Owner Rep, GC/CM), supported by four brand voices.
- **Payment Terms Centralization:** Standardizes payment terms across the application (e.g., Net 15, Net 45, 50/50) with consistent UI and pricing logic.

## External Dependencies
- **QuickBooks Online:** Connected for accounting, estimates, and financial reporting.
- **Google Maps API:** Configured for distance calculations and travel pricing.
- **Google Solar API:** Configured for building insights.
- **Google Drive:** Configured for document storage.
- **Google Calendar:** Configured for event management.
- **Gmail:** Configured for email integration.
- **HubSpot:** Configured for CRM sync.
- **Airtable:** Key required for project handoff synchronization.
- **PandaDoc:** Key required for document signing and proposal import.
- **GoHighLevel:** Not yet configured for CRM and marketing automation.

## Recent Changes (January 12, 2026)
- **DealWorkspace.tsx Phase 5 Refactoring:**
  - Extracted QuoteBuilderTab component (~1,130 lines) to client/src/features/deals/components/QuoteBuilderTab.tsx
  - DealWorkspace.tsx reduced from 2,239 to 1,087 lines (51% reduction, down from original 3,112 lines)
  - Total extracted components (Phases 1-5): QboEstimateBadge, TierAEstimatorCard, MarketingInfluenceWidget, VersionHistoryTab, DocumentsTab, CommunicateTab, QuoteVersionDialog, ProposalTab, PandaDocTab, LeadDetailsTab, QuoteBuilderTab (11 components total)
  - All data-testid attributes preserved for e2e testing
- **Unit Testing Suite:**
  - Added comprehensive unit tests for CPQ pricing engine (client/src/features/cpq/pricing.test.ts) - 72 tests covering margin calculations, travel costs, tier pricing, scope discounts, risk premiums, landscape pricing
  - Added unit tests for server-side CPQ validator (server/validators/cpqValidator.test.ts) - 33 tests covering margin floor enforcement, CEO override, dispatch location validation, Tier A classification, PandaDoc send validation
  - Added LeadDetailsTab.test.tsx with 10 unit tests covering form rendering, input population, billing section, notes section
  - Created vitest.config.ts for test configuration with proper path aliases supporting dual Node/jsdom environments
  - ResizeObserver mock properly configured as class for Radix UI component compatibility
  - All 115 unit tests passing
- **JSDoc Documentation:**
  - Added comprehensive JSDoc to calculatePricing() with full parameter/return documentation matching PricingResult interface
  - Added JSDoc to getAreaTier() and getPricingRate() helper functions
  - Added JSDoc to QuoteBuilderTab confidence score calculation explaining weight factors and score interpretation
- **Centralized Error Handling:**
  - Enhanced server/middleware/errorHandler.ts with typed error classes: BadRequestError, UnauthorizedError, ForbiddenError, NotFoundError, ConflictError, ValidationError, MarginGateError, ServiceError
  - Consistent HTTP status codes and error response format with code, message, requestId, and optional details
  - Error code mapping from HTTP status for backward compatibility
- **Performance Monitoring:**
  - Added server/middleware/performanceLogger.ts for tracking API response times
  - Slow request detection (>1s warning, >3s very slow) with automatic logging
  - New endpoints: GET /api/performance/stats (view metrics), POST /api/performance/stats/clear (reset) - CEO role required
  - Tracks p50/p95/p99 latencies per endpoint
- **Component Self-Containment:**
  - QuoteBuilderTab now uses useQueryClient hook internally instead of requiring prop injection
  - Reduces prop drilling and improves component independence
- **Code Quality Improvements (earlier today):**
  - Replaced console.log with structured log() utility in pandadoc-client.ts, proposal-vision.ts, personaLearning.ts
  - Created server/storage/ domain modules (leads.ts, quotes.ts, financial.ts, marketing.ts) for cleaner imports
  - Storage modules are backwards-compatible wrappers - existing imports unchanged
- **CPQ Documentation Cleanup:**
  - Deleted 4 outdated docs: CPQ_PRICING_API.md, CPQ_COMPARISON_REPORT.md, CPQ_PRICING_REPAIR_REPORT.md, CPQ_CRM_ALIGNMENT_REPORT.md
  - Rewrote CPQ_INTEGRATION_GUIDE.md to reflect 100% client-side pricing architecture (no external CPQ service)

### Previous Changes (January 11, 2026)
- **PandaDoc Embedded Editor Integration:**
  - Added PandaDoc embedded editor directly in Deal Workspace "Proposal" tab using pandadoc-editor npm package
  - E-Token authentication with 1-hour session expiration for secure editing sessions
  - API endpoints: POST /api/pandadoc/documents (create from quote), POST /api/pandadoc/documents/:id/editing-session (get edit token)
  - Webhook handles document_state_changed events: updates quote status, auto-closes deals to "Closed Won" on signature
  - Removed standalone Proposal Vault page - proposal workflow now consolidated in Deal Workspace
- **Margin Guardrail Floating Point Fix:** Added EPSILON tolerance (0.0001) to margin comparisons preventing false warnings at exact 45% threshold
- **AI Performance Improvements:**
  - LRU caching for AI responses (500 items, 30 min TTL) reduces API costs with separate chat/embedding caches
  - Cache monitoring endpoints: GET /api/ai/cache-stats, POST /api/ai/cache/clear
  - Background embedding pre-computation on lead create/update for faster project matching
  - Streaming proposal generation via SSE (POST /api/proposals/generate-stream)
  - Field notes AI processing endpoint (POST /api/field-notes/:id/process) transforms technician notes to professional scopes
  - Few-shot examples added to AI prompts: scoping assistant, proposal generator, field notes processor
- **Code Cleanup:** Removed deprecated `/api/cpq/calculate` and `/api/cpq/pricing-matrix` endpoints (now handled client-side). Deleted orphaned GoHighLevel integration files (`server/routes/ghl.ts`, `server/services/gohighlevel.ts`) - integration was never configured.
- **QBO Expense Auto-Linking:** Expenses and Bills synced from QuickBooks are automatically linked to leads/projects via CustomerRef. Uses deterministic selection: prioritizes Closed Won leads, then most recent.
- **Bill Sync Multi-Line Support:** syncBills() aggregates all lines from vendor invoices, supports both AccountBased and ItemBased expense details, with getMostCommonCategory() for accurate categorization.
- **Job Costing Analytics:** getJobCostingAnalytics() calculates actual vs quoted margins with hasQuotedMargin and hasMarginVariance flags to indicate data quality. Groups costs by category, tracks overhead, provides profitability summaries.
- **New API Endpoints:** POST /api/quickbooks/sync-expenses (syncs purchases + bills), GET /api/analytics/job-costing (full job profitability), GET /api/analytics/overhead (overhead breakdown).

### Previous Changes (January 11, 2026)
- **Production-Grade Password Protection:** Multi-layer authentication with Replit Auth + @scan2plan.io domain restriction + bcrypt password verification (12 rounds). Rate limiting enforced (5 attempts, 15-min lockout). PasswordGate component handles access denied, password setup, and password verification flows.
- **Security Middleware:** Global /api middleware enforces authentication on all routes except explicit whitelist. Public routes use strict regex patterns (24-char nanoid tokens, UUID formats) to prevent accidental exposure of protected endpoints like /proposals/generate.
- **PandaDoc Proposal Signature:** Added "Send for Signature" integration that uploads proposal PDFs to PandaDoc, sends for client signature, and auto-closes deals to Closed Won when signed via webhook. Requires PANDADOC_API_KEY secret and lead contact info.
- **Quote → Project Data Inheritance:** Closed Won deals now pass complete CPQ snapshot (price, margin, areas, risks, travel, services, site readiness) to Production module with auto-generated scope summary.
- **Client-Side Pricing:** DealWorkspace.tsx now uses client-side `calculatePricing()` from `pricing.ts` instead of external API proxy
- **Orphaned Module Deleted:** Removed unused `client/src/modules/sales_engine/` directory (163 files)
- **Backend Deprecation:** `/api/cpq/calculate` endpoint marked deprecated with console warning; migrate to client-side calculation
- **Margin Governance:** Uses FY26_GOALS.MARGIN_FLOOR (40%) and MARGIN_STRETCH (45%) constants for integrity checks
- **Line Item Categories:** Infers categories (risk, travel, service, subtotal, discipline, total) from labels
- **Quote Save Fix:** Backend now extracts `areas` from nested `requestData` to resolve NOT NULL constraint errors