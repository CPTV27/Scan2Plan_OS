# SYSTEM ARCHITECTURE EXPORT
## Scan2Plan OS (CEO Hub) - Technical Audit
**Generated:** January 8, 2026
**Last Updated:** January 11, 2026

---

## 1. DATABASE SCHEMA (shared/schema.ts)

### Tables Overview

| Table | Purpose | Primary Relationships |
|-------|---------|----------------------|
| `leads` | Sales pipeline CRM with CPQ data | Has many: projects, fieldNotes, invoices, expenses, leadResearch, quoteVersions, projectAttachments |
| `lead_research` | AI-generated research (client/property) | Belongs to: leads |
| `scantechs` | Field technicians | Has many: projects (via assignedTechId) |
| `projects` | Production tracker (Kanban) | Belongs to: leads, scantechs; Has many: fieldNotes, timeLogs, missionLogs, siteIntelligence, projectAttachments, expenses, invoices |
| `field_notes` | AI technical translation (raw → scope) | Belongs to: projects, leads |
| `time_logs` | Technician clock in/out | Belongs to: projects |
| `mission_logs` | Four-point logistics tracker | Belongs to: projects |
| `site_intelligence` | Video walkthrough + AI summary | Belongs to: projects |
| `project_attachments` | Visual scoping (Drive sync) | Belongs to: projects, leads |
| `settings` | Business configuration (key-value) | None |
| `quickbooks_tokens` | OAuth tokens for QB integration | None |
| `expenses` | Field + QuickBooks expenses | Belongs to: leads, projects |
| `accounts` | Profit First virtual accounts | None |
| `invoices` | Accounts receivable | Belongs to: leads, projects |
| `internal_loans` | Inter-account borrowing | None |
| `vendor_payables` | Accounts payable | None |
| `quote_versions` | CPQ quote version history | Belongs to: leads |
| `cpq_upteam_pricing_matrix` | UpTeam pricing rates | None |
| `cpq_pricing_matrix` | S2P pricing rates | None |
| `cpq_cad_pricing_matrix` | CAD pricing rates | None |
| `cpq_pricing_parameters` | Minimums, multipliers | None |
| `cpq_quotes` | Standalone quotes | Belongs to: leads (optional) |
| `users` | User accounts (Replit Auth) | None |
| `sessions` | Session storage | Belongs to: users |
| `conversations` | AI chat history | Belongs to: users |
| `messages` | AI chat messages | Belongs to: conversations |

### Key Columns on `leads` Table
```typescript
// Core CRM Fields
id, projectCode, clientName, projectName, projectAddress, projectZipCode, value, 
dealStage, probability, lastContactDate, notes

// Payment & Retainer
retainerPaid, retainerAmount, retainerPaidDate, legalJurisdiction

// Scoping Document
quoteNumber, buildingType, sqft, scope, disciplines, bimDeliverable, bimVersion

// Contact Info
contactName, contactEmail, contactPhone

// Travel & Dispatch
dispatchLocation, distance, travelRate

// CPQ Integration (JSONB)
cpqAreas, cpqRisks, cpqTravel, cpqServices, cpqScopingData

// AI Intelligence
complexityScore, clientTier, regulatoryRisks, aiInsightsUpdatedAt, googleIntel

// CPQ Integrity Auditor
integrityStatus, integrityFlags, requiresOverride, overrideApproved, overrideApprovedBy, overrideApprovedAt

// Early Binding (UPID before Closed Won)
driveFolderId, driveFolderUrl
```

### **AUDIT CHECK: Potential Duplicate/Unused Tables**

| Status | Table | Issue |
|--------|-------|-------|
| **DUPLICATE** | `cpq_pricing_matrix`, `cpq_upteam_pricing_matrix`, `cpq_cad_pricing_matrix`, `cpq_pricing_parameters` | Pricing is now client-side (see `client/src/features/cpq/pricing.ts`). Backend routes are marked `@DEPRECATED`. |
| **LOW USAGE** | `site_intelligence` | Video walkthrough feature - verify if actively used |
| **LOW USAGE** | `internal_loans` | Profit First inter-account borrowing - verify if used |

