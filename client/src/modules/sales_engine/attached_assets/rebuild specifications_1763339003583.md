# Scan-to-BIM Pricing Calculator - Complete Rebuild Specification

## Overview
A professional web-based pricing calculator for Scan-to-BIM services. Users can create quotes through two paths: a **Quick Quote Calculator** for instant estimates, or a **Comprehensive Scoping Form** for detailed project planning. Both paths produce exportable PDF quotes and can be saved to a database.

---

## Core Features

### 1. Home Page
- Clean, professional landing page with two main call-to-action cards:
  - **Quick Quote Calculator** - Fast pricing for straightforward projects
  - **Scoping Form** - Detailed project scoping with comprehensive options
- Navigation to Dashboard and Admin pages
- Light/Dark theme toggle (persistent via localStorage)

### 2. Quick Quote Calculator (`/calculator`)

#### Building Type Selection
14 building types available via dropdown:
1. Residential - Single Family
2. Residential - Multi Family
3. Residential - Luxury
4. Commercial / Office
5. Retail / Restaurants
6. Kitchen / Catering Facilities
7. Education
8. Hotel / Theatre / Museum
9. Hospitals / Mixed Use
10. Mechanical / Utility Rooms
11. Warehouse / Storage
12. Religious Buildings
13. Infrastructure / Roads / Bridges
14. Landscape

#### Project Details
- **Client Name** (optional)
- **Project Address** (required) - auto-calculates distance to dispatch location
- **Project Name** (required)
- **Date** (date picker)

#### Multi-Area Input
Users can add multiple project areas, each with:
- **Area Name** (e.g., "Main Building", "Garage", "Basement")
- **Square Footage** (number)
- **Project Scope** (dropdown):
  - Full Building - includes all disciplines
  - Interior Only - excludes Site/Topography discipline
  - Exterior Only - excludes MEPF discipline
  - Roof/Facades Only - special scope for facade work

**Special Case - Landscape Projects:**
- When Building Type = 14 (Landscape), show "Acres" input instead of square footage
- Landscape projects automatically set scope to include only Site/Topography discipline

**Per-Area Discipline Overrides:**
- Areas can optionally override which disciplines apply
- Used for cases like "Structural Modeling" with different square footage than architectural
- Example: Main Building (5,000 sqft) with Architecture/MEPF/Site, Structural Modeling (2,000 sqft) with Structure only

#### Discipline & LOD Selection
Four disciplines available:
- **Architecture** - Building modeling
- **Structure** - Structural elements
- **MEPF** - Mechanical, Electrical, Plumbing, Fire protection
- **Site/Topography** - Site work and grading

Three LOD (Level of Development) levels:
- **LOD 200** - Conceptual design
- **LOD 300** - Detailed design
- **LOD 350** - Construction documentation

**Scope-Based Filtering:**
- Interior Only projects: Architecture, Structure, MEPF (no Site)
- Exterior Only projects: Architecture, Structure, Site (no MEPF)
- Roof/Facades: All disciplines available
- Landscape: Site/Topography only (auto-selected)

**Optional Disciplines:**
- Users can create quotes with NO disciplines selected (quote contains only additional services like scanning or Matterport)

#### Project Options

**Risk Factors** (multi-select checkboxes):
- Occupied Building
- Hazardous Conditions
- No Power/HVAC

Risk premiums apply ONLY to Architecture discipline pricing.

**Travel Calculation:**
- **Dispatch Location** dropdown: Troy NY, Woodstock NY, Brooklyn NY
- **Project Address** auto-calculates driving distance via Mapbox API
- Shows loading state during distance calculation
- Distance updates automatically when address or location changes

#### Additional Services
Three optional services with quantity inputs:
- **Matterport Virtual Tours** (per unit)
- **Georeferencing** (per unit)
- **3D Laser Scanning** - Two options:
  - Full Day (10 hours)
  - Half Day (4 hours)

#### Notes Field
- Optional textarea for additional project notes and special requirements
- Saved with quote and included in PDF export

