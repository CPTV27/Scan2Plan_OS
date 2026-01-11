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
- **PandaDoc Proposal Vault:** Syncs completed proposals from PandaDoc, uses AI for data extraction, and supports a review workflow to convert approved documents into CPQ quotes.
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

## Recent Changes (January 11, 2026)
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