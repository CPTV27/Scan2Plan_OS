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
- **CPQ Calculator:** Configures, prices, and quotes projects with unified area inputs, standard and Tier A pricing modes, travel cost logic, and a price adjustment mechanism. It enforces a 40% margin floor (FY26_GOALS.MARGIN_FLOOR) to protect profitability.
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