# Scan2Plan OS (CEO Hub) - Compressed replit.md

## Overview
Scan2Plan OS is an enterprise-grade "Command Center" for CEOs of laser scanning and BIM businesses. It provides unified visibility and management across sales, production, finance, and marketing operations. The system leverages AI-powered automation to streamline processes, enhance decision-making, and protect margins through features like the CPQ Calculator, QuickBooks Online integration, and comprehensive sales and production pipelines. The project aims to deliver a robust, AI-driven platform that supports business growth and operational efficiency in a specialized market.

## User Preferences
- Preferred communication style: Simple, everyday language
- Design approach: Glassmorphism theme with dark/light mode support
- Technical decisions delegated to AI agent

## System Architecture
Scan2Plan OS is built with a modern web stack. The frontend uses React 18 + TypeScript, Vite, Wouter for routing, TanStack Query for data fetching, and Shadcn/ui with Radix primitives styled by TailwindCSS. The backend runs on Node.js + Express.js, using Drizzle ORM with PostgreSQL for data persistence and Zod for validation. Authentication is managed via Replit Auth (OpenID Connect) with PostgreSQL session storage. AI capabilities are integrated using OpenAI GPT-4o-mini, with Gemini integration also available.

Key architectural components and features include:
- **CPQ Calculator:** Configures, prices, and quotes projects with unified area inputs, standard and Tier A pricing modes, travel cost logic, and price adjustment mechanisms. It enforces a 40% margin floor and includes a margin target slider (35%-60%) with guardrail warnings.
- **Sales Pipeline:** A 6-stage Kanban board with drag-and-drop functionality, lead scoring, UPID generation, and a dedicated deal workspace.
- **Production Module:** A 7-stage workflow Kanban system with hard gates and margin tracking.
- **Financial Module:** Integrates with QuickBooks for Balance Sheet/P&L display and includes a Profit First dashboard.
- **Marketing Module:** Features an 8-persona classification system and an Evidence Vault.
- **CEO Dashboard:** Provides key metrics, win rate tracking, pipeline visualization, and recent activity feeds.
- **Profitability Gates System:** Server-side enforcement of business rules, including a hard gate for minimum gross margin (40%), auto-flagging for large "Tier A" deals, and attribution requirements.
- **PandaDoc Embedded Editor:** Allows direct PandaDoc proposal editing within the Deal Workspace using E-Token authentication, supporting document creation from templates, inline editing, sending for signature, and automatic deal closure via webhooks.
- **Cognitive Brand Engine:** An AI writing assistant that enforces brand governance, capable of executive brief generation, buyer type adaptation, pain point selection, and AI-driven self-correction.
- **Buyer Persona Intelligence Engine:** Advanced AI content generation leveraging detailed psychological profiles, communication preferences, and solution mappings for four distinct buyer personas and four brand voices.
- **Payment Terms Centralization:** Standardizes payment terms (e.g., Net 15, Net 45, 50/50) across the application with consistent UI and pricing logic.
- **Hungry Fields Data Collection:** Implements a tri-state UI for optional fields ("I don't know" options), tracks data completeness, and auto-generates follow-up emails for missing information.
- **Security:** Features multi-layer authentication with Replit Auth, domain restriction, bcrypt password verification, rate limiting, and global API middleware for authentication enforcement.
- **Field Technician Module (FieldHub):** Comprehensive technician portal with time logging, expense tracking, mission briefs, scope checklists, and file uploads to Google Drive. Calendar events include quick links to mission briefs and Drive folders.
- **Google Drive Organization:** Projects are organized under a shared "Scan2Plan OS Projects" parent folder with standardized subfolders (01_Field_Capture, 02_Registration, etc.).
- **Client Delivery Portal:** Secure file delivery system with Google Cloud Storage integration. Features include file browser for deliverables (PDFs, CAD files), Potree 3D point cloud viewer for scan data visualization, and role-based access control (CEO/production only). Uses authenticated streaming proxy for secure GCS file access without exposing signed URLs to browsers.

## External Dependencies
- **QuickBooks Online:** Used for accounting, estimates, and financial reporting.
- **Google Maps API:** Utilized for distance calculations and travel pricing.
- **Google Solar API:** Provides building insights.
- **Google Drive:** Integrated for document storage.
- **Google Calendar:** Used for event management.
- **Gmail:** Configured for email integration.
- **HubSpot:** Used for CRM synchronization.
- **Airtable:** Key for project handoff synchronization.
- **PandaDoc:** Essential for document signing and proposal management.