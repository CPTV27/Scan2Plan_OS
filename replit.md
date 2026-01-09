# Scan2Plan OS (CEO Hub) - Comprehensive System Audit

## Overview
Scan2Plan OS is an enterprise-grade management system designed as a "Command Center" for CEOs of laser scanning and BIM businesses. It provides unified visibility and management across sales, production, finance, and marketing operations, leveraging AI-powered automation to streamline processes and enhance decision-making. The system aims to optimize workflows, improve profitability, and offer a comprehensive overview of business performance.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture
Scan2Plan OS is built with a modern web stack, featuring a React 18 + TypeScript frontend utilizing Vite, Wouter for routing, TanStack Query for data fetching, and Shadcn/ui + Radix primitives styled with TailwindCSS for a glassmorphism theme supporting dark/light modes. The backend is a Node.js + Express.js application, using Drizzle ORM with PostgreSQL for data persistence and Zod for end-to-end type-safe validation. Replit Auth (OpenID Connect) handles authentication, with PostgreSQL for session storage.

**Key Modules and Features:**

*   **Sales & CRM:** Features a 6-stage Kanban pipeline, lead management with a Universal Project ID (UPID) system, a comprehensive Deal Workspace, and a CPQ Calculator with integrated travel and building insights (via Google Maps/Solar APIs). It includes an RFI Assistant with a Client Input Portal for secure client interaction, and a Smart Proposal Engine for AI-powered, persona-specific proposal generation. Attribution tracking provides insights into marketing influence.
*   **Production:** Implements a 7-stage Kanban workflow with configurable "Hard Gates" to enforce business rules. It includes real-time, color-coded margin tracking and a Potree-based Point Cloud Delivery system for digital twins. The Field Hub offers a mobile-optimized interface for technicians, incorporating AI for voice-to-text notes and structured data conversion.
*   **Marketing & Growth Engine:** Utilizes an 8-Persona Classification System for targeted marketing. The Evidence Vault centrally stores persona-based marketing assets with an EWS (Evidence Weight Score). A Content Queue automates persona-specific outreach, and Truth Loop Analytics tracks marketing effectiveness.
*   **Financial:** Integrates with QuickBooks Online for comprehensive accounting, offering real-time Balance Sheet and P&L access. A Profit First Dashboard visualizes allocation buckets and cash flow. Dual Hat Labor Tracking and a True Net Profitability Calculator provide detailed insights into project and stakeholder compensation.
*   **Analytics & Reporting:** Features a CEO Dashboard with key metrics like rotting deal tracking, sales velocity, weighted pipeline value, and win/loss ratios. Regional Intelligence offers geographic market analysis, all visualized with Recharts. Includes ABM Target Account Penetration widget (Tier A engagement in 90 days).
*   **Help & Training:** Includes an S2P Academy with role-based guides and context-sensitive help components for complex fields.
*   **ABM & Education:** Supports Account-Based Marketing tiering (Tier A/B/C), firm size, discipline, and focus sector tracking. Education-Led Sales via Events module with CEU credit tracking and automatic +10 lead score on attendance.

**Role-Based Access Control (RBAC):** The system implements RBAC with distinct access levels for CEO (full access), Sales, Production, and Accounting roles across various modules.

## External Dependencies
*   **Google Workspace:** Drive (auto-folder creation, document storage), Calendar (event management), Gmail (email integration), Maps API (distance matrix), Solar API (building insights).
*   **Financial/CRM:** QuickBooks Online (full accounting integration), GoHighLevel (CRM synchronization, persona tagging, opportunity management).
*   **Productivity:** Airtable (project handoff sync for closed deals), OpenAI (GPT-4o-mini for AI assistants, Whisper for voice transcription).
*   **Specialized:** External CPQ Tool (bi-directional quote synchronization), Potree (point cloud visualization).
*   **Notifications:** Google Chat Webhooks (real-time team notifications for sales and operations).