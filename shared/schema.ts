import { pgTable, text, serial, integer, boolean, timestamp, jsonb, decimal } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Import Auth and Chat models from blueprints
export * from "./models/auth";
export * from "./models/chat";
export * from "./utils/projectId";
export * from "./utils/workflowGates";

// === CONTROLLED VOCABULARIES (Data Normalization) ===
export const BUILDING_TYPES = [
  "Commercial / Office",
  "Industrial / Warehouse",
  "Residential - Standard",
  "Residential - High-Rise",
  "Healthcare / Medical",
  "Education / Campus",
  "Retail / Hospitality",
  "Mixed Use",
  "Infrastructure",
  "Historical / Renovation",
  "Warehouse / Storage",
  // HBIM Building Types (auto-default to LOD 350+)
  "Religious Building",
  "Hotel / Resort",
  "Theatre / Performing Arts",
  "Museum / Gallery",
  "Other",
] as const;

// HBIM Building Types that require LOD 350+ for heritage/complexity
export const HBIM_BUILDING_TYPES: readonly BuildingType[] = [
  "Historical / Renovation",
  "Religious Building",
  "Hotel / Resort",
  "Theatre / Performing Arts",
  "Museum / Gallery",
] as const;

export const SCOPE_OPTIONS = [
  "Full Building",
  "Interior Only",
  "Exterior Only",
  "Roof/Facades Only",
  "MEP Systems Only",
  "Structural Only",
  "As-Built Documentation",
] as const;

export const LOD_LEVELS = [
  "LOD 100",
  "LOD 200",
  "LOD 300",
  "LOD 350",
  "LOD 400",
] as const;

// Level of Accuracy per USIBD Standards (tolerance thresholds)
export const LOA_LEVELS = [
  "LoA 10", // > 1" tolerance
  "LoA 20", // ≤ 1" tolerance
  "LoA 30", // ≤ 1/2" tolerance (S2P default for modeled)
  "LoA 40", // ≤ 1/4" tolerance (S2P default for measured)
  "LoA 50", // ≤ 1/8" tolerance
] as const;

export const DISCIPLINE_OPTIONS = [
  "Architecture (LOD 200)",
  "Architecture (LOD 300)",
  "Architecture (LOD 350)",
  "Structural (LOD 300)",
  "MEPF (LOD 200)",
  "MEPF (LOD 300)",
  "Civil/Site",
  "Full BIM (Arch + MEPF)",
] as const;

export const SCANNER_TYPES = [
  "Leica RTC360",
  "Leica BLK360",
  "Leica P-Series",
  "NavVis VLX",
  "Matterport Pro",
  "FARO Focus",
  "Trimble X7",
  "Other",
] as const;

export const BIM_DELIVERABLES = [
  "Revit",
  "Archicad",
  "SketchUp",
  "Rhino",
  "AutoCAD",
  "Point Cloud Only",
  "Navisworks",
  "IFC",
  "Other",
] as const;

// === HYBRID STORAGE MODES (Legacy Drive + GCS) ===
export const STORAGE_MODES = [
  "legacy_drive",   // Legacy: Only Google Drive (30TB archive)
  "hybrid_gcs",     // Hybrid: GCS for scan data, Drive for docs
  "gcs_native",     // Future: Full GCS (post-migration)
] as const;

export type StorageMode = typeof STORAGE_MODES[number];

// === LEAD SOURCE OPTIONS (Canonical Attribution) ===
export const SOURCE_OPTIONS = [
  { value: "cold_outreach", label: "Cold Outreach" },
  { value: "abm", label: "ABM Campaign" },
  { value: "referral_client", label: "Referral - Client" },
  { value: "referral_partner", label: "Referral - Partner" },
  { value: "existing_customer", label: "Existing Customer" },
  { value: "ceu", label: "CEU Event" },
  { value: "proof_vault", label: "Proof Vault" },
  { value: "spec_standards", label: "Spec Standards" },
  { value: "podcast", label: "Podcast" },
  { value: "site_seo", label: "Site SEO" },
  { value: "permit_trigger", label: "Permit Trigger" },
  { value: "compliance_trigger", label: "Compliance Trigger" },
  { value: "procurement_trigger", label: "Procurement Trigger" },
  { value: "event_conference", label: "Event/Conference" },
  { value: "social", label: "Social Media" },
  { value: "vendor_onboarding", label: "Vendor Onboarding" },
] as const;

export const REFERRAL_SOURCES = ["referral_client", "referral_partner"] as const;
export type SourceOption = typeof SOURCE_OPTIONS[number]["value"];

// === MARKETING INFLUENCE TOUCHPOINTS ===
export const TOUCHPOINT_OPTIONS = [
  { value: "proof_vault", label: "Proof Vault" },
  { value: "spec_standards", label: "Spec Standards" },
  { value: "castle", label: "Castle (Digital Twin)" },
  { value: "deck_library", label: "Deck Library" },
  { value: "ceu", label: "CEU/Training" },
  { value: "case_study", label: "Case Study" },
  { value: "site_page", label: "Site Page" },
  { value: "podcast", label: "Podcast" },
  { value: "social", label: "Social Media" },
] as const;

export type TouchpointOption = typeof TOUCHPOINT_OPTIONS[number]["value"];

// === ABM TIERING (Account-Based Marketing) ===
export const ABM_TIERS = ["Tier A", "Tier B", "Tier C", "None"] as const;
export type AbmTier = typeof ABM_TIERS[number];

export const FIRM_SIZES = ["1-10", "11-50", "50-100", "100+"] as const;
export type FirmSize = typeof FIRM_SIZES[number];

export const COMPANY_DISCIPLINES = ["Architecture", "GC", "Owner", "MEP"] as const;
export type CompanyDiscipline = typeof COMPANY_DISCIPLINES[number];

// === EVENT TYPES (Education-Led Sales) ===
export const EVENT_TYPES = ["webinar", "lunch_learn"] as const;
export type EventType = typeof EVENT_TYPES[number];

export const REGISTRATION_STATUSES = ["registered", "attended", "certificate_sent"] as const;
export type RegistrationStatus = typeof REGISTRATION_STATUSES[number];

export type BuildingType = typeof BUILDING_TYPES[number];
export type ScopeOption = typeof SCOPE_OPTIONS[number];
export type LODLevel = typeof LOD_LEVELS[number];
export type LOALevel = typeof LOA_LEVELS[number];
export type DisciplineOption = typeof DISCIPLINE_OPTIONS[number];
export type ScannerType = typeof SCANNER_TYPES[number];
export type BimDeliverable = typeof BIM_DELIVERABLES[number];

// === CPQ BUILDING TYPE IDS (matches CPQ calculator) ===
export const CPQ_BUILDING_TYPES = {
  "1": "Residential - Single Family",
  "2": "Residential - Multi Family",
  "3": "Residential - Luxury",
  "4": "Commercial / Office",
  "5": "Retail / Restaurants",
  "6": "Kitchen / Catering Facilities",
  "7": "Education",
  "8": "Hotel / Theatre / Museum",
  "9": "Hospitals / Mixed Use",
  "10": "Mechanical / Utility Rooms",
  "11": "Warehouse / Storage",
  "12": "Religious Buildings",
  "13": "Infrastructure / Roads / Bridges",
  "14": "Built Landscape",
  "15": "Natural Landscape",
  "16": "ACT (Acoustic Ceiling Tiles)",
} as const;

export const CPQ_BUILDING_TYPE_IDS = Object.keys(CPQ_BUILDING_TYPES) as Array<keyof typeof CPQ_BUILDING_TYPES>;

// === CPQ DISCIPLINES ===
export const CPQ_DISCIPLINES = ["arch", "struct", "mech", "elec", "plumb", "site"] as const;
export type CpqDiscipline = typeof CPQ_DISCIPLINES[number];

// === CPQ LOD VALUES (simplified for CPQ) ===
export const CPQ_LOD_VALUES = ["200", "300", "350"] as const;
export type CpqLodValue = typeof CPQ_LOD_VALUES[number];

// === CPQ SCOPE VALUES (aligned with original CPQ) ===
export const CPQ_SCOPE_VALUES = ["full", "interior", "exterior", "roof", "facade"] as const;
export type CpqScopeValue = typeof CPQ_SCOPE_VALUES[number];

// === CPQ RISK FACTORS ===
// Includes costed risk factors from external CPQ: Occupied (+15%), Hazardous (+25%), No Power/HVAC (+20%)
export const CPQ_RISK_FACTORS = [
  "remote",
  "fastTrack",
  "revisions",
  "coordination",
  "incomplete",
  "difficult",
  "multiPhase",
  "unionSite",
  "security",
  "occupied",      // Occupied Building +15%
  "hazardous",     // Hazardous Conditions +25%
  "noPower",       // No Power/HVAC +20%
] as const;
export type CpqRiskFactor = typeof CPQ_RISK_FACTORS[number];

// Risk factor percentages for pricing
export const CPQ_RISK_PERCENTAGES: Record<CpqRiskFactor, number> = {
  remote: 10,
  fastTrack: 15,
  revisions: 10,
  coordination: 10,
  incomplete: 15,
  difficult: 15,
  multiPhase: 10,
  unionSite: 10,
  security: 10,
  occupied: 15,
  hazardous: 25,
  noPower: 20,
};

// === CPQ DISPATCH LOCATIONS ===
export const CPQ_DISPATCH_LOCATIONS = ["troy", "brooklyn", "boise", "denver", "remote"] as const;
export type CpqDispatchLocation = typeof CPQ_DISPATCH_LOCATIONS[number];

// === TRAVEL MODES ===
export const TRAVEL_MODES = ["local", "regional", "flyout"] as const;
export type TravelMode = typeof TRAVEL_MODES[number];

// === CPQ ADDITIONAL SERVICES ===
export const CPQ_SERVICES = [
  "matterport",
  "georeferencing",
  "actScanning",
  "scanRegistrationOnly",
  "expedited",
] as const;
export type CpqService = typeof CPQ_SERVICES[number];

// === CPQ PAYMENT TERMS ===
export const CPQ_PAYMENT_TERMS = [
  "partner",       // Partner (no hold on production)
  "owner",         // Owner (hold if delay)
  "50/50",         // 50% Deposit / 50% on Completion
  "net15",         // Net 15 (no surcharge)
  "net30",         // Net 30 +5%
  "net45",         // Net 45 +7%
  "net60",         // Net 60 +10%
  "net90",         // Net 90 +15%
  "standard",      // Standard terms
  "other",
] as const;
export type CpqPaymentTerm = typeof CPQ_PAYMENT_TERMS[number];

// Centralized display labels for payment terms (used across UI and proposal generators)
export const CPQ_PAYMENT_TERMS_DISPLAY: Record<CpqPaymentTerm, string> = {
  partner: "Partner (no premium)",
  owner: "Owner (no premium)",
  "50/50": "50% Deposit / 50% on Completion",
  net15: "Net 15",
  net30: "Net 30 (+5%)",
  net45: "Net 45 (+7%)",
  net60: "Net 60 (+10%)",
  net90: "Net 90 (+15%)",
  standard: "Standard",
  other: "Other",
};

// === GOOGLE INTEL TYPE (Solar API + Distance Matrix) ===
export interface GoogleBuildingInsights {
  available: boolean;
  squareFeet?: number;
  squareMeters?: number;
  maxRoofHeightFeet?: number;
  maxRoofHeightMeters?: number;
  roofSegments?: number;
  imageryDate?: string;
  imageryQuality?: string;
  coordinates?: { lat: number; lng: number };
  fetchedAt?: string;
  error?: string;
}

export interface GoogleTravelInsights {
  available: boolean;
  origin?: string;
  destination?: string;
  distanceMiles?: number;
  durationMinutes?: number;
  durationText?: string;
  scenarioType?: "local" | "regional" | "flyout";
  scenarioLabel?: string;
  fetchedAt?: string;
  error?: string;
}

export interface GoogleIntel {
  buildingInsights?: GoogleBuildingInsights;
  travelInsights?: GoogleTravelInsights;
}

// Payment term percentage adjustments (aligned with original CPQ)
// Positive = surcharge, Negative = discount
export const CPQ_PAYMENT_TERM_PERCENTAGES: Record<CpqPaymentTerm, number> = {
  partner: -10,  // 10% discount for partner terms
  owner: 0,
  net30: 5,      // 5% surcharge
  net60: 10,     // 10% surcharge
  net90: 15,     // 15% surcharge
  other: 0,
};

// === CPQ BIM DELIVERABLES ===
export const CPQ_BIM_SOFTWARE = [
  "revit",
  "archicad",
  "sketchup",
  "rhino",
  "other",
] as const;
export type CpqBimSoftware = typeof CPQ_BIM_SOFTWARE[number];

