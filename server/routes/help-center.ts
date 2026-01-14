/**
 * Help Center API Routes
 * 
 * CRUD for help articles with import from knowledge base.
 */

import { Router } from "express";
import { db } from "../db";
import { helpArticles, insertHelpArticleSchema, HELP_ARTICLE_CATEGORIES, type HelpArticleCategory } from "@shared/schema";
import { eq, desc, asc } from "drizzle-orm";
import { isAuthenticated, requireRole } from "../replit_integrations/auth";

const router = Router();

// GET /api/help/articles - List all articles
router.get("/articles", isAuthenticated, async (req, res) => {
    try {
        const { category } = req.query;

        let query = db.select().from(helpArticles).orderBy(asc(helpArticles.sortOrder), desc(helpArticles.createdAt));

        const articles = await query;

        // Filter by category if provided
        const filtered = category
            ? articles.filter(a => a.category === category)
            : articles;

        // Non-admins only see published articles
        const user = req.user as any;
        const isAdmin = user?.claims?.role === "ceo";
        const result = isAdmin ? filtered : filtered.filter(a => a.isPublished);

        res.json(result);
    } catch (error) {
        console.error("Error fetching help articles:", error);
        res.status(500).json({ message: "Failed to fetch articles" });
    }
});

// GET /api/help/articles/:slug - Get single article
router.get("/articles/:slug", isAuthenticated, async (req, res) => {
    try {
        const { slug } = req.params;
        const [article] = await db.select().from(helpArticles).where(eq(helpArticles.slug, slug));

        if (!article) {
            return res.status(404).json({ message: "Article not found" });
        }

        // Non-admins can only see published
        const user = req.user as any;
        const isAdmin = user?.claims?.role === "ceo";
        if (!article.isPublished && !isAdmin) {
            return res.status(404).json({ message: "Article not found" });
        }

        res.json(article);
    } catch (error) {
        console.error("Error fetching article:", error);
        res.status(500).json({ message: "Failed to fetch article" });
    }
});

// GET /api/help/categories - List categories with counts
router.get("/categories", isAuthenticated, async (req, res) => {
    try {
        const articles = await db.select().from(helpArticles).where(eq(helpArticles.isPublished, true));

        const counts: Record<string, number> = {};
        HELP_ARTICLE_CATEGORIES.forEach(cat => counts[cat] = 0);
        articles.forEach(a => {
            if (counts[a.category] !== undefined) {
                counts[a.category]++;
            }
        });

        res.json(counts);
    } catch (error) {
        console.error("Error fetching categories:", error);
        res.status(500).json({ message: "Failed to fetch categories" });
    }
});

// POST /api/help/articles - Create article (CEO only)
router.post("/articles", isAuthenticated, requireRole("ceo"), async (req, res) => {
    try {
        const parsed = insertHelpArticleSchema.safeParse(req.body);
        if (!parsed.success) {
            return res.status(400).json({ message: "Invalid request", errors: parsed.error.errors });
        }

        const user = req.user as any;
        const [article] = await db.insert(helpArticles).values({
            ...parsed.data,
            category: parsed.data.category as HelpArticleCategory,
            createdBy: user?.claims?.email || "system",
        }).returning();

        res.status(201).json(article);
    } catch (error: any) {
        if (error.code === "23505") { // Unique violation
            return res.status(400).json({ message: "An article with this slug already exists" });
        }
        console.error("Error creating article:", error);
        res.status(500).json({ message: "Failed to create article" });
    }
});

// PUT /api/help/articles/:id - Update article (CEO only)
router.put("/articles/:id", isAuthenticated, requireRole("ceo"), async (req, res) => {
    try {
        const { id } = req.params;
        const { title, slug, category, content, sortOrder, isPublished } = req.body;

        const [article] = await db
            .update(helpArticles)
            .set({
                ...(title !== undefined && { title }),
                ...(slug !== undefined && { slug }),
                ...(category !== undefined && { category: category as HelpArticleCategory }),
                ...(content !== undefined && { content }),
                ...(sortOrder !== undefined && { sortOrder }),
                ...(isPublished !== undefined && { isPublished }),
                updatedAt: new Date(),
            })
            .where(eq(helpArticles.id, parseInt(id)))
            .returning();

        if (!article) {
            return res.status(404).json({ message: "Article not found" });
        }

        res.json(article);
    } catch (error) {
        console.error("Error updating article:", error);
        res.status(500).json({ message: "Failed to update article" });
    }
});