#### Real-Time Price Previews
- Discipline/LOD options show estimated cost next to each selection
- Risk factors show premium amount next to each checkbox
- Travel cost updates automatically with calculated distance
- Additional services show per-unit rates and totals

### 3. Pricing Summary Display

#### Itemized Breakdown Structure
**Base Pricing:**
- Per Area breakdown showing:
  - Area name and square footage
  - Each discipline with rate per sqft and subtotal
  - Area subtotal
- Base subtotal (sum of all areas)

**Scope Discount:**
- Applies when ALL areas have the same non-"both" scope:
  - Interior Only: 25% discount
  - Exterior Only: 50% discount
  - Mixed Interior/Exterior: 35% discount on interior areas, 65% discount on exterior areas
  - Roof/Facades: 65% discount
- Shows discount amount in green
- Subtotal After Discount

**Risk Premiums:**
- Added to Architecture discipline only
- Shows each selected risk factor with its premium
- Applied after scope discount

**Travel Costs:**
- Distance-based mileage charge
- Scan day fee if distance > 100 miles (see pricing rules below)

**Additional Services:**
- Each service listed separately with quantity, rate, and cost

**Grand Total**

#### Editable Pricing Fields
ALL pricing fields are editable for manual adjustments:
- Click any price to edit inline
- Editable fields: line item rates, subtotals, scope discount, risk premium, travel cost, additional services, grand total
- Manual overrides persist in database
- PDF export uses manually adjusted values

#### Minimum Billing Area
- Areas under 3,000 sqft are billed at 3,000 sqft minimum
- Display shows "(billed at 3,000 sqft)" notation
- Applies to each area individually

### 4. Scoping Form (`/scoping`)

Comprehensive project scoping form matching Google Form fields. Includes all fields from Quick Calculator plus:

#### Extended Project Information
- Building age
- Number of floors (above/below grade)
- Elevator count
- Parking details
- Occupancy status
- Access restrictions
- Safety requirements

#### Detailed Discipline Scoping

**Architecture:**
- Wall types and finishes
- Ceiling types
- Floor finishes
- Door and window details
- Built-in fixtures
- Casework requirements

**Structural:**
- Foundation type
- Structural system
- Framing details
- **Separate structural square footage** (if different from architectural)

**MEPF:**
- Mechanical systems
- Electrical systems
- Plumbing fixtures
- Fire protection
- Controls and automation

**Site/Topography:**
- Grade around building (yes/no)
- Landscape modeling (no, LOD 200, LOD 300, LOD 350, other)
- Hardscape elements
- Site utilities

#### Additional Areas
- **Basement/Attic** - Separate square footage input
- Automatically creates additional area in converted quote

#### Deliverables
- List of expected deliverables and formats
- Special requirements

#### File Uploads
- Support for uploading existing plans, surveys, photos
- Multiple file upload capability
- Files stored and can be downloaded

### 5. Scoping-to-Quote Conversion

**Automatic Conversion Logic:**
When converting a scoping project to quote:

1. **Building Type** → Maps to calculator building type
2. **LOD Standard** → Applies to all selected disciplines
3. **Total Square Footage** → Creates main area
4. **Disciplines** → Auto-selected based on yes/no answers:
   - Architecture: If building modeling = yes
   - Structure: If structural modeling = yes
   - MEPF: If MEPF modeling = yes
   - Site: If grade around building = yes OR landscape modeling ≠ no

5. **Separate Structural Area:**
   - If structural sqft ≠ architectural sqft
   - Creates TWO areas:
     - Main Building (architectural sqft) with Architecture, MEPF, Site
     - Structural Modeling (structural sqft) with Structure only
   - Uses per-area discipline overrides

6. **Interior/Exterior Scope** → Maps to project scope:
   - interior_only → Interior Only
   - exterior_only → Exterior Only
   - full_building → Full Building
   - facade_roof → Roof/Facades

7. **Basement/Attic** → Creates additional area if square footage provided

8. **All other fields** → Preserved in quote metadata for reference

### 6. Projects Dashboard (`/dashboard`)

Two tabs:
- **Projects** - All scoping projects with full project details
- **Quote Only** - Quotes created directly from calculator (no scoping project)