// === CPQ SCAN REGISTRATION OPTIONS ===
export const CPQ_SCAN_REGISTRATION_OPTIONS = [
  "none",
  "fullDay",    // Full Day (up to 10 hrs on-site)
  "halfDay",    // Half Day (up to 4 hrs on-site)
] as const;
export type CpqScanRegistrationOption = typeof CPQ_SCAN_REGISTRATION_OPTIONS[number];

// === CPQ TIMELINE OPTIONS ===
export const CPQ_TIMELINE_OPTIONS = [
  "1week",
  "2weeks",
  "3weeks",
  "4weeks",
  "5weeks",
  "6weeks",
] as const;
export type CpqTimelineOption = typeof CPQ_TIMELINE_OPTIONS[number];

// === CPQ AREA SCHEMA (areas can be grouped by building) ===
export const cpqAreaSchema = z.object({
  id: z.string(),
  name: z.string(),
  buildingName: z.string().optional(), // Group areas by building (e.g., "Main Building", "Annex")
  buildingType: z.string(), // CPQ building type ID (1-16)
  squareFeet: z.string(),
  scope: z.enum(CPQ_SCOPE_VALUES),
  disciplines: z.array(z.enum(CPQ_DISCIPLINES)),
  disciplineLods: z.record(z.enum(CPQ_DISCIPLINES), z.enum(CPQ_LOD_VALUES)).optional(),
  mixedInteriorLod: z.enum(CPQ_LOD_VALUES).optional(),
  mixedExteriorLod: z.enum(CPQ_LOD_VALUES).optional(),
  numberOfRoofs: z.number().optional(),
  facades: z.array(z.object({ id: z.string(), label: z.string() })).optional(),
  gradeAroundBuilding: z.boolean().optional(),
  gradeLod: z.enum(CPQ_LOD_VALUES).optional(),
  includeCad: z.boolean().optional(),
  additionalElevations: z.number().optional(),
});
export type CpqArea = z.infer<typeof cpqAreaSchema>;

// === CPQ TRAVEL CONFIG SCHEMA (expanded for three modes) ===
export const cpqTravelSchema = z.object({
  // Travel mode: local (NYC/LI), regional (Greater Northeast), flyout (requires flight)
  travelMode: z.enum(TRAVEL_MODES).default("local"),
  
  // === LOCAL MODE (NYC/Long Island) ===
  // Technician without car, subway/transit, optional car rental
  localTransitCost: z.number().optional(), // Subway/transit fare
  localRentalCarNeeded: z.boolean().optional(),
  localRentalCarCost: z.number().optional(), // Daily rental cost
  localRentalDays: z.number().optional(),
  localMileage: z.number().optional(), // If rental car used
  localMileageRate: z.number().optional(), // Gas reimbursement rate
  localParkingCost: z.number().optional(),
  localTollsCost: z.number().optional(),
  
  // === REGIONAL MODE (Greater Northeast - Company Truck) ===
  dispatchLocation: z.enum(CPQ_DISPATCH_LOCATIONS).optional(),
  distance: z.number().optional(), // Miles to site
  truckMileageRate: z.number().optional(), // $/mile for company truck (default $0.67)
  scanDays: z.number().optional(), // Number of days on site
  perDiem: z.number().optional(), // Daily per diem for technician (default $75)
  overnightRequired: z.boolean().optional(),
  hotelCostRegional: z.number().optional(), // If overnight needed
  hotelNightsRegional: z.number().optional(),
  
  // === FLYOUT MODE (Flights + Hotels) ===
  flyoutOrigin: z.string().optional(), // Origin airport code
  flyoutDestination: z.string().optional(), // Destination airport code
  flyoutFlightCost: z.number().optional(), // Estimated flight cost per person
  flyoutNumTechnicians: z.number().optional(), // Number of people flying
  flyoutHotelCost: z.number().optional(), // Nightly hotel rate
  flyoutHotelNights: z.number().optional(),
  flyoutGroundTransport: z.number().optional(), // Rental car/Uber at destination
  flyoutPerDiem: z.number().optional(), // Daily per diem
  flyoutBaggageFees: z.number().optional(), // Equipment checked bags
  
  // === SEARCH RESULTS (cached from API) ===
  flightSearchResults: z.array(z.object({
    airline: z.string(),
    price: z.number(),
    departure: z.string(),
    arrival: z.string(),
    stops: z.number(),
  })).optional(),
  hotelSearchResults: z.array(z.object({
    name: z.string(),
    price: z.number(),
    rating: z.number().optional(),
    address: z.string().optional(),
  })).optional(),
  searchTimestamp: z.string().optional(), // When search was performed
  
  // === TOTALS ===
  customTravelCost: z.number().optional(), // Override calculated total
  calculatedTravelCost: z.number().optional(), // Auto-calculated total
  travelNotes: z.string().optional(),
});
export type CpqTravel = z.infer<typeof cpqTravelSchema>;

// === CPQ SCOPING DATA SCHEMA (extended details) ===
export const cpqScopingDataSchema = z.object({
  // Building Features (from external CPQ)
  hasBasement: z.boolean().optional(),
  hasAttic: z.boolean().optional(),
  specificBuilding: z.string().optional(), // Specific building or unit details
  // ACT Options
  aboveBelowACT: z.enum(["", "above", "below", "both", "other"]).optional(),
  aboveBelowACTOther: z.string().optional(),
  actSqft: z.string().optional(),
  // Scan & Registration Only (from external CPQ)
  scanRegistrationOnly: z.enum(["", "none", "fullDay", "halfDay"]).optional(),
  // Deliverables
  bimDeliverable: z.array(z.string()).optional(),
  bimDeliverableOther: z.string().optional(),
  bimVersion: z.string().optional(),
  // Template
  customTemplate: z.enum(["", "yes", "no", "other"]).optional(),
  customTemplateOther: z.string().optional(),
  // Sqft Assumptions
  sqftAssumptions: z.string().optional(),
  // Financial Notes
  assumedGrossMargin: z.string().optional(),
  caveatsProfitability: z.string().optional(),
  projectNotes: z.string().optional(),
  mixedScope: z.string().optional(),
  insuranceRequirements: z.string().optional(),
  // Timeline
  estimatedTimeline: z.enum(["", "1week", "2weeks", "3weeks", "4weeks", "5weeks", "6weeks", "other"]).optional(),
  timelineOther: z.string().optional(),
  timelineNotes: z.string().optional(),
  // Payment Terms (updated to match external CPQ)
  paymentTerms: z.enum(["", "partner", "owner", "50/50", "net15", "net30", "net45", "net60", "net90", "standard", "other"]).optional(),
  paymentTermsOther: z.string().optional(),
  paymentNotes: z.string().optional(),
  // Contact Information
  accountContact: z.string().optional(),
  accountContactEmail: z.string().optional(),
  accountContactPhone: z.string().optional(),
  phoneNumber: z.string().optional(),
  designProContact: z.string().optional(),
  designProCompanyContact: z.string().optional(),
  otherContact: z.string().optional(),
  // Billing Contact (required for contract)
  billingContactName: z.string().optional(),
  billingContactEmail: z.string().optional(),
  billingContactPhone: z.string().optional(),
  billingAddress: z.string().optional(),
  // Documentation
  proofLinks: z.string().optional(),
  // Lead Source
  source: z.enum(["", "referral", "website", "linkedin", "coldOutreach", "repeat", "partner", "other"]).optional(),
  sourceNote: z.string().optional(),
  // Sales Pipeline
  assist: z.string().optional(),
  probabilityOfClosing: z.string().optional(),
  projectStatus: z.enum(["", "lead", "qualified", "proposal", "negotiation", "won", "lost", "other"]).optional(),
  projectStatusOther: z.string().optional(),
  // === TIER A PRICING (Projects ≥50,000 sqft) ===
  tierAScanningCost: z.enum(["", "3500", "7000", "10500", "15000", "18500", "other"]).optional(),
  tierAScanningCostOther: z.number().optional(), // Custom amount when "other" selected
  tierAModelingCost: z.number().optional(), // Free-form modeling cost input
  tierAMargin: z.enum(["", "2.352", "2.5", "3.0", "3.5", "4.0"]).optional(), // Margin multiplier
  tierAClientPrice: z.number().optional(), // Calculated: (Scanning + Modeling) × Margin
});
export type CpqScopingData = z.infer<typeof cpqScopingDataSchema>;

// === TIER A PRICING CONSTANTS ===
export const TIER_A_THRESHOLD = 50000; // sqft threshold for Tier A pricing
export const TIER_A_SCANNING_COSTS = {
  "3500": 3500,
  "7000": 7000,
  "10500": 10500,
  "15000": 15000,
  "18500": 18500,
} as const;
export const TIER_A_MARGINS = {
  "2.352": { label: "2.352X (Standard)", value: 2.352 },
  "2.5": { label: "2.5X", value: 2.5 },
  "3.0": { label: "3.0X", value: 3.0 },
  "3.5": { label: "3.5X", value: 3.5 },
  "4.0": { label: "4.0X (Premium)", value: 4.0 },
} as const;
// Travel Tier Rules
export const TRAVEL_TIERS = {
  TIER_C: { maxSqft: 10000, base: 150, perMileOver: 0, mileThreshold: 0 },
  TIER_B: { minSqft: 10000, maxSqft: 50000, base: 300, perMileOver: 0, mileThreshold: 0 },
  TIER_A: { minSqft: 50000, base: 0, perMileOver: 4, mileThreshold: 20 },
} as const;

// AI-Derived Intelligence Fields
export const COMPLEXITY_SCORES = ["Low", "Medium", "High"] as const;
export const CLIENT_TIERS = ["SMB", "Mid-Market", "Enterprise"] as const;
export type ComplexityScore = typeof COMPLEXITY_SCORES[number];
export type ClientTier = typeof CLIENT_TIERS[number];

// === BUYER PERSONAS (Communication Personalization) ===
export const BUYER_PERSONAS = {
  "BP1": "Engineer (Technical Detail)",
  "BP2": "Executive (ROI/Speed)",
  "BP3": "Project Manager (Timeline/Budget)",
  "BP4": "Facilities Manager (Operations)",
  "BP5": "Architect (Design/Precision)",
  "BP6": "Owner/Developer (Value/Investment)",
  "BP7": "GC/Contractor (Schedule/Coordination)",
} as const;
export type BuyerPersonaId = keyof typeof BUYER_PERSONAS;