---

## 2. BACKEND LOGIC (server/routes.ts)

### Closed Won Trigger Logic

**Location:** `server/routes.ts` lines 359-435 (PUT /api/leads/:id) and lines 523-537 (PATCH /api/leads/:id/stage)

```typescript
// Triggered when dealStage changes to "Closed Won"
const isClosingWon = input.dealStage === "Closed Won" && previousLead?.dealStage !== "Closed Won";

if (isClosingWon) {
  const existingProject = await storage.getProjectByLeadId(leadId);
  if (!existingProject) {
    // Early Binding Safety Check: Use existing UPID if already generated (via early binding)
    let universalProjectId = lead.projectCode;
    
    if (!universalProjectId) {
      // Generate Universal Project ID per Nomenclature Standards
      // Format: [REFERRAL]-[CLIENT_CODE]-[PROJ_CODE]-[YYYYMMDD]
      universalProjectId = generateUPID({
        clientName: lead.clientName,
        projectName: lead.projectName || lead.projectAddress || 'Project',
        closedWonDate: new Date(),
        leadSource: lead.leadSource,
      });
      
      // Persist UPID back to lead record
      await storage.updateLead(leadId, { projectCode: universalProjectId });
    }
    
    // Create Google Drive folder with subfolders
    let driveFolderId, driveFolderUrl, driveSubfolders;
    const driveConnected = await isGoogleDriveConnected();
    if (driveConnected) {
      const folderResult = await createProjectFolder(universalProjectId);
      driveFolderId = folderResult.folderId;
      driveFolderUrl = folderResult.folderUrl;
      driveSubfolders = folderResult.subfolders;
    }
    
    // Create production project
    await storage.createProject({
      name: `${lead.clientName} - ${lead.projectAddress || 'Project'}`,
      leadId: leadId,
      universalProjectId,
      status: "Scheduling",
      priority: "Medium",
      progress: 0,
      driveFolderId,
      driveFolderUrl,
      driveFolderStatus: driveConnected ? "success" : "pending",
      driveSubfolders,
    });
  }
}
```

### UPID Generation Endpoint (Early Binding)

**Location:** `server/routes.ts` lines 1237-1307

```typescript
// POST /api/leads/:id/generate-upid
// Allows UPID generation before Closed Won for Proposal creation
app.post("/api/leads/:id/generate-upid", isAuthenticated, requireRole("ceo", "sales"), async (req, res) => {
  const lead = await storage.getLead(leadId);
  
  // Check if UPID already exists
  if (lead.projectCode) {
    return res.json({ success: true, upid: lead.projectCode, alreadyExists: true });
  }

  // Generate UPID
  const universalProjectId = generateUPID({
    clientName: lead.clientName,
    projectName: lead.projectName || lead.projectAddress || 'Project',
    closedWonDate: new Date(),
    leadSource: lead.leadSource,
  });

  // Create Google Drive folder immediately
  let driveFolderUrl, driveFolderId;
  const driveConnected = await isGoogleDriveConnected();
  if (driveConnected) {
    const folderResult = await createProjectFolder(universalProjectId);
    driveFolderId = folderResult.folderId;
    driveFolderUrl = folderResult.folderUrl;
  }

  // Persist UPID and Drive folder info to lead record
  await storage.updateLead(leadId, { 
    projectCode: universalProjectId,
    driveFolderId,
    driveFolderUrl,
  });

  res.json({ success: true, upid: universalProjectId, driveFolderUrl, driveFolderId });
});
```

### Google Drive Folder Creation

**Location:** `server/googleDrive.ts`

