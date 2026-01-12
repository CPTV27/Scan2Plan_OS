# Scan2Plan OS - Comprehensive Feature Documentation

> **Last Updated:** January 2026  
> **Purpose:** Complete feature inventory for enhancement review

---

## Table of Contents
1. [Core Platform](#1-core-platform)
2. [Sales & CRM Module](#2-sales--crm-module)
3. [Production & Project Management](#3-production--project-management)
4. [Field Operations (ScanTech)](#4-field-operations-scantech)
5. [Financial Module](#5-financial-module)
6. [AI Capabilities](#6-ai-capabilities)
7. [Communication Tools](#7-communication-tools)
8. [Location Intelligence](#8-location-intelligence)
9. [External Integrations](#9-external-integrations)
10. [Data Model](#10-data-model)
11. [Business Logic & Gates](#11-business-logic--gates)
12. [Enhancement Opportunities](#12-enhancement-opportunities)

---

## 1. Core Platform

### Authentication & User Management
- **Replit Auth (OpenID Connect)**: Secure SSO authentication
- **Role-Based Access Control (RBAC)**:
  - `ceo`: Full system access
  - `sales`: Sales pipeline and lead management
  - `production`: Project tracking and field operations
  - `accounting`: Financial module access
- **Session Management**: PostgreSQL-backed sessions with `connect-pg-simple`
- **RoleGuard Component**: Frontend route protection based on user roles

### Navigation & Layout
- **Responsive Sidebar**: Shadcn sidebar with collapsible navigation
- **Mobile Header**: Optimized mobile navigation with hamburger menu
- **Dark Theme**: "Command Center" glassmorphism aesthetic
- **Pages Available**:
  - Dashboard (Command Center)
  - Sales Pipeline
  - Production Tracker
  - Analytics
  - Financial
  - Tools
  - Regional Intel
  - Airtable Insights
  - Settings
  - ScanTech (Field Module)

### Settings & Configuration
- **Appearance**: Theme customization
- **Integrations**: Airtable, CPQ, OpenAI, Google Workspace, QuickBooks
- **Lead Sources**: Custom source tracking
- **Staleness Thresholds**: Configurable lead decay settings
- **Business Defaults**: Default LOD/LoA standards

---

## 2. Sales & CRM Module

### Lead Management
- **Deal Stages**: Leads → Contacted → Proposal → Negotiation → On Hold → Closed Won → Closed Lost
- **Kanban Board**: Drag-and-drop deal movement between stages
- **Lead Fields**:
  - Client name, project name, project address, zip code
  - Deal value (decimal precision)
  - Building type, square footage, scope
  - Disciplines, BIM deliverable, BIM version
  - Contact info (name, email, phone)
  - Lead priority (1-5), lead source attribution
  - Buyer persona (7 types for personalized communication)

### CPQ (Configure-Price-Quote) Integration
- **Multi-Building Support**: Define multiple areas/buildings per project
- **Per-Area Configuration**:
  - Building type (16 options)
  - Square footage
  - Scope (full/interior/exterior)
  - Disciplines (arch, struct, mech, elec, plumb, site)
  - Per-discipline LOD levels (200/300/350)
  - Roof count, facades, grade modeling
- **Risk Factors**: Remote, fast track, revisions, coordination, incomplete docs, difficult access, multi-phase, union site, security
- **Travel Pricing (3 Modes)**:
  - **Local (NYC/LI)**: Transit, rental car, parking, tolls
  - **Regional (Greater Northeast)**: Company truck mileage, per diem, overnight hotels
  - **Flyout**: Flights, hotels, ground transport, baggage fees
- **Additional Services**: Matterport integration
- **Quote Versioning**: Track V1, V2, V3... with sync to external CPQ tool
- **Bi-directional Sync**: Push/pull quotes from cpq.scan2plan.dev

### CRM Integrations
- **HubSpot** (Replit OAuth Connector):
  - Connection status checking
  - Fetch contacts, deals, companies (up to 100 records)
  - Stage mapping: appointmentscheduled→Contacted, qualifiedtobuy→Proposal, etc.
  - Import deals as leads with duplicate detection (ID in notes + email matching)
- **Go High Level** (Private Integration Token):
  - Opportunity sync and import
  - Stage mapping via keyword detection
  - Duplicate prevention via GHL ID and email matching
  - Requires: GHL_API_KEY, GHL_LOCATION_ID secrets

### Import Capabilities
- **PDF Import**: AI-powered extraction from PandaDoc proposals
  - Extracts: client, project, value, building type, sqft, scope, disciplines, contacts
  - Identifies unmapped fields for CRM enhancement
- **CSV Import**: Bulk lead import from spreadsheets
- **CRM Import**: HubSpot and Go High Level batch import

### Buyer Personas (Communication Personalization)
| ID | Persona | Focus |
|----|---------|-------|
| BP1 | Engineer | Technical Detail |
| BP2 | Executive | ROI/Speed |
| BP3 | Project Manager | Timeline/Budget |
| BP4 | Facilities Manager | Operations |
| BP5 | Architect | Design/Precision |
| BP6 | Owner/Developer | Value/Investment |
| BP7 | GC/Contractor | Schedule/Coordination |

### AI-Derived Intelligence
- **Complexity Score**: Low/Medium/High (MEP complexity from property research)
- **Client Tier**: SMB/Mid-Market/Enterprise (from client research)
- **Regulatory Risks**: Array of identified risks with severity and source

### Staleness Engine
- Automatic probability reduction based on days since last contact
- Configurable thresholds per deal stage
- Stage-specific staleness tracking

---

## 3. Production & Project Management

### Kanban Workflow Stages
1. **Scheduling**: Project coordination and technician assignment
2. **Scanning**: On-site data capture
3. **Registration**: Point cloud processing and alignment
4. **Modeling**: BIM model creation
5. **QC (Quality Control)**: Validation and review
6. **Delivered**: Project completion

### Project Fields
- **Universal Project ID**: [ClientCode]-[YYMMDD]-[Seq] format
- **Lead Linkage**: Optional connection to sales lead
- **Technician Assignment**: Assigned ScanTech
- **Priority**: Low/Medium/High
- **Due Date & Progress**: Timeline tracking (0-100%)

### LoD/LoA Standards (Measure of Excellence)
- **LOD Levels**: 100, 200, 300, 350, 400 (per USIBD)
- **LoA Measured**: Tolerance for measurements (default LoA 40 = ≤1/4")
- **LoA Modeled**: Tolerance for BIM models (default LoA 30 = ≤1/2")

### BOMA Audit Fields
- **Estimated SQFT**: Client-provided square footage
- **Actual SQFT**: Scanned/measured actual
- **SQFT Variance**: Percentage difference
- **Audit Complete Flag**: Boolean
- **Billing Adjustment Approved**: Gate for >10% variance

### QC 3-Stage Validation Gates
- **B-Validation**: Cross-scan alignment (pending/passed/failed/waived)
- **C-Validation**: Control point alignment (optional)
- **Registration RMS**: Measured accuracy in inches
- **Registration Passed At**: Timestamp
- **Registration Notes**: Technician comments

### LEED v5 Embodied Carbon Tracking
- **GWP Baseline**: Reference building kgCO2e
- **GWP Actual**: Measured kgCO2e from BoM analysis
- **GWP Reduction Target**: Percentage (LEED v5 = 5-20%)
- **Bill of Materials (BoM)**:
  - Material, category (Concrete/Steel/Aluminum/Glass/Insulation/Other)
  - Quantity, unit (kg/m3/m2/ea/lf)
  - GWP factor (kgCO2e per unit)
  - GWP total

### HBIM Auto-Defaults
Automatically sets LOD 350+ for heritage building types:
- Historical/Renovation
- Religious Building
- Hotel/Resort
- Theatre/Performing Arts
- Museum/Gallery

### Technician (ScanTech) Management
- Name, email, phone
- Base location
- Travel capability flag
- Active status

---

## 4. Field Operations (ScanTech)

### Mobile-Optimized Interface
- Responsive design for phone/tablet use
- Touch-friendly controls
- Offline-capable (where applicable)

### GPS-Based Time Tracking
- **Clock In/Out**: Automatic capture with coordinates
- **Geofence Detection**: Visual indicator of on-site status
- **Time Logs**:
  - Arrival/departure timestamps
  - Total site minutes
  - Type: Automatic (GPS) or Manual
  - Latitude/longitude at clock-in
  - Technician notes

### Daily Missions
- View assigned projects for the day
- Project details and requirements
- Navigation to job sites

### Site Intelligence Capture
- **Video Walkthrough Recording**: Capture site conditions
- **Audio Recording**: Voice notes during inspection
- **AI-Powered Analysis**:
  - Whisper transcription of audio
  - GPT analysis of walkthrough
  - Extracted insights:
    - Physical site obstructions
    - Lighting conditions
    - Confirmed areas for scanning
    - Requested scope changes

### Field Notes (AI Translation)
- Raw technician notes input
- AI processing to professional scope of work
- Status tracking: Pending → Processing → Completed → Failed

---

## 5. Financial Module

### Profit First Accounts
- **Account Types**: Operating, Taxes, Debt, Marketing
- **Actual Balance**: Real bank balance
- **Virtual Balance**: Calculated from allocations
- **Allocation Percentages**: Configurable per account
- **Revenue Allocation**: Automatic distribution when payments received

### Collections Management
- **Invoice Tracking**: Create, view, update invoices
- **Overdue Detection**: Automatic flagging of past-due invoices
- **Interest Calculation**: Apply late payment interest
- **Reminder System**: Automated overdue payment reminders via email
- **Outstanding Balance**: Per-lead balance calculation
- **Retainer Status**: Track retainer payments per lead

### Internal Loans
- Track loans between accounts
- Active loan monitoring
- Repayment processing
- Balance reconciliation

### Vendor Payables
- Track amounts owed to vendors
- Payment status (paid/unpaid)
- Due date management

### QuickBooks Online Integration
- **OAuth 2.0 Authentication**: Secure token-based connection
- **Expense Sync**: Pull expenses from QuickBooks
- **Category Mapping**: Travel, Equipment, Labor, Software
- **Expense Linking**: Associate expenses with leads/projects
- **Profitability Analytics**: Revenue vs. expense analysis per project

---

## 6. AI Capabilities

### Field Note Translation
- **Model**: GPT-4o-mini
- **Input**: Raw technician notes (text or voice)
- **Output**: Professional scope of work document
- Preserves technical accuracy while improving clarity

### Voice Transcription
- **Model**: OpenAI Whisper
- **Use Cases**:
  - Meeting notes
  - Site walkthroughs
  - Quick voice memos

### AI Actions (Per Lead)
- **Generate Quote Description**: Create professional descriptions from lead data
- **Suggest Probability**: AI-recommended win probability based on factors
- **Draft Follow-up Email**: Personalized communication drafts
- **Generate Scope**: Convert notes to detailed scope document

### Meeting Scoping Assistant
- Audio recording during client meetings
- Real-time transcription
- Automatic extraction of:
  - Client requirements
  - Project specifications
  - Timeline discussions
  - Special requirements

### AI Assistant (Chat Interface)
- Conversational AI for questions about the system
- Context-aware responses based on current data
- Available from dashboard and throughout the app

### Research Insights
- Property research integration
- Client research capabilities
- AI-generated insights for lead intelligence

---

## 7. Communication Tools

### Communication Center
- Centralized view of all client communications
- Email history and tracking
- Communication timeline per lead

### Evidence Vault
- Document repository per lead
- Research findings consolidation
- Proof links and supporting documentation
- Accessible from lead detail view

### Email Integration (Gmail)
- List recent emails
- Send emails directly from the system
- Track email correspondence with leads
- Reminder emails for overdue invoices

### Calendar Integration (Google Calendar)
- View upcoming appointments
- Create calendar events
- Scheduling coordination

---

## 8. Location Intelligence

### Google Maps Integration
- **Maps API**: Location visualization
- **Geocoding**: Address to coordinates conversion
- **Static Maps**: Embedded map previews

### Street View Integration
- Street-level imagery of project sites
- Pre-scan site evaluation
- Visual verification of addresses

### Google Places API
- Location search and autocomplete
- Place details retrieval
- Business information lookup

### Solar API (Available)
- Solar potential analysis
- Roof configuration data
- Energy production estimates

### Aerial View API (Available)
- Overhead imagery access
- Site area visualization
- Pre-scan planning support

### Location Preview Component
- Combined view of location data
- Map + Street View integration
- Quick site assessment tool

---

## 9. External Integrations

### CRM Systems
| System | Auth Method | Features |
|--------|-------------|----------|
| HubSpot | Replit OAuth | Contacts, Deals, Companies, Import |
| Go High Level | API Key | Opportunities, Contacts, Import |

### Project Management
- **Airtable**: Project tracking sync, analytics, "Closed Won" handoffs
  - Time entries retrieval
  - Overview and analytics endpoints
  - Sync project data to Airtable

### Financial
- **QuickBooks Online**: OAuth 2.0, expense sync, profitability tracking

### Google Workspace
- Gmail (send/list emails)
- Google Calendar (view/create events)
- Google Drive (list/upload files)

### AI/ML
- **OpenAI**: GPT-4o-mini, Whisper
- **Gemini** (configured): Google AI integration

### CPQ External Tool
- **cpq.scan2plan.dev**: Bi-directional quote sync
- API key authentication
- Version tracking
- Quote URL linking

---

## 10. Data Model

### Core Tables

| Table | Purpose | Key Fields |
|-------|---------|------------|
| `users` | User accounts | id, role, email, profile |
| `sessions` | Auth sessions | id, userId, expiresAt |
| `leads` | Sales pipeline | id, projectCode, clientName, dealStage, value, cpqAreas, cpqTravel |
| `lead_research` | AI research results | leadId, researchType, summary, citations |
| `projects` | Production tracking | id, universalProjectId, leadId, status, targetLoD, bValidationStatus |
| `scantechs` | Field technicians | id, name, baseLocation, canDoTravel |
| `field_notes` | Raw/processed notes | projectId, rawContent, processedScope, status |
| `time_logs` | Clock in/out | projectId, techId, arrivalTime, latitude, longitude |
| `site_intelligence` | Video/audio analysis | projectId, transcript, aiSummary, obstructions |
| `settings` | App configuration | key, value (JSONB) |
| `quickbooks_tokens` | OAuth tokens | accessToken, refreshToken, realmId |
| `expenses` | Synced expenses | qbExpenseId, leadId, amount, category |
| `accounts` | Profit First buckets | accountType, actualBalance, virtualBalance |
| `invoices` | Client billing | leadId, amount, status, dueDate |
| `internal_loans` | Inter-account loans | fromAccount, toAccount, amount, status |
| `vendor_payables` | Vendor bills | vendorName, amount, dueDate, isPaid |
| `conversations` | AI chat threads | userId, title, messages |
| `messages` | Chat messages | conversationId, role, content |

### Controlled Vocabularies
- **Building Types**: 16 options including HBIM types
- **Scope Options**: Full Building, Interior Only, Exterior Only, etc.
- **LOD Levels**: 100, 200, 300, 350, 400
- **LoA Levels**: 10, 20, 30, 40, 50 (tolerance thresholds)
- **Scanner Types**: Trimble X7, NavVis SLAM, Matterport, FARO
- **BIM Deliverables**: Revit, AutoCAD, Point Cloud, Navisworks, IFC, SketchUp
- **CPQ Disciplines**: arch, struct, mech, elec, plumb, site
- **Travel Modes**: local, regional, flyout
- **Risk Factors**: 9 types

---

## 11. Business Logic & Gates

### Production Hard Gates (Risk Mitigation)

| Gate | Trigger | Action |
|------|---------|--------|
| **Retainer Gate** | Moving to "Scanning" stage | Blocks if retainer not paid |
| **QC Gate** | Moving to "Modeling" stage | Blocks if B-Validation not passed |
| **Delivery Gate** | Moving to "Delivered" status | Blocks if linked lead has unpaid invoices |
| **BOMA Variance Alert** | SQFT variance > 10% | Soft gate: flags for billing adjustment |

### Probability Engine
- Automatic probability calculation based on:
  - Deal stage
  - Days since last contact
  - Lead priority
  - Historical win rates
- Recalculation triggers on stage changes

### Staleness Penalties
- Configurable thresholds per stage
- Automatic probability reduction over time
- Visual indicators for stale leads

### HBIM Auto-Defaults
- Detects heritage building types
- Automatically sets LOD 350+ requirements
- Prevents under-scoping of complex buildings

---

## 12. Enhancement Opportunities

### Suggested Improvements

#### Sales Module
- [ ] Multi-currency support for international projects
- [ ] Automated follow-up sequences
- [ ] Lead scoring machine learning model
- [ ] Competitor tracking per lead
- [ ] Proposal template library

#### Production Module
- [ ] Resource capacity planning
- [ ] Automated scheduling based on technician availability
- [ ] Equipment tracking and assignment
- [ ] Client portal for project visibility
- [ ] Milestone notifications

#### Field Operations
- [ ] Offline mode for poor connectivity areas
- [ ] Photo documentation with AI tagging
- [ ] Equipment checklist per project
- [ ] Real-time status updates for dispatchers
- [ ] Automated mileage logging

#### Financial Module
- [ ] Automated invoice generation from closed deals
- [ ] Payment processing integration (Stripe)
- [ ] Cash flow forecasting
- [ ] Budget vs. actual per project
- [ ] Subcontractor payment tracking

#### AI Capabilities
- [ ] Predictive project duration estimates
- [ ] Automated quality issue detection from point clouds
- [ ] Smart scheduling recommendations
- [ ] Client sentiment analysis from communications
- [ ] Competitive pricing intelligence

#### Integrations
- [ ] Slack notifications
- [ ] Microsoft Teams integration
- [ ] Autodesk BIM 360/ACC sync
- [ ] Procore integration
- [ ] Salesforce CRM option

#### Reporting
- [ ] Custom report builder
- [ ] Scheduled report delivery
- [ ] Executive dashboard PDF export
- [ ] Client-facing project reports
- [ ] YoY comparison analytics

---

## API Endpoints Summary

### Authentication
- `POST /api/login` - User login
- `GET /api/logout` - User logout
- `GET /api/auth/user` - Current user info

### Leads
- `GET /api/leads` - List all leads
- `GET /api/leads/:id` - Get lead by ID
- `POST /api/leads` - Create lead
- `PUT /api/leads/:id` - Update lead
- `DELETE /api/leads/:id` - Delete lead
- `PATCH /api/leads/:id/stage` - Move stage
- `GET /api/leads/:id/estimate-pdf` - Generate PDF
- `POST /api/leads/:id/handoff` - Handoff to production

### Projects
- `GET /api/projects` - List projects
- `GET /api/projects/:id` - Get project
- `POST /api/projects` - Create project
- `PUT /api/projects/:id` - Update project
- `POST /api/projects/:id/sync` - Sync to Airtable

### CRM Integration
- `GET /api/hubspot/status` - HubSpot connection status
- `GET /api/hubspot/contacts` - Fetch HubSpot contacts
- `GET /api/hubspot/deals` - Fetch HubSpot deals
- `POST /api/hubspot/import` - Import HubSpot deals
- `GET /api/ghl/status` - GHL connection status
- `POST /api/ghl/import` - Import GHL opportunities

### Financial
- `GET /api/accounts` - List Profit First accounts
- `POST /api/accounts/allocate` - Allocate revenue
- `GET /api/invoices` - List invoices
- `POST /api/invoices` - Create invoice
- `POST /api/invoices/send-reminders` - Send overdue reminders
- `GET /api/expenses` - List expenses
- `GET /api/analytics/profitability` - Profitability report

### Field Operations
- `GET /api/scantechs` - List technicians
- `POST /api/field-notes` - Create field note
- `POST /api/field-notes/process` - AI process note
- `POST /api/time-logs` - Clock in/out

### Location
- `GET /api/location/preview` - Location preview data
- `GET /api/location/place-details` - Google Places details

---

*This document provides a complete inventory of Scan2Plan OS features for enhancement planning and cross-LLM review.*