// === LEADS (Sales Intelligence) ===
export const leads = pgTable("leads", {
  id: serial("id").primaryKey(),
  projectCode: text("project_code"), // Unique identifier across OS, QuickBooks, Airtable (e.g., "S2P-2026-0001")
  clientName: text("client_name").notNull(),
  projectName: text("project_name"),
  projectAddress: text("project_address"),
  projectZipCode: text("project_zip_code"), // Full zip code for PandaDoc unique identifier
  value: decimal("value", { precision: 12, scale: 2 }).default("0"),
  dealStage: text("deal_stage").notNull().default("Leads"), // Leads, Contacted, Proposal, Negotiation, On Hold, Closed Won, Closed Lost
  probability: integer("probability").default(0), // 0-100
  lastContactDate: timestamp("last_contact_date").defaultNow(),
  notes: text("notes"),
  // Payment & Retainer Status
  retainerPaid: boolean("retainer_paid").default(false), // Tracks if retainer has been received
  retainerAmount: decimal("retainer_amount", { precision: 12, scale: 2 }),
  retainerPaidDate: timestamp("retainer_paid_date"),
  // Legal & Jurisdiction
  legalJurisdiction: text("legal_jurisdiction").default("Welor County"), // For small claims court
  // Scoping Document Fields
  quoteNumber: text("quote_number"),
  buildingType: text("building_type"), // Warehouse, Commercial, Residential, etc.
  sqft: integer("sqft"),
  scope: text("scope"), // Interior Only, Exterior Only, Full Building, Roof/Facades
  disciplines: text("disciplines"), // Architecture LOD 300, MEPF LOD 300, etc.
  bimDeliverable: text("bim_deliverable"), // Revit, AutoCAD, etc.
  bimVersion: text("bim_version"), // Client template version
  // Contact Info (Project Contact)
  contactName: text("contact_name"),
  contactEmail: text("contact_email"),
  contactPhone: text("contact_phone"),
  // Billing Contact Info (Required for invoicing)
  billingContactName: text("billing_contact_name"),
  billingContactEmail: text("billing_contact_email"),
  billingContactPhone: text("billing_contact_phone"),
  // Travel & Dispatch
  dispatchLocation: text("dispatch_location"),
  distance: integer("distance"), // miles
  travelRate: decimal("travel_rate", { precision: 6, scale: 2 }), // $/mile
  // Timeline & Payment
  timeline: text("timeline"), // e.g., "4 weeks"
  paymentTerms: text("payment_terms"), // owner, partner, etc.
  // CPQ Integration
  quoteUrl: text("quote_url"), // Link to generated quote from CPQ tool
  quoteVersion: integer("quote_version"), // Current version number from CPQ (V1, V2, etc.)
  // CPQ Multi-Building Areas (JSONB array of CpqArea)
  cpqAreas: jsonb("cpq_areas"), // Array of areas with building type, sqft, scope, disciplines, LoDs
  // CPQ Risk Factors (array of risk IDs)
  cpqRisks: jsonb("cpq_risks"), // ["remote", "fastTrack", etc.]
  // CPQ Travel Configuration
  cpqTravel: jsonb("cpq_travel"), // {dispatchLocation, distance, customTravelCost}
  // CPQ Additional Services
  cpqServices: jsonb("cpq_services"), // {matterport: 1, sitePhotography: 2}
  // CPQ Extended Scoping Data
  cpqScopingData: jsonb("cpq_scoping_data"), // ACT options, deliverables, timeline, contacts, etc.
  // Lead Source Attribution (Canonical Source)
  leadSource: text("lead_source"), // Legacy field - kept for backwards compatibility
  source: text("source").default("cold_outreach"), // Canonical: abm, cold_outreach, referral_client, referral_partner, existing_customer, ceu, proof_vault, spec_standards, podcast, site_seo, permit_trigger, compliance_trigger, procurement_trigger, event_conference, social, vendor_onboarding
  // Referrer Network Effect (for referral sources)
  referrerCompanyName: text("referrer_company_name"), // Company that referred this lead
  referrerContactName: text("referrer_contact_name"), // Contact person who referred
  // Lead Priority (1-5, where 5 is highest priority)
  leadPriority: integer("lead_priority").default(3),
  // Buyer Persona (for personalized communication)
  buyerPersona: text("buyer_persona"), // BP1, BP2, BP3, etc. - see BUYER_PERSONAS constant
  // AI-Derived Intelligence (extracted from research modules)
  complexityScore: text("complexity_score"), // "Low" | "Medium" | "High" - MEP complexity from property research
  clientTier: text("client_tier"), // "SMB" | "Mid-Market" | "Enterprise" - from client research
  regulatoryRisks: jsonb("regulatory_risks"), // Array of identified regulatory risks [{risk, severity, source}]
  aiInsightsUpdatedAt: timestamp("ai_insights_updated_at"), // When AI fields were last updated
  // Google API Data (Solar API building insights + Distance Matrix travel data)
  googleIntel: jsonb("google_intel"), // {buildingInsights: {...}, travelInsights: {...}}
  // CPQ Integrity Auditor Fields (synced from CPQ validation system)
  integrityStatus: text("integrity_status"), // "pass" | "warning" | "blocked"
  integrityFlags: jsonb("integrity_flags"), // Array of {code, severity, message, details}
  requiresOverride: boolean("requires_override").default(false),
  overrideApproved: boolean("override_approved").default(false),
  overrideApprovedBy: text("override_approved_by"),
  overrideApprovedAt: timestamp("override_approved_at"),
  driveFolderId: text("drive_folder_id"), // Google Drive folder ID (early binding)
  driveFolderUrl: text("drive_folder_url"), // Direct URL to Drive folder (early binding)
  // Hybrid Storage Strategy (Legacy Drive + GCS)
  storageMode: text("storage_mode").default("legacy_drive"), // legacy_drive | hybrid_gcs | gcs_native
  gcsBucket: text("gcs_bucket"), // GCS bucket name (e.g., "s2p-active")
  gcsPath: text("gcs_path"), // GCS path for scan data (e.g., "AYON-ACME-HQ-20260108/")
  // QuickBooks Online Integration
  qboEstimateId: text("qbo_estimate_id"), // QuickBooks Estimate ID (e.g., "1024")
  qboEstimateNumber: text("qbo_estimate_number"), // QuickBooks Estimate DocNumber (e.g., "EST-1024")
  qboInvoiceId: text("qbo_invoice_id"), // QuickBooks Invoice ID (e.g., "2048")
  qboInvoiceNumber: text("qbo_invoice_number"), // QuickBooks Invoice DocNumber (e.g., "INV-2048")
  qboCustomerId: text("qbo_customer_id"), // QuickBooks Customer ID
  qboSyncedAt: timestamp("qbo_synced_at"), // Last sync timestamp
  // PandaDoc Integration (E-Signature)
  pandaDocId: text("pandadoc_id"), // PandaDoc Document ID
  pandaDocStatus: text("pandadoc_status"), // document_draft, document_sent, document_completed, etc.
  pandaDocSentAt: timestamp("pandadoc_sent_at"), // When document was sent for signing
  // HubSpot Integration (Growth Engine) - Legacy
  hubspotId: text("hubspot_id"), // HubSpot Contact ID
  // GoHighLevel Integration (Growth Engine)
  ghlContactId: text("ghl_contact_id"), // GoHighLevel Contact ID
  ghlOpportunityId: text("ghl_opportunity_id"), // GoHighLevel Opportunity ID
  leadScore: integer("lead_score").default(0), // Engagement-based lead score
  ownerId: text("owner_id"), // Assigned sales owner (references users.id)
  // ABM Tiering Fields (Account-Based Marketing)
  abmTier: text("abm_tier").default("None"), // Tier A, Tier B, Tier C, None
  firmSize: text("firm_size"), // 1-10, 11-50, 50-100, 100+
  discipline: text("discipline"), // Architecture, GC, Owner, MEP
  focusSector: text("focus_sector"), // e.g., "Historic Preservation"
  // Estimator Card (Required for Tier A deals before proposal)
  estimatorCardId: text("estimator_card_id"), // Google Drive file ID for estimator card PDF
  estimatorCardUrl: text("estimator_card_url"), // Direct URL to estimator card in Drive
  // Project Status Checkboxes (Proposal Phase, In Hand, Urgent, Other)
  projectStatus: jsonb("project_status"), // {proposalPhase: boolean, inHand: boolean, urgent: boolean, other: boolean, otherText: string}
  // Proof Links (URLs to proof documents, photos, floor plans)
  proofLinks: text("proof_links"), // Free-form text for storing multiple URLs
  // Site Readiness Questionnaire (Magic Link)
  siteReadiness: jsonb("site_readiness").$type<Record<string, any>>(), // Answers to site readiness questions
  siteReadinessQuestionsSent: jsonb("site_readiness_questions_sent").$type<string[]>(), // Question IDs sent to client
  siteReadinessStatus: text("site_readiness_status").default("pending"), // pending | sent | completed
  siteReadinessSentAt: timestamp("site_readiness_sent_at"), // When magic link was sent
  siteReadinessCompletedAt: timestamp("site_readiness_completed_at"), // When client submitted answers
  clientToken: text("client_token"), // Magic link token for public access
  clientTokenExpiresAt: timestamp("client_token_expires_at"), // Token expiration
  // Soft Delete (60-day trash can)
  deletedAt: timestamp("deleted_at"), // When record was moved to trash (null = active)
  deletedBy: text("deleted_by"), // User ID who deleted the record
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Helper to convert empty strings to null for optional text fields
const optionalString = z.preprocess(
  (val) => (val === "" || val === undefined ? null : val),
  z.string().nullable().optional()
);

// Helper to convert empty strings to null for optional numbers
const optionalNumber = z.preprocess(
  (val) => {
    if (val === "" || val === undefined || val === null) return null;
    const num = Number(val);
    return isNaN(num) ? null : num;
  },
  z.number().nullable().optional()
);

// === DEAL ATTRIBUTIONS (Marketing Influence "Assist" Tracker) ===
export const dealAttributions = pgTable("deal_attributions", {
  id: serial("id").primaryKey(),
  leadId: integer("lead_id").references(() => leads.id).notNull(),
  // The influence channel touchpoint
  touchpoint: text("touchpoint").notNull(), // proof_vault, spec_standards, castle, deck_library, ceu, case_study, site_page, podcast, social
  recordedAt: timestamp("recorded_at").defaultNow(),
});

export const insertDealAttributionSchema = createInsertSchema(dealAttributions).omit({
  id: true,
  recordedAt: true,
});
export type InsertDealAttribution = z.infer<typeof insertDealAttributionSchema>;
export type DealAttribution = typeof dealAttributions.$inferSelect;

// === EVENTS (Education-Led Sales / CEU Strategy) ===
export const events = pgTable("events", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(), // e.g., "Scanning for Historic Preservation"
  description: text("description"),
  date: timestamp("date").notNull(),
  type: text("type").notNull().default("webinar"), // webinar, lunch_learn
  ceuCredits: decimal("ceu_credits", { precision: 4, scale: 2 }).default("0"), // AIA CEU credits
  location: text("location"), // Physical location or "Virtual"
  maxAttendees: integer("max_attendees"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertEventSchema = createInsertSchema(events).omit({
  id: true,
  createdAt: true,
}).extend({
  type: z.enum(EVENT_TYPES),
  ceuCredits: z.coerce.number().min(0).optional(),
  date: z.coerce.date(),
  maxAttendees: z.coerce.number().min(1).optional(),
});
export type InsertEvent = z.infer<typeof insertEventSchema>;
export type Event = typeof events.$inferSelect;

// === EVENT REGISTRATIONS (Tracking CEU Strategy) ===
export const eventRegistrations = pgTable("event_registrations", {
  id: serial("id").primaryKey(),
  eventId: integer("event_id").references(() => events.id).notNull(),
  leadId: integer("lead_id").references(() => leads.id).notNull(),
  status: text("status").notNull().default("registered"), // registered, attended, certificate_sent
  registeredAt: timestamp("registered_at").defaultNow(),
  attendedAt: timestamp("attended_at"),
  certificateSentAt: timestamp("certificate_sent_at"),
});

export const insertEventRegistrationSchema = createInsertSchema(eventRegistrations).omit({
  id: true,
  registeredAt: true,
  attendedAt: true,
  certificateSentAt: true,
}).extend({
  status: z.enum(REGISTRATION_STATUSES).optional(),
});
export type InsertEventRegistration = z.infer<typeof insertEventRegistrationSchema>;
export type EventRegistration = typeof eventRegistrations.$inferSelect;

// === LEAD RESEARCH (Deep Research Results) ===
export const leadResearch = pgTable("lead_research", {
  id: serial("id").primaryKey(),
  leadId: integer("lead_id").references(() => leads.id).notNull(),
  researchType: text("research_type").notNull(), // "client" or "property"
  summary: text("summary").notNull(),
  highlights: text("highlights"), // JSON array of key findings
  citations: text("citations"), // JSON array of source URLs
  rawResponse: text("raw_response"), // Full API response for debugging
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertLeadResearchSchema = createInsertSchema(leadResearch).omit({
  id: true,
  createdAt: true,
});
export type InsertLeadResearch = z.infer<typeof insertLeadResearchSchema>;
export type LeadResearch = typeof leadResearch.$inferSelect;

// === LEAD DOCUMENTS (Files attached to deals) ===
export const leadDocuments = pgTable("lead_documents", {
  id: serial("id").primaryKey(),
  leadId: integer("lead_id").references(() => leads.id).notNull(),
  filename: text("filename").notNull(),
  originalName: text("original_name").notNull(),
  mimeType: text("mime_type").notNull(),
  size: integer("size").notNull(), // File size in bytes
  storageKey: text("storage_key").notNull(), // Path in local storage or GCS
  uploadedBy: text("uploaded_by"), // User ID who uploaded
  uploadedAt: timestamp("uploaded_at").defaultNow(),
  // Google Drive migration fields
  movedToDriveAt: timestamp("moved_to_drive_at"), // When file was moved to Drive
  driveFileId: text("drive_file_id"), // Google Drive file ID after migration
  driveFileUrl: text("drive_file_url"), // Direct URL to file in Drive
});

export const insertLeadDocumentSchema = createInsertSchema(leadDocuments).omit({
  id: true,
  uploadedAt: true,
  movedToDriveAt: true,
  driveFileId: true,
  driveFileUrl: true,
});
export type InsertLeadDocument = z.infer<typeof insertLeadDocumentSchema>;
export type LeadDocument = typeof leadDocuments.$inferSelect;

// Regulatory risk item schema for AI-extracted risks
export const regulatoryRiskSchema = z.object({
  risk: z.string(),
  severity: z.enum(["Low", "Medium", "High"]),
  source: z.string().optional(), // e.g., "ADA", "Seismic", "Historic Preservation"
});

export type RegulatoryRisk = z.infer<typeof regulatoryRiskSchema>;

export const insertLeadSchema = createInsertSchema(leads).omit({ 
  id: true, 
  createdAt: true, 
  updatedAt: true 
}).extend({
  value: z.coerce.number(), // Handle decimal input
  probability: z.coerce.number().min(0).max(100),
  projectName: optionalString,
  quoteNumber: optionalString,
  buildingType: optionalString,
  sqft: optionalNumber,
  scope: optionalString,
  disciplines: optionalString,
  bimDeliverable: optionalString,
  bimVersion: optionalString,
  contactName: optionalString,
  contactEmail: optionalString,
  contactPhone: optionalString,
  billingContactName: optionalString,
  billingContactEmail: optionalString,
  billingContactPhone: optionalString,
  dispatchLocation: optionalString,
  distance: optionalNumber,
  travelRate: optionalNumber,
  timeline: optionalString,
  paymentTerms: optionalString,
  notes: optionalString,
  quoteUrl: optionalString,
  quoteVersion: optionalNumber,
  leadSource: optionalString,
  source: optionalString,
  referrerCompanyName: optionalString,
  referrerContactName: optionalString,
  leadPriority: z.coerce.number().min(1).max(5).default(3),
  buyerPersona: optionalString, // BP1, BP2, etc.
  // CPQ Integration fields (JSONB)
  cpqAreas: z.array(cpqAreaSchema).optional(),
  cpqRisks: z.array(z.enum(CPQ_RISK_FACTORS)).optional(),
  cpqTravel: cpqTravelSchema.optional(),
  cpqServices: z.record(z.enum(CPQ_SERVICES), z.number()).optional(),
  cpqScopingData: cpqScopingDataSchema.optional(),
  // AI-Derived Intelligence fields
  complexityScore: z.enum(COMPLEXITY_SCORES).optional(),
  clientTier: z.enum(CLIENT_TIERS).optional(),
  regulatoryRisks: z.array(regulatoryRiskSchema).optional(),
  aiInsightsUpdatedAt: z.coerce.date().optional(),
  // Hybrid Storage fields
  storageMode: z.enum(STORAGE_MODES).optional(),
  gcsBucket: z.string().optional(),
  gcsPath: z.string().optional(),
  // ABM Tiering fields
  abmTier: z.enum(ABM_TIERS).optional(),
  firmSize: z.enum(FIRM_SIZES).optional(),
  discipline: z.enum(COMPANY_DISCIPLINES).optional(),
  focusSector: optionalString,
  // Project Status Checkboxes
  projectStatus: z.object({
    proposalPhase: z.boolean().optional(),
    inHand: z.boolean().optional(),
    urgent: z.boolean().optional(),
    other: z.boolean().optional(),
    otherText: z.string().optional(),
  }).optional(),
  // Proof Links
  proofLinks: optionalString,
});

// === QC VALIDATION STATUS ENUM ===
export const QC_VALIDATION_STATUS = ["pending", "passed", "failed", "waived"] as const;
export type QCValidationStatus = typeof QC_VALIDATION_STATUS[number];

// === SCANTECHS (Field Technicians) ===
export const scantechs = pgTable("scantechs", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email"),
  phone: text("phone"),
  baseLocation: text("base_location").notNull(), // City/region where technician is based
  canDoTravel: boolean("can_do_travel").default(false), // Can handle out-of-state travel jobs
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertScantechSchema = createInsertSchema(scantechs).omit({
  id: true,
  createdAt: true,
});
export type InsertScantech = z.infer<typeof insertScantechSchema>;
export type Scantech = typeof scantechs.$inferSelect;

// === PROJECTS (Production Tracker) ===
export const projects = pgTable("projects", {
  id: serial("id").primaryKey(),
  universalProjectId: text("universal_project_id").unique(), // [ClientCode]-[YYMMDD]-[Seq] links QuickBooks accounting with production
  leadId: integer("lead_id").references(() => leads.id), // Optional link to lead
  assignedTechId: integer("assigned_tech_id").references(() => scantechs.id), // Assigned ScanTech
  name: text("name").notNull(),
  status: text("status").notNull().default("Scheduling"), // Scheduling, Scanning, Registration, Modeling, QC, Delivered
  priority: text("priority").default("Medium"), // Low, Medium, High
  dueDate: timestamp("due_date"),
  progress: integer("progress").default(0), // 0-100
  // LoD/LoA Standards (Scan2Plan "Measure of Excellence")
  targetLoD: text("target_lod").default("LOD 300"), // Level of Development per USIBD
  targetLoaMeasured: text("target_loa_measured").default("LoA 40"), // ≤ 1/4" measured tolerance (S2P standard)
  targetLoaModeled: text("target_loa_modeled").default("LoA 30"), // ≤ 1/2" modeled tolerance (S2P standard)
  // Square Foot Audit Fields (10% Variance Hard Gate)
  estimatedSqft: integer("estimated_sqft"), // Client-provided estimate
  actualSqft: integer("actual_sqft"), // Scanned/measured actual
  sqftVariance: decimal("sqft_variance", { precision: 5, scale: 2 }), // Percentage variance
  sqftAuditComplete: boolean("sqft_audit_complete").default(false), // Auto-set: true if ≤10% variance, false if >10%
  billingAdjustmentApproved: boolean("billing_adjustment_approved").default(false), // Hard Gate: Must be approved if variance >10% to proceed to Modeling/Delivered
  // QC 3-Stage Validation Gates (Scanning → Registration → Modeling)
  bValidationStatus: text("b_validation_status").default("pending"), // Cross-scan alignment validation
  cValidationStatus: text("c_validation_status").default("pending"), // Control point alignment (optional)
  registrationRms: decimal("registration_rms", { precision: 6, scale: 3 }), // RMS value in inches (LoA compliance)
  registrationPassedAt: timestamp("registration_passed_at"), // When B/C validation passed
  registrationNotes: text("registration_notes"), // Technician notes on registration
  // LEED v5 Embodied Carbon Tracking (A1-A3 Cradle-to-Gate GWP)
  leedCarbonEnabled: boolean("leed_carbon_enabled").default(false), // Track embodied carbon for this project
  gwpBaseline: decimal("gwp_baseline", { precision: 12, scale: 2 }), // Baseline kgCO2e for reference building
  gwpActual: decimal("gwp_actual", { precision: 12, scale: 2 }), // Actual kgCO2e from BoM analysis
  gwpReductionTarget: integer("gwp_reduction_target").default(10), // % reduction target (LEED v5 = 5-20%)
  bomMaterials: jsonb("bom_materials"), // Bill of Materials [{material, quantity, unit, gwpFactor, gwpTotal}]
  bomNotes: text("bom_notes"), // Notes on material choices and carbon reduction strategies
  // Google Drive Integration
  driveFolderId: text("drive_folder_id"), // Google Drive folder ID for project files
  driveFolderUrl: text("drive_folder_url"), // Direct URL to the Google Drive folder
  driveFolderStatus: text("drive_folder_status").default("pending"), // pending, success, failed
  driveSubfolders: jsonb("drive_subfolders"), // {fieldCapture, bimProduction, accountingFinancials, clientDeliverables, additionalDocuments}
  // Travel-Aware Scheduling
  scanDate: timestamp("scan_date"), // Scheduled scan date
  calendarEventId: text("calendar_event_id"), // Google Calendar event ID
  travelDistanceMiles: decimal("travel_distance_miles", { precision: 8, scale: 2 }), // Distance from office to site
  travelDurationMinutes: integer("travel_duration_minutes"), // Travel time in minutes
  travelScenario: text("travel_scenario"), // local, regional, flyout
  // Project Concierge (Google Chat Integration)
  chatSpaceId: text("chat_space_id"), // Google Chat space ID (e.g., spaces/XXXXXXX)
  chatSpaceUrl: text("chat_space_url"), // URL to the Chat space
  // Hybrid Storage Strategy (Legacy Drive + GCS)
  storageMode: text("storage_mode").default("legacy_drive"), // legacy_drive | hybrid_gcs | gcs_native
  gcsBucket: text("gcs_bucket"), // GCS bucket name (e.g., "s2p-active")
  gcsPath: text("gcs_path"), // GCS path for scan data (e.g., "AYON-ACME-HQ-20260108/")
  // Real-Time Margin Tracking
  vendorCostActual: decimal("vendor_cost_actual", { precision: 12, scale: 2 }), // Calculated vendor cost based on rates
  marginActual: decimal("margin_actual", { precision: 12, scale: 2 }), // Revenue - Vendor Cost
  marginPercent: decimal("margin_percent", { precision: 5, scale: 2 }), // Margin as percentage
  // Point Cloud Delivery (Heavy Artillery - Potree Integration)
  potreePath: text("potree_path"), // Internal GCS path to converted point cloud
  viewerUrl: text("viewer_url"), // Public/Signed URL for Potree viewer
  deliveryStatus: text("delivery_status").default("pending"), // pending | processing | ready | failed
  createdAt: timestamp("created_at").defaultNow(),
});

// === VENDOR RATES (Margin Tracking) ===
export const vendorRates = pgTable("vendor_rates", {
  id: serial("id").primaryKey(),
  discipline: text("discipline"), // "arch", "mep", "structure"
  lod: text("lod"), // "200", "300", "350"
  tier: text("tier").default("standard"), // "standard", "premium"
  ratePerSqft: decimal("rate_per_sqft", { precision: 10, scale: 4 }), // 0.0450
});

export const insertVendorRateSchema = createInsertSchema(vendorRates).omit({
  id: true,
});
export type VendorRate = typeof vendorRates.$inferSelect;
export type InsertVendorRate = z.infer<typeof insertVendorRateSchema>;

// LEED v5 Bill of Materials item schema
export const bomItemSchema = z.object({
  material: z.string(),
  category: z.enum(["Concrete", "Steel", "Aluminum", "Glass", "Insulation", "Other"]).optional(),
  quantity: z.number().min(0),
  unit: z.enum(["kg", "m3", "m2", "ea", "lf"]),
  gwpFactor: z.number().min(0), // kgCO2e per unit (A1-A3 stages)
  gwpTotal: z.number().min(0), // quantity × gwpFactor
});

export type BomItem = z.infer<typeof bomItemSchema>;

export const insertProjectSchema = createInsertSchema(projects).omit({ 
  id: true, 
  createdAt: true,
  universalProjectId: true, // Auto-generated on backend
}).partial().extend({
  name: z.string(),
  progress: z.coerce.number().min(0).max(100).optional().default(0),
  dueDate: z.coerce.date().optional(),
  targetLoD: z.enum(LOD_LEVELS).optional(),
  targetLoaMeasured: z.enum(LOA_LEVELS).optional(),
  targetLoaModeled: z.enum(LOA_LEVELS).optional(),
  estimatedSqft: z.coerce.number().min(0).optional(),
  actualSqft: z.coerce.number().min(0).optional(),
  sqftVariance: z.coerce.number().optional(),
  sqftAuditComplete: z.boolean().optional(),
  billingAdjustmentApproved: z.boolean().optional(),
  bValidationStatus: z.enum(QC_VALIDATION_STATUS).optional(),
  cValidationStatus: z.enum(QC_VALIDATION_STATUS).optional(),
  registrationRms: z.coerce.number().min(0).optional(),
  registrationPassedAt: z.coerce.date().optional(),
  registrationNotes: z.string().optional(),
  // LEED v5 Embodied Carbon fields
  leedCarbonEnabled: z.boolean().optional(),
  gwpBaseline: z.coerce.number().min(0).optional(),
  gwpActual: z.coerce.number().min(0).optional(),
  gwpReductionTarget: z.coerce.number().min(0).max(100).optional(),
  bomMaterials: z.array(bomItemSchema).optional(),
  bomNotes: z.string().optional(),
  driveFolderId: z.string().optional(),
  driveFolderUrl: z.string().optional(),
  driveFolderStatus: z.enum(["pending", "success", "failed"]).optional(),
  driveSubfolders: z.object({
    fieldCapture: z.string(),
    bimProduction: z.string(),
    accountingFinancials: z.string(),
    clientDeliverables: z.string(),
    additionalDocuments: z.string().optional(),
  }).optional(),
  chatSpaceId: z.string().optional(),
  chatSpaceUrl: z.string().optional(),
  // Hybrid Storage fields
  storageMode: z.enum(STORAGE_MODES).optional(),
  gcsBucket: z.string().optional(),
  gcsPath: z.string().optional(),
  // Point Cloud Delivery (Potree Integration)
  potreePath: z.string().optional(),
  viewerUrl: z.string().optional(),
  deliveryStatus: z.enum(["pending", "processing", "ready", "failed"]).optional(),
});

// === FIELD NOTES (AI Technical Translation) ===
export const fieldNotes = pgTable("field_notes", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").references(() => projects.id),
  leadId: integer("lead_id").references(() => leads.id),
  rawContent: text("raw_content").notNull(),
  processedScope: text("processed_scope"), // The AI translation
  status: text("status").default("Pending"), // Pending, Processing, Completed, Failed
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertFieldNoteSchema = createInsertSchema(fieldNotes).omit({ 
  id: true, 
  createdAt: true,
  processedScope: true,
  status: true
});

// === SCAN TECH TIME LOGS (Automated Clock In/Out) ===
export const WORK_TYPES = ["Scanning", "Travel", "Modeling", "Site Prep", "Other"] as const;
export type WorkType = typeof WORK_TYPES[number];

// === ROLE TYPES FOR DUAL HAT LABOR TRACKING ===
export const ROLE_TYPES = ["tech", "admin", "sales"] as const;
export type RoleType = typeof ROLE_TYPES[number];

export const timeLogs = pgTable("time_logs", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").references(() => projects.id).notNull(),
  techId: text("tech_id").notNull(), // User ID of the technician
  arrivalTime: timestamp("arrival_time"),
  departureTime: timestamp("departure_time"),
  totalSiteMinutes: integer("total_site_minutes"),
  type: text("type").default("Automatic"), // Automatic (GPS) or Manual
  workType: text("work_type").default("Scanning"), // Scanning, Travel, Modeling, Site Prep, Other (different pay rates)
  roleType: text("role_type").default("tech"), // "tech" | "admin" | "sales" - Dual Hat tracking
  hourlyCost: decimal("hourly_cost", { precision: 10, scale: 2 }), // Snapshot of cost at time of work
  latitude: decimal("latitude", { precision: 10, scale: 7 }), // GPS coords at clock-in
  longitude: decimal("longitude", { precision: 10, scale: 7 }),
  notes: text("notes"), // Optional technician notes
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertTimeLogSchema = createInsertSchema(timeLogs).omit({
  id: true,
  createdAt: true,
  totalSiteMinutes: true,
});

// === MISSION LOGS (Four-Point Logistics Tracker for Invoicing) ===
export const missionLogs = pgTable("mission_logs", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").references(() => projects.id).notNull(),
  techId: text("tech_id").notNull(),
  missionDate: timestamp("mission_date").defaultNow(),
  
  // Four-point timestamps
  startTravelTime: timestamp("start_travel_time"), // Departure from home/office
  arriveSiteTime: timestamp("arrive_site_time"),   // Arrival at project location
  leaveSiteTime: timestamp("leave_site_time"),     // Completion of scan/walkthrough
  arriveHomeTime: timestamp("arrive_home_time"),   // Arrival back at home/office
  
  // Manual override flags (true if manually entered vs auto-tapped)
  startTravelManual: boolean("start_travel_manual").default(false),
  arriveSiteManual: boolean("arrive_site_manual").default(false),
  leaveSiteManual: boolean("leave_site_manual").default(false),
  arriveHomeManual: boolean("arrive_home_manual").default(false),
  
  // Calculated durations (in minutes)
  travelDurationMinutes: integer("travel_duration_minutes"),
  scanningDurationMinutes: integer("scanning_duration_minutes"),
  
  // Status
  status: text("status").default("in_progress"), // in_progress, completed, invoiced
  notes: text("notes"),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertMissionLogSchema = createInsertSchema(missionLogs).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  travelDurationMinutes: true,
  scanningDurationMinutes: true,
});

export type MissionLog = typeof missionLogs.$inferSelect;
export type InsertMissionLog = z.infer<typeof insertMissionLogSchema>;

// === SITE INTELLIGENCE (Video Walkthrough + AI Summary) ===
export const siteIntelligence = pgTable("site_intelligence", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").references(() => projects.id).notNull(),
  techId: text("tech_id").notNull(),
  videoUrl: text("video_url"), // URL to stored video file
  audioUrl: text("audio_url"), // URL to stored audio file
  transcript: text("transcript"), // Whisper transcription
  aiSummary: text("ai_summary"), // GPT analysis of the walkthrough
  obstructions: text("obstructions"), // Extracted: Physical site obstructions
  lightingConditions: text("lighting_conditions"), // Extracted: Lighting conditions
  confirmedAreas: text("confirmed_areas"), // Extracted: Rooms/areas confirmed for scanning
  scopeChanges: text("scope_changes"), // Extracted: Any requested changes to original scope
  status: text("status").default("recording"), // recording, transcribing, analyzing, complete
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertSiteIntelligenceSchema = createInsertSchema(siteIntelligence).omit({
  id: true,
  createdAt: true,
  transcript: true,
  aiSummary: true,
  obstructions: true,
  lightingConditions: true,
  confirmedAreas: true,
  scopeChanges: true,
  status: true,
});

// === PROJECT ATTACHMENTS (Visual Scoping - Drive Sync) ===
export const ATTACHMENT_SOURCE = ["manual", "visual_scope", "document_ai", "client_upload"] as const;
export const ATTACHMENT_STATUS = ["processing", "ready", "failed"] as const;

export const projectAttachments = pgTable("project_attachments", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").references(() => projects.id),
  leadId: integer("lead_id").references(() => leads.id), // Optional: attach to lead before project exists
  fileName: text("file_name").notNull(),
  originalName: text("original_name").notNull(), // Original filename before renaming
  mimeType: text("mime_type").notNull(),
  fileSize: integer("file_size"), // Size in bytes
  driveFileId: text("drive_file_id").notNull(), // Google Drive file ID
  driveFileUrl: text("drive_file_url").notNull(), // webViewLink for browser viewing
  driveDownloadUrl: text("drive_download_url"), // webContentLink for direct download
  thumbnailUrl: text("thumbnail_url"), // For image preview
  subfolder: text("subfolder").default("01_Field_Capture"), // Which Drive subfolder
  source: text("source").default("manual"), // manual, visual_scope, document_ai, client_upload
  uploadedBy: text("uploaded_by"), // User ID who uploaded
  status: text("status").default("ready"), // processing, ready, failed
  aiTags: jsonb("ai_tags"), // AI-extracted tags/metadata
  version: integer("version").default(1), // File version tracking
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertProjectAttachmentSchema = createInsertSchema(projectAttachments).omit({
  id: true,
  createdAt: true,
}).extend({
  source: z.enum(ATTACHMENT_SOURCE).optional(),
  status: z.enum(ATTACHMENT_STATUS).optional(),
});

export type ProjectAttachment = typeof projectAttachments.$inferSelect;
export type InsertProjectAttachment = z.infer<typeof insertProjectAttachmentSchema>;

// === SETTINGS (Business Configuration) ===
export const settings = pgTable("settings", {
  id: serial("id").primaryKey(),
  key: text("key").notNull().unique(),
  value: jsonb("value").notNull(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertSettingsSchema = createInsertSchema(settings).omit({
  id: true,
  updatedAt: true,
});

// === QUICKBOOKS INTEGRATION ===
export const quickbooksTokens = pgTable("quickbooks_tokens", {
  id: serial("id").primaryKey(),
  accessToken: text("access_token").notNull(),
  refreshToken: text("refresh_token").notNull(),
  realmId: text("realm_id").notNull(), // QuickBooks company ID
  expiresAt: timestamp("expires_at").notNull(),
  refreshExpiresAt: timestamp("refresh_expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type QuickBooksToken = typeof quickbooksTokens.$inferSelect;

// === QUICKBOOKS CUSTOMERS (Synced from QuickBooks) ===
export const qbCustomers = pgTable("qb_customers", {
  id: serial("id").primaryKey(),
  qbId: text("qb_id").notNull().unique(),
  displayName: text("display_name").notNull(),
  companyName: text("company_name"),
  email: text("email"),
  phone: text("phone"),
  mobile: text("mobile"),
  fax: text("fax"),
  billingLine1: text("billing_line1"),
  billingLine2: text("billing_line2"),
  billingCity: text("billing_city"),
  billingState: text("billing_state"),
  billingPostalCode: text("billing_postal_code"),
  billingCountry: text("billing_country"),
  shippingLine1: text("shipping_line1"),
  shippingLine2: text("shipping_line2"),
  shippingCity: text("shipping_city"),
  shippingState: text("shipping_state"),
  shippingPostalCode: text("shipping_postal_code"),
  shippingCountry: text("shipping_country"),
  balance: decimal("balance", { precision: 12, scale: 2 }),
  active: boolean("active").default(true),
  syncedAt: timestamp("synced_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertQbCustomerSchema = createInsertSchema(qbCustomers).omit({
  id: true,
  createdAt: true,
  syncedAt: true,
});
export type InsertQbCustomer = z.infer<typeof insertQbCustomerSchema>;
export type QbCustomer = typeof qbCustomers.$inferSelect;

// === EXPENSES (From QuickBooks or Field Entry) ===
export const FIELD_EXPENSE_CATEGORIES = [
  "Parking",
  "Tolls", 
  "Fuel",
  "Meals",
  "Hotel",
  "Equipment Rental",
  "Supplies",
  "Other"
] as const;
export type FieldExpenseCategory = typeof FIELD_EXPENSE_CATEGORIES[number];

export const expenses = pgTable("expenses", {
  id: serial("id").primaryKey(),
  qbExpenseId: text("qb_expense_id").unique(), // QuickBooks expense ID (null for field entries)
  leadId: integer("lead_id").references(() => leads.id), // Optional link to deal
  projectId: integer("project_id").references(() => projects.id), // Optional link to project
  techId: text("tech_id"), // User ID of technician who entered (for field expenses)
  vendorName: text("vendor_name"),
  description: text("description"),
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
  expenseDate: timestamp("expense_date"),
  category: text("category"), // e.g., "Parking", "Tolls", "Fuel", "Meals", "Hotel", etc.
  accountName: text("account_name"), // QuickBooks account name
  source: text("source").default("field"), // "field" for manual entry, "quickbooks" for QB sync
  isBillable: boolean("is_billable").default(true), // Field expenses are billable by default
  receiptUrl: text("receipt_url"), // Optional photo of receipt
  syncedAt: timestamp("synced_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertExpenseSchema = createInsertSchema(expenses).omit({
  id: true,
  syncedAt: true,
  createdAt: true,
});
export type Expense = typeof expenses.$inferSelect;
export type InsertExpense = z.infer<typeof insertExpenseSchema>;

// === PROFIT FIRST ACCOUNTS (Virtual/Real Bank Balances) ===
export const ACCOUNT_TYPES = [
  "Operating",
  "Taxes", 
  "Debt",
  "Marketing",
] as const;

export type AccountType = typeof ACCOUNT_TYPES[number];

export const accounts = pgTable("accounts", {
  id: serial("id").primaryKey(),
  accountType: text("account_type").notNull(), // Operating, Taxes, Debt, Marketing
  actualBalance: decimal("actual_balance", { precision: 14, scale: 2 }).default("0"), // Real M&T balance
  virtualBalance: decimal("virtual_balance", { precision: 14, scale: 2 }).default("0"), // Should-be balance from allocations
  allocationPercent: decimal("allocation_percent", { precision: 5, scale: 2 }).notNull(), // e.g., 10.00 for 10%
  notes: text("notes"),
  updatedAt: timestamp("updated_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertAccountSchema = createInsertSchema(accounts).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  actualBalance: z.coerce.number().default(0),
  virtualBalance: z.coerce.number().default(0),
  allocationPercent: z.coerce.number().min(0).max(100),
});
export type Account = typeof accounts.$inferSelect;
export type InsertAccount = z.infer<typeof insertAccountSchema>;

// === INVOICES (Accounts Receivable with Interest Tracking) ===
export const INVOICE_STATUSES = [
  "Draft",
  "Sent",
  "Paid",
  "Partial",
  "Overdue",
  "Collections",
  "Written Off",
] as const;

export type InvoiceStatus = typeof INVOICE_STATUSES[number];

export const invoices = pgTable("invoices", {
  id: serial("id").primaryKey(),
  leadId: integer("lead_id").references(() => leads.id),
  projectId: integer("project_id").references(() => projects.id),
  invoiceNumber: text("invoice_number").notNull(),
  clientName: text("client_name").notNull(),
  description: text("description"),
  totalAmount: decimal("total_amount", { precision: 14, scale: 2 }).notNull(),
  amountPaid: decimal("amount_paid", { precision: 14, scale: 2 }).default("0"),
  interestAccrued: decimal("interest_accrued", { precision: 14, scale: 2 }).default("0"), // 8% monthly penalty
  issueDate: timestamp("issue_date").notNull(),
  dueDate: timestamp("due_date").notNull(),
  paidDate: timestamp("paid_date"),
  status: text("status").notNull().default("Sent"), // Draft, Sent, Paid, Partial, Overdue, Collections, Written Off
  daysOverdue: integer("days_overdue").default(0),
  isHighRisk: boolean("is_high_risk").default(false), // Flag for >$50k or >60 days overdue
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertInvoiceSchema = createInsertSchema(invoices).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  daysOverdue: true,
  isHighRisk: true,
  interestAccrued: true,
}).extend({
  totalAmount: z.coerce.number().min(0),
  amountPaid: z.coerce.number().min(0).default(0),
  issueDate: z.coerce.date(),
  dueDate: z.coerce.date(),
  paidDate: z.coerce.date().optional().nullable(),
});
export type Invoice = typeof invoices.$inferSelect;
export type InsertInvoice = z.infer<typeof insertInvoiceSchema>;

// === INTERNAL LOANS (Inter-Account Borrowing - e.g., from Taxes account) ===
export const internalLoans = pgTable("internal_loans", {
  id: serial("id").primaryKey(),
  fromAccountType: text("from_account_type").notNull(), // e.g., "Taxes"
  toAccountType: text("to_account_type").notNull(), // e.g., "Operating"
  originalAmount: decimal("original_amount", { precision: 14, scale: 2 }).notNull(),
  amountRepaid: decimal("amount_repaid", { precision: 14, scale: 2 }).default("0"),
  remainingBalance: decimal("remaining_balance", { precision: 14, scale: 2 }).notNull(),
  reason: text("reason"),
  loanDate: timestamp("loan_date").notNull(),
  targetRepayDate: timestamp("target_repay_date"),
  isFullyRepaid: boolean("is_fully_repaid").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertInternalLoanSchema = createInsertSchema(internalLoans).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  remainingBalance: true,
  isFullyRepaid: true,
}).extend({
  originalAmount: z.coerce.number().min(0),
  amountRepaid: z.coerce.number().min(0).default(0),
  loanDate: z.coerce.date(),
  targetRepayDate: z.coerce.date().optional().nullable(),
});
export type InternalLoan = typeof internalLoans.$inferSelect;
export type InsertInternalLoan = z.infer<typeof insertInternalLoanSchema>;

// === VENDOR PAYABLES (AP Management) ===
export const vendorPayables = pgTable("vendor_payables", {
  id: serial("id").primaryKey(),
  vendorName: text("vendor_name").notNull(),
  description: text("description"),
  amount: decimal("amount", { precision: 14, scale: 2 }).notNull(),
  dueDate: timestamp("due_date"),
  isRecurring: boolean("is_recurring").default(false),
  recurringFrequency: text("recurring_frequency"), // Monthly, Weekly, Quarterly
  priority: integer("priority").default(3), // 1-5, 5 = highest priority
  isPaid: boolean("is_paid").default(false),
  paidDate: timestamp("paid_date"),
  category: text("category"), // Loan, Insurance, Software, Contractor, etc.
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertVendorPayableSchema = createInsertSchema(vendorPayables).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  amount: z.coerce.number().min(0),
  dueDate: z.coerce.date().optional().nullable(),
  paidDate: z.coerce.date().optional().nullable(),
  priority: z.coerce.number().min(1).max(5).default(3),
});
export type VendorPayable = typeof vendorPayables.$inferSelect;
export type InsertVendorPayable = z.infer<typeof insertVendorPayableSchema>;

// === CPQ QUOTE VERSIONS (Version History for Quotes) ===
export const quoteVersions = pgTable("quote_versions", {
  id: serial("id").primaryKey(),
  leadId: integer("lead_id").notNull().references(() => leads.id),
  versionNumber: integer("version_number").notNull(),
  cpqQuoteId: text("cpq_quote_id"), // ID/slug from CPQ system
  quoteUrl: text("quote_url"), // Direct link to this version
  priceSnapshot: jsonb("price_snapshot"), // { total, lineItems, labor, travel, etc. }
  summary: text("summary"), // Brief description of changes
  createdBy: text("created_by"), // User who created this version
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertQuoteVersionSchema = createInsertSchema(quoteVersions).omit({
  id: true,
  createdAt: true,
});
export type QuoteVersion = typeof quoteVersions.$inferSelect;
export type InsertQuoteVersion = z.infer<typeof insertQuoteVersionSchema>;

// === CPQ PRICING REFERENCE TABLES ===
export const cpqPricingMatrix = pgTable("cpq_pricing_matrix", {
  id: serial("id").primaryKey(),
  buildingTypeId: integer("building_type_id").notNull(),
  areaTier: text("area_tier").notNull(),
  discipline: text("discipline").notNull(),
  lod: text("lod").notNull(),
  ratePerSqFt: decimal("rate_per_sq_ft", { precision: 10, scale: 4 }).notNull(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const cpqUpteamPricingMatrix = pgTable("cpq_upteam_pricing_matrix", {
  id: serial("id").primaryKey(),
  buildingTypeId: integer("building_type_id").notNull(),
  areaTier: text("area_tier").notNull(),
  discipline: text("discipline").notNull(),
  lod: text("lod").notNull(),
  ratePerSqFt: decimal("rate_per_sq_ft", { precision: 10, scale: 4 }).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const cpqCadPricingMatrix = pgTable("cpq_cad_pricing_matrix", {
  id: serial("id").primaryKey(),
  buildingTypeId: integer("building_type_id").notNull(),
  areaTier: text("area_tier").notNull(),
  packageType: text("package_type").notNull(),
  ratePerSqFt: decimal("rate_per_sq_ft", { precision: 10, scale: 4 }).notNull(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const cpqPricingParameters = pgTable("cpq_pricing_parameters", {
  id: serial("id").primaryKey(),
  parameterKey: text("parameter_key").notNull().unique(),
  parameterValue: text("parameter_value").notNull(),
  parameterType: text("parameter_type").notNull(),
  description: text("description"),
  category: text("category"),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// === CPQ QUOTES (Full Quote Data) ===
export const cpqQuotes = pgTable("cpq_quotes", {
  id: serial("id").primaryKey(),
  leadId: integer("lead_id").references(() => leads.id),
  quoteNumber: text("quote_number").notNull(),
  
  clientName: text("client_name"),
  projectName: text("project_name").notNull(),
  projectAddress: text("project_address").notNull(),
  specificBuilding: text("specific_building"),
  typeOfBuilding: text("type_of_building").notNull(),
  hasBasement: boolean("has_basement").default(false),
  hasAttic: boolean("has_attic").default(false),
  notes: text("notes"),
  
  scopingMode: boolean("scoping_mode").default(false).notNull(),
  areas: jsonb("areas").notNull(),
  risks: jsonb("risks").default('[]').notNull(),
  
  dispatchLocation: text("dispatch_location").notNull(),
  distance: integer("distance"),
  customTravelCost: decimal("custom_travel_cost", { precision: 12, scale: 2 }),
  
  services: jsonb("services").default('{}').notNull(),
  scopingData: jsonb("scoping_data"),
  
  totalPrice: decimal("total_price", { precision: 12, scale: 2 }),
  pricingBreakdown: jsonb("pricing_breakdown"),
  
  parentQuoteId: integer("parent_quote_id"),
  versionNumber: integer("version_number").default(1).notNull(),
  versionName: text("version_name"),
  isLatest: boolean("is_latest").default(true).notNull(),
  
  // Additional fields for unified deal workspace
  travel: jsonb("travel"),
  paymentTerms: text("payment_terms").default("standard"),
  
  // RFI fields that can be marked as "ask_client"
  siteStatus: text("site_status"),
  mepScope: text("mep_scope"),
  actScanning: text("act_scanning"),
  scanningOnly: text("scanning_only"),
  actScanningNotes: text("act_scanning_notes"),
  
  // Client Input Portal (Magic Link)
  clientToken: text("client_token"),
  clientTokenExpiresAt: timestamp("client_token_expires_at"),
  clientStatus: text("client_status").default("pending"),
  
  // External CPQ Integration
  externalCpqId: text("external_cpq_id"),
  externalCpqUrl: text("external_cpq_url"),
  
  createdBy: text("created_by"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertCpqQuoteSchema = createInsertSchema(cpqQuotes).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export const updateCpqQuoteSchema = insertCpqQuoteSchema.partial();
export type CpqQuote = typeof cpqQuotes.$inferSelect;
export type InsertCpqQuote = z.infer<typeof insertCpqQuoteSchema>;

export type CpqPricingMatrix = typeof cpqPricingMatrix.$inferSelect;
export type CpqUpteamPricingMatrix = typeof cpqUpteamPricingMatrix.$inferSelect;
export type CpqCadPricingMatrix = typeof cpqCadPricingMatrix.$inferSelect;
export type CpqPricingParameter = typeof cpqPricingParameters.$inferSelect;

// === CASE STUDIES (Proof Vault) ===
export const caseStudies = pgTable("case_studies", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  blurb: text("blurb").notNull(),
  tags: text("tags").array().notNull(),
  imageUrl: text("image_url"),
  stats: jsonb("stats"),
  clientName: text("client_name"),
  heroStat: text("hero_stat"),
  pdfUrl: text("pdf_url"),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertCaseStudySchema = createInsertSchema(caseStudies).omit({
  id: true,
  createdAt: true,
});
export type CaseStudy = typeof caseStudies.$inferSelect;
export type InsertCaseStudy = z.infer<typeof insertCaseStudySchema>;

// === GROWTH ENGINE: PERSONAS ===
export const personas = pgTable("personas", {
  id: serial("id").primaryKey(),
  code: text("code").notNull().unique(), // "BP1", "BP5"
  name: text("name").notNull(),
  painPoints: text("pain_points").array(),
  preferredTags: text("preferred_tags").array(),
  scriptTemplate: text("script_template"), // Template with {{variables}}
});

export const insertPersonaSchema = createInsertSchema(personas).omit({
  id: true,
});
export type Persona = typeof personas.$inferSelect;
export type InsertPersona = z.infer<typeof insertPersonaSchema>;

// === GROWTH ENGINE: HUBSPOT SYNC LOGS ===
export const hubspotSyncLogs = pgTable("hubspot_sync_logs", {
  id: serial("id").primaryKey(),
  leadId: integer("lead_id").references(() => leads.id),
  hubspotContactId: text("hubspot_contact_id"),
  syncStatus: text("sync_status"), // "pending", "synced", "failed"
  errorMessage: text("error_message"),
  lastSyncAt: timestamp("last_sync_at").defaultNow(),
});

export const insertHubspotSyncLogSchema = createInsertSchema(hubspotSyncLogs).omit({
  id: true,
  lastSyncAt: true,
});
export type HubspotSyncLog = typeof hubspotSyncLogs.$inferSelect;
export type InsertHubspotSyncLog = z.infer<typeof insertHubspotSyncLogSchema>;

// === GROWTH ENGINE: GOHIGHLEVEL SYNC LOGS ===
export const ghlSyncLogs = pgTable("ghl_sync_logs", {
  id: serial("id").primaryKey(),
  leadId: integer("lead_id").references(() => leads.id),
  ghlContactId: text("ghl_contact_id"),
  ghlOpportunityId: text("ghl_opportunity_id"),
  syncStatus: text("sync_status"), // "pending", "synced", "failed"
  errorMessage: text("error_message"),
  lastSyncAt: timestamp("last_sync_at").defaultNow(),
});

export const insertGhlSyncLogSchema = createInsertSchema(ghlSyncLogs).omit({
  id: true,
  lastSyncAt: true,
});
export type GhlSyncLog = typeof ghlSyncLogs.$inferSelect;
export type InsertGhlSyncLog = z.infer<typeof insertGhlSyncLogSchema>;

// === GROWTH ENGINE: TRACKING EVENTS ===
export const trackingEvents = pgTable("tracking_events", {
  id: serial("id").primaryKey(),
  leadId: integer("lead_id").references(() => leads.id),
  eventType: text("event_type"), // "case_study_click"
  assetUrl: text("asset_url"),
  clickedAt: timestamp("clicked_at").defaultNow(),
  referrer: text("referrer"),
});

export const insertTrackingEventSchema = createInsertSchema(trackingEvents).omit({
  id: true,
  clickedAt: true,
});
export type TrackingEvent = typeof trackingEvents.$inferSelect;
export type InsertTrackingEvent = z.infer<typeof insertTrackingEventSchema>;

// === GROWTH ENGINE: NOTIFICATIONS ===
export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  userId: text("user_id"), // References users.id (varchar)
  type: text("type"), // "lead_click", "sync_failure", "client_input", "variance_alert"
  title: text("title"),
  leadId: integer("lead_id").references(() => leads.id),
  quoteId: integer("quote_id"),
  message: text("message"),
  read: boolean("read").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertNotificationSchema = createInsertSchema(notifications).omit({
  id: true,
  createdAt: true,
});
export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = z.infer<typeof insertNotificationSchema>;

// === EVIDENCE VAULT (High-EWS Marketing Hooks by Persona) ===
export const EWS_SCORES = [1, 2, 3, 4, 5] as const;
export type EwsScore = typeof EWS_SCORES[number];

export const evidenceVault = pgTable("evidence_vault", {
  id: serial("id").primaryKey(),
  personaCode: text("persona_code"), // "BP1", "BP2", etc.
  hookContent: text("hook_content"), // "RFIs killing your schedule?"
  ewsScore: integer("ews_score"), // 1-5 (Emotional Weight Score)
  sourceUrl: text("source_url"), // LinkedIn post URL, research source
  usageCount: integer("usage_count").default(0), // How many times used in scripts
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertEvidenceVaultSchema = createInsertSchema(evidenceVault).omit({
  id: true,
  createdAt: true,
  usageCount: true,
});
export type EvidenceVaultEntry = typeof evidenceVault.$inferSelect;
export type InsertEvidenceVaultEntry = z.infer<typeof insertEvidenceVaultSchema>;

// === MARKETING POSTS (Truth Loop Content Queue) ===
export const MARKETING_POST_STATUSES = ["draft", "approved", "posted"] as const;
export const MARKETING_POST_CATEGORIES = ["stat_bomb", "process_tease", "case_highlight", "thought_leadership"] as const;
export const MARKETING_PLATFORMS = ["linkedin", "twitter", "instagram", "email"] as const;

export type MarketingPostStatus = typeof MARKETING_POST_STATUSES[number];
export type MarketingPostCategory = typeof MARKETING_POST_CATEGORIES[number];
export type MarketingPlatform = typeof MARKETING_PLATFORMS[number];

export const marketingPosts = pgTable("marketing_posts", {
  id: serial("id").primaryKey(),
  caseStudyId: integer("case_study_id").references(() => caseStudies.id),
  projectId: integer("project_id").references(() => projects.id),
  platform: text("platform").default("linkedin"),
  category: text("category"), // "stat_bomb", "process_tease"
  content: text("content"), // The formatted text body
  suggestedVisual: text("suggested_visual"), // "Bar Chart"
  status: text("status").default("draft"), // "draft", "approved", "posted"
  variancePercent: decimal("variance_percent", { precision: 10, scale: 2 }),
  savingsAmount: decimal("savings_amount", { precision: 12, scale: 2 }),
  postedAt: timestamp("posted_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertMarketingPostSchema = createInsertSchema(marketingPosts).omit({
  id: true,
  createdAt: true,
});
export type MarketingPost = typeof marketingPosts.$inferSelect;
export type InsertMarketingPost = z.infer<typeof insertMarketingPostSchema>;

// === TYPES ===
export type Lead = typeof leads.$inferSelect;
export type InsertLead = z.infer<typeof insertLeadSchema>;

// Project Status Type (for checkboxes)
export interface ProjectStatus {
  proposalPhase?: boolean;
  inHand?: boolean;
  urgent?: boolean;
  other?: boolean;
  otherText?: string;
}

export type Project = typeof projects.$inferSelect;
export type InsertProject = z.infer<typeof insertProjectSchema>;

export type FieldNote = typeof fieldNotes.$inferSelect;
export type InsertFieldNote = z.infer<typeof insertFieldNoteSchema>;

export type TimeLog = typeof timeLogs.$inferSelect;
export type InsertTimeLog = z.infer<typeof insertTimeLogSchema>;

export type SiteIntelligence = typeof siteIntelligence.$inferSelect;
export type InsertSiteIntelligence = z.infer<typeof insertSiteIntelligenceSchema>;

export type Setting = typeof settings.$inferSelect;
export type InsertSetting = z.infer<typeof insertSettingsSchema>;

// Settings value types
export interface LeadSourcesConfig {
  sources: string[];
}

export interface StalenessConfig {
  warningDays: number;    // Days before showing "stale" warning
  criticalDays: number;   // Days before showing "critical" status
  penaltyPercent: number; // Probability reduction per day after warning
}

export interface BusinessDefaultsConfig {
  defaultTravelRate: number;
  dispatchLocations: string[];
  defaultBimDeliverable: string;
  defaultBimVersion: string;
}

// === SALES REPS (Commission Tracking) ===
export const salesReps = pgTable("sales_reps", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull().unique(), // Links to Replit Auth user ID (ownerId in leads)
  name: text("name").notNull(),
  email: text("email"),
  commissionRate: decimal("commission_rate", { precision: 5, scale: 2 }).default("5.00"), // % of Gross Revenue
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertSalesRepSchema = createInsertSchema(salesReps).omit({
  id: true,
  createdAt: true,
});
export type SalesRep = typeof salesReps.$inferSelect;
export type InsertSalesRep = z.infer<typeof insertSalesRepSchema>;

// === SYSTEM SETTINGS (Global Business Configuration) ===
export const systemSettings = pgTable("system_settings", {
  id: serial("id").primaryKey(),
  overheadRate: decimal("overhead_rate", { precision: 5, scale: 2 }).default("15.00"), // % allocation for Ops/Rent/Software
  targetNetMargin: decimal("target_net_margin", { precision: 5, scale: 2 }).default("20.00"), // Target net margin %
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertSystemSettingsSchema = createInsertSchema(systemSettings).omit({
  id: true,
});
export type SystemSettings = typeof systemSettings.$inferSelect;
export type InsertSystemSettings = z.infer<typeof insertSystemSettingsSchema>;

// === COMPENSATION SPLITS (Variable Stakeholder Percentages) ===
export const COMPENSATION_TYPES = {
  commission: "Sales Commission",
  referral: "Referral Fee",
  partner: "Partner Share",
  bonus: "Performance Bonus",
} as const;

export const compensationSplits = pgTable("compensation_splits", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  role: text("role"),
  type: text("type").default("commission"),
  defaultRate: decimal("default_rate", { precision: 5, scale: 2 }).default("5.00"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertCompensationSplitSchema = createInsertSchema(compensationSplits).omit({
  id: true,
  createdAt: true,
});
export type CompensationSplit = typeof compensationSplits.$inferSelect;
export type InsertCompensationSplit = z.infer<typeof insertCompensationSplitSchema>;

// === AI FEATURES TABLES ===

// Deal Predictions - Track AI prediction accuracy
export const dealPredictions = pgTable("deal_predictions", {
  id: serial("id").primaryKey(),
  leadId: integer("lead_id").references(() => leads.id),
  predictedProbability: integer("predicted_probability"),
  predictedOutcome: text("predicted_outcome"), // "won" | "lost"
  actualOutcome: text("actual_outcome"),
  predictionDate: timestamp("prediction_date").defaultNow(),
  outcomeDate: timestamp("outcome_date"),
});

export const insertDealPredictionSchema = createInsertSchema(dealPredictions).omit({
  id: true,
  predictionDate: true,
});
export type DealPrediction = typeof dealPredictions.$inferSelect;
export type InsertDealPrediction = z.infer<typeof insertDealPredictionSchema>;

// CPQ Conversations - Natural language quote builder chat history
export const cpqConversations = pgTable("cpq_conversations", {
  id: serial("id").primaryKey(),
  leadId: integer("lead_id").references(() => leads.id),
  userId: text("user_id"),
  messages: jsonb("messages"), // Array of {role, content, timestamp}
  extractedData: jsonb("extracted_data"), // CPQ fields gathered so far
  quoteId: integer("quote_id"),
  status: text("status").default("active"), // "active" | "converted" | "abandoned"
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertCpqConversationSchema = createInsertSchema(cpqConversations).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type CpqConversation = typeof cpqConversations.$inferSelect;
export type InsertCpqConversation = z.infer<typeof insertCpqConversationSchema>;

// Project Embeddings - Semantic similarity matching
export const projectEmbeddings = pgTable("project_embeddings", {
  id: serial("id").primaryKey(),
  leadId: integer("lead_id").references(() => leads.id),
  embedding: text("embedding"), // JSON array of floats
  projectSummary: text("project_summary"), // Text used for embedding
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertProjectEmbeddingSchema = createInsertSchema(projectEmbeddings).omit({
  id: true,
  updatedAt: true,
});
export type ProjectEmbedding = typeof projectEmbeddings.$inferSelect;
export type InsertProjectEmbedding = z.infer<typeof insertProjectEmbeddingSchema>;

// AI Analytics - Track AI feature usage
export const aiAnalytics = pgTable("ai_analytics", {
  id: serial("id").primaryKey(),
  feature: text("feature").notNull(), // 'scoping' | 'document' | 'intelligence' | 'proposal' | 'nlp_cpq' | 'matching'
  userId: text("user_id"),
  leadId: integer("lead_id"),
  action: text("action"), // 'generated' | 'accepted' | 'rejected' | 'modified'
  timeTakenMs: integer("time_taken_ms"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertAiAnalyticsSchema = createInsertSchema(aiAnalytics).omit({
  id: true,
  createdAt: true,
});
export type AiAnalytic = typeof aiAnalytics.$inferSelect;
export type InsertAiAnalytic = z.infer<typeof insertAiAnalyticsSchema>;

// === PANDADOC IMPORT SYSTEM (Proposal Vault) ===
export const PANDADOC_IMPORT_STATUSES = [
  "pending",
  "fetching",
  "extracted",
  "needs_review",
  "approved",
  "rejected",
  "error",
] as const;
export type PandaDocImportStatus = typeof PANDADOC_IMPORT_STATUSES[number];

export const PANDADOC_BATCH_STATUSES = [
  "pending",
  "in_progress",
  "completed",
  "partial",
  "failed",
] as const;
export type PandaDocBatchStatus = typeof PANDADOC_BATCH_STATUSES[number];

export const PANDADOC_STAGES = [
  "proposal_pending",
  "awaiting_internal",
  "closed_won",
  "closed_lost",
  "unknown",
] as const;
export type PandaDocStage = typeof PANDADOC_STAGES[number];

export const PANDADOC_STATUS_MAP: Record<number, PandaDocStage> = {
  0: "proposal_pending",
  1: "proposal_pending",
  5: "proposal_pending",
  6: "awaiting_internal",
  7: "awaiting_internal",
  2: "closed_won",
  10: "closed_won",
  11: "closed_lost",
  12: "closed_lost",
};

export const pandaDocImportBatches = pgTable("pandadoc_import_batches", {
  id: serial("id").primaryKey(),
  name: text("name"),
  status: text("status").default("pending").notNull(),
  totalDocuments: integer("total_documents").default(0),
  processedDocuments: integer("processed_documents").default(0),
  successfulDocuments: integer("successful_documents").default(0),
  failedDocuments: integer("failed_documents").default(0),
  lastSyncCursor: text("last_sync_cursor"),
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  createdBy: text("created_by"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertPandaDocImportBatchSchema = createInsertSchema(pandaDocImportBatches).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type PandaDocImportBatch = typeof pandaDocImportBatches.$inferSelect;
export type InsertPandaDocImportBatch = z.infer<typeof insertPandaDocImportBatchSchema>;

export const pandaDocDocuments = pgTable("pandadoc_documents", {
  id: serial("id").primaryKey(),
  batchId: integer("batch_id").references(() => pandaDocImportBatches.id),
  pandaDocId: text("pandadoc_id").notNull().unique(),
  pandaDocName: text("pandadoc_name"),
  pandaDocStatus: text("pandadoc_status"),
  pandaDocStatusCode: integer("pandadoc_status_code"),
  pandaDocStage: text("pandadoc_stage").default("unknown"),
  pandaDocVersion: text("pandadoc_version"),
  pandaDocCreatedAt: timestamp("pandadoc_created_at"),
  pandaDocUpdatedAt: timestamp("pandadoc_updated_at"),
  pandaDocPdfUrl: text("pandadoc_pdf_url"),
  
  importStatus: text("import_status").default("pending").notNull(),
  extractedData: jsonb("extracted_data"),
  extractionConfidence: decimal("extraction_confidence", { precision: 5, scale: 2 }),
  extractionErrors: jsonb("extraction_errors"),
  
  reviewedBy: text("reviewed_by"),
  reviewedAt: timestamp("reviewed_at"),
  reviewNotes: text("review_notes"),
  
  cpqQuoteId: integer("cpq_quote_id").references(() => cpqQuotes.id),
  leadId: integer("lead_id").references(() => leads.id),
  
  rawPandaDocData: jsonb("raw_pandadoc_data"),
  pricingTableData: jsonb("pricing_table_data"),
  recipientsData: jsonb("recipients_data"),
  variablesData: jsonb("variables_data"),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertPandaDocDocumentSchema = createInsertSchema(pandaDocDocuments).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type PandaDocDocument = typeof pandaDocDocuments.$inferSelect;
export type InsertPandaDocDocument = z.infer<typeof insertPandaDocDocumentSchema>;

export const pandaDocImportBatchesRelations = relations(pandaDocImportBatches, ({ many }) => ({
  documents: many(pandaDocDocuments),
}));

export const pandaDocDocumentsRelations = relations(pandaDocDocuments, ({ one }) => ({
  batch: one(pandaDocImportBatches, {
    fields: [pandaDocDocuments.batchId],
    references: [pandaDocImportBatches.id],
  }),
  cpqQuote: one(cpqQuotes, {
    fields: [pandaDocDocuments.cpqQuoteId],
    references: [cpqQuotes.id],
  }),
  lead: one(leads, {
    fields: [pandaDocDocuments.leadId],
    references: [leads.id],
  }),
}));

// === COGNITIVE BRAND ENGINE TABLES ===

// Brand Personas - Stores the "voice modes" (Executive Signal Mapper, Master Author, etc.)
export const brandPersonas = pgTable("brand_personas", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  coreIdentity: text("core_identity").notNull(),
  voiceMode: jsonb("voice_mode"),
  mantra: text("mantra"),
  directives: text("directives"),
  active: boolean("active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertBrandPersonaSchema = createInsertSchema(brandPersonas).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type BrandPersona = typeof brandPersonas.$inferSelect;
export type InsertBrandPersona = z.infer<typeof insertBrandPersonaSchema>;

// Governance Red Lines - "Do Not Say" rules for AI content generation
export const governanceRedLines = pgTable("governance_red_lines", {
  id: serial("id").primaryKey(),
  ruleContent: text("rule_content").notNull(),
  violationCategory: text("violation_category").notNull(),
  correctionInstruction: text("correction_instruction").notNull(),
  severity: integer("severity").default(1).notNull(),
  active: boolean("active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertGovernanceRedLineSchema = createInsertSchema(governanceRedLines).omit({
  id: true,
  createdAt: true,
});
export type GovernanceRedLine = typeof governanceRedLines.$inferSelect;
export type InsertGovernanceRedLine = z.infer<typeof insertGovernanceRedLineSchema>;

// Standard Definitions - The "Hard Deck" of immutable facts (LoA/LoD, guarantees, etc.)
export const standardDefinitions = pgTable("standard_definitions", {
  id: serial("id").primaryKey(),
  term: text("term").notNull().unique(),
  definition: text("definition").notNull(),
  guaranteeText: text("guarantee_text"),
  category: text("category").default("general"),
  active: boolean("active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertStandardDefinitionSchema = createInsertSchema(standardDefinitions).omit({
  id: true,
  createdAt: true,
});
export type StandardDefinition = typeof standardDefinitions.$inferSelect;
export type InsertStandardDefinition = z.infer<typeof insertStandardDefinitionSchema>;

// Generation Audit Logs - Tracks AI self-correction during content generation
export const generationAuditLogs = pgTable("generation_audit_logs", {
  id: serial("id").primaryKey(),
  promptContext: text("prompt_context").notNull(),
  buyerType: text("buyer_type"),
  painPoint: text("pain_point"),
  situation: text("situation"),
  initialDraft: text("initial_draft").notNull(),
  violationCount: integer("violation_count").default(0).notNull(),
  violationsFound: jsonb("violations_found"),
  rewriteAttempts: integer("rewrite_attempts").default(0).notNull(),
  finalOutput: text("final_output").notNull(),
  personaUsed: text("persona_used"),
  authorMode: text("author_mode"),
  processingTimeMs: integer("processing_time_ms"),
  userId: text("user_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertGenerationAuditLogSchema = createInsertSchema(generationAuditLogs).omit({
  id: true,
  createdAt: true,
});
export type GenerationAuditLog = typeof generationAuditLogs.$inferSelect;
export type InsertGenerationAuditLog = z.infer<typeof insertGenerationAuditLogSchema>;

// === BUYER PERSONA INTELLIGENCE ENGINE ===

// Enhanced Buyer Personas - Detailed psychological profiles for targeted content
export const buyerPersonas = pgTable("buyer_personas", {
  id: serial("id").primaryKey(),
  code: text("code").notNull().unique(), // BP-A, BP-B, BP-C, BP-D
  roleTitle: text("role_title").notNull(),
  roleVariants: jsonb("role_variants").$type<string[]>(),
  organizationType: text("organization_type"),
  primaryPain: text("primary_pain").notNull(),
  secondaryPain: text("secondary_pain"),
  hiddenFear: text("hidden_fear"),
  valueDriver: text("value_driver").notNull(),
  decisionCriteria: jsonb("decision_criteria").$type<string[]>(),
  dealbreakers: jsonb("dealbreakers").$type<string[]>(),
  projectPhases: jsonb("project_phases").$type<string[]>(),
  budgetAuthority: text("budget_authority"),
  typicalBudgetRange: text("typical_budget_range"),
  influenceChain: jsonb("influence_chain").$type<{
    reportsTo: string;
    needsApprovalFrom: string[];
    influencedBy: string[];
  }>(),
  tonePreference: text("tone_preference").notNull(),
  communicationStyle: text("communication_style"),
  attentionSpan: text("attention_span"),
  technicalTriggers: jsonb("technical_triggers").$type<string[]>(),
  emotionalTriggers: jsonb("emotional_triggers").$type<string[]>(),
  avoidWords: jsonb("avoid_words").$type<string[]>(),
  disqualifiers: jsonb("disqualifiers").$type<string[]>(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertBuyerPersonaSchema = createInsertSchema(buyerPersonas).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type BuyerPersona = typeof buyerPersonas.$inferSelect;
export type InsertBuyerPersona = z.infer<typeof insertBuyerPersonaSchema>;

// Brand Voices - Communication style profiles for different content types
export const brandVoices = pgTable("brand_voices", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
  purpose: text("purpose").notNull(),
  baseInstruction: text("base_instruction").notNull(),
  toneMarkers: jsonb("tone_markers").$type<string[]>(),
  prohibitions: jsonb("prohibitions").$type<string[]>(),
  exampleOutput: text("example_output"),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertBrandVoiceSchema = createInsertSchema(brandVoices).omit({
  id: true,
  createdAt: true,
});
export type BrandVoice = typeof brandVoices.$inferSelect;
export type InsertBrandVoice = z.infer<typeof insertBrandVoiceSchema>;

// Solution Mappings - Pain → Solution translation per persona
export const solutionMappings = pgTable("solution_mappings", {
  id: serial("id").primaryKey(),
  buyerCode: text("buyer_code").notNull(),
  painPoint: text("pain_point").notNull(),
  solutionMechanism: text("solution_mechanism").notNull(),
  proofPoint: text("proof_point"),
  argumentFrame: text("argument_frame").notNull(),
  objectionPreempt: text("objection_preempt"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertSolutionMappingSchema = createInsertSchema(solutionMappings).omit({
  id: true,
  createdAt: true,
});
export type SolutionMapping = typeof solutionMappings.$inferSelect;
export type InsertSolutionMapping = z.infer<typeof insertSolutionMappingSchema>;

// Negotiation Playbook - Objection patterns and response strategies
export const negotiationPlaybook = pgTable("negotiation_playbook", {
  id: serial("id").primaryKey(),
  buyerCode: text("buyer_code").notNull(),
  objectionPattern: text("objection_pattern").notNull(),
  underlyingConcern: text("underlying_concern"),
  responseStrategy: text("response_strategy").notNull(),
  reframeLanguage: text("reframe_language"),
  walkAwaySignal: text("walk_away_signal"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertNegotiationPlaybookSchema = createInsertSchema(negotiationPlaybook).omit({
  id: true,
  createdAt: true,
});
export type NegotiationPlaybookEntry = typeof negotiationPlaybook.$inferSelect;
export type InsertNegotiationPlaybookEntry = z.infer<typeof insertNegotiationPlaybookSchema>;

// Generated Content - Tracks all AI-generated content for feedback loop
export const intelligenceGeneratedContent = pgTable("intelligence_generated_content", {
  id: serial("id").primaryKey(),
  contentType: text("content_type").notNull(), // proposal, negotiation_brief, email, ad_copy, etc.
  targetPersona: text("target_persona"),
  projectContext: jsonb("project_context").$type<{
    projectName?: string;
    projectType?: string;
    squareFootage?: string;
    timeline?: string;
    specialConditions?: string[];
  }>(),
  inputPrompt: text("input_prompt"),
  generatedOutput: text("generated_output").notNull(),
  voiceUsed: text("voice_used"),
  qualityScore: integer("quality_score"),
  wasUsed: boolean("was_used").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertIntelligenceGeneratedContentSchema = createInsertSchema(intelligenceGeneratedContent).omit({
  id: true,
  createdAt: true,
});
export type IntelligenceGeneratedContent = typeof intelligenceGeneratedContent.$inferSelect;
export type InsertIntelligenceGeneratedContent = z.infer<typeof insertIntelligenceGeneratedContentSchema>;

// === CPQ PRICING CALCULATION API SCHEMAS ===
// Uses existing constants: CPQ_BUILDING_TYPES, CPQ_DISCIPLINES, CPQ_LOD_VALUES, CPQ_SCOPE_VALUES, CPQ_RISK_FACTORS, CPQ_DISPATCH_LOCATIONS, CPQ_PAYMENT_TERMS

// API-specific discipline IDs (external CPQ uses these exact values)
export const CPQ_API_DISCIPLINES = ["arch", "mepf", "structure", "site"] as const;
export const CPQ_API_LODS = ["200", "300", "350"] as const;
export const CPQ_API_SCOPES = ["full", "interior", "exterior", "mixed"] as const;
export const CPQ_API_RISKS = ["occupied", "hazardous", "no_power"] as const;
export const CPQ_API_DISPATCH_LOCATIONS = ["troy", "woodstock", "brooklyn", "fly_out"] as const;

// API Discipline LOD configuration
export const cpqApiDisciplineLodSchema = z.object({
  discipline: z.enum(CPQ_API_DISCIPLINES),
  lod: z.enum(CPQ_API_LODS),
  scope: z.enum(CPQ_API_SCOPES).optional(),
});
export type CpqApiDisciplineLod = z.infer<typeof cpqApiDisciplineLodSchema>;

// API Area configuration (matches external CPQ API structure)
export const cpqApiAreaSchema = z.object({
  name: z.string().optional(),
  buildingType: z.string(), // Building type ID as string
  squareFeet: z.string(), // Square feet or acres for landscape types
  disciplines: z.array(z.enum(CPQ_API_DISCIPLINES)).optional(),
  disciplineLods: z.record(z.string(), cpqApiDisciplineLodSchema).optional(),
});
export type CpqApiArea = z.infer<typeof cpqApiAreaSchema>;

// Services configuration
export const cpqServicesSchema = z.object({
  matterport: z.boolean().optional(),
  actScan: z.boolean().optional(),
  additionalElevations: z.number().optional(),
});
export type CpqServices = z.infer<typeof cpqServicesSchema>;

// Full calculate request
export const cpqCalculateRequestSchema = z.object({
  clientName: z.string().optional(),
  projectName: z.string().optional(),
  projectAddress: z.string().optional(),
  areas: z.array(cpqApiAreaSchema).min(1),
  risks: z.array(z.enum(CPQ_API_RISKS)).optional(),
  dispatchLocation: z.enum(CPQ_API_DISPATCH_LOCATIONS),
  distance: z.number().optional(),
  customTravelCost: z.number().optional(),
  services: cpqServicesSchema.optional(),
  paymentTerms: z.enum(CPQ_PAYMENT_TERMS).optional(),
  leadId: z.number().optional(),
  marginTarget: z.number().min(0.35).max(0.60).optional(),
});
export type CpqCalculateRequest = z.infer<typeof cpqCalculateRequestSchema>;

// Line item in response
export const cpqLineItemSchema = z.object({
  id: z.string(),
  label: z.string(),
  category: z.enum(["discipline", "area", "risk", "travel", "service", "subtotal", "total"]),
  clientPrice: z.number(),
  upteamCost: z.number(),
  details: z.object({
    sqft: z.number().optional(),
    discipline: z.string().optional(),
    lod: z.string().optional(),
    scope: z.string().optional(),
    clientRate: z.number().optional(),
    upteamRate: z.number().optional(),
  }).optional(),
});
export type CpqLineItem = z.infer<typeof cpqLineItemSchema>;

// Integrity flag
export const cpqIntegrityFlagSchema = z.object({
  code: z.string(),
  message: z.string(),
  severity: z.enum(["warning", "error"]),
});
export type CpqIntegrityFlag = z.infer<typeof cpqIntegrityFlagSchema>;

// Margin warning schema
export const cpqMarginWarningSchema = z.object({
  code: z.enum(["BELOW_GUARDRAIL", "BELOW_FLOOR", "MARGIN_ADJUSTED"]),
  message: z.string(),
  targetMargin: z.number().optional(),
  calculatedMargin: z.number().optional(),
});
export type CpqMarginWarning = z.infer<typeof cpqMarginWarningSchema>;

// Full calculate response
export const cpqCalculateResponseSchema = z.object({
  success: z.literal(true),
  totalClientPrice: z.number(),
  totalUpteamCost: z.number(),
  grossMargin: z.number(),
  grossMarginPercent: z.number(),
  lineItems: z.array(cpqLineItemSchema),
  subtotals: z.object({
    modeling: z.number(),
    travel: z.number(),
    riskPremiums: z.number(),
    services: z.number(),
    paymentPremium: z.number(),
  }),
  integrityStatus: z.enum(["pass", "warning", "blocked"]),
  integrityFlags: z.array(cpqIntegrityFlagSchema).optional(),
  marginTarget: z.number().optional(),
  marginWarnings: z.array(cpqMarginWarningSchema).optional(),
  calculatedAt: z.string(),
  engineVersion: z.string(),
});
export type CpqCalculateResponse = z.infer<typeof cpqCalculateResponseSchema>;

// Error response
export const cpqErrorResponseSchema = z.object({
  success: z.literal(false),
  error: z.string(),
  message: z.string().optional(),
  details: z.object({
    formErrors: z.array(z.string()).optional(),
    fieldErrors: z.record(z.string(), z.array(z.string())).optional(),
  }).optional(),
});
export type CpqErrorResponse = z.infer<typeof cpqErrorResponseSchema>;