// DELETE /api/help/articles/:id - Delete article (CEO only)
router.delete("/articles/:id", isAuthenticated, requireRole("ceo"), async (req, res) => {
    try {
        const { id } = req.params;
        const [deleted] = await db
            .delete(helpArticles)
            .where(eq(helpArticles.id, parseInt(id)))
            .returning();

        if (!deleted) {
            return res.status(404).json({ message: "Article not found" });
        }

        res.json({ success: true });
    } catch (error) {
        console.error("Error deleting article:", error);
        res.status(500).json({ message: "Failed to delete article" });
    }
});

// POST /api/help/seed - Seed initial help articles (CEO only)
router.post("/seed", isAuthenticated, requireRole("ceo"), async (req, res) => {
    try {
        const seedArticles = [
            // Getting Started
            {
                title: "Platform Overview",
                slug: "platform-overview",
                category: "getting-started" as HelpArticleCategory,
                content: `# Welcome to Scan2Plan OS

Scan2Plan OS is the central nervous system of our company. This platform isn't just a CRM or Project Management tool—it's an end-to-end operating system designed specifically for the laser scanning and BIM modeling industry.

## The Lifecycle of a Job

Every job follows this journey:
1. **Lead**: A potential project enters the system
2. **Quote (CPQ)**: Configure the building details, and the system calculates the price
3. **Closed Won**: Client signs, lead becomes a Project
4. **Production**: Field techs scan, BIM team models
5. **Delivery**: Final files sent to client

## User Roles

- **CEO**: Full system access, can override margin gates
- **Sales**: Access to pipeline, leads, quotes, proposals
- **Production**: Access to projects, field operations
- **Accounting**: Access to financial module`,
                sortOrder: 1,
            },
            // Sales
            {
                title: "Creating Leads",
                slug: "creating-leads",
                category: "sales" as HelpArticleCategory,
                content: `# Creating a New Lead

Navigate to the **Sales Pipeline** and click **"+ New Lead"**.

## Essential Information

- **Project Name**: Required - the name of the project
- **Project Address**: Critical for travel calculations
- **Client Name**: The company or person you're quoting

## Deal Stages

New leads start in "Leads". As you progress, move them through:
1. Leads
2. Contacted
3. Proposal
4. Negotiation
5. Closed Won / Closed Lost

## Lead Sources

Track where leads come from for attribution reporting. Required before marking "Closed Won".`,
                sortOrder: 1,
            },
            // CPQ
            {
                title: "Building a Quote",
                slug: "building-a-quote",
                category: "cpq" as HelpArticleCategory,
                content: `# How to Build a Quote

1. Open a lead from the Sales Pipeline
2. Click the **Quote** tab
3. Add one or more **Areas** (buildings/spaces)

## Configuring Each Area

- **Building Type**: 16 options (Hospital, Warehouse, Office, etc.)
- **Square Footage**: Enter gross square footage
- **Scope**: Full Building, Interior Only, or Exterior Only
- **Disciplines**: Architecture, Structural, MEP
- **LOD**: Level of Development (200, 300, 350, 400)

## Risk Factors

Add percentage markup for complexity:
- Occupied Building: +15%
- Hazardous Conditions: +25%
- No Power/HVAC: +20%
- Remote Location: +10%
- Fast Track/Rush: +15%

## The 40% Margin Gate

If your quote's gross margin falls below 40%, a warning displays. CEO can override and proceed with strategic pricing.`,
                sortOrder: 1,
            },
            // FieldHub
            {
                title: "Using FieldHub Mobile",
                slug: "fieldhub-mobile",
                category: "fieldhub" as HelpArticleCategory,
                content: `# FieldHub Mobile Interface

Technicians use the mobile-first FieldHub interface, which automatically activates on smartphones and tablets.

## Mobile Navigation

Bottom navigation bar with tabs:
- **Home**: Mission overview and Quick Actions
- **Time**: Clock In/Out and time tracking
- **Capture**: Upload site photos and videos
- **Chat**: AI support for questions

## Quick Actions

- **Clock In/Out**: Tap to log arrival. GPS captured automatically.
- **Capture**: Opens camera for site photos
- **Voice Note**: Record memo, AI transcribes to text
- **Escalate**: Jump to Chat for AI assistance

## Voice Notes

1. Tap **Voice Note** button
2. Speak clearly
3. Tap **Stop**
4. AI transcribes using Whisper
5. Text appears in Field Notes`,
                sortOrder: 1,
            },
            // FAQ
            {
                title: "Why Can't I Save My Quote?",
                slug: "cant-save-quote",
                category: "faq" as HelpArticleCategory,
                content: `# Why Can't I Save My Quote?

Look at the **Integrity Audit** panel in the quote sidebar.

## Red Shield

You have a blocking error. Usually, your **Gross Margin** is below the 40% floor. You cannot save without an Admin override.

### Fix Options:
1. Increase prices
2. Remove costly disciplines
3. Request CEO override for strategic pricing

## Yellow Shield

Warning only. Check for:
- Missing Building Type selection
- Missing dispatch location
- Incomplete area configuration

## Travel Cost Shows $0?

Did you enter a valid **Project Address** in the Lead tab? The system needs a specific address to calculate distance.`,
                sortOrder: 1,
            },
        ];

        let created = 0;
        for (const article of seedArticles) {
            try {
                await db.insert(helpArticles).values(article);
                created++;
            } catch (e: any) {
                // Skip duplicates
                if (e.code !== "23505") throw e;
            }
        }

        res.json({ success: true, created, message: `Seeded ${created} help articles` });
    } catch (error) {
        console.error("Error seeding articles:", error);
        res.status(500).json({ message: "Failed to seed articles" });
    }
});