```typescript
export interface ProjectFolderResult {
  folderId: string;
  folderUrl: string;
  subfolders: {
    fieldCapture: string;
    bimProduction: string;
    accountingFinancials: string;
    clientDeliverables: string;
  };
}

export async function createProjectFolder(universalProjectId: string): Promise<ProjectFolderResult> {
  const drive = await getGoogleDriveClient();
  
  // Create the main project folder
  const mainFolderResponse = await drive.files.create({
    requestBody: {
      name: universalProjectId,
      mimeType: 'application/vnd.google-apps.folder',
    },
    fields: 'id, webViewLink',
  });

  const folderId = mainFolderResponse.data.id!;
  const folderUrl = mainFolderResponse.data.webViewLink!;

  // Create subfolders per project specification
  const subfolderNames = [
    '01_Field_Capture',
    '02_BIM_Production',
    '03_Accounting_Financials',
    '04_Client_Final_Deliverables',
  ];

  const subfolderIds: string[] = [];
  for (const subfolderName of subfolderNames) {
    const subfolderResponse = await drive.files.create({
      requestBody: {
        name: subfolderName,
        mimeType: 'application/vnd.google-apps.folder',
        parents: [folderId],
      },
      fields: 'id',
    });
    subfolderIds.push(subfolderResponse.data.id!);
  }

  // Share folder with accounting and production teams
  const shareEmails = ['accounting@scan2plan.dev', 'production@scan2plan.dev'];
  
  for (const email of shareEmails) {
    try {
      await drive.permissions.create({
        fileId: folderId,
        requestBody: {
          type: 'user',
          role: 'writer',
          emailAddress: email,
        },
        sendNotificationEmail: false,
      });
    } catch (err) {
      console.warn(`Failed to share folder with ${email}:`, err);
    }
  }

  console.log(`Created Google Drive folder for project ${universalProjectId}: ${folderUrl}`);

  return {
    folderId,
    folderUrl,
    subfolders: {
      fieldCapture: subfolderIds[0],
      bimProduction: subfolderIds[1],
      accountingFinancials: subfolderIds[2],
      clientDeliverables: subfolderIds[3],
    },
  };
}

export async function isGoogleDriveConnected(): Promise<boolean> {
  try {
    await getAccessToken();
    return true;
  } catch {
    return false;
  }
}
```

### **AUDIT CHECK: Unused API Routes**

| Route | Status | Notes |
|-------|--------|-------|
| `GET /api/cpq/pricing-matrix` | **DEPRECATED** | Marked with console.warn, pricing now client-side |
| `GET /api/cpq/upteam-pricing-matrix` | **DEPRECATED** | Marked with console.warn, pricing now client-side |
| `GET /api/cpq/cad-pricing-matrix` | **DEPRECATED** | Marked with console.warn, pricing now client-side |
| `GET /api/cpq/pricing-parameters` | **DEPRECATED** | Marked with console.warn, pricing now client-side |
| `POST /api/google-chat/webhook` | **VERIFY** | Google Chat webhook - check if actively receiving events |

---

## 3. SALES ENGINE LOGIC

### Location: `client/src/modules/sales_engine/`

**CRITICAL FINDING: This entire module is NOT imported by the main application.**

The `sales_engine` folder contains a **complete standalone application** that was likely an external CPQ tool before being moved into this repository:

```
client/src/modules/sales_engine/
├── attached_assets/          # CSV pricing matrices, images, PDFs
├── client/
│   ├── public/               # favicon.png
│   └── src/
│       ├── components/       # Full UI component library (duplicate of main app)
│       │   ├── examples/     # Example components
│       │   └── ui/           # DUPLICATE Shadcn components
│       ├── hooks/            # DUPLICATE use-mobile, use-toast
│       ├── lib/              # DUPLICATE queryClient, utils
│       ├── pages/            # Admin, Calculator, Dashboard, Home
│       ├── App.tsx           # Standalone app entry
│       └── main.tsx          # Standalone React entry
├── scripts/                  # Pricing import scripts
├── server/                   # STANDALONE Express server!
│   ├── db.ts
│   ├── index.ts              # Contains app.listen() - REDUNDANT
│   ├── routes.ts             # Standalone API routes
│   ├── storage.ts
│   └── vite.ts
├── shared/
│   └── schema.ts             # Standalone schema (DUPLICATE)
├── package.json              # Standalone dependencies
├── drizzle.config.ts         # Standalone Drizzle config
├── vite.config.ts            # Standalone Vite config
└── tailwind.config.ts        # Standalone Tailwind config
```