#### Project List View
Each project shows:
- Project name
- Client name
- Building type
- Total square footage
- LOD level
- Date created
- Status badge
- Action buttons:
  - View details
  - Convert to Quote
  - Download Scantech Sheet (PDF with images)
  - Download files as ZIP
  - Delete

#### Quote List View
Each quote shows:
- Quote number/ID
- Project name
- Client name
- Total price
- Date created
- Action buttons:
  - View/Edit
  - Export PDF
  - Delete

### 7. PDF Exports

#### Quote PDF Export (from Calculator/Dashboard)
**Header:**
- Company branding
- Quote number
- Date

**Project Information:**
- Client name
- Project name
- Project address
- Building type
- Date

**Pricing Table:**
- Complete itemized breakdown (matching on-screen display)
- All areas with disciplines and costs
- Scope discounts
- Risk premiums
- Travel costs
- Additional services
- Grand total

**Notes:**
- Project notes section (if provided)

**Terms:**
- Payment terms
- Validity period

#### Scantech Sheet PDF Export (from Scoping Projects)
**Project Overview:**
- All scoping form fields
- Comprehensive project details
- Discipline requirements

**Embedded Images:**
- All uploaded images displayed inline in PDF
- Maintains image quality and aspect ratios

**Download Options:**
- PDF with all details and images
- ZIP file with all uploaded files

### 8. Admin Interface (`/admin`)

**Pricing Parameters Editor:**
33 configurable parameters organized by category:

**Risk Factors:**
- occupied_building_premium (default: 500)
- hazardous_conditions_premium (default: 1000)
- no_power_hvac_premium (default: 300)

**Travel Costs:**
- travel_rate_per_mile (default: 1.50)
- travel_distance_threshold (default: 100 miles)
- travel_min_days (default: 2)
- travel_scan_day_fee (default: 500 per day)

**Scope Discounts:**
- discount_interior_only (default: 0.25 = 25%)
- discount_exterior_only (default: 0.50 = 50%)
- discount_mixed_interior (default: 0.35 = 35%)
- discount_mixed_exterior (default: 0.65 = 65%)
- discount_roof_facades (default: 0.65 = 65%)

**Landscape Pricing:**
- landscape_acres_enabled (default: true)

**Additional Services:**
- service_matterport (default: 150 per unit)
- service_georeferencing (default: 500 per unit)
- service_scanning_half_day (default: 750)
- service_scanning_full_day (default: 1500)

**Payment Terms:**
- payment_deposit_percent (default: 0.50 = 50%)
- payment_terms_days (default: 30)
- quote_validity_days (default: 30)

**Pricing Matrix Editor:**
Inline editing of base rates organized by:
- Building Type (14 types)
- Discipline (Architecture, Structure, MEPF, Site)
- Area Tier (9 tiers - see below)
- LOD Level (LOD 200, 300, 350)

Total matrix: 1,872 rate entries (14 × 4 × 9 × 3)

**Upteam Vendor Pricing:**
- Internal cost matrix (1,872 entries matching pricing matrix)
- Used for margin analysis
- Displays profit margin on quotes

---

## Detailed Pricing Rules & Calculations

### Area Tier System
9 square footage tiers determine pricing rates:
1. 0-5k sqft
2. 5k-10k sqft
3. 10k-20k sqft
4. 20k-30k sqft
5. 30k-40k sqft
6. 40k-50k sqft
7. 50k-75k sqft
8. 75k-100k sqft
9. 100k+ sqft

**Tier Detection:**
- Each area's square footage determines its tier
- Rate lookup: `pricing_matrix[buildingType][tier][discipline][lod]`
- Example: 15,000 sqft building → 10k-20k tier

### Base Pricing Calculation

**For each area:**
```
For each selected discipline:
  Billing Area = MAX(area square footage, 3000)
  Rate = pricing_matrix[building_type][tier][discipline][lod]
  Discipline Cost = Billing Area × Rate
  
Area Subtotal = SUM(all discipline costs for this area)
```

**Base Subtotal** = SUM(all area subtotals)

### Scope Discount Logic

