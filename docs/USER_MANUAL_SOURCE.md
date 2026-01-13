# Scan2Plan OS: Comprehensive User Guide

> **Note to AI Processor (NotebookLM):** This document is written as a narrative source text. Please use this content to generate a friendly, step-by-step User Manual for new employees at Scan2Plan. The tone should be professional but accessible.

---

## 1. Introduction to Scan2Plan OS

Welcome to **Scan2Plan OS**, the central nervous system of our company. This platform isn't just a CRM or a Project Management tool—it's an end-to-end operating system designed specifically for the laser scanning and BIM modeling industry.

We built this system to solve the unique challenges of our workflow: complex quoting, travel logistics, massive data files, and strict precision standards.

### The Lifecycle of a Job
Every job in Scan2Plan OS follows a specific journey:
1.  **Lead**: A potential project enters the system.
2.  **Quote (CPQ)**: You configure the building details, and the system calculates the price.
3.  **Closed Won**: The client signs, and the lead becomes a **Project**.
4.  **Production**: Our field techs scan the site, and our BIM team models it.
5.  **Delivery**: The final files are sent to the client, and we get paid.

---

## 2. Sales & CPQ (Configure, Price, Quote)

The Sales module is where revenue begins. The heart of this module is the **CPQ Engine**, which allows you to build complex quotes in minutes that would technically take hours in a spreadsheet.

### Step 1: Creating a Lead
Navigate to the **Sales Pipeline**. Click **"+ New Lead"**.
*   **Essential Info**: You must enter a **Project Name** and **Project Address**. The address is critical because it powers our travel calculations later.
*   **Deal Stage**: New leads start in "Leads". As you progress, you'll move them to "Contacted", "Proposal", and eventually "Closed Won".

### Step 2: Building a Quote
Open a Lead and click the **"Quote"** tab. You'll see a two-panel interface.
*   **Left Panel**: This is your workspace.
*   **Right Panel (Sidebar)**: This is the **Live Pricing Preview**. It updates in real-time as you change options. Watch this panel—it tells you if your quote is profitable.

#### A. Defining Project Areas
A project isn't just one big "thing." It's composed of **Areas**. For example, a university campus might have a "Main Hall", a "Dormitory", and a "Parking Lot".
*   Click **"Add Area"**.
*   **Building Type**: Choose carefully! A "Hospital" costs much more to scan than a "Warehouse".
    *   *Tip:* Use "Commercial - Simple" for basic empty shells.
    *   *Tip:* Use "Built Landscape" for outdoor topography (pricing switches to per-acre).
*   **Square Feet**: Enter the Gross Square Footage (GSF).
*   **Disciplines**: What are we modeling?
    *   **Architecture**: Walls, floors, windows, doors.
    *   **Structure**: Beams, columns, trusses.
    *   **MEPF**: Ductwork, pipes, conduit (the complex stuff).
*   **LOD (Level of Development)**: How detailed should the model be?
    *   **LOD 200**: Rough geometry (placeholders).
    *   **LOD 300**: Precise geometry (standard for design).
    *   **LOD 350**: High detail with connections (construction documentation).

#### B. Risk Factors
Does the project have hair on it? Check these boxes to add safety margin:
*   **Occupied**: People walking around while we scan? Check this (+15%).
*   **Hazardous**: Mold, asbestos, construction site? Check this (+25%).
*   **No Power**: Do we need to bring batteries/generators? Check this (+20%).

#### C. Logistics & Travel
This is where Scan2Plan OS shines.
1.  **Dispatch Location**: Where is the technician coming from? (e.g., Troy, Brooklyn).
2.  **Distance**: The system auto-calculates the driving distance from the dispatch hub to the project site.
3.  **Pricing Models**:
    *   **Local**: Short drive, no hotels.
    *   **Regional**: Long drive, includes hotels and per diem.
    *   **Fly-out**: System adds airfare, rental cars, and airport parking estimates.

### Step 3: Generating the Proposal
Once your numbers look right in the Preview Panel:
1.  **Button**: Click **"Create PandaDoc"**.
2.  **Magic Happenings**: The system takes all your data—client name, scoped areas, pricing, inclusions/exclusions—and pushes it directly into a legal contract in PandaDoc.
3.  **Review**: Open the PandaDoc link, check the formatting, and send it to the client for e-signature.

---

## 3. Production & Field Operations

Once a deal is "Closed Won", it transforms into a **Project**.

### The Kanban Board
Navigate to **"Production"**. You'll see projects moving through these stages:
1.  **Scheduling**: Waiting for a date on the calendar.
2.  **Scanning**: Tech is on-site capturing data.
3.  **Registration**: We are stitching the scans together.
4.  **Modeling**: The BIM team is building the 3D model.
5.  **QC**: Quality Control is checking the work.

### For Field Technicians (Mobile Workflow)
Technicians use the mobile view of Scan2Plan OS.
*   **Clock In**: When you arrive at the site, tap "Clock In". The system logs your GPS location to verify you're at the right address.
*   **Field Notes**: Use the **AI Note Taker**.
    *   *Feature*: Tap the microphone and say, "The mechanical room on the 3rd floor is locked, scope changed to hallway only."
    *   *AI Action*: The system transcribes your voice and auto-formats it into a professional "Scope Change" note for the project manager.
*   **Uploads**: Upload site photos directly to the Project ID folder on Google Drive (linked in the app).

---

## 4. Financial Module (Profit First)

We run our business on **Profit First** principles. Scan2Plan OS helps us stick to them.

### Invoicing
*   **Trigger**: When a project hits "Scanning", the system flags it for the Deposit Invoice (usually 50%).
*   **Integration**: Clicking "Create Invoice" pushes the data to **QuickBooks Online**.
*   **Gates**: The system has "Hard Gates". You often cannot deliver final files to a client if there is an unpaid invoice on their account.

### Account Allocation
Money isn't just one big pile. When revenue comes in, the **Financial Dashboard** helps allocate it:
*   **Operating Expenses**: 30%
*   **Taxes**: 15%
*   **Profit**: 10%
*   **Owner Pay**: 45%
(These percentages are configurable in Settings).

---

## 5. Troubleshooting & FAQs

### Why can't I save my quote?
Look at the **Integrity Audit** panel in the quote sidebar.
*   **Red Shield**: You have a blocking error. Usually, your **Gross Margin** is below the 40% floor. You cannot save a money-losing deal without an Admin override.
*   **Yellow Shield**: Warning only. You might have forgotten to select a "Building Type".

### The travel cost says $0?
Did you enter a valid **Project Address** in the Lead tab? The system needs a specific address to calculate distance.

### How do I add a new user?
Go to **Settings > Team**. Only "CEO" role users can invite new members.

---

*This guide serves as the source truth for the Scan2Plan OS User Manual.*
