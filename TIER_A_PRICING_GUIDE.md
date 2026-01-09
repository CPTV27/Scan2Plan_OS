# Tier A Project Pricing Implementation Guide

This document describes the Tier A pricing system used for large-scale Scan2Plan projects. Tier A is a special pricing methodology applied to projects exceeding 50,000 square feet.

---

## What is Tier A?

**Tier A** refers to large commercial projects (50,000+ sqft) that use a different pricing methodology than standard matrix-based pricing. These projects have:

1. **Fixed scanning cost tiers** - Predetermined scanning costs based on project complexity
2. **Custom modeling cost estimation** - Calculated from a reference spreadsheet
3. **Margin multipliers** - Applied to costs to determine final client pricing
4. **Special travel rules** - Brooklyn dispatch has no base fee for Tier A

---

## Tier A Threshold

A project qualifies as **Tier A** when:

```typescript
const totalSqft = areas.reduce((sum, area) => {
  const isLandscape = area.buildingType === "14" || area.buildingType === "15";
  const inputValue = parseInt(area.squareFeet) || 0;
  return sum + (isLandscape ? inputValue * 43560 : inputValue);
}, 0);

const isTierA = totalSqft >= 50000;
```

| Tier | Square Footage | Brooklyn Travel Base |
|------|----------------|---------------------|
| Tier C | < 10,000 sqft | $150 |
| Tier B | 10,000 - 49,999 sqft | $300 |
| **Tier A** | **50,000+ sqft** | **$0** (no base fee) |

---

## Tier A Pricing Components

### 1. Scanning Cost (Fixed Options)

Pre-defined scanning cost options for Tier A projects:

| Option | Cost | Typical Project Size |
|--------|------|---------------------|
| Standard | $3,500 | 50k-75k sqft, simple layout |
| Medium | $7,000 | 75k-100k sqft or complex |
| Large | $10,500 | 100k-150k sqft |
| Very Large | $15,000 | 150k-200k sqft |
| Mega | $18,500 | 200k+ sqft |
| Other | Custom | Special circumstances |

### 2. Modeling Cost

Modeling cost is calculated using an external reference spreadsheet. This is a free-form input that references:

**Reference Spreadsheet**: [Modeling Cost Reference](https://docs.google.com/spreadsheets/d/192MhTytrT01h05V3xOugBXm7dFcxl4ZMxcwuVUCQAuo/edit?usp=sharing)

### 3. Margin Multiplier

Applied to total internal costs (scanning + modeling) to calculate client price:

| Multiplier | Description | Formula |
|------------|-------------|---------|
| **2.352X** | Minimum (1.68 overhead × 1.4 min GM) | Standard floor |
| 2.5X | Low margin | Competitive pricing |
| 3X | Standard margin | Typical pricing |
| 3.5X | Good margin | Premium pricing |
| 4X | High margin | Premium clients |

**Client Price Calculation:**
```
Client Price = (Scanning Cost + Modeling Cost) × Margin Multiplier
```

---

## Data Model

### Scoping Data Fields

```typescript
interface TierAPricing {
  tierAScanningCost: string;         // "3500" | "7000" | "10500" | "15000" | "18500" | "other"
  tierAScanningCostOther: string;    // Custom value if "other" selected
  tierAModelingCost: string;         // Free-form dollar amount
  tierAMargin: string;               // "2.352" | "2.5" | "3" | "3.5" | "4"
}
```

### Database Storage

Tier A pricing is stored in the `scopingData` JSONB field of the quotes table:

```typescript
scopingData: {
  // ... other scoping fields
  tierAScanningCost: "7000",
  tierAScanningCostOther: "",
  tierAModelingCost: "12500",
  tierAMargin: "3",
  // ... other scoping fields
}
```

---

## Implementation

### 1. UI Component

Located in: `client/src/components/ScopingFields.tsx`

```tsx
{/* Tier A Pricing */}
<Card className="p-4 bg-accent/50">
  <h3 className="text-lg font-semibold mb-4">Tier A Pricing (Internal)</h3>
  <div className="space-y-4">

    {/* Scanning Cost - Radio Group */}
    <div className="space-y-2">
      <Label className="text-sm font-medium">Tier A - Scanning Cost</Label>
      <RadioGroup 
        value={data.tierAScanningCost} 
        onValueChange={(val) => onChange('tierAScanningCost', val)}
      >
        <div className="flex items-center space-x-2">
          <RadioGroupItem value="3500" id="tier-scan-3500" />
          <Label htmlFor="tier-scan-3500">$3,500</Label>
        </div>
        <div className="flex items-center space-x-2">
          <RadioGroupItem value="7000" id="tier-scan-7000" />
          <Label htmlFor="tier-scan-7000">$7,000</Label>
        </div>
        <div className="flex items-center space-x-2">
          <RadioGroupItem value="10500" id="tier-scan-10500" />
          <Label htmlFor="tier-scan-10500">$10,500</Label>
        </div>
        <div className="flex items-center space-x-2">
          <RadioGroupItem value="15000" id="tier-scan-15000" />
          <Label htmlFor="tier-scan-15000">$15,000</Label>
        </div>
        <div className="flex items-center space-x-2">
          <RadioGroupItem value="18500" id="tier-scan-18500" />
          <Label htmlFor="tier-scan-18500">$18,500</Label>
        </div>
        <div className="flex items-center space-x-2">
          <RadioGroupItem value="other" id="tier-scan-other" />
          <Label htmlFor="tier-scan-other">Other</Label>
        </div>
      </RadioGroup>

      {/* Custom scanning cost input */}
      {data.tierAScanningCost === 'other' && (
        <Input
          placeholder="Specify scanning cost"
          value={data.tierAScanningCostOther}
          onChange={(e) => onChange('tierAScanningCostOther', e.target.value)}
        />
      )}
    </div>

    {/* Modeling Cost - Free Input */}
    <div className="space-y-2">
      <Label htmlFor="tier-modeling-cost">Tier A - Modeling Cost</Label>
      <Input
        id="tier-modeling-cost"
        placeholder="Enter modeling cost"
        value={data.tierAModelingCost}
        onChange={(e) => onChange('tierAModelingCost', e.target.value)}
      />
      <a 
        href="https://docs.google.com/spreadsheets/d/192MhTytrT01h05V3xOugBXm7dFcxl4ZMxcwuVUCQAuo"
        target="_blank"
        className="text-sm text-primary hover:underline"
      >
        View Modeling Cost Reference
      </a>
    </div>

    {/* Margin - Select Dropdown */}
    <div className="space-y-2">
      <Label htmlFor="tier-margin">Tier A - Margin</Label>
      <Select 
        value={data.tierAMargin} 
        onValueChange={(val) => onChange('tierAMargin', val)}
      >
        <SelectTrigger id="tier-margin">
          <SelectValue placeholder="Select margin" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="2.352">2.352X (1.68 overhead × 1.4 min GM)</SelectItem>
          <SelectItem value="2.5">2.5X</SelectItem>
          <SelectItem value="3">3X</SelectItem>
          <SelectItem value="3.5">3.5X</SelectItem>
          <SelectItem value="4">4X</SelectItem>
        </SelectContent>
      </Select>
    </div>
  </div>
</Card>
```

### 2. State Initialization

```typescript
const [scopingData, setScopingData] = useState({
  // ... other fields
  tierAScanningCost: "",
  tierAScanningCostOther: "",
  tierAModelingCost: "",
  tierAMargin: "",
  // ... other fields
});
```

### 3. Travel Tier Detection (Brooklyn Dispatch)

```typescript
if (dispatch === "brooklyn") {
  const isTierB = totalSqft >= 10000 && totalSqft < 50000;
  const isTierC = totalSqft < 10000;
  // Tier A = 50,000+ sqft (neither B nor C)

  const baseTravelCost = isTierB ? 300 : (isTierC ? 150 : 0);
  const tierLabel = isTierB ? "Tier B" : (isTierC ? "Tier C" : "Tier A");

  travelCost = baseTravelCost;

  if (distance > 20) {
    const extraMiles = distance - 20;
    travelCost += extraMiles * 4;  // $4/mile over 20 miles
  }
}
```

### 4. PDF Export

```typescript
// In PDF generation
y = addSectionTitle(doc, 'TIER A PRICING', y);

if (scopingData.tierAScanningCost) {
  let cost = scopingData.tierAScanningCost;
  if (scopingData.tierAScanningCost === 'other' && scopingData.tierAScanningCostOther) {
    cost = scopingData.tierAScanningCostOther;
  }
  y = addField(doc, 'Scanning Cost', `$${cost}`, y, pageWidth);
}

if (scopingData.tierAModelingCost) {
  y = addField(doc, 'Modeling Cost', scopingData.tierAModelingCost, y, pageWidth);
}

if (scopingData.tierAMargin) {
  y = addField(doc, 'Margin', `${scopingData.tierAMargin}X`, y, pageWidth);
}
```

---

## Admin Parameters

The following admin-configurable parameters relate to Tier A pricing:

| Parameter Key | Display Name | Default |
|--------------|--------------|---------|
| `risk_occupied_tier_a` | Occupied Building - Tier A (%) | 15% |
| `risk_hazardous_tier_a` | Hazardous Conditions - Tier A (%) | 25% |
| `risk_no_power_tier_a` | No Power/HVAC - Tier A (%) | 20% |
| `tier_a_overhead_markup` | Tier A Overhead Markup (%) | 68% |
| `tier_a_gm_markup_min` | Tier A GM Markup Min (%) | 40% |
| `tier_a_gm_markup_max` | Tier A GM Markup Max (%) | 100% |
| `tier_a_threshold` | Tier A Threshold (sqft) | 50,000 |
| `landscape_acres_threshold` | Landscape Tier A Threshold (acres) | ~1.15 acres |
| `landscape_tier_a_overhead` | Landscape Tier A Overhead (%) | 68% |
| `landscape_tier_a_gm` | Landscape Tier A GM (%) | 40% |

---

## Example Calculation

**Project:** 85,000 sqft commercial office building

1. **Tier Detection:** 85,000 sqft → Tier A (≥50,000)
2. **Scanning Cost:** $10,500 (Large tier selected)
3. **Modeling Cost:** $18,000 (from reference sheet)
4. **Margin:** 3X

**Calculation:**
```
Internal Cost = $10,500 + $18,000 = $28,500
Client Price = $28,500 × 3 = $85,500
```

**Travel (Brooklyn):**
- Distance: 45 miles
- Base: $0 (Tier A = no base)
- Extra miles: 45 - 20 = 25 miles × $4 = $100
- Total Travel: $100

---

## Integration with CRM

When receiving data from the CRM via postMessage:

```typescript
if (event.data?.type === "CPQ_SCOPING_PAYLOAD") {
  const payload = event.data;

  if (payload.scopingData) {
    setScopingData(prev => ({
      ...prev,
      tierAScanningCost: payload.scopingData.tierAScanningCost || prev.tierAScanningCost,
      tierAScanningCostOther: payload.scopingData.tierAScanningCostOther || prev.tierAScanningCostOther,
      tierAModelingCost: payload.scopingData.tierAModelingCost || prev.tierAModelingCost,
      tierAMargin: payload.scopingData.tierAMargin || prev.tierAMargin,
    }));
  }
}
```

---

## Testing Checklist

- [ ] Projects under 50k sqft do NOT show Tier A pricing section
- [ ] Projects at/above 50k sqft qualify for Tier A
- [ ] Brooklyn travel shows $0 base for Tier A projects
- [ ] Scanning cost radio buttons work correctly
- [ ] "Other" scanning cost shows custom input field
- [ ] Modeling cost accepts free-form input
- [ ] Margin dropdown shows all multiplier options
- [ ] PDF export displays Tier A pricing section
- [ ] Data persists when saving/loading quotes
- [ ] CRM integration properly hydrates Tier A fields

---

## Summary

| Component | Description |
|-----------|-------------|
| **Threshold** | 50,000+ sqft |
| **Scanning Costs** | $3,500 / $7,000 / $10,500 / $15,000 / $18,500 / Other |
| **Modeling Cost** | Free-form (use reference spreadsheet) |
| **Margin Multipliers** | 2.352X / 2.5X / 3X / 3.5X / 4X |
| **Brooklyn Travel** | $0 base + $4/mile over 20 miles |
| **UI Location** | ScopingFields component |
| **Storage** | scopingData JSONB field |

---

*This guide covers the Tier A pricing implementation for the Scan2Plan CPQ system.*
