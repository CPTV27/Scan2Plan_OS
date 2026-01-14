/**
 * Seed Default Proposal Templates
 * 
 * Creates the default boilerplate templates for proposal generation.
 * Run with: npx tsx server/seed-proposal-templates.ts
 */

import { db } from "./db";
import { proposalTemplates, proposalTemplateGroups } from "@shared/schema";
import { eq } from "drizzle-orm";

const DEFAULT_TEMPLATES = [
    {
        name: "Cover Page",
        slug: "cover-page",
        category: "intro",
        sortOrder: 1,
        isDefault: true,
        variables: ["client_name", "project_name", "quote_date", "valid_until"],
        content: `# Scan2Plan Proposal

## {{project_name}}

**Prepared for:** {{client_name}}

**Date:** {{quote_date}}

**Valid Until:** {{valid_until}}

---

*Professional 3D Scanning & BIM Modeling Services*

![Scan2Plan Logo](/logo.png)

---

**Scan2Plan**
Brooklyn, NY
www.scan2plan.com
`,
    },
    {
        name: "Executive Summary",
        slug: "executive-summary",
        category: "intro",
        sortOrder: 2,
        isDefault: true,
        variables: ["project_name", "client_name", "project_address"],
        content: `## Executive Summary

Thank you for considering Scan2Plan for your **{{project_name}}** project located at **{{project_address}}**.

We are pleased to provide this proposal for professional 3D laser scanning and BIM modeling services. Our team combines cutting-edge technology with deep industry expertise to deliver accurate, reliable as-built documentation.

### Why Scan2Plan?

- **Accuracy Guaranteed**: ±1/8" precision across all deliverables
- **Fast Turnaround**: Industry-leading delivery times
- **Full-Service**: From field scanning to final BIM model
- **Quality Assured**: ISO-certified processes

We look forward to partnering with {{client_name}} on this project.
`,
    },
    {
        name: "About Scan2Plan",
        slug: "about-scan2plan",
        category: "company",
        sortOrder: 3,
        isDefault: true,
        variables: [],
        content: `## About Scan2Plan

**Scan2Plan** is a leading provider of 3D laser scanning and BIM modeling services, serving architects, engineers, contractors, and building owners across the Northeast.

### Our Expertise

- **3D Laser Scanning**: High-definition point cloud capture
- **BIM Modeling**: LOD 200-400 Revit models
- **CAD Conversion**: 2D floor plans and elevations
- **Virtual Tours**: Matterport 3D walkthroughs
- **As-Built Documentation**: Complete building documentation

### Our Clients

We proudly serve industry leaders including:
- Top architecture firms
- Major general contractors
- Property management companies
- Educational institutions
- Healthcare facilities

### Quality Commitment

All projects are delivered with our quality guarantee. Our ISO-certified workflow ensures consistency, accuracy, and reliability on every engagement.
`,
    },
    {
        name: "Scope of Work",
        slug: "scope-of-work",
        category: "scope",
        sortOrder: 4,
        isDefault: true,
        variables: ["project_name", "project_address", "areas_table"],
        content: `## Scope of Work

### Project Location
**{{project_address}}**

### Areas Included

{{areas_table}}

### Field Work

Our certified technicians will perform comprehensive 3D laser scanning of all areas specified above. The scanning process includes:

1. **Site Preparation**: Coordination with facility contacts
2. **Scanning**: Complete coverage of all specified areas
3. **Field Notes**: Documentation of conditions and observations
4. **Quality Check**: On-site verification of data capture

### Deliverables

Upon completion of modeling, you will receive:

- Revit model at specified LOD levels
- Point cloud files (RCP/RCS format)
- PDF exports of floor plans and elevations
- Project coordination support
`,
    },
    {
        name: "Deliverables Detail",
        slug: "deliverables-detail",
        category: "scope",
        sortOrder: 5,
        isDefault: true,
        variables: [],
        content: `## Deliverables

### Revit BIM Model

Your Revit model will include:

- **Architecture**: Walls, doors, windows, ceilings, stairs, railings
- **MEP/F**: Major mechanical equipment, ductwork, piping, fixtures
- **Structural**: Columns, beams, floor/roof structure

### LOD Definitions

| LOD | Description |
|-----|-------------|
| LOD 200 | Generic system representations, approximate geometry |
| LOD 300 | Specific system assemblies, accurate geometry and location |
| LOD 350 | LOD 300 plus interfaces and connections |
| LOD 400 | Fabrication-ready, shop drawing level detail |

### File Formats

- Revit (.rvt) - Native format
- Point Cloud (.rcp/.rcs) - Compressed laser scan data
- DWG (.dwg) - AutoCAD format
- PDF - Print-ready documentation
`,
    },
    {
        name: "Service Deliverables",
        slug: "service-deliverables",
        category: "pricing",
        sortOrder: 6,
        isDefault: true,
        variables: ["scope", "matterport_scope"],
        content: `## What's Included

**End-to-End Project Management and Customer Service**

Our team provides dedicated project management from kick-off through delivery, ensuring clear communication and timely updates throughout the engagement.

---

### LiDAR Scanning
A certified scanning technician will capture the {{scope}} using state-of-the-art 3D laser scanning equipment. Our technicians are trained to efficiently capture comprehensive data while minimizing disruption to your operations.

### Matterport Scanning
A scanning technician will capture the {{matterport_scope}} using Matterport Pro2 cameras, creating immersive 3D virtual tours and dollhouse views of your space.

### Point Cloud Registration
Point cloud data captured on-site will be registered, cleaned, and reviewed for quality assurance. This process ensures seamless alignment of all scan positions and removes noise or artifacts from the data.

### BIM Modeling
Your deliverable will be modeled in your preferred software (Revit, ArchiCAD, Rhino, SketchUp, etc.) to the specified Level of Detail. Our modeling team follows industry-standard BIM practices and your template requirements.

### CAD Drafting
CAD sheets will be prepared according to your standards, including floor plans, reflected ceiling plans, elevations, and sections as specified in your scope.

### QA/QC
The entire project is redundantly reviewed and checked by our QC team and senior engineering staff. Multiple quality gates ensure accuracy, completeness, and adherence to your deliverable specifications.
`,
    },
    {
        name: "Pricing",
        slug: "pricing",
        category: "pricing",
        sortOrder: 7,
        isDefault: true,
        variables: ["line_items_table", "total_price"],
        content: `## Investment

### Pricing Breakdown

{{line_items_table}}

---

### **Total: {{total_price}}**

*Prices are valid for 30 days from proposal date.*

### What's Included

- All field scanning labor and equipment
- BIM modeling to specified LOD levels
- One round of revisions
- Project management and coordination
- Electronic file delivery
`,
    },
    {
        name: "Timeline",
        slug: "timeline",
        category: "scope",
        sortOrder: 8,
        isDefault: true,
        variables: ["timeline"],
        content: `## Timeline

### Estimated Project Duration: {{timeline}}

| Phase | Duration |
|-------|----------|
| Scheduling & Coordination | 1-2 days |
| Field Scanning | 1-3 days |
| Data Processing | 2-3 days |
| BIM Modeling | 1-3 weeks |
| Quality Review | 2-3 days |
| Delivery & Revisions | As needed |

*Timeline begins upon receipt of signed proposal and retainer payment.*

### Scheduling Flexibility

We can often accommodate rush timelines for an additional fee. Please contact us to discuss expedited options if needed.
`,
    },
    {
        name: "Payment Terms - Owner",
        slug: "payment-terms-owner",
        category: "terms",
        sortOrder: 9,
        isDefault: true,
        variables: [],
        content: `## Payment Terms

### Pricing Basis

The price estimate is based on a square footage estimate. The total cost of the project will be determined by the actual square footage scanned and modeled. We use the **BOMA 2024 Gross Areas Standard**, and will send a square footage audit approximately one week after scan completion.

### Payment Schedule

- **50% of the estimated cost** will be due at the time of the client engaging the Services.
- The first invoice will be for half of the estimated cost.
- The second invoice, due upon delivery, will be for the outstanding balance based on the total square footage scanned and modeled.

### Accepted Forms of Payment

- **ACH** (Preferred Method)
- **Check** - Please mail check to Scan2Plan, 188 1st St., Troy, NY 12180
- **Credit Card** (additional 3% fee) - Email accounting@scan2plan.io to request this option
`,
    },
    {
        name: "Payment Terms - Partner",
        slug: "payment-terms-partner",
        category: "terms",
        sortOrder: 9,
        isDefault: false,
        variables: [],
        content: `## Payment Terms

### Pricing Basis

The price estimate is based on a square footage estimate. The total cost of the project will be determined by the actual square footage scanned and modeled. We use the **BOMA 2024 Gross Areas Standard**, and will send a square footage audit approximately one week after scan completion.

### Payment Schedule

- **50% of the estimated cost** will be due at the time of the client ("Client") engaging the Services.
- The first invoice will be for half of the estimated cost.
- The second invoice will be for the outstanding balance based on the total square footage scanned and modeled.

### Accepted Forms of Payment

- **ACH** (Preferred Method)
- **Check** - Please mail check to Scan2Plan, 188 1st St., Troy, NY 12180
- **Credit Card** (additional 3% fee) - Email accounting@scan2plan.io to request this option
`,
    },
    {
        name: "Payment Terms - Net 30",
        slug: "payment-terms-net30",
        category: "terms",
        sortOrder: 9,
        isDefault: false,
        variables: [],
        content: `## Payment Terms

### Net 30

Net 30 - upon delivery.

### Pricing Basis

The price estimate is based on a square footage estimate. The total cost of the project will be determined by the actual square footage scanned and modeled. We use the **BOMA 2024 Gross Areas Standard**, and will send a square footage audit approximately one week after scan completion.

**Net 30 Projects carry a 5% service fee.**

### Accepted Forms of Payment

- **ACH** (Preferred Method)
- **Check** - Please mail check to Scan2Plan, 188 1st St., Troy, NY 12180
- **Credit Card** (additional 3% fee) - Email accounting@scan2plan.io to request this option
`,
    },
    {
        name: "Payment Terms - Net 60",
        slug: "payment-terms-net60",
        category: "terms",
        sortOrder: 9,
        isDefault: false,
        variables: [],
        content: `## Payment Terms

### Net 60

Net 60 - upon delivery.

### Pricing Basis

The price estimate is based on a square footage estimate. The total cost of the project will be determined by the actual square footage scanned and modeled. We use the **BOMA 2024 Gross Areas Standard**, and will send a square footage audit approximately one week after scan completion.

**Net 60 Projects carry a 10% service fee.**

### Accepted Forms of Payment

- **ACH** (Preferred Method)
- **Check** - Please mail check to Scan2Plan, 188 1st St., Troy, NY 12180
- **Credit Card** (additional 3% fee) - Email accounting@scan2plan.io to request this option
`,
    },
    {
        name: "Payment Terms - Net 90",
        slug: "payment-terms-net90",
        category: "terms",
        sortOrder: 9,
        isDefault: false,
        variables: [],
        content: `## Payment Terms

### Net 90

Net 90 - upon delivery.

### Pricing Basis

The price estimate is based on a square footage estimate. The total cost of the project will be determined by the actual square footage scanned and modeled. We use the **BOMA 2024 Gross Areas Standard**, and will send a square footage audit approximately one week after scan completion.

**Net 90 Projects carry a 15% service fee.**

### Accepted Forms of Payment

- **ACH** (Preferred Method)
- **Check** - Please mail check to Scan2Plan, 188 1st St., Troy, NY 12180
- **Credit Card** (additional 3% fee) - Email accounting@scan2plan.io to request this option
`,
    },
    {
        name: "General Terms",
        slug: "general-terms",
        category: "terms",
        sortOrder: 9.5,
        isDefault: true,
        variables: [],
        content: `## Terms & Conditions

### Revisions

- One round of revisions is included in the base price
- Additional revisions billed at standard hourly rates
- Major scope changes require a change order

### Cancellation

- Cancellation before field work: Full refund less 10% administrative fee
- Cancellation after field work: Field work charges apply
- Cancellation during modeling: Pro-rated charges apply

### Intellectual Property

- All deliverables become client property upon final payment
- Scan2Plan retains right to use project for portfolio/marketing (anonymized)
`,
    },
    {
        name: "Insurance & Liability",
        slug: "insurance-liability",
        category: "legal",
        sortOrder: 10,
        isDefault: true,
        variables: [],
        content: `## Insurance & Liability

### Coverage

Scan2Plan maintains comprehensive insurance coverage:

- **General Liability**: $2,000,000 per occurrence
- **Professional Liability (E&O)**: $1,000,000 per claim
- **Workers Compensation**: As required by law
- **Auto Liability**: $1,000,000 combined single limit

### Certificates

Insurance certificates available upon request. Additional insured endorsements available.

### Limitation of Liability

Scan2Plan's liability is limited to the contract value. We are not responsible for:

- Decisions made based on deliverables
- Consequential or incidental damages
- Delays due to site access issues
- Third-party claims
`,
    },
    {
        name: "Signature Block",
        slug: "signature-block",
        category: "legal",
        sortOrder: 11,
        isDefault: true,
        variables: ["client_name", "quote_date"],
        content: `## Acceptance

By signing below, {{client_name}} agrees to the scope, pricing, and terms outlined in this proposal.

---

**Client Signature:** _________________________

**Printed Name:** _________________________

**Title:** _________________________

**Date:** _________________________

---

**Scan2Plan Authorization:**

**Signature:** _________________________

**Printed Name:** _________________________

**Date:** {{quote_date}}

---

*Please sign and return this proposal to proceed. Thank you for your business!*
`,
    },
];

