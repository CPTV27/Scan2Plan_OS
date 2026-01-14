# Scan2Plan OS Knowledge Base

> **Purpose:** This document is optimized for NotebookLM ingestion. It contains comprehensive Q&A-style content about all Scan2Plan OS features, workflows, and troubleshooting. Employees can query NotebookLM to get answers about how to use the application.

---

## Table of Contents
1. [Platform Overview](#platform-overview)
2. [Sales & Pipeline](#sales--pipeline)
3. [CPQ (Quote Builder)](#cpq-quote-builder)
4. [Proposal Builder](#proposal-builder)
5. [Production Workflow](#production-workflow)
6. [FieldHub Mobile App](#fieldhub-mobile-app)
7. [Financial Module](#financial-module)
8. [AI Features](#ai-features)
9. [Integrations](#integrations)
10. [Settings & Admin](#settings--admin)
11. [Troubleshooting FAQ](#troubleshooting-faq)

---

## Platform Overview

### What is Scan2Plan OS?
Scan2Plan OS is an end-to-end operating system designed for the laser scanning and BIM modeling industry. It combines CRM, CPQ (Configure-Price-Quote), project management, field operations, and financial tracking into one platform.

### What is the lifecycle of a job?
1. **Lead**: Potential project enters the pipeline
2. **Quote**: Configure building details, calculate pricing with CPQ
3. **Proposal**: Generate and send a professional proposal
4. **Closed Won**: Client signs, lead becomes a Project
5. **Production**: Field techs scan, BIM team models
6. **Delivery**: Final files sent to client

### What user roles exist?
- **CEO**: Full system access, can override margin gates
- **Sales**: Access to pipeline, leads, quotes, proposals
- **Production**: Access to projects, field operations
- **Accounting**: Access to financial module

---

## Sales & Pipeline

### How do I create a new lead?
1. Navigate to **Sales Pipeline** from the sidebar
2. Click **"+ New Deal"** button
3. Fill in required fields:
   - Client / Company name
   - Project Name
   - Project Address (critical for travel calculations)
4. Click **Save**

### What are the pipeline stages?
1. **Leads**: New opportunities
2. **Contacted**: Initial outreach made
3. **Proposal**: Quote/proposal sent
4. **Negotiation**: Active discussions
5. **On Hold**: Temporarily paused
6. **Closed Won**: Deal signed
7. **Closed Lost**: Deal lost

### What is a Buyer Persona?
Buyer Personas help tailor communication. Options include:
- **BP1 (Engineer)**: Technical detail, risk/coordination focus
- **BP2 (Executive)**: ROI and speed focus
- **BP3 (Project Manager)**: Timeline and budget focus
- **BP4 (Facilities Manager)**: Operations focus
- **BP5 (Architect)**: Design and precision focus
- **BP6 (Owner/Developer)**: Value and investment focus
- **BP7 (GC/Contractor)**: Schedule and coordination focus

### What is the Staleness Engine?
It automatically reduces win probability for leads that haven't been contacted recently. Configure thresholds in Settings > Staleness Settings.

---

## CPQ (Quote Builder)

### How do I build a quote?
1. Open a lead from the Sales Pipeline
2. Click the **Quote** tab
3. Add one or more **Areas** (buildings/spaces)
4. Configure each area:
   - Building Type (16 options)
   - Square Footage
   - Scope (Full/Interior/Exterior)
   - Disciplines (Architecture, Structure, MEP, Site)
   - LOD per discipline (200/300/350)
5. Add Risk Factors if applicable
6. Configure Travel
7. Review the **Live Pricing Preview** on the right
8. Click **Save Quote**

### What are the Building Types?
Commercial - Simple, Commercial - Complex, Office, Hospital, Industrial, Warehouse, Retail, Educational, Residential - Single Family, Residential - Multi-Family, Historical/Renovation, Religious Building, Hotel/Resort, Theatre/Performing Arts, Museum/Gallery, Built Landscape (outdoor/per-acre)

### What disciplines can I select?
- **Architecture (Arch)**: Walls, floors, doors, windows
- **Structural (Struct)**: Beams, columns, foundations
- **Mechanical (Mech)**: HVAC, ductwork
- **Electrical (Elec)**: Conduit, panels, fixtures
- **Plumbing (Plumb)**: Pipes, fixtures
- **Site**: Exterior, topography

### What are LOD levels?
- **LOD 200**: Basic geometry, placeholders
- **LOD 300**: Precise geometry (standard)
- **LOD 350**: High detail with connections
- **LOD 400**: Fabrication-ready

### What are Risk Factors?
Risk factors add percentage markup to account for project complexity:
- **Occupied Building**: +15%
- **Hazardous Conditions**: +25%
- **No Power/HVAC**: +20%
- **Remote Location**: +10%
- **Fast Track/Rush**: +15%
- **Revisions Expected**: +10%
- **Incomplete Documents**: +10%
- **Difficult Access**: +15%
- **Multi-Phase**: +10%
- **Union Site**: +5%
- **Security Requirements**: +5%

### How does Travel pricing work?
1. Select a **Dispatch Location** (Brooklyn, Woodstock, Troy)
2. Enter the **Project Address**
3. Click **Calculate Distance**
4. System applies tier-based pricing:
   - **Brooklyn Dispatch**:
     - Tier A (50K+ sqft): No base fee, $4/mile over 20 miles
     - Tier B (10K-49,999 sqft): $300 base + $4/mile over 20 miles
     - Tier C (<10K sqft): $150 base + $4/mile over 20 miles
   - **Woodstock/Troy**: Flat $3/mile

### What is the 40% Gross Margin Floor?
Quotes with less than 40% gross margin show a warning. CEO can acknowledge and proceed with strategic pricing. This protects profitability.

### What is Tier A Auto-Flagging?
Projects 50,000+ sqft are automatically flagged as "Tier A" with:
- Amber "Tier A" badge on the lead
- Priority set to 5 (highest)
- Recommendation to add an Estimator Card

---

## Proposal Builder

### How do I create a proposal?
1. Open a lead and go to the **Proposal** tab
2. Click **"Open Proposal Builder"**
3. Select a template group
4. Customize sections as needed
5. Use **Edit Section** to modify content
6. Click **Preview** to see the final document
7. Generate PDF or send via PandaDoc

### How do I edit a proposal section?
1. Click the **three-dot menu** on any section card
2. Select **"Edit Section"**
3. Modify the content in the editor
4. Click **Save**

### What variables are available?
Template variables auto-substitute with lead/quote data:
- `{{clientName}}`, `{{projectName}}`, `{{projectAddress}}`
- `{{totalPrice}}`, `{{scanningCost}}`, `{{modelingCost}}`
- `{{disciplines}}`, `{{lod}}`, `{{buildingType}}`
- `{{paymentTerms}}`, `{{timeline}}`

### How do I add case studies?
1. In the Proposal Builder, look for the Case Studies section
2. Click **"Add Case Study"**
3. Select from the Evidence Vault
4. Case studies matching the building type are recommended

---

## Production Workflow

### What are the Production stages?
1. **Scheduling**: Project created, waiting for scan date
2. **Scanning**: Field tech on-site capturing data
3. **Processing**: Raw data cleaned and registered
4. **Modeling**: BIM model creation
5. **QC**: Quality control check
6. **Delivered**: Sent to client
7. **Archived**: Project complete

### How do projects get created?
When a lead is moved to **Closed Won**:
1. A project is automatically created
2. Quote data transfers (price, margin, scope)
3. Project appears in Production > Scheduling

### What is the SQFT Variance Audit?
Before modeling:
1. Enter the **Actual SQFT** from scan data
2. System calculates variance from estimated
3. If variance > 10%, a warning triggers
4. Must clear variance alert before proceeding

### What are Production Hard Gates?
- **Retainer Gate**: Can't start scanning until retainer is paid
- **QC Gate**: Can't deliver if variance exceeds threshold
- **Invoice Gate**: Can't deliver if invoices are unpaid

---

## FieldHub Mobile App

### How do I access FieldHub?
Navigate to **/field** on any device. On mobile phones and tablets, the interface automatically switches to mobile-optimized layout.

### What is the mobile navigation?
Bottom navigation tabs:
- **Home**: Mission overview + Quick Actions
- **Time**: Clock In/Out with GPS tracking
- **Capture**: Photo/video upload
- **Chat**: AI support
- **Notes**: Voice recording + transcription

### What are Quick Actions?
Large, touch-friendly buttons on the Home tab:
- **Clock In/Out**: One-tap with GPS location capture
- **Capture**: Direct camera access for site photos
- **Voice Note**: Record voice memo → AI transcription
- **Escalate**: Immediate AI support chat

### How do Voice Notes work?
1. Tap **Voice Note** Quick Action
2. Press **Record Voice Note** and speak clearly
3. Tap **Stop** when finished
4. AI transcribes audio using OpenAI Whisper
5. Text appears in Field Notes
6. Notes save locally until Daily Report submission

### How does GPS Time Tracking work?
When you Clock In:
1. System requests browser location permission
2. GPS coordinates are captured
3. Timestamp + location sent to server
4. Mission log entry created

If geolocation fails, Clock In still works but location won't be recorded.

### Why isn't my GPS working?
Common causes:
- Location permissions not granted in browser
- GPS signal weak (indoors or parking garage)
- Browser privacy settings blocking geolocation

---

## Financial Module

### What is Profit First accounting?
Revenue is allocated to accounts with target percentages:
- **Operating Expenses**: 30%
- **Taxes**: 15%
- **Profit**: 10%
- **Owner Pay**: 45%

Configure percentages in Settings.

### How do invoices work?
1. When project hits "Scanning", Deposit Invoice is flagged (50%)
2. Click **"Create Invoice"** to push to QuickBooks
3. Final invoice sent after delivery
4. System blocks delivery if invoices unpaid

### What is QuickBooks integration?
- OAuth 2.0 connection to QuickBooks Online
- Sync expenses and link to projects
- Create invoices and estimates
- Track actual vs. quoted margin

---

## AI Features

### What AI features are available?
1. **Intelligent Scoping**: Suggests building type, LOD, disciplines from project description
2. **Document Intelligence**: Extracts requirements from RFPs/PDFs
3. **Predictive Deal Intelligence**: Win probability and risk analysis
4. **Natural Language CPQ**: Build quotes from plain English
5. **AI Proposal Generator**: Personalized proposals by buyer persona
6. **Smart Project Matching**: Find similar past projects
7. **Voice Transcription**: Whisper AI for voice notes
8. **Field Note Translation**: Convert raw notes to professional scope
9. **AI Agent Dashboard**: Autonomous prompt generation and marketing intelligence

### How do I use the AI Assistant?
Click the **Chat** icon in the sidebar or use the Chat tab in FieldHub. Ask questions about the system, your leads, or get help with tasks.

### What is the AI Agent Dashboard?
The AI Agent Dashboard is a CEO-only feature that allows you to manage AI-generated prompts and extract marketing intelligence from business data. It uses your entire database as a Retrieval Augmented Generation (RAG) context to optimize prompts for Scan2Plan's specific market.

Access it via **AI Agent** in the sidebar (CEO role only) or navigate to `/ai-agent`.

### What are the main features of the AI Agent?

**1. Prompt Library**
- Store and manage AI-optimized search prompts
- Organize prompts by category (opportunity, policy, competitor, project, technology, funding, event, talent, market)
- Track performance metrics (usage count, success rate)
- Self-improving prompts that learn from your feedback

**2. Marketing Intelligence Extraction**
- AI analyzes news feeds and intel items
- Extracts actionable insights
- Generates recommended actions
- Tracks confidence scores

**3. RAG Context Viewer**
- See what data the AI uses to understand Scan2Plan
- Brand personas, red lines, standards
- Company capabilities
- Geographic focus areas
- Network statistics (leads, wins, building types)

### How do I generate AI prompts?
1. Navigate to **AI Agent** in the sidebar
2. Click **Generate Prompts** button
3. AI creates 9 category-specific prompts optimized for Scan2Plan
4. Prompts appear in the Prompt Library tab
5. Each prompt includes the search query, variables, and optimization notes

### How do I add my own prompt ideas?
1. In the AI Agent Dashboard, click **Add Prompt**
2. Select a category (e.g., "opportunity", "competitor")
3. Enter a name (e.g., "NYC Historic RFPs")
4. Write your base prompt
5. Click **Add & Optimize**
6. The AI automatically refines your prompt using company context

### How does prompt optimization work?
The AI Agent tracks how prompts are used:
- Click ✓ (Accept) when a prompt produces good results → Increases success rate
- Click ↻ (Refine) when a prompt needs improvement → AI generates better version
- Performance metrics track: usage count, success rate, confidence

Over time, the system learns which prompts work best for your market.

### How do I extract marketing intel?
1. Click **Extract Intel** button
2. AI analyzes recent news items from your intel feeds
3. For each significant finding, it extracts:
   - Key insights (what this means for Scan2Plan)
   - Action items (recommended next steps)
   - Confidence score (how certain the AI is)
4. Review intel in the Marketing Intel tab
5. Click **Mark Done** when you've acted on an insight

### What is RAG Context?
RAG (Retrieval Augmented Generation) means the AI uses your actual company data to make its responses more relevant. The AI Agent pulls from:

- **Brand Engine**: Personas, red lines, terminology standards
- **Capabilities**: All registered services and tools
- **Geography**: Regions served, primary markets, service areas from your leads
- **Network**: Lead counts, win history, top building types, recent wins
- **Intel**: Active opportunities, competitors mentioned, policy alerts

This ensures prompts are tailored to Scan2Plan's specific market position.

### Who can access the AI Agent?
Only users with the **CEO** role can access the AI Agent Dashboard. This is enforced by role-based access control.

---


## Integrations

### What integrations are available?
- **PandaDoc**: Proposal creation and e-signatures
- **QuickBooks Online**: Invoicing and expense tracking
- **Google Workspace**: Calendar, Gmail, Drive
- **HubSpot**: CRM sync and import
- **GoHighLevel**: Opportunity sync
- **Airtable**: Project tracking sync
- **OpenAI**: GPT-4o-mini, Whisper
- **Google Maps**: Distance calculation, location preview

### How do I connect QuickBooks?
1. Go to **Settings > Integrations**
2. Click **Connect QuickBooks**
3. Authorize the OAuth connection
4. Tokens are stored securely

### How do I connect PandaDoc?
1. Get an API key from PandaDoc Settings
2. Add `PANDADOC_API_KEY` to environment variables
3. Proposals can now be created from the Proposal tab

---

## Settings & Admin

### Where do I configure business defaults?
**Settings > Business Defaults**:
- Default LOD and LoA standards
- Target margins
- Payment term options

### How do I manage lead sources?
**Settings > Lead Sources**:
- Add/remove attribution sources
- Required before marking "Closed Won"

### How do I configure staleness thresholds?
**Settings > Staleness Settings**:
- Set days before probability decay
- Configure per-stage thresholds

### How do I add team members?
**Settings > Team** (CEO role only):
- Invite users by email
- Assign roles
- Manage permissions

---

## Troubleshooting FAQ

### Why can't I save my quote?
Check the **Integrity Audit** panel:
- **Red Shield**: Blocking error (margin below 40%)
- **Yellow Shield**: Warning only (missing building type)

CEO can acknowledge and proceed with margin below 40%.

### Why is travel cost $0?
Enter a valid **Project Address** in the Lead Details tab. The system needs an address to calculate distance.

### Why can't I move a deal to Closed Won?
**Lead Source Attribution Gate**: You must select a Lead Source before closing a deal.

### Why can't I deliver a project?
Check for:
- Unpaid invoices on the lead
- SQFT variance > 10% not cleared
- QC not passed

### How do I reset QuickBooks connection?
Go to **Settings > Integrations > QuickBooks** and click **Disconnect**, then reconnect.

### The app looks different on mobile?
FieldHub automatically switches to mobile layout when viewport width is < 768px. This is intentional for field technicians.

### Voice recording isn't working?
1. Grant microphone permission in browser
2. Check that you're on HTTPS (required for MediaRecorder)
3. Try a different browser if issues persist

---

*This knowledge base is the source of truth for NotebookLM. Update this file when features change.*
