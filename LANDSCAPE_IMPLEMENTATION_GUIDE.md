# Landscape Area Type Implementation Guide

This document describes how to implement the "Landscape" area type in the CPQ system. Landscape projects have fundamentally different pricing, input, and UI behavior compared to standard building scans.

---

## Overview

Landscape areas represent outdoor site/topography scanning projects. There are two types:
- **Built Landscape** (Building Type ID: 14) - Man-made outdoor features (parking lots, plazas, courtyards)
- **Natural Landscape** (Building Type ID: 15) - Natural terrain (undeveloped land, parks, natural sites)

---

## Key Differences from Standard Areas

| Aspect | Standard Building | Landscape Area |
|--------|-------------------|----------------|
| Input Unit | Square Feet | **Acres** |
| Minimum Billing | 3,000 sqft | None (use actual acreage) |
| Disciplines Available | Architecture, Structure, MEPF, Site, Matterport | **Site only** (auto-selected) |
| Discipline Selector | User selects multiple | **Hidden** (locked to "site") |
| Scope Options | Full, Interior, Exterior, Mixed, Roof/Facades | **Full only** (hidden selector) |
| LoD Options | 200, 300, 350 | 200, 300, 350 (same) |
| Pricing Source | Database pricing_matrix | **Hardcoded per-acre rates** |

---

## Implementation Steps

### 1. Detect Landscape Area Type

Check if the building type is landscape:

```typescript
const isLandscape = area.buildingType === "14" || area.buildingType === "15";
```

### 2. Parse Input as Decimal Acres

For landscape areas, the `squareFeet` field actually contains **acres** (decimal value):

```typescript
const inputValue = isLandscape 
  ? parseFloat(area.squareFeet) || 0   // Acres (decimal)
  : parseInt(area.squareFeet) || 0;    // Square feet (integer)
```

### 3. Convert Acres to Square Feet for Display

When displaying aggregate totals or for internal calculations that need sqft:

```typescript
const SQFT_PER_ACRE = 43560;

if (isLandscape) {
  const acres = inputValue;
  const sqft = Math.round(acres * SQFT_PER_ACRE);
  // Display: "2.5 acres (108,900 sqft)"
}
```

### 4. Auto-Initialize Landscape Areas

When a landscape building type is selected, auto-configure:

```typescript
if (isLandscape) {
  area.disciplines = ["site"];           // Lock to site discipline
  area.disciplineLods = { "site": "300" }; // Default LoD 300
  area.scope = "full";                    // Always full scope
}
```

### 5. Simplified UI for Landscape

Hide or disable these UI elements for landscape areas:
- Discipline selector checkboxes (auto-locked to "site")
- Scope dropdown (always "full")
- Interior/Exterior LoD selectors
- Facade/Roof entries
- CAD deliverable option

Show only:
- Area name input
- Acreage input (with "acres" label instead of "sqft")
- Single LoD dropdown (for the "site" discipline)

### 6. Tiered Per-Acre Pricing

Landscape uses tiered pricing based on total acreage. Implement this lookup function:

```typescript
const getLandscapePerAcreRate = (buildingType: string, acres: number, lod: string): number => {
  // Built Landscape rates (Building Type 14)
  // Array indices: [<5ac, 5-20ac, 20-50ac, 50-100ac, 100+ac]
  const builtLandscapeRates: Record<string, number[]> = {
    "200": [875, 625, 375, 250, 160],
    "300": [1000, 750, 500, 375, 220],
    "350": [1250, 1000, 750, 500, 260],
  };

  // Natural Landscape rates (Building Type 15)
  const naturalLandscapeRates: Record<string, number[]> = {
    "200": [625, 375, 250, 200, 140],
    "300": [750, 500, 375, 275, 200],
    "350": [1000, 750, 500, 325, 240],
  };

  const rates = buildingType === "14" ? builtLandscapeRates : naturalLandscapeRates;
  const lodRates = rates[lod] || rates["200"];

  // Tiered lookup based on acreage
  if (acres >= 100) return lodRates[4];
  if (acres >= 50) return lodRates[3];
  if (acres >= 20) return lodRates[2];
  if (acres >= 5) return lodRates[1];
  return lodRates[0];  // < 5 acres
};
```

