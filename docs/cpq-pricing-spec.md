\# Scan2Plan CPQ Pricing Engine Specification

\*\*Version:\*\* 2.0.0    
\*\*Last Updated:\*\* January 2026    
\*\*Purpose:\*\* Complete reference for implementing pricing calculations in any application

\---

\#\# Table of Contents

1\. \[Overview\](\#overview)  
2\. \[Core Constants\](\#core-constants)  
3\. \[Area Tier Logic\](\#area-tier-logic)  
4\. \[Modeling Cost Calculations\](\#modeling-cost-calculations)  
5\. \[Landscape Pricing\](\#landscape-pricing)  
6\. \[Travel Calculations\](\#travel-calculations)  
7\. \[Risk Premium Logic\](\#risk-premium-logic)  
8\. \[Tier A Projects\](\#tier-a-projects)  
9\. \[Scope Handling\](\#scope-handling)  
10\. \[Payment Terms\](\#payment-terms)  
11\. \[Additional Services\](\#additional-services)  
12\. \[Complete Calculation Flow\](\#complete-calculation-flow)  
13\. \[Golden Test Cases\](\#golden-test-cases)  
14\. \[Known Issues\](\#known-issues)

\---

\#\# Overview

This document defines the complete pricing logic for the Scan2Plan CPQ (Configure, Price, Quote) system. Any application implementing this logic should produce identical results to the reference implementation.

\#\#\# Core Principles

1\. \*\*Minimum Floor:\*\* Areas below 3,000 sqft are priced as 3,000 sqft  
2\. \*\*Database First:\*\* Look up rates from pricing matrix, fall back to defaults  
3\. \*\*Risk on Arch Only:\*\* Risk premiums apply ONLY to Architecture discipline  
4\. \*\*Scope Portions:\*\* Interior/exterior scopes reduce the billable portion  
5\. \*\*Upteam Fallback:\*\* When no vendor rate exists, use 65% of client price

\---

\#\# Core Constants

\#\#\# Critical Values

\`\`\`javascript  
const MIN\_SQFT\_FLOOR \= 3000;              // Minimum billable sqft  
const UPTEAM\_MULTIPLIER\_FALLBACK \= 0.65;  // Default vendor cost ratio  
const SQFT\_PER\_ACRE \= 43560;              // Landscape conversion  
const TIER\_A\_THRESHOLD \= 50000;           // Sqft for Tier A qualification  
\`\`\`

\#\#\# Fixed Rates

| Service | Rate | Description |  
|---------|------|-------------|  
| ACT (Above Ceiling Tile) | $2.00/sqft | Building type 16 |  
| Matterport Virtual Tour | $0.10/sqft | Building type 17 or add-on |

\#\#\# Default Base Rates (Fallback when no DB rate)

| Discipline | Rate/sqft |  
|------------|-----------|  
| \`arch\` (Architecture) | $2.50 |  
| \`mepf\` (Mechanical/Electrical/Plumbing/Fire) | $3.00 |  
| \`structure\` | $2.00 |  
| \`site\` (Site/Topography) | $1.50 |

\#\#\# LoD (Level of Development) Multipliers

Applied to base rates when using fallback calculation:

| LoD | Multiplier | Description |  
|-----|------------|-------------|  
| 200 | 1.0× | Basic/Conceptual |  
| 300 | 1.3× | Standard (default) |  
| 350 | 1.5× | Detailed/Construction |

\---

\#\# Area Tier Logic

Square footage determines pricing tier for database lookups.

\#\#\# Tier Boundaries

\`\`\`javascript  
function getAreaTier(sqft) {  
  if (sqft \< 3000\)   return "0-3k";  
  if (sqft \< 5000\)   return "3k-5k";  
  if (sqft \< 10000\)  return "5k-10k";  
  if (sqft \< 25000\)  return "10k-25k";  
  if (sqft \< 50000\)  return "25k-50k";  
  if (sqft \< 75000\)  return "50k-75k";  
  if (sqft \< 100000\) return "75k-100k";  
  return "100k+";  
}  
\`\`\`

\#\#\# Test Cases

| Input (sqft) | Expected Tier |  
|--------------|---------------|  
| 2,000 | "0-3k" |  
| 3,000 | "3k-5k" |  
| 10,000 | "10k-25k" |  
| 50,000 | "50k-75k" |  
| 100,000 | "100k+" |

\---

\#\# Modeling Cost Calculations

\#\#\# Core Formula

\`\`\`  
clientPrice \= effectiveSqft × clientRatePerSqft × scopePortion  
upteamCost \= effectiveSqft × upteamRatePerSqft × scopePortion  
\`\`\`

Where:  
\- \`effectiveSqft \= max(sqft, 3000)\` (minimum floor)  
\- \`scopePortion\` \= 1.0 (full), 0.65 (interior), 0.35 (exterior)

\#\#\# Calculation Function

\`\`\`javascript  
function calculateAreaPricing(input) {  
  const { sqft, discipline, lod, clientRatePerSqft, upteamRatePerSqft, scopePortion } \= input;  
    
  // Step 1: Apply minimum floor  
  const effectiveSqft \= Math.max(sqft, 3000);  
    
  // Step 2: Calculate client price  
  let clientPrice;  
  if (clientRatePerSqft \!== null && clientRatePerSqft \> 0\) {  
    // Use database rate  
    clientPrice \= effectiveSqft \* clientRatePerSqft \* scopePortion;  
  } else {  
    // Fallback: base rate × LoD multiplier  
    const baseRates \= { arch: 2.50, mepf: 3.00, structure: 2.00, site: 1.50 };  
    const lodMultipliers \= { "200": 1.0, "300": 1.3, "350": 1.5 };  
    const baseRate \= baseRates\[discipline\] || 2.50;  
    const lodMultiplier \= lodMultipliers\[lod\] || 1.0;  
    clientPrice \= effectiveSqft \* baseRate \* lodMultiplier \* scopePortion;  
  }  
    
  // Step 3: Calculate upteam (vendor) cost  
  let upteamCost;  
  if (upteamRatePerSqft \!== null && upteamRatePerSqft \> 0\) {  
    // Use database rate  
    upteamCost \= effectiveSqft \* upteamRatePerSqft \* scopePortion;  
  } else {  
    // Fallback: 65% of client price  
    upteamCost \= clientPrice \* 0.65;  
  }  
    
  return { clientPrice, upteamCost, effectiveSqft };  
}  
\`\`\`

\#\#\# Test Cases

| sqft | discipline | lod | clientRate | upteamRate | scope | Expected Client | Expected Upteam |  
|------|------------|-----|------------|------------|-------|-----------------|-----------------|  
| 5,000 | arch | 300 | $3.50 | $2.00 | 1.0 | $17,500 | $10,000 |  
| 5,000 | mepf | 300 | $4.00 | null | 1.0 | $20,000 | $13,000 |  
| 5,000 | arch | 300 | null | null | 1.0 | $16,250 | $10,562.50 |  
| 2,000 | arch | 300 | $3.00 | $1.80 | 1.0 | $9,000 | $5,400 |  
| 10,000 | arch | 300 | $3.00 | $1.80 | 0.65 | $19,500 | $11,700 |  
| 10,000 | arch | 300 | $3.00 | $1.80 | 0.35 | $10,500 | $6,300 |

\---

\#\# Landscape Pricing

Building types 14 (Built Landscape) and 15 (Natural Landscape) use per-acre pricing instead of per-sqft.

\#\#\# Detection

\`\`\`javascript  
function isLandscapeType(buildingTypeId) {  
  return buildingTypeId \=== "14" || buildingTypeId \=== "15";  
}  
\`\`\`

\#\#\# Acreage Tiers

| Tier Index | Acreage Range |  
|------------|---------------|  
| 0 | \< 5 acres |  
| 1 | 5-20 acres |  
| 2 | 20-50 acres |  
| 3 | 50-100 acres |  
| 4 | 100+ acres |

\`\`\`javascript  
function getLandscapeAcreageTierIndex(acres) {  
  if (acres \>= 100\) return 4;  
  if (acres \>= 50\)  return 3;  
  if (acres \>= 20\)  return 2;  
  if (acres \>= 5\)   return 1;  
  return 0;  
}  
\`\`\`

\#\#\# Per-Acre Rates

\#\#\#\# Built Landscape (Type 14\)

| Tier | LoD 200 | LoD 300 | LoD 350 |  
|------|---------|---------|---------|  
| \< 5 ac | $875 | $1,000 | $1,250 |  
| 5-20 ac | $625 | $750 | $1,000 |  
| 20-50 ac | $375 | $500 | $750 |  
| 50-100 ac | $250 | $375 | $500 |  
| 100+ ac | $160 | $220 | $260 |

\#\#\#\# Natural Landscape (Type 15\)

| Tier | LoD 200 | LoD 300 | LoD 350 |  
|------|---------|---------|---------|  
| \< 5 ac | $625 | $750 | $1,000 |  
| 5-20 ac | $375 | $500 | $750 |  
| 20-50 ac | $250 | $375 | $500 |  
| 50-100 ac | $200 | $275 | $325 |  
| 100+ ac | $140 | $200 | $240 |

\#\#\# Calculation

\`\`\`javascript  
function calculateLandscapePrice(buildingTypeId, acres, lod) {  
  const perAcreRate \= getLandscapePerAcreRate(buildingTypeId, acres, lod);  
  return acres \* perAcreRate;  
}

// Upteam cost always uses 0.65 fallback for landscape  
function calculateLandscapeAreaPricing(buildingTypeId, acres, lod) {  
  const clientPrice \= calculateLandscapePrice(buildingTypeId, acres, lod);  
  const upteamCost \= clientPrice \* 0.65;  
  return { clientPrice, upteamCost };  
}  
\`\`\`

\#\#\# Test Cases

| Type | Acres | LoD | Expected Client | Expected Upteam |  
|------|-------|-----|-----------------|-----------------|  
| 14 (Built) | 5 | 300 | $3,750 | $2,437.50 |  
| 15 (Natural) | 10 | 350 | $7,500 | $4,875 |  
| 15 (Natural) | 3 | 200 | $1,875 | $1,218.75 |

\---

\#\# Travel Calculations

\#\#\# Standard Dispatch (Troy, Woodstock, Boise)

\*\*Constants (from TRAVEL\_RATES in pricingEngine.ts):\*\*  
\`\`\`javascript  
const TRAVEL\_RATES \= {  
  standard: 3,              // $/mile for Troy, Woodstock, Boise  
  scanDayFeeThreshold: 75,  // Miles to trigger scan day fee  
  scanDayFee: 300           // Daily fee for long distance  
};  
\`\`\`

\*\*Calculation:\*\*  
\`\`\`javascript  
function calculateStandardTravel(distance) {  
  const baseCost \= distance \* TRAVEL\_RATES.standard;  
  const scanDayFee \= distance \>= TRAVEL\_RATES.scanDayFeeThreshold   
    ? TRAVEL\_RATES.scanDayFee : 0;  
    
  // Build display label  
  let label \= \`Travel \- ${distance} mi @ $${TRAVEL\_RATES.standard}/mi\`;  
  if (scanDayFee \> 0\) {  
    label \+= \` \+ $${TRAVEL\_RATES.scanDayFee} scan day fee\`;  
  }  
    
  return {  
    baseCost,  
    extraMilesCost: 0,     // Always 0 for standard travel  
    scanDayFee,  
    totalCost: baseCost \+ scanDayFee,  
    label                   // Human-readable description  
  };  
}  
\`\`\`

\*\*TravelResult Object Structure:\*\*  
\`\`\`typescript  
interface TravelResult {  
  baseCost: number;        // distance × rate  
  extraMilesCost: number;  // Always 0 for standard dispatch  
  scanDayFee: number;      // $300 if 75+ miles, else $0  
  totalCost: number;       // Sum of all costs  
  label: string;           // e.g., "Travel \- 80 mi @ $3/mi \+ $300 scan day fee"  
  tier?: string;           // Not present for standard dispatch  
}  
\`\`\`

\#\#\# Test Cases (Standard)

| Distance | Base Cost | Scan Day Fee | Total |  
|----------|-----------|--------------|-------|  
| 30 mi | $90 | $0 | $90 |  
| 74 mi | $222 | $0 | $222 |  
| 75 mi | $225 | $300 | $525 |  
| 80 mi | $240 | $300 | $540 |

\#\#\# Brooklyn Dispatch (Tiered by Project Size)

\*\*Constants (from TRAVEL\_RATES in pricingEngine.ts):\*\*  
\`\`\`javascript  
const TRAVEL\_RATES \= {  
  standard: 3,              // $/mile for Troy, Woodstock  
  brooklyn: 4,              // $/mile over 20 miles for Brooklyn  
  brooklynThreshold: 20,    // Miles before extra charges apply  
  scanDayFeeThreshold: 75,  // Miles to trigger scan day fee (standard only)  
  scanDayFee: 300           // Daily fee for long distance (standard only)  
};

const BROOKLYN\_BASE\_FEES \= {  
  tierC: 150,   // \< 10k sqft  
  tierB: 300,   // 10k-50k sqft  
  tierA: 0      // 50k+ sqft  
};  
\`\`\`

\*\*Note:\*\* Brooklyn dispatch does NOT trigger scan day fees \- only standard dispatch does.

| Tier | Project Size | Base Fee | Extra Miles |  
|------|--------------|----------|-------------|  
| Tier C | \< 10k sqft | $150 | $4/mi over 20 mi |  
| Tier B | 10k-50k sqft | $300 | $4/mi over 20 mi |  
| Tier A | 50k+ sqft | $0 | $4/mi over 20 mi |

\`\`\`javascript  
function getBrooklynTravelTier(totalSqft) {  
  if (totalSqft \>= 50000\) return 'tierA';  
  if (totalSqft \>= 10000\) return 'tierB';  
  return 'tierC';  
}

function calculateBrooklynTravel(distance, totalProjectSqft) {  
  const tier \= getBrooklynTravelTier(totalProjectSqft);  
  const tierLabel \= tier \=== 'tierA' ? 'Tier A' : (tier \=== 'tierB' ? 'Tier B' : 'Tier C');  
  const baseCost \= BROOKLYN\_BASE\_FEES\[tier\];  
    
  // Use TRAVEL\_RATES constants  
  const extraMiles \= Math.max(0, distance \- TRAVEL\_RATES.brooklynThreshold);  
  const extraMilesCost \= extraMiles \* TRAVEL\_RATES.brooklyn;  
    
  // Build display label  
  let label \= \`Travel \- Brooklyn ${tierLabel} ($${baseCost} base\`;  
  if (extraMilesCost \> 0\) {  
    label \+= \` \+ ${extraMiles} mi @ $${TRAVEL\_RATES.brooklyn}/mi\`;  
  }  
  label \+= ')';  
    
  return {  
    baseCost,  
    extraMilesCost,  
    scanDayFee: 0,        // Brooklyn does NOT have scan day fee  
    totalCost: baseCost \+ extraMilesCost,  
    label,                 // e.g., "Travel \- Brooklyn Tier B ($300 base \+ 5 mi @ $4/mi)"  
    tier: tierLabel        // "Tier A", "Tier B", or "Tier C"  
  };  
}  
\`\`\`

\*\*TravelResult Object Structure:\*\*  
\`\`\`typescript  
interface TravelResult {  
  baseCost: number;        // Base fee (tier-dependent for Brooklyn)  
  extraMilesCost: number;  // Extra miles cost (Brooklyn only)  
  scanDayFee: number;      // Always 0 for Brooklyn  
  totalCost: number;       // Sum of all costs  
  label: string;           // Human-readable description  
  tier?: string;           // Tier label (Brooklyn only)  
}  
\`\`\`

\#\#\# Test Cases (Brooklyn)

| Distance | Project Sqft | Tier | Base | Extra | Total |  
|----------|--------------|------|------|-------|-------|  
| 15 mi | 8,000 | C | $150 | $0 | $150 |  
| 25 mi | 25,000 | B | $300 | $20 | $320 |  
| 30 mi | 75,000 | A | $0 | $40 | $40 |

\---

\#\# Risk Premium Logic

\*\*CRITICAL:\*\* Risk premiums apply \*\*ONLY to Architecture\*\* (\`arch\`) discipline.

\#\#\# Risk Factors

| Risk ID | Premium | Description |  
|---------|---------|-------------|  
| \`occupied\` | \+15% | Building is occupied during scan |  
| \`hazardous\` | \+25% | Hazardous materials present |  
| \`no\_power\` | \+20% | No power available on site |

\#\#\# Calculation

\`\`\`javascript  
const RISK\_PREMIUMS \= {  
  occupied: 0.15,  
  hazardous: 0.25,  
  no\_power: 0.20  
};

function calculateRiskMultiplier(risks) {  
  let totalPremium \= 0;  
  for (const risk of risks) {  
    if (risk in RISK\_PREMIUMS) {  
      totalPremium \+= RISK\_PREMIUMS\[risk\];  
    }  
  }  
  return 1 \+ totalPremium;  
}

function applyRiskPremium(discipline, baseAmount, risks) {  
  // ONLY apply to Architecture  
  if (discipline \!== 'arch') {  
    return baseAmount;  
  }  
  return baseAmount \* calculateRiskMultiplier(risks);  
}  
\`\`\`

\#\#\# Test Cases

| Discipline | Base | Risks | Expected |  
|------------|------|-------|----------|  
| arch | $1,000 | \["occupied"\] | $1,150 |  
| arch | $1,000 | \["hazardous"\] | $1,250 |  
| arch | $1,000 | \["occupied", "hazardous"\] | $1,400 |  
| mepf | $1,000 | \["occupied"\] | $1,000 |  
| structure | $1,000 | \["occupied", "hazardous"\] | $1,000 |  
| site | $1,000 | \["occupied"\] | $1,000 |

\---

\#\# Tier A Projects

Projects with total sqft ≥ 50,000 use manual pricing.

\#\#\# Detection

\`\`\`javascript  
function isTierAProject(totalSqft) {  
  return totalSqft \>= 50000;  
}  
\`\`\`

\#\#\# Pricing Formula

\`\`\`javascript  
function calculateTierAPrice(scanningCost, modelingCost, marginMultiplier) {  
  return (scanningCost \+ modelingCost) \* marginMultiplier;  
}  
\`\`\`

\#\#\# Typical Ranges

| Sqft Range | Scanning Range | Modeling Range | Margin Range |  
|------------|----------------|----------------|--------------|  
| 50k-75k | $3,500-$10,500 | $12,000-$18,000 | 2.352X-3X |  
| 75k-100k | $7,000-$14,000 | $18,000-$25,000 | 2.5X-3.5X |  
| 100k+ | $14,000-$18,500 | $25,000-$40,000 | 3X-4X |

\#\#\# Test Case

| Scanning | Modeling | Margin | Expected |  
|----------|----------|--------|----------|  
| $10,500 | $18,000 | 3× | $85,500 |

\---

\#\# Scope Handling

There are \*\*two distinct scope mechanisms\*\* in the system. Implementers must understand when each is used.

\#\#\# Mechanism 1: Scope Portions (for modeling cost calculation)

Used when calculating per-discipline pricing via \`calculateAreaPricing()\`. The scope portion is a \*\*multiplier\*\* applied to the full sqft calculation:

| Scope | Portion | Formula |  
|-------|---------|---------|  
| \`full\` | 1.0 | Full sqft × rate |  
| \`interior\` | 0.65 | 65% of full price |  
| \`exterior\` | 0.35 | 35% of full price |  
| \`mixed\` | N/A | Creates two separate line items |

\*\*Application:\*\*  
\`\`\`javascript  
// Applied directly in calculateAreaPricing()  
clientPrice \= effectiveSqft \* clientRatePerSqft \* scopePortion;  
upteamCost \= effectiveSqft \* upteamRatePerSqft \* scopePortion;  
\`\`\`

\#\#\# Mechanism 2: Scope Discounts (for line item adjustments)

Used via \`applyScopeDiscount()\` for applying discounts to already-calculated prices. The discount is \*\*subtracted\*\* from the full price:

| Scope | Discount | Result |  
|-------|----------|--------|  
| \`full\` | 0% | 100% of price |  
| \`interior\` | 35% | 65% of price |  
| \`exterior\` | 65% | 35% of price |

\*\*Application:\*\*  
\`\`\`javascript  
const SCOPE\_DISCOUNTS \= { full: 0, interior: 0.35, exterior: 0.65, mixed: 0 };

function applyScopeDiscount(basePrice, scope) {  
  const discount \= SCOPE\_DISCOUNTS\[scope\] || 0;  
  return basePrice \* (1 \- discount);  
}  
\`\`\`

\#\#\# Which to Use?

\- \*\*Scope Portions\*\*: Use when calculating from scratch via \`calculateAreaPricing()\`  
\- \*\*Scope Discounts\*\*: Use when adjusting an already-calculated full price

Both mechanisms produce the \*\*same mathematical result\*\*:  
\- Interior: 65% of full price  
\- Exterior: 35% of full price

\#\#\# Mixed Scope Handling

When \`scope \= "mixed"\`, the system creates \*\*two separate line items\*\* for the same area:

1\. \*\*Interior Line Item\*\*: Uses \`mixedInteriorLod\` for the LoD, priced at 65% portion  
2\. \*\*Exterior Line Item\*\*: Uses \`mixedExteriorLod\` for the LoD, priced at 35% portion

\*\*Implementation Pattern:\*\*  
\`\`\`javascript  
if (area.scope \=== 'mixed') {  
  // Create interior line item  
  const interiorPrice \= calculateAreaPricing({  
    ...input,  
    lod: area.mixedInteriorLod || '300',  
    scopePortion: 0.65  
  });  
    
  // Create exterior line item  
  const exteriorPrice \= calculateAreaPricing({  
    ...input,  
    lod: area.mixedExteriorLod || '300',  
    scopePortion: 0.35  
  });  
    
  // Result: Two line items, possibly with different LoDs and rates  
}  
\`\`\`

\*\*Key Points:\*\*  
\- Mixed scope allows different LoD for interior vs exterior  
\- Total price \= interior (65%) \+ exterior (35%) \= 100% but potentially at different rates  
\- Each line item is calculated independently, including risk premiums (Arch only)

\#\#\# Test Cases

| Full Price | Scope | Expected |  
|------------|-------|----------|  
| $1,000 | full | $1,000 |  
| $1,000 | interior | $650 |  
| $1,000 | exterior | $350 |

\---

\#\# Payment Terms

Payment term premiums are applied to the final subtotal.

| Term | Premium | Description |  
|------|---------|-------------|  
| \`partner\` | 0% | Partner/internal pricing |  
| \`owner\` | 0% | Owner direct |  
| \`net30\` | \+5% | Net 30 days |  
| \`net60\` | \+10% | Net 60 days |  
| \`net90\` | \+15% | Net 90 days |

\#\#\# Calculation

\`\`\`javascript  
function applyPaymentTermPremium(subtotal, paymentTerms) {  
  const premiums \= { partner: 0, owner: 0, net30: 0.05, net60: 0.10, net90: 0.15 };  
  const premium \= premiums\[paymentTerms\] || 0;  
  return subtotal \* (1 \+ premium);  
}  
\`\`\`

\#\#\# Test Cases

| Subtotal | Terms | Expected |  
|----------|-------|----------|  
| $10,000 | net30 | $10,500 |  
| $10,000 | net90 | $11,500 |

\---

\#\# Additional Services

\#\#\# ACT (Above Ceiling Tile) Pricing

Building type 16 uses ACT-specific pricing. \*\*Note:\*\* ACT supports \`scopePortion\` parameter for partial scope pricing.

\*\*Constants (from pricingEngine.ts):\*\*  
\`\`\`javascript  
const ACT\_RATE\_PER\_SQFT \= 2.00;         // Fixed rate per sqft  
const MIN\_SQFT\_FLOOR \= 3000;            // Minimum billable sqft  
const UPTEAM\_MULTIPLIER\_FALLBACK \= 0.65; // Vendor cost fallback (65% of client)  
\`\`\`

\*\*Calculation:\*\*  
\`\`\`javascript  
function calculateACTAreaPricing(sqft, scopePortion \= 1.0) {  
  // Step 1: Apply minimum floor  
  const effectiveSqft \= Math.max(sqft, MIN\_SQFT\_FLOOR);  
    
  // Step 2: Calculate client price (includes scope portion)  
  const clientPrice \= effectiveSqft \* ACT\_RATE\_PER\_SQFT \* scopePortion;  
    
  // Step 3: Vendor cost uses fallback (no database rate exists for ACT)  
  const upteamCost \= clientPrice \* UPTEAM\_MULTIPLIER\_FALLBACK;  
    
  return {  
    clientPrice,              // Client-facing price  
    upteamCost,               // Vendor/modeling cost  
    effectiveSqft,            // After minimum floor applied  
    rateUsed: 'database',     // Indicates fixed/known rate was used  
    upteamRateUsed: 'fallback' // Indicates 0.65 fallback was used  
  };  
}  
\`\`\`

\*\*Test Cases:\*\*

| Input Sqft | Scope | Effective Sqft | Client Price | Upteam Cost |  
|------------|-------|----------------|--------------|-------------|  
| 5,000 | 1.0 | 5,000 | $10,000 | $6,500 |  
| 2,000 | 1.0 | 3,000 | $6,000 | $3,900 |  
| 10,000 | 0.65 | 10,000 | $13,000 | $8,450 |

\---

\#\#\# Matterport Virtual Tour Pricing

Building type 17 or add-on service uses Matterport-specific pricing. \*\*Note:\*\* Matterport does NOT support scope portion \- always uses full sqft.

\*\*Constants (from pricingEngine.ts):\*\*  
\`\`\`javascript  
const MATTERPORT\_RATE\_PER\_SQFT \= 0.10;  // Fixed rate per sqft  
const MIN\_SQFT\_FLOOR \= 3000;            // Minimum billable sqft  
const UPTEAM\_MULTIPLIER\_FALLBACK \= 0.65; // Vendor cost fallback (65% of client)  
\`\`\`

\*\*Calculation:\*\*  
\`\`\`javascript  
function calculateMatterportPricing(sqft) {  
  // Step 1: Apply minimum floor  
  const effectiveSqft \= Math.max(sqft, MIN\_SQFT\_FLOOR);  
    
  // Step 2: Calculate client price (NO scope portion \- always full)  
  const clientPrice \= effectiveSqft \* MATTERPORT\_RATE\_PER\_SQFT;  
    
  // Step 3: Vendor cost uses fallback (no database rate exists for Matterport)  
  const upteamCost \= clientPrice \* UPTEAM\_MULTIPLIER\_FALLBACK;  
    
  return {  
    clientPrice,              // Client-facing price  
    upteamCost,               // Vendor/modeling cost  
    effectiveSqft,            // After minimum floor applied  
    rateUsed: 'database',     // Indicates fixed/known rate was used  
    upteamRateUsed: 'fallback' // Indicates 0.65 fallback was used  
  };  
}  
\`\`\`

\*\*Test Cases:\*\*

| Input Sqft | Effective Sqft | Client Price | Upteam Cost |  
|------------|----------------|--------------|-------------|  
| 5,000 | 5,000 | $500 | $325 |  
| 2,000 | 3,000 | $300 | $195 |

\---

\#\#\# Additional Elevations (Tiered Pricing)

| Tier | Range | Rate |  
|------|-------|------|  
| 1 | 1-10 | $25/ea |  
| 2 | 11-20 | $20/ea |  
| 3 | 21-100 | $15/ea |  
| 4 | 101-300 | $10/ea |  
| 5 | 300+ | $5/ea |

\`\`\`javascript  
function calculateAdditionalElevationsPrice(count) {  
  if (count \<= 0\) return 0;  
    
  let total \= 0;  
  let remaining \= count;  
    
  // Tier 1: 1-10 @ $25  
  const tier1 \= Math.min(remaining, 10);  
  total \+= tier1 \* 25;  
  remaining \-= tier1;  
    
  // Tier 2: 11-20 @ $20  
  if (remaining \> 0\) {  
    const tier2 \= Math.min(remaining, 10);  
    total \+= tier2 \* 20;  
    remaining \-= tier2;  
  }  
    
  // Tier 3: 21-100 @ $15  
  if (remaining \> 0\) {  
    const tier3 \= Math.min(remaining, 80);  
    total \+= tier3 \* 15;  
    remaining \-= tier3;  
  }  
    
  // Tier 4: 101-300 @ $10  
  if (remaining \> 0\) {  
    const tier4 \= Math.min(remaining, 200);  
    total \+= tier4 \* 10;  
    remaining \-= tier4;  
  }  
    
  // Tier 5: 300+ @ $5  
  if (remaining \> 0\) {  
    total \+= remaining \* 5;  
  }  
    
  return total;  
}  
\`\`\`

\#\#\# Test Cases

| Count | Expected |  
|-------|----------|  
| 0 | $0 |  
| 5 | $125 |  
| 10 | $250 |  
| 15 | $350 |  
| 25 | $525 |

\---

\#\# Complete Calculation Flow

\#\#\# Step-by-Step Process

\`\`\`  
1\. AGGREGATE  
   └─ Calculate total project sqft (convert landscape acres to sqft)  
   └─ Determine if Tier A project (≥50k sqft)

2\. PER AREA  
   └─ For each area:  
       a. Determine if landscape type (14, 15\)  
       b. Get area tier for database lookup  
       c. Apply minimum sqft floor (3000)  
       d. Look up client rate from pricing\_matrix  
       e. Look up upteam rate from upteam\_pricing\_matrix  
       f. Calculate client price (rate × sqft × scope)  
       g. Calculate upteam cost (rate × sqft × scope or fallback 65%)  
       h. Apply risk premium (Architecture only)

3\. LINE ITEMS  
   └─ Create line items per area/discipline combination  
   └─ Add CAD packages if selected  
   └─ Add additional elevations  
   └─ Add Matterport if selected

4\. TRAVEL  
   └─ Determine dispatch location  
   └─ If Brooklyn: determine tier based on total sqft  
   └─ Calculate travel cost  
   └─ Add scan day fee if 75+ miles

5\. SUBTOTAL  
   └─ Sum all line items \+ travel

6\. PAYMENT TERMS  
   └─ Apply payment term premium to subtotal

7\. GRAND TOTAL  
   └─ Final price after all adjustments  
\`\`\`

\---

\#\# Golden Test Cases

The following JSON file contains 85 test cases for validation:

\*\*File:\*\* \`server/lib/pricingEngine.golden.json\`

\#\#\# Categories Covered

1\. \`areaTier\` \- Sqft to tier mapping  
2\. \`brooklynTier\` \- Brooklyn travel tier determination  
3\. \`brooklynBaseFee\` \- Brooklyn base fees  
4\. \`landscape\` \- Landscape type detection  
5\. \`acresToSqft\` \- Acre conversion  
6\. \`landscapeTier\` \- Landscape acreage tiers  
7\. \`landscapeRate\` \- Per-acre rates  
8\. \`landscapePrice\` \- Landscape total pricing  
9\. \`standardTravel\` \- Standard dispatch travel  
10\. \`brooklynTravel\` \- Brooklyn dispatch travel  
11\. \`riskMultiplier\` \- Risk premium calculation  
12\. \`riskPremium\` \- Risk application to disciplines  
13\. \`tierA\` \- Tier A detection  
14\. \`tierAPrice\` \- Tier A pricing  
15\. \`scopeDiscount\` \- Scope portion values  
16\. \`applyScopeDiscount\` \- Scope application  
17\. \`paymentTerm\` \- Payment term premiums  
18\. \`applyPaymentTerm\` \- Payment term application  
19\. \`elevations\` \- Additional elevations pricing  
20\. \`modelingCost\` \- Full modeling cost calculation  
21\. \`actPricing\` \- ACT pricing  
22\. \`matterportPricing\` \- Matterport pricing  
23\. \`landscapeAreaPricing\` \- Landscape area full pricing  
24\. \`profitMargin\` \- Margin calculations  
25\. \`lodMultiplier\` \- LoD multiplier values  
26\. \`defaultBaseRate\` \- Default fallback rates

\#\#\# Running Validation

\`\`\`bash  
\# Run all 85 validation tests  
npx tsx scripts/validate-pricing-tests.ts

\# Output as JSON for comparison  
npx tsx scripts/validate-pricing-tests.ts \--json  
\`\`\`

\---

\#\# Known Issues

\#\#\# Scope Discount Value Mismatch

There is a known discrepancy between scope handling in different parts of the system:

\*\*Current pricingEngine.ts (scope portions):\*\*  
\- Interior: 65% of full price  
\- Exterior: 35% of full price

\*\*Some UI references (scope discounts):\*\*  
\- Interior Only: \-25% discount (pays 75%)  
\- Exterior Only: \-50% discount (pays 50%)

\*\*Resolution Needed:\*\* Clarify which values are authoritative for business logic.

\---

\#\# Appendix: Building Types Reference

| ID | Name | Pricing Method |  
|----|------|----------------|  
| 1 | Office Building | Per-sqft |  
| 2 | Educational | Per-sqft |  
| 3 | Healthcare | Per-sqft |  
| 4 | Industrial | Per-sqft |  
| 5 | Residential Multi-Family | Per-sqft |  
| 6 | Residential Single-Family | Per-sqft |  
| 7 | Retail | Per-sqft |  
| 8 | Hospitality | Per-sqft |  
| 9 | Mixed-Use | Per-sqft |  
| 10 | Warehouse | Per-sqft |  
| 11 | Religious | Per-sqft |  
| 12 | Government | Per-sqft |  
| 13 | Parking Structure | Per-sqft |  
| 14 | Built Landscape | Per-acre |  
| 15 | Natural Landscape | Per-acre |  
| 16 | ACT Ceilings Only | Per-sqft ($2.00) |  
| 17 | Matterport Only | Per-sqft ($0.10) |

\---

\#\# Appendix: Discipline Reference

| ID | Name |  
|----|------|  
| \`arch\` | Architecture |  
| \`structure\` | Structure |  
| \`mepf\` | MEPF (Mechanical/Electrical/Plumbing/Fire) |  
| \`site\` | Site/Topography |  
| \`matterport\` | Matterport (add-on service) |

\---

\*End of Pricing Engine Specification\*

