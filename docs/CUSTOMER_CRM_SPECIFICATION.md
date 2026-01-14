# Customer CRM Specification

**Version:** 1.0
**Last Updated:** January 2026
**Purpose:** Define the UI and behavior for the Customer Database module.

---

## 1. Overview
The Customer Database (`/customers`) serves as the central repository for client information, bridging QuickBooks financial data with sales/marketing enrichment.

## 2. Customer List UI (`/customers`)

### Layout
- **Header**: "Customers" title, Stats (Total Customers, Active, Churned).
- **Toolbar**:
  - Search Bar (Name, Email, Company).
  - "Sync from QuickBooks" Button (Primary).
- **Table**:
  - Columns:
    - **Name/Company** (Avatar + Text).
    - **Status** (Lead, Customer, Churned) - Badge.
    - **Industry** (Text).
    - **Projects** (Count).
    - **Total Revenue** (Currency).
    - **Balance** (Currency - Red if > 0).
    - **Actions** (View Profile).

### Behavior
- **Sync**: Pulls latest data from QBO. Shows "Syncing..." loading state.
- **Click Row**: Navigates to `/customers/:id`.
- **Search**: Client-side filtering of the list.

## 3. Customer Detail UI (`/customers/:id`)

### Layout
**Left Column (Profile Card)**
- **Header**: Large Avatar (Building Icon), Display Name, Company Name, Status Badge.
- **Contact**: Email, Phone, Address (Billing).
- **Enrichment Section**:
  - Header: "Enrichment Data" + "Auto-Enrich" Button (Sparkles Icon).
  - Fields: Website, Industry, Employee Count, LinkedIn URL.
  - Edit Mode: Input fields for manual override.

**Right Column (Stats & Projects)**
- **Stats Grid**:
  - Total Revenue (Green).
  - Active Pipeline (Blue).
  - Project Count (Purple).
- **Engagements Tab**:
  - List of "Leads" (Projects) associated with this customer.
  - Shows: Project Name, Address, Stage, Value.

### AI Enrichment Logic
- **Trigger**: User clicks "Auto-Enrich".
- **Input**: Customer Name, Website (if available).
- **Service**: Calls `server/services/aiEnrichment.ts` (OpenAI GPT-4).
- **Output**:
  - Industry (e.g., "Architecture").
  - Employee Count Range.
  - LinkedIn URL.
  - Tags (array).
  - Notes (Business Summary).
- **Persistence**: Saves to `qb_customers` table columns (`industry`, `employeeCount`, etc.) and `enrichmentData` JSONB.

## 4. QuickBooks Integration
- **Sync Logic**:
  - Customers are master-sourced from QuickBooks.
  - Sync Operation (`/api/quickbooks/sync-customers`) fetches all customers.
  - Updates local DB: `display_name`, `company_name`, `email`, `phone`, `balance`.
  - Does NOT overwrite local enrichment fields (Industry, Tags) unless explicitly designed.

## 5. Security & Roles
- **View Access**: `ceo`, `sales`, `marketing`, `accounting`.
- **Edit/Enrich Access**: `ceo`, `sales`, `marketing`.
- **Delete Access**: Not available in CRM (must manage in QBO).