### **AUDIT CHECK: Server-Side Code That's Now Redundant**

| File | Contains | Status |
|------|----------|--------|
| `client/src/modules/sales_engine/server/index.ts` | `app.listen()` Express server | **REDUNDANT** - Main app runs monolith server |
| `client/src/modules/sales_engine/server/routes.ts` | Duplicate API routes | **REDUNDANT** - Routes duplicated in main `server/routes.ts` |
| `client/src/modules/sales_engine/server/storage.ts` | Duplicate storage layer | **REDUNDANT** - Storage in main `server/storage.ts` |
| `client/src/modules/sales_engine/server/db.ts` | Duplicate DB connection | **REDUNDANT** - DB connection in main `server/db.ts` |
| `client/src/modules/sales_engine/package.json` | Standalone dependencies | **REDUNDANT** - Dependencies in main `package.json` |

### Pricing Calculation Logic

**Current Location (Active):** `client/src/features/cpq/pricing.ts`

The pricing engine uses embedded static configuration rather than database lookups:

```typescript
// Pricing is calculated client-side with static matrices
// See: client/src/features/cpq/pricing.ts
// 
// Key functions:
// - calculateAreaPrice(): Computes price per area based on building type, LOD, sqft
// - calculateTotalQuote(): Aggregates all areas, travel, risks, services
// - applyRiskMultipliers(): Applies risk factor percentages from schema
```

### Margin Target Slider & Post-Proxy Normalization (Added January 11, 2026)

**Frontend Location:** `client/src/pages/DealWorkspace.tsx`
**Backend Location:** `server/routes/cpq.ts` (POST /api/cpq/calculate)

The CPQ system now includes a margin target slider that allows dynamic price adjustment:

```typescript
// Frontend: Margin slider in DealWorkspace pricing sidebar
// Range: 35% - 60%, Default: 45%
const [marginTarget, setMarginTarget] = useState(0.45);

// Passed to backend with calculate request:
const requestBody = {
  areas,
  dispatchLocation,
  distance,
  risks,
  marginTarget, // 0.35 to 0.60
  // ...
};
```

**Backend Post-Proxy Margin Normalization:**

The `/api/cpq/calculate` endpoint proxies to an external CPQ service, then applies margin target adjustment:

```typescript
// After receiving response from external CPQ service:
if (marginTarget && marginTarget >= 0.35 && marginTarget <= 0.60) {
  // Recalculate each line item using margin formula
  data.lineItems = data.lineItems.map((item) => {
    if (item.category !== "total" && item.upteamCost) {
      const newClientPrice = item.upteamCost / (1 - marginTarget);
      return { ...item, clientPrice: newClientPrice };
    }
    return item;
  });
  
  // Recalculate totals
  data.totalClientPrice = /* sum of new client prices */;
  data.grossMargin = data.totalClientPrice - data.totalUpteamCost;
  data.grossMarginPercent = (data.grossMargin / data.totalClientPrice) * 100;
}
```

**Margin Guardrails (FY26 Goals):**

| Threshold | Status | Action |
|-----------|--------|--------|
| < 40% (MARGIN_FLOOR) | `blocked` | Quote cannot be saved |
| < 45% (GUARDRAIL) | `warning` | Quote can be saved with warning |
| >= 45% | `passed` | Quote saves normally |

```typescript
// Integrity status updated based on margin
const FY26_MARGIN_FLOOR = 0.40;
const GUARDRAIL_THRESHOLD = 0.45;

if (actualMargin < FY26_MARGIN_FLOOR) {
  data.integrityStatus = "blocked";
  data.integrityFlags.push({
    code: "LOW_MARGIN",
    message: `Gross margin ${margin}% is below 40% threshold`,
    severity: "error"
  });
} else if (actualMargin < GUARDRAIL_THRESHOLD) {
  data.integrityStatus = "warning";
  data.integrityFlags.push({
    code: "MARGIN_BELOW_GUARDRAIL", 
    message: `Gross margin ${margin}% is below recommended 45%`,
    severity: "warning"
  });
}
```