**Single Scope Projects:**
If ALL areas have the same scope (and it's not "Full Building"):
- Interior Only: Base Subtotal × 25% discount
- Exterior Only: Base Subtotal × 50% discount
- Roof/Facades: Base Subtotal × 65% discount

**Mixed Scope Projects:**
If some areas are interior and some are exterior:
- Interior areas: Each gets 35% discount
- Exterior areas: Each gets 65% discount

**Subtotal After Discount** = Base Subtotal - Scope Discount

### Risk Premium Calculation

Risk premiums apply ONLY to Architecture discipline:
```
Architecture Subtotal = SUM(all Architecture costs across all areas)

For each selected risk factor:
  If "Occupied Building": Premium = Architecture Subtotal × occupied_building_premium
  If "Hazardous Conditions": Premium = Architecture Subtotal × hazardous_conditions_premium
  If "No Power/HVAC": Premium = Architecture Subtotal × no_power_hvac_premium

Total Risk Premium = SUM(all selected risk premiums)
```

Risk premiums are ADDITIVE (multiple factors sum together).

### Travel Cost Calculation

**Mileage Charge:**
```
Distance (miles) = Auto-calculated via Mapbox Directions API
Mileage Cost = Distance × travel_rate_per_mile
```

**Scan Day Fee:**
```
If Distance > travel_distance_threshold (100 miles):
  Scan Day Fee = travel_scan_day_fee × travel_min_days
  (Default: $500/day × 2 days = $1,000)
Else:
  Scan Day Fee = $0

Total Travel Cost = Mileage Cost + Scan Day Fee
```

### Additional Services Calculation
```
For each service with quantity > 0:
  Service Cost = Quantity × service_rate
  
Total Additional Services = SUM(all service costs)
```

### Grand Total
```
Grand Total = Subtotal After Discount 
            + Total Risk Premium 
            + Total Travel Cost 
            + Total Additional Services
```

### Manual Override System
- Any calculated value can be manually edited
- Overrides are stored separately
- When calculating totals, use override value if present, otherwise use calculated value
- Overrides persist when editing quote from dashboard

---

## Sample Pricing Matrix (Excerpt)

Building Type 1 (Residential - Single Family):

| Area Tier | Architecture LOD 200 | Architecture LOD 300 | Architecture LOD 350 | Structure LOD 200 | Structure LOD 300 | Structure LOD 350 | MEPF LOD 200 | MEPF LOD 300 | MEPF LOD 350 | Site LOD 200 | Site LOD 300 | Site LOD 350 |
|-----------|---------------------|---------------------|---------------------|------------------|------------------|------------------|-------------|-------------|-------------|-------------|-------------|-------------|
| 0-5k | $0.12 | $0.15 | $0.18 | $0.06 | $0.08 | $0.10 | $0.08 | $0.10 | $0.12 | $0.04 | $0.05 | $0.06 |
| 5k-10k | $0.10 | $0.13 | $0.16 | $0.05 | $0.07 | $0.09 | $0.07 | $0.09 | $0.11 | $0.03 | $0.04 | $0.05 |
| 10k-20k | $0.09 | $0.12 | $0.15 | $0.04 | $0.06 | $0.08 | $0.06 | $0.08 | $0.10 | $0.03 | $0.04 | $0.05 |
| 20k-30k | $0.08 | $0.11 | $0.14 | $0.04 | $0.06 | $0.08 | $0.06 | $0.08 | $0.10 | $0.03 | $0.04 | $0.05 |
| 30k-40k | $0.08 | $0.11 | $0.14 | $0.04 | $0.06 | $0.08 | $0.06 | $0.08 | $0.10 | $0.03 | $0.04 | $0.05 |
| 40k-50k | $0.08 | $0.10 | $0.13 | $0.04 | $0.05 | $0.07 | $0.05 | $0.07 | $0.09 | $0.03 | $0.04 | $0.05 |
| 50k-75k | $0.07 | $0.10 | $0.13 | $0.04 | $0.05 | $0.07 | $0.05 | $0.07 | $0.09 | $0.03 | $0.04 | $0.05 |
| 75k-100k | $0.07 | $0.09 | $0.12 | $0.03 | $0.05 | $0.07 | $0.05 | $0.07 | $0.09 | $0.02 | $0.03 | $0.04 |
| 100k+ | $0.07 | $0.09 | $0.12 | $0.03 | $0.05 | $0.07 | $0.05 | $0.07 | $0.09 | $0.02 | $0.03 | $0.04 |

*Note: Each building type (1-14) has its own pricing matrix. The complete matrix contains 1,872 rate entries.*

---

## Complete Pricing Example

**Project Details:**
- Building Type: Commercial/Office
- Client: Acme Corporation
- Project Address: 123 Main St, Albany NY (45 miles from Troy, NY)
- Areas:
  - Main Building: 15,000 sqft, Full Building scope
  - Parking Structure: 8,000 sqft, Exterior Only scope
- Disciplines: Architecture, Structure, MEPF, Site
- LOD: 300
- Risk Factors: Occupied Building
- Additional Services: 1 Matterport tour

**Calculation:**

**Step 1: Base Pricing**
Main Building (15,000 sqft, tier: 10k-20k):
- Architecture @ $0.12/sqft × 15,000 = $1,800
- Structure @ $0.06/sqft × 15,000 = $900
- MEPF @ $0.08/sqft × 15,000 = $1,200
- Site @ $0.04/sqft × 15,000 = $600
- Main Building Subtotal = $4,500

Parking Structure (8,000 sqft, tier: 5k-10k, Exterior Only - no MEPF):
- Architecture @ $0.13/sqft × 8,000 = $1,040
- Structure @ $0.07/sqft × 8,000 = $560
- Site @ $0.04/sqft × 8,000 = $320
- Parking Structure Subtotal = $1,920

**Base Subtotal = $6,420**

**Step 2: Scope Discount**
Mixed scope project (one Full Building, one Exterior):
- Parking Structure is Exterior Only → Gets 65% discount
- Discount = $1,920 × 0.65 = $1,248

**Subtotal After Discount = $6,420 - $1,248 = $5,172**

**Step 3: Risk Premium**
Architecture Total (after discount) = $1,800 + ($1,040 × 0.35) = $2,164
- Occupied Building premium = $2,164 × $500 = $500 (assuming premium is fixed, not percentage)
*Note: If premium is percentage-based, adjust accordingly*

**Subtotal with Risk = $5,172 + $500 = $5,672**

**Step 4: Travel Cost**
- Distance: 45 miles (< 100 mile threshold)
- Mileage: 45 × $1.50 = $67.50
- Scan Day Fee: $0 (under 100 miles)

**Total Travel = $67.50**

**Step 5: Additional Services**
- Matterport: 1 × $150 = $150

**Grand Total = $5,672 + $67.50 + $150 = $5,889.50**

---

## User Workflows

### Workflow 1: Quick Quote Creation
1. User lands on home page
2. Clicks "Quick Quote Calculator"
3. Selects building type from dropdown
4. Enters project details (name, address, date)
5. Adds one or more project areas with square footage and scope
6. Selects disciplines and LOD level
7. (Optional) Selects risk factors
8. (Optional) Enters travel information - distance auto-calculates
9. (Optional) Adds services (Matterport, scanning, etc.)
10. (Optional) Enters notes
11. Reviews pricing summary with real-time updates
12. (Optional) Manually edits any pricing fields
13. Clicks "Export PDF" to download quote
14. Quote auto-saves to database

### Workflow 2: Comprehensive Scoping
1. User clicks "Scoping Form" from home page
2. Fills out detailed scoping questionnaire
3. Uploads relevant files (plans, photos, surveys)
4. Submits scoping form
5. Scoping project saved to database
6. User navigates to Dashboard → Projects tab
7. Finds scoping project in list
8. Clicks "Convert to Quote"
9. System auto-fills calculator with scoping data
10. User reviews/adjusts pricing
11. Exports PDF quote

### Workflow 3: Scantech Sheet Export
1. User navigates to Dashboard → Projects tab
2. Locates scoping project
3. Clicks "Download Scantech Sheet"
4. PDF generates with all project details and embedded images
5. Or clicks "Download Files ZIP" for all uploaded files

### Workflow 4: Quote Management
1. User navigates to Dashboard
2. Views all quotes (Projects tab shows converted quotes, Quote Only shows calculator quotes)
3. Clicks quote to view/edit
4. Makes adjustments to pricing
5. Re-exports updated PDF
6. Or deletes quote if no longer needed

### Workflow 5: Admin Pricing Updates
1. Admin navigates to Admin page
2. Updates pricing parameters (risk factors, travel, discounts, services)
3. Or edits pricing matrix inline (by building type and discipline)
4. Changes save immediately
5. All new quotes use updated pricing

---

## UI/UX Requirements

### Design System
- **Colors:** Professional blue theme (HSL 220, 90%, 56%)
- **Typography:** Inter font family
- **Components:** Shadcn UI component library
- **Styling:** Tailwind CSS
- **Theme:** Light/Dark mode with persistent toggle

### Form Behavior
- All forms use react-hook-form with zod validation
- Real-time validation feedback
- Clear error messages
- Loading states for async operations (distance calculation, PDF generation)
- Disabled states when data is loading

### Responsive Design
- Mobile-friendly layouts
- Touch-friendly buttons and inputs
- Collapsible sections on mobile
- Readable typography at all screen sizes

### Loading States
- Distance calculation shows "Calculating distance..." spinner
- PDF generation shows "Generating PDF..." progress
- Upteam pricing shows "Loading pricing data..." until data fetched
- Export button disabled until pricing data loaded

### Data Validation
- Required fields marked clearly
- Numeric inputs validate for positive numbers
- Square footage must be > 0
- Dates default to today
- Email validation for client contact (if added)

### Accessibility
- Proper ARIA labels
- Keyboard navigation support
- Focus indicators
- Screen reader friendly
- Color contrast compliance

---

## Data Requirements

### Pricing Matrix Data
1,872 entries with structure:
- building_type_id (1-14)
- area_tier (9 tiers)
- discipline (architecture, structure, mepf, site)
- lod_level (lod200, lod300, lod350)
- rate_per_sqft (decimal)

### Upteam Pricing Matrix
1,872 entries matching pricing matrix for vendor cost tracking

### Pricing Parameters
33 parameters with keys and values:
- All risk factor premiums
- All travel cost parameters
- All scope discount percentages
- All service rates
- Payment terms

### Quotes
Each quote stores:
- Project metadata (name, client, address, date, building type)
- All areas with names, square footage, scopes
- Selected disciplines and LOD levels
- Risk factors selected
- Travel distance and location
- Additional services with quantities
- Notes
- Calculated pricing breakdown (as JSONB)
- Manual overrides (as JSONB)
- Timestamps

### Scoping Projects
Comprehensive project data:
- All form fields
- File uploads (stored as references)
- Conversion status
- Related quote ID (if converted)

---

## Integration Requirements

### Mapbox API
- **Purpose:** Auto-calculate driving distance from dispatch location to project address
- **Endpoints Used:**
  - Geocoding API: Convert address to coordinates
  - Directions API: Calculate driving distance
- **Setup:**
  - Requires Mapbox API key
  - Set as environment variable: VITE_MAPBOX_API_KEY
- **Features:**
  - Request cancellation (AbortController) to prevent race conditions
  - Error handling for invalid addresses
  - Loading states during calculation

### PDF Generation
- **Library:** jsPDF with jsPDF-AutoTable
- **Features:**
  - Professional quote formatting
  - Itemized pricing tables
  - Embedded images (for Scantech Sheets)
  - Company branding/headers
  - Multi-page support

### File Upload/Storage
- **Requirements:**
  - Support multiple file types (PDF, images, CAD files)
  - Store file metadata in database
  - Generate download links
  - Create ZIP archives of multiple files

---

## Business Rules Summary

1. **Minimum Billing:** All areas under 3,000 sqft are billed at 3,000 sqft
2. **Scope Discounts:** Only apply when ALL areas have same non-"both" scope
3. **Risk Premiums:** Only apply to Architecture discipline costs
4. **Travel Fee Threshold:** $500/day fee (2-day minimum) only applies when distance > 100 miles
5. **Landscape Projects:** Use acres instead of square feet, auto-select Site discipline only
6. **Per-Area Overrides:** Areas can specify their own discipline selections for cases like separate structural modeling
7. **Manual Overrides:** All pricing can be manually edited and overrides persist
8. **Auto-Save:** Quotes auto-save to database when PDF is exported
9. **Loading Protection:** PDF export disabled until Upteam pricing data is fully loaded
10. **Optional Disciplines:** Quotes can be created with no disciplines (only additional services)

---

## Future Enhancement Opportunities

### Noted but Not Implemented
1. **Landscape Tier A Markups:** GM multipliers (130-180%) for projects >10 acres
2. **User Authentication:** Login system and user-specific quotes
3. **Email Quotes:** Send quotes directly via email
4. **Quote Templates:** Save and reuse common configurations
5. **Historical Quotes:** Track quote versions and revisions
6. **Advanced Reporting:** Analytics on quotes, conversion rates, pricing trends
7. **Tier A Overhead/GM Multipliers:** For large commercial projects
8. **Quote Comparison:** Side-by-side LOD level comparison view
9. **Multi-Currency:** Support for international projects
10. **API Access:** RESTful API for third-party integrations

---

## Technical Notes for Rebuild

### Data Seeding Required
1. Load complete pricing matrix (1,872 entries) from CSV
2. Load upteam pricing matrix (1,872 entries) from CSV
3. Initialize all 33 pricing parameters with default values
4. Create building types reference list

### Environment Variables Needed
- `DATABASE_URL` - PostgreSQL connection string (Replit handles this)
- `VITE_MAPBOX_API_KEY` - Mapbox API key for distance calculations

### Key Libraries/Dependencies
- React + TypeScript
- Tailwind CSS + Shadcn UI
- React Hook Form + Zod
- TanStack Query (React Query)
- jsPDF + jsPDF-AutoTable
- Wouter (routing)
- Date-fns
- Lucide React (icons)

### Performance Considerations
- Pricing matrix loaded once and cached
- Distance calculation uses AbortController to cancel stale requests
- PDF generation happens client-side (no server processing)
- Images in Scantech Sheets should be optimized before embedding

---

## Testing Checklist

### Calculator Testing
- [ ] All 14 building types calculate correctly
- [ ] Multi-area pricing sums properly
- [ ] Minimum 3,000 sqft billing applies
- [ ] Scope discounts calculate correctly (single scope, mixed scope)
- [ ] Risk premiums add to Architecture only
- [ ] Travel costs calculate with distance API
- [ ] Travel scan day fee triggers at 100+ miles
- [ ] Additional services multiply correctly
- [ ] Manual overrides persist
- [ ] PDF export includes all data
- [ ] Real-time previews update instantly

### Scoping Form Testing
- [ ] All fields save correctly
- [ ] File uploads work
- [ ] Conversion to quote maps all fields
- [ ] Separate structural sqft creates two areas
- [ ] Scantech Sheet PDF includes images
- [ ] ZIP download contains all files

### Dashboard Testing
- [ ] Projects and Quote Only tabs display correctly
- [ ] Quotes can be edited and re-exported
- [ ] Delete functionality works
- [ ] Search/filter works (if implemented)

### Admin Testing
- [ ] Pricing parameter updates apply immediately
- [ ] Pricing matrix inline editing saves
- [ ] Upteam margin calculations accurate

### Theme Testing
- [ ] Light/dark toggle persists
- [ ] All components visible in both themes
- [ ] No contrast issues

---

## End Notes

This specification covers 100% of the current app functionality as of November 2025. Use this document as the complete blueprint for rebuilding with Replit Agent or any other development approach.

For questions or clarifications about any pricing rules, business logic, or features, refer to the code at:
- `client/src/pages/calculator.tsx` - Main calculator logic
- `client/src/components/PricingSummary.tsx` - Pricing calculations
- `server/routes.ts` - Scoping-to-quote conversion logic
- `shared/schema.ts` - Data models