### 7. Calculate Landscape Line Item

```typescript
if (isLandscape) {
  const acres = inputValue;
  const sqft = Math.round(acres * 43560);
  const lod = area.disciplineLods["site"] || "300";
  const perAcreRate = getLandscapePerAcreRate(area.buildingType, acres, lod);

  const lineTotal = acres * perAcreRate;
  const areaLabel = `${acres} acres (${sqft.toLocaleString()} sqft)`;

  // For vendor cost estimation (no database rates for landscape)
  const upteamCost = lineTotal * 0.65;  // 65% vendor cost fallback

  items.push({
    label: `Site/Topography (${areaLabel}, LOD ${lod})`,
    value: lineTotal,
    editable: true,
    upteamCost: upteamCost,
  });
}
```

---

## Pricing Reference Tables

### Built Landscape (Type 14) - $/acre

| Acreage | LoD 200 | LoD 300 | LoD 350 |
|---------|---------|---------|---------|
| < 5 acres | $875 | $1,000 | $1,250 |
| 5-20 acres | $625 | $750 | $1,000 |
| 20-50 acres | $375 | $500 | $750 |
| 50-100 acres | $250 | $375 | $500 |
| 100+ acres | $160 | $220 | $260 |

### Natural Landscape (Type 15) - $/acre

| Acreage | LoD 200 | LoD 300 | LoD 350 |
|---------|---------|---------|---------|
| < 5 acres | $625 | $750 | $1,000 |
| 5-20 acres | $375 | $500 | $750 |
| 20-50 acres | $250 | $375 | $500 |
| 50-100 acres | $200 | $275 | $325 |
| 100+ acres | $140 | $200 | $240 |

---

## UI/UX Guidelines

### Input Field Label
- Standard areas: "Square Footage"
- Landscape areas: "Acreage"

### Input Placeholder
- Standard areas: "e.g., 25000"
- Landscape areas: "e.g., 2.5"

### Building Type Dropdown Options
Include these landscape options in the building type selector:
```typescript
{ value: "14", label: "Built Landscape (Site/Parking)" },
{ value: "15", label: "Natural Landscape (Terrain)" },
```

### Area Card Display
When rendering the area summary, format landscape areas distinctly:
```
Area 1: Site Survey
Building Type: Built Landscape
Size: 12.5 acres (544,500 sqft)
Discipline: Site @ LoD 300
Price: $9,375.00
```

---

## Edge Cases

1. **Zero Acreage**: If acres = 0, the line item total should be $0.

2. **Fractional Acres**: Support decimal input (e.g., 2.75 acres). Use `parseFloat()`, not `parseInt()`.

3. **Very Large Projects**: The 100+ acre tier has the lowest per-acre rate to handle large land surveys economically.

4. **Aggregate Calculations**: When summing total project sqft for travel tier calculations, convert landscape acres to sqft:
   ```typescript
   const totalSqft = areas.reduce((sum, area) => {
     const isLandscape = area.buildingType === "14" || area.buildingType === "15";
     const inputValue = parseInt(area.squareFeet) || 0;
     return sum + (isLandscape ? inputValue * 43560 : inputValue);
   }, 0);
   ```

5. **No CAD for Landscape**: CAD deliverable packages are not available for landscape areas. Skip CAD pricing for building types 14 and 15.

6. **No Risk Premiums for Landscape**: Risk factors (Occupied, Hazardous, No Power) typically don't apply to landscape areas since there's no "Architecture" discipline.

---

## Testing Checklist

- [ ] Selecting "Built Landscape" or "Natural Landscape" changes input label to "Acreage"
- [ ] Discipline selector is hidden/locked for landscape areas
- [ ] Scope selector is hidden/locked for landscape areas
- [ ] Entering 5 acres calculates correct price based on tier
- [ ] Entering 25 acres uses the "20-50 acres" tier
- [ ] LoD 350 produces higher price than LoD 200
- [ ] Display shows both acres and converted sqft
- [ ] Total project sqft correctly includes landscape converted to sqft
- [ ] CAD option is disabled for landscape areas

---

*This guide covers the complete landscape area type implementation for the Scan2Plan CPQ system.*