### Quote Creation - Areas Extraction Fix (Added January 11, 2026)

**Location:** `server/routes/cpq.ts` (POST /api/leads/:id/cpq-quotes)

The frontend sends `areas` nested inside `requestData`. The backend now extracts it:

```typescript
// Extract areas from requestData if not at top level
const areas = normalizedData.areas || normalizedData.requestData?.areas || [];

const quote = await storage.createCpqQuote({
  ...normalizedData,
  areas, // Explicitly include at top level for DB
  // ...
});
```

---

## 4. FRONTEND STATE (DealWorkspace.tsx)

### UPID Display and Generate Project ID Button

**Location:** `client/src/pages/DealWorkspace.tsx` lines 242-290

```tsx
{/* UPID Badge with Drive Link OR Generate Button */}
{lead.projectCode ? (
  <Tooltip>
    <TooltipTrigger asChild>
      <a
        href={lead.driveFolderUrl || `https://drive.google.com/drive/search?q=${encodeURIComponent(lead.projectCode)}`}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex"
        data-testid="link-drive-folder"
      >
        <Badge variant="outline" className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30 gap-1">
          <FolderOpen className="w-3 h-3" />
          {lead.projectCode}
        </Badge>
      </a>
    </TooltipTrigger>
    <TooltipContent>
      <p>Click to open Google Drive folder</p>
    </TooltipContent>
  </Tooltip>
) : (
  <Tooltip>
    <TooltipTrigger asChild>
      <Button
        variant="outline"
        size="sm"
        onClick={() => generateUpidMutation.mutate()}
        disabled={generateUpidMutation.isPending}
        className="gap-1"
        data-testid="button-generate-upid"
      >
        {generateUpidMutation.isPending ? (
          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
        ) : (
          <FolderPlus className="w-4 h-4 mr-2" />
        )}
        Generate Project ID
      </Button>
    </TooltipTrigger>
    <TooltipContent>
      <p>Generates ID and creates Google Drive folder for scoping files</p>
    </TooltipContent>
  </Tooltip>
)}
```

### Generate UPID Mutation

```tsx
const generateUpidMutation = useMutation({
  mutationFn: async () => {
    const response = await apiRequest("POST", `/api/leads/${id}/generate-upid`);
    return response.json();
  },
  onSuccess: (data) => {
    queryClient.invalidateQueries({ queryKey: ["/api/leads", id] });
    toast({
      title: "Project ID Generated",
      description: `UPID: ${data.upid}${data.driveFolderUrl ? ' - Drive folder created' : ''}`,
    });
  },
});
```

---

## 5. DEPRECATED CODE & CLEANUP LIST

### Files NOT Imported by Main App

**ENTIRE `client/src/modules/sales_engine/` FOLDER IS ORPHANED**

```
ORPHANED FILES (77 files):
├── client/src/modules/sales_engine/attached_assets/  (44 files)
├── client/src/modules/sales_engine/client/           (52 files including duplicates)
├── client/src/modules/sales_engine/scripts/          (2 files)
├── client/src/modules/sales_engine/server/           (7 files)
├── client/src/modules/sales_engine/shared/           (1 file)
└── Root config files                                 (10 files)
```

### Zombie Code (Commented Out / Old Logic)

| Location | Description |
|----------|-------------|
| `server/routes.ts` lines 1314-1360 | DEPRECATED pricing matrix routes with console.warn |
| `client/src/modules/sales_engine/server/` | Entire standalone server - dead code |

### Potentially Unused Dependencies in package.json

| Package | Reason to Verify |
|---------|------------------|
| `@playwright/test` | Testing framework - check if e2e tests exist |
| `passport-local` | Only using Replit Auth (OpenID Connect) |
| `jszip` | Check if ZIP functionality is used |
| `input-otp` | OTP input component - check if used |
| `next-themes` | Next.js theming - but using custom ThemeProvider |
| `@hubspot/api-client` | HubSpot integration - verify if actively used |

---

## REFACTORING ACTION PLAN

> **CAUTION:** Before deleting any files or database tables, perform the verification steps listed below. This plan requires manual confirmation of each step.

### Priority 1: Verify & Delete Orphaned Sales Engine Module

**Verification Steps (REQUIRED BEFORE DELETE):**

```bash
# 1. Confirm no imports exist in the main app
grep -r "modules/sales_engine" client/src --exclude-dir=modules
grep -r "modules/sales_engine" server/