const DEFAULT_GROUPS = [
    {
        name: "Standard Proposal",
        slug: "standard",
        description: "Complete proposal with all standard sections",
        isDefault: true,
    },
    {
        name: "Simple Quote",
        slug: "simple",
        description: "Abbreviated proposal for quick turnaround",
        isDefault: false,
    },
    {
        name: "Enterprise",
        slug: "enterprise",
        description: "Extended proposal with additional legal and compliance sections",
        isDefault: false,
    },
];

async function seedProposalTemplates() {
    console.log("🌱 Seeding proposal templates...");

    // Check if templates already exist
    const existing = await db.select().from(proposalTemplates).limit(1);
    if (existing.length > 0) {
        console.log("⚠️  Templates already exist. Skipping seed.");
        return;
    }

    // Insert templates
    const insertedTemplates = await db
        .insert(proposalTemplates)
        .values(DEFAULT_TEMPLATES)
        .returning();

    console.log(`✅ Inserted ${insertedTemplates.length} templates`);

    // Create template groups with section references
    const templatesBySlug = Object.fromEntries(
        insertedTemplates.map((t) => [t.slug, t])
    );

    // Standard group includes all templates
    const standardSections = insertedTemplates
        .filter((t) => t.isDefault)
        .map((t, idx) => ({
            templateId: t.id,
            sortOrder: t.sortOrder || idx + 1,
            required: true,
        }));

    // Simple group - just core sections
    const simpleSections = ["cover-page", "scope-of-work", "service-deliverables", "pricing", "signature-block"]
        .map((slug, idx) => ({
            templateId: templatesBySlug[slug]?.id,
            sortOrder: idx + 1,
            required: true,
        }))
        .filter((s) => s.templateId);

    // Enterprise group - all plus additional
    const enterpriseSections = insertedTemplates.map((t, idx) => ({
        templateId: t.id,
        sortOrder: t.sortOrder || idx + 1,
        required: true,
    }));

    // Insert groups
    const groups = [
        { ...DEFAULT_GROUPS[0], sections: standardSections },
        { ...DEFAULT_GROUPS[1], sections: simpleSections },
        { ...DEFAULT_GROUPS[2], sections: enterpriseSections },
    ];

    const insertedGroups = await db
        .insert(proposalTemplateGroups)
        .values(groups)
        .returning();

    console.log(`✅ Inserted ${insertedGroups.length} template groups`);
    console.log("🎉 Proposal template seeding complete!");
}

seedProposalTemplates()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("❌ Seed failed:", error);
        process.exit(1);
    });