// POST /api/help/import-tkb - Import Total Knowledge Base articles (CEO only)
router.post("/import-tkb", isAuthenticated, requireRole("ceo"), async (req, res) => {
    try {
        // Parsed articles from Scan2Plan Total Knowledge Base
        const tkbArticles = [
            // GETTING STARTED
            {
                title: "Welcome to Scan2Plan",
                slug: "welcome-to-scan2plan",
                category: "getting-started" as HelpArticleCategory,
                content: `# Welcome to Scan2Plan OS

The **Scan2Plan Total Knowledge Base (TKB)** is a comprehensive guide to everything that defines Scan2Plan's services, standards, processes, and client experience.

## What We Do
- **Core Services**: Scan-to-BIM, Scan-to-CAD, Structural Modeling, MEPF Modeling, Landscape & Site Modeling, 360 Photo Documentation
- **Project Types**: Residential, Commercial, Institutional, Industrial, Historic Preservation (HBIM), Infrastructure

## Our Difference
- **Accuracy**: 0" to 1/8" Measured Accuracy and 0" to 1/2" Represented Accuracy
- **Customization**: Tailored deliverables with support for client-specific Revit, CAD, and modeling standards
- **Responsiveness**: 1-week response for scanning, 2-5 week delivery on projects
- **HBIM Expertise**: Advanced LoD 350+ modeling for Historic Building Information Modeling projects`,
                sortOrder: 1,
            },
            {
                title: "Mission, Vision & Values",
                slug: "mission-vision-values",
                category: "getting-started" as HelpArticleCategory,
                content: `# Core Messaging

## Mission Statement
**"To deliver trust, confidence, and integrity on every project."**

## Vision Statement
**"Scan2Plan is the measure of excellence for Architects and Engineers."**

## Core Values

| Core Value | What It Means |
|------------|---------------|
| **We Care** | We put people first. From client satisfaction to employee well-being, we take a people-first approach. |
| **Can Do** | We are resourceful, proactive, and solution-oriented. Obstacles are met with problem-solving, not excuses. |
| **Continual Improvement** | We seek constant growth and learning. Every project is an opportunity for more precision and efficiency. |

## The 3 Uniques

| Unique | What It Means |
|--------|---------------|
| **The Measure of Excellence** | Our standards for LoD, LoA, accuracy, and quality control are unmatched in the industry. |
| **Tailored to Your Needs** | Flexible LoD, LoA, and file format options to meet every client's specific needs. |
| **Ready When You Are** | Fast, reliable, and ready to mobilize. 1-week scanning and 2-5 week model delivery. |`,
                sortOrder: 2,
            },
            {
                title: "Price-Match Guarantee",
                slug: "price-match-guarantee",
                category: "getting-started" as HelpArticleCategory,
                content: `# Price-Match Guarantee

**"If it meets our standards, we'll match the price."**

This price-match guarantee builds client confidence that Scan2Plan offers fair, competitive pricing without sacrificing accuracy or precision.

## How It Works
- If a client finds a competitor offering the same scope, LoD, and deliverables at a lower price, **Scan2Plan will match it**
- This guarantee only applies to comparable scopes where the **LoD, LoA, and project requirements match Scan2Plan's standard service offerings**`,
                sortOrder: 3,
            },
            // SALES
            {
                title: "Client Journey Overview",
                slug: "client-journey-overview",
                category: "sales" as HelpArticleCategory,
                content: `# 10-Step Client Journey

| Step | What Happens | Why It Matters |
|------|--------------|----------------|
| **1️⃣ Initial Consultation** | Understand client needs, scope, and deliverables | Defines client needs |
| **2️⃣ Scope Definition & Proposal** | Confirm LoD, deliverables, and pricing | Sets clear scope and cost |
| **3️⃣ Contract Signing** | Client signs contract and pays 50% deposit | Ensures alignment |
| **4️⃣ Pre-Scan Site Survey** | Site review using Google Earth, Zillow, site plans | Ensures scanning conditions are known |
| **5️⃣ Kickoff Call** | Align stakeholders on scope, schedule, and access | Ensures team alignment |
| **6️⃣ On-Site Scanning** | Field team captures point clouds and 360° images | Captures raw scan data |
| **7️⃣ Point Cloud Registration** | Point clouds are aligned and registered | Ensures clean data |
| **8️⃣ BIM/CAD Production** | Point clouds converted into Revit, CAD, and other models | Creates design files |
| **9️⃣ Quality Control** | Deliverables reviewed in 3-stage QC process | Ensures quality |
| **🔟 Client Review & Delivery** | Final files delivered, revisions made as needed | Client gets final product |`,
                sortOrder: 1,
            },
            {
                title: "Client Benefits & Guarantees",
                slug: "client-benefits-guarantees",
                category: "sales" as HelpArticleCategory,
                content: `# Client Benefits

## 1-Week Standard Response
On-site scanning is scheduled within 1 week of contract approval.

## Accuracy & Precision
- **LoA 40** for measured accuracy (0-1/8" tolerance) for point cloud data
- **LoA 30** for modeled accuracy (0-1/2" tolerance) for BIM and CAD models

## Comprehensive Support
- File Conversion assistance
- Usage Support for Revit, Archicad, and AutoCAD
- Re-Export Requests available anytime (files retained indefinitely)

## Unlimited Revisions
If deliverables don't meet expectations, we revise until satisfied (within original scope).

---

# Key Guarantees

| Guarantee | What It Covers |
|-----------|----------------|
| **Accuracy Guarantee** | Point clouds meet LoA 40. BIM/CAD models meet LoA 30. |
| **Price-Match Guarantee** | We'll match competitor pricing for same scope/LoD. |
| **Turnaround Guarantee** | 1-week scanning turnaround. 2-5 week BIM/CAD delivery. |`,
                sortOrder: 2,
            },
            // CPQ
            {
                title: "Level of Detail (LoD) Explained",
                slug: "lod-explained",
                category: "cpq" as HelpArticleCategory,
                content: `# Level of Detail (LoD)

LoD defines how much graphical and functional detail is in BIM/CAD models.

## LoD Definitions

| LoD | Definition | Typical Use |
|-----|------------|-------------|
| **LoD 200** | Schematic Design: Basic massing models | Feasibility studies, conceptual design |
| **LoD 300** | Construction-Ready: Essential architectural features | Construction documents, permits |
| **LoD 350** | Construction-Ready (Detailed): Refined details | Coordination, clash detection |
| **LoD 350+** | Historic Preservation (HBIM): Custom site-specific detail | Preservation, adaptive reuse |

## Key Differences

| Feature | LoD 200 | LoD 300 | LoD 350 | LoD 350+ |
|---------|---------|---------|---------|----------|
| **Detail Level** | Placeholder | Construction-ready | Full detail | Custom ornamentation |
| **Walls** | Massed only | Accurate geometry | Details, reveals | Carved reliefs |
| **Windows** | Openings only | Accurate placement | Full system | Stained glass |
| **Who Uses It** | Planners | Architects | Engineers | Preservation architects |`,
                sortOrder: 1,
            },
            {
                title: "Level of Accuracy (LoA) Explained",
                slug: "loa-explained",
                category: "cpq" as HelpArticleCategory,
                content: `# Level of Accuracy (LoA)

LoA defines how precisely a 3D model or point cloud aligns with real-world measurements.

## Two Types of LoA

| LoA Type | Definition | Tolerance | What It Controls |
|----------|------------|-----------|------------------|
| **LoA 40** (Measured) | Precision of raw point cloud | **0-1/8"** | Scan data alignment |
| **LoA 30** (Modeled) | Precision of BIM/CAD geometry | **0-1/2"** | Model-to-scan alignment |

## Why LoA Matters

| Benefit | Why It Matters |
|---------|----------------|
| Clear Expectations | Clients know exactly how precise scans and models will be |
| Reduced Rework | Clear LoA requirements reduce disputes |
| Clash Detection | Accurate models detect conflicts between systems |
| Industry Compliance | Aligns with USIBD LoA Standards |

## Validation Methods
- **B-Validation**: Overlapping scan comparison for consistency
- **C-Validation**: Internal control point alignment verification`,
                sortOrder: 2,
            },
            {
                title: "Disciplines Overview",
                slug: "disciplines-overview",
                category: "cpq" as HelpArticleCategory,
                content: `# Four Core Disciplines

Scan2Plan models four primary disciplines, each with specific LoD requirements.

## Architecture
- Walls, doors, windows, floors, roofs, ceilings
- **Deliverables**: BIM models, CAD drawings, plan sets

## Structure
- Columns, beams, trusses, foundations
- **Deliverables**: BIM models for structural coordination

## MEPF (Mechanical, Electrical, Plumbing, Fire)
- HVAC, Plumbing, Electrical, Fire Systems
- **Deliverables**: BIM for coordination, clash detection

## Landscape
- Paths, foliage, site furnishings, topography
- **Deliverables**: Georeferenced BIM/CAD models, site plans

---

## Customization Options
- **Custom LoD by Discipline**: Request LoD 300 for MEPF but LoD 350 for Architecture
- **Area-Specific**: LoD 350 for lobbies, LoD 300 for back-of-house`,
                sortOrder: 3,
            },
            // PRODUCTION
            {
                title: "On-Site Scanning Process",
                slug: "on-site-scanning",
                category: "production" as HelpArticleCategory,
                content: `# On-Site Scanning & Fieldwork

## Site Preparation
- Confirm site access with client
- Follow "White Glove" protocol — technicians don't touch client property
- PPE Compliance: Hard hats, gloves, safety vests, steel-toe boots

## Equipment Setup
- **Trimble X7** and **NavVis VLX 2** for scanning
- **Matterport Pro2** for 360° walkthroughs (optional)

## Scanning Process
1. Begin scanning with technicians capturing point clouds
2. Collect overlap scans for B-Validation during registration
3. Capture 360° photo documentation

## On-Site Review
Before leaving, technicians review captured scans to ensure all areas are covered.`,
                sortOrder: 1,
            },
            {
                title: "Point Cloud Registration",
                slug: "point-cloud-registration",
                category: "production" as HelpArticleCategory,
                content: `# Post-Scan Processing & Registration

## File Upload & Storage
- Raw scan files uploaded to Airtable job tracker
- Files stored on Google Drive and tape backups for redundancy

## Point Cloud Registration

Using **Trimble RealWorks** to align multiple scan positions:

| Validation | Method | Purpose |
|------------|--------|---------|
| **B-Validation** | Cross-scan alignment | Uses natural features to check alignment |
| **C-Validation** | Control points | High-precision alignment using survey points |

## 360° Tour Processing
Matterport scans processed and ready within **24-48 hours**.`,
                sortOrder: 2,
            },
            {
                title: "BIM/CAD Production",
                slug: "bim-cad-production",
                category: "production" as HelpArticleCategory,
                content: `# BIM/CAD Production & Drafting

## BIM Production
- **Revit, Archicad, and Rhino** convert point clouds into BIM models
- Models created to match **LoD 200, 300, 350, or 350+ (HBIM)**

## CAD Drafting
- Extract 2D CAD drawings: floor plans, elevations, sections
- CAD files produced as **DWG, DXF, and PDF**
- Custom templates and annotations upon request

## Quality Control (3-Stage Process)

| Stage | Who Reviews | What is Reviewed |
|-------|-------------|-----------------|
| **Stage 1 - Initial QC** | Initial QC Team | LoD, LoA, model alignment, file structure |
| **Stage 2 - Revisions** | Internal Modeling Team | Address QC markups |
| **Stage 3 - Final Review** | BIM Manager | Ensures all files match agreed scope |`,
                sortOrder: 3,
            },
            // FIELDHUB
            {
                title: "Scanning Equipment",
                slug: "scanning-equipment",
                category: "fieldhub" as HelpArticleCategory,
                content: `# Core Scanning Equipment

## Trimble X7 3D Laser Scanner
Compact, survey-grade 3D laser scanner for precise interior/exterior scanning.

| Feature | Specification |
|---------|---------------|
| **Scan Speed** | 500,000 points per second |
| **Accuracy** | ±2mm |
| **Calibration** | Automatic self-calibration |
| **Color** | 1-minute quick colorization |
| **Registration** | Real-time on tablet |

**Best for**: Survey-grade precision, HBIM, inspection projects

---

## NavVis VLX 2 SLAM Scanner
Wearable, mobile scanner for rapid scanning of large environments.

| Feature | Specification |
|---------|---------------|
| **Technology** | SLAM (Simultaneous Localization and Mapping) |
| **Accuracy** | Up to 6mm in spaces up to 500m² |
| **System** | Hands-free, agile, wearable |
| **Imagery** | 360° panoramic capture |

**Best for**: Rapid indoor mapping, crowded/dynamic sites, multi-floor buildings`,
                sortOrder: 1,
            },
            {
                title: "Supported File Formats",
                slug: "supported-file-formats",
                category: "fieldhub" as HelpArticleCategory,
                content: `# Supported File Formats & Deliverables

## BIM Models
- **RVT** - Revit native
- **IFC** - Open BIM standard
- **PLN** - Archicad native

## CAD Drawings
- **DWG** - AutoCAD
- **DXF** - Universal exchange
- **DGN** - MicroStation

## Point Cloud Data
- **RCP** - Primary format (ReCap)
- **E57** - Industry standard
- **LAS** - LiDAR format
- **PTS, XYZ** - ASCII formats

## 3D Design Formats
- **FBX** - Animation/visualization
- **OBJ** - General 3D
- **STL** - 3D printing

## Additional Compatibility
- Chief Architect (via DWG/DXF export)
- Vectorworks (via DWG, DXF, IFC)
- SolidWorks (via ACIS SAT, STEP)
- MicroStation (via DGN, DWG, DXF)`,
                sortOrder: 2,
            },
            // AI-TOOLS (using for Technical content)
            {
                title: "Industry Standards & Compliance",
                slug: "industry-standards",
                category: "ai-tools" as HelpArticleCategory,
                content: `# Industry Standards Scan2Plan Follows

| Standard | Governing Body | How We Align |
|----------|----------------|--------------|
| **BIM Forum LoD** | BIM Forum | LoD 200, 300, 350, 350+ support |
| **USIBD LoA** | US Institute of Building Documentation | LoA 40 (Measured), LoA 30 (Modeled) |
| **BOMA Gross Area** | Building Owners & Managers Association | BOMA-compliant square footage audits |
| **AIA E202** | American Institute of Architects | LoD/LoA defined in every contract |
| **ISO 19650** | International Organization for Standardization | For global/international projects |

## Why Standards Matter

| Benefit | Description |
|---------|-------------|
| **Predictability** | Clients know exactly what to expect from each LoD |
| **Accuracy** | Every project follows LoA40/LoA30 standards |
| **Interoperability** | Deliverables work in Revit, AutoCAD, Archicad |
| **Reduced Risk** | Clear scope eliminates misalignment and rework |`,
                sortOrder: 1,
            },
            {
                title: "Historic Building Information Modeling (HBIM)",
                slug: "hbim-overview",
                category: "ai-tools" as HelpArticleCategory,
                content: `# Historic Building Information Modeling (HBIM)

HBIM requires custom LoD (350+) for unique site-specific elements not present in modern buildings.

## What Makes HBIM Unique

| HBIM Element | What It Captures |
|--------------|------------------|
| **Ornamental Carvings** | Custom carvings on doors, walls, ceilings |
| **Stained Glass** | Unique colors and lead patterns |
| **Historic Joinery** | Mortise and tenon connections |
| **Custom Roofs** | Historic dormers, finials, chimneys |
| **Stone Foundations** | Preserved historic footings |

## Why HBIM Matters

- **Protects Architectural Legacy** — Preserves hand-carved details, period-specific joinery
- **Supports Grant Compliance** — Many historic preservation grants require precise documentation
- **Enables Restoration** — 3D scans provide reference to return sites to original form

## Our Commitment
"Buildings are more than structures — they are time capsules of human ingenuity. By preserving them, we preserve not just history, but a greener, more sustainable future."`,
                sortOrder: 2,
            },
            // SETTINGS (using for Company Info)
            {
                title: "Company Information",
                slug: "company-information",
                category: "settings" as HelpArticleCategory,
                content: `# Company Information

| Detail | Value |
|--------|-------|
| **Company Name** | Scan2Plan, Inc |
| **Founded** | 2018 |
| **Headquarters** | 188 1st St, Troy, NY |
| **Business Entity** | C Corporation |
| **EIN** | 84-504-2462 |
| **D-U-N-S Number** | 11-114-5156 |

## Locations

| Location | Service Area |
|----------|--------------|
| **Troy, NY (HQ)** | 200-mile radius (Albany, VT, CT, MA, PA) |
| **Brooklyn, NY** | 200-mile radius (NYC metro, NJ, CT) |
| **National/International** | Projects over 10,000 sqft |

## Contact

| Type | Details |
|------|---------|
| **Phone** | (518) 362-2403 |
| **Email** | v@scan2plan.io |
| **Support** | admin@scan2plan.io |
| **Website** | www.scan2plan.io |`,
                sortOrder: 1,
            },
            {
                title: "Leadership Team",
                slug: "leadership-team",
                category: "settings" as HelpArticleCategory,
                content: `# Leadership Team

| Name | Title | Role |
|------|-------|------|
| **V Owen Bush** | Co-Founder & Principal | Strategic leadership, creative technology executive |
| **Chase Pierson** | Co-Founder & Field Operations | Oversees field operations and technology deployment |
| **Kurt Przybilla** | Project Manager | Production schedules, deliverables, client coordination |
| **Megumi Call** | Studio Manager | Point cloud registration, QA/QC, client file management |
| **Drayton Patriota** | BIM/CAD Manager | 25+ years as BIM/CAD manager, architectural designer |
| **Agata Roberts** | Office Manager | Cash Flow, HR, IT, Insurance, Accounting |`,
                sortOrder: 2,
            },
            // FAQ
            {
                title: "Turnaround Times",
                slug: "turnaround-times",
                category: "faq" as HelpArticleCategory,
                content: `# Turnaround Times

| Service Stage | Timeframe |
|---------------|-----------|
| **On-Site Scanning** | 1 week from contract approval |
| **Point Cloud Registration** | 1-2 weeks after scanning |
| **BIM/CAD Production** | 2-5 weeks from scan completion |
| **File Delivery** | 2-5 weeks total |
| **Revision Requests** | 1-2 weeks |

## Expedited Service
- Additional fee for expedited delivery
- Generally reduces time by 1 week
- Shortest possible: **2 weeks** (3-day delivery not available)

## Delays
Site-specific delays may occur for specialized PPE requirements (fire, flood, or mold-damaged sites).`,
                sortOrder: 1,
            },
            {
                title: "Revision Policy",
                slug: "revision-policy",
                category: "faq" as HelpArticleCategory,
                content: `# Revision Policy

## Unlimited Revisions
If deliverables don't meet expectations, Scan2Plan will revise until satisfied — **as long as the request is within original scope**.

## How It Works
1. After first delivery, clients have a review period
2. Request changes via email or project portal
3. Revisions completed at no extra charge
4. Only out-of-scope requests (new areas, higher LoD) incur additional cost

## Example
After receiving a BIM model, client requests door swings be included in LoD 300 (within scope) → Scan2Plan makes revisions within 48 hours.`,
                sortOrder: 2,
            },
            {
                title: "Pricing & Payment",
                slug: "pricing-payment",
                category: "faq" as HelpArticleCategory,
                content: `# Pricing & Payment

## Payment Terms
- **50% Deposit** required before scheduling
- **50% Balance** due upon delivery

## Minimum Project Size
Contact us for current minimums based on location and project type.

## Square Footage Audit
We use **BOMA Gross Area Standard** for all square footage calculations:
- Includes stairwells, mechanical rooms, hallways
- Different from "Living Area" (which excludes basements, attics)

## Price-Match Guarantee
If a competitor offers the same service, LoD, and LoA at a lower price — **we'll match it**.

## Late Payments
Projects may be paused if payments are not received per terms. Final files withheld until balance cleared.`,
                sortOrder: 3,
            },
            {
                title: "Insurance & Safety",
                slug: "insurance-safety",
                category: "faq" as HelpArticleCategory,
                content: `# Insurance & Safety

## Insurance Coverage
Full liability and workers' compensation coverage for all field operations.

## Site Safety

### White Glove Protocol
Technicians do not touch, move, or interact with client property unless explicitly required.

### PPE Compliance
All technicians wear:
- Hard hats
- Safety vests
- Steel-toe boots
- Gloves
- N95 masks (when required)

### Stop Work Authority
Any team member can halt work if they observe unsafe conditions.

## Data Security
- Files backed up to Google Drive and tape
- Encryption for file sharing
- Files retained indefinitely`,
                sortOrder: 4,
            },
        ];

        let created = 0;
        let skipped = 0;
        for (const article of tkbArticles) {
            try {
                await db.insert(helpArticles).values(article);
                created++;
            } catch (e: any) {
                if (e.code === "23505") {
                    skipped++;
                } else {
                    throw e;
                }
            }
        }

        res.json({
            success: true,
            created,
            skipped,
            total: tkbArticles.length,
            message: `Imported ${created} articles from Total Knowledge Base (${skipped} already existed)`
        });
    } catch (error) {
        console.error("Error importing TKB:", error);
        res.status(500).json({ message: "Failed to import knowledge base" });
    }
});

export default router;