# 2. Check for any scheduled jobs or background processes
grep -r "sales_engine" .github/ scripts/ cron/

# 3. Verify no environment variables reference it
grep -r "SALES_ENGINE" .env* replit.nix
```

**If all checks return empty, safe to delete:**

```bash
rm -rf client/src/modules/sales_engine/
```

**Files to delete:** ~120+ files totaling ~50MB (including attached_assets)

### Priority 2: Deprecate Backend Pricing Routes

**Option A (Recommended):** Return 410 Gone with migration guidance

```typescript
// In server/routes.ts, update deprecated routes to:
app.get("/api/cpq/pricing-matrix", (req, res) => {
  res.status(410).json({ 
    message: "DEPRECATED: Pricing is now calculated client-side. See client/src/features/cpq/pricing.ts" 
  });
});
```

**Option B:** Remove routes entirely (only after confirming no external callers)

### Priority 3: Database Table Cleanup (REQUIRES DATA AUDIT)

**BEFORE dropping any tables, run these checks:**

```sql
-- Check if tables have data
SELECT 'cpq_pricing_matrix' as tbl, COUNT(*) FROM cpq_pricing_matrix
UNION ALL
SELECT 'cpq_upteam_pricing_matrix', COUNT(*) FROM cpq_upteam_pricing_matrix
UNION ALL
SELECT 'cpq_cad_pricing_matrix', COUNT(*) FROM cpq_cad_pricing_matrix
UNION ALL
SELECT 'cpq_pricing_parameters', COUNT(*) FROM cpq_pricing_parameters;

-- Check for recent reads (if query logging enabled)
-- Review server logs for calls to deprecated routes
```

**If tables are empty or data is archived elsewhere:**

```sql
-- Create backup first
CREATE TABLE cpq_pricing_matrix_backup AS SELECT * FROM cpq_pricing_matrix;
-- Then drop
DROP TABLE cpq_pricing_matrix;
```

### Priority 4: Audit Dependencies

```bash
# Run dependency check
npx depcheck

# Review output and remove confirmed unused packages
# DO NOT remove without verification
```

### Priority 5: Code Quality Tasks

1. **Type Safety:** Replace `as any` casts with proper types
2. **Logging:** Replace `console.log` with structured logging
3. **Dead Code:** Remove commented-out blocks (use git history)

### Pre-Cleanup Checklist

| Item | Verified | Notes |
|------|----------|-------|
| No imports to sales_engine module | [ ] | Run grep commands above |
| No scheduled jobs reference module | [ ] | Check cron/scripts folders |
| Pricing tables have no critical data | [ ] | Run SQL count queries |
| Deprecated routes have no external callers | [ ] | Check CPQ tool configuration |
| Backup created before deletions | [ ] | Use git commit + DB backup |

---

## SUMMARY

| Category | Items Found | Action Required |
|----------|-------------|-----------------|
| Orphaned Module | `client/src/modules/sales_engine/` (120+ files) | **DELETE** - Not imported |
| Deprecated Routes | 4 pricing matrix endpoints | **REMOVE** or return 410 |
| Duplicate Tables | 4 pricing tables | **DROP** after data verification |
| Unused Dependencies | 6 packages flagged | **VERIFY** with depcheck |
| Type Safety Issues | `as any` casts | **FIX** - Add proper types |

**Estimated Cleanup Savings:**
- ~120 orphaned files removed
- ~50MB of attached_assets removed
- Cleaner codebase with single source of truth
