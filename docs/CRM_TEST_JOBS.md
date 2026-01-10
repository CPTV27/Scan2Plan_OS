# CRM-CPQ Integration Test Jobs

This document contains 10 comprehensive test jobs for validating the CRM-CPQ integration via the `/api/pricing/calculate` endpoint. Each job exercises different combinations of building types, disciplines, LoD levels, risk factors, and travel scenarios.

**Important:** These payloads use the CPQ API schema format (pricingCalculationRequestSchema), not the internal UI format.

---

## Quick Reference Matrix

| Job | Business | Building Type | Size | Disciplines | Dispatch | Travel | Risks | Services |
|-----|----------|---------------|------|-------------|----------|--------|-------|----------|
| 1 | Miller Family Trust | Single Family (1) | 2,500 sqft | Arch | troy | Local | None | None |
| 2 | Apex Development | Multi Family (2) | 45,000 sqft | Arch+Struct | woodstock | Regional | hazardous | None |
| 3 | Luxe Properties | Luxury (3) | 12,000 sqft | All 4 | brooklyn | Local | occupied | Elevations |
| 4 | Metro Corporate | Commercial/Office (4) | 85,000 sqft | Arch+MEPF | troy | Flyout | hazardous+occupied | None |
| 5 | Bella Cucina | Kitchen/Catering (6) | 8,500 sqft | MEPF | woodstock | Local | None | ACT |
| 6 | St. Mary's Academy | Education (7) | 120,000 sqft | Arch+Struct+MEPF | brooklyn | Regional | no_power | None |
| 7 | Grand Hotels | Hotel/Theatre (8) | 200,000 sqft | All 4 | troy | Flyout | All 3 risks | All |
| 8 | City Medical | Hospital (9) | 350,000 sqft | Arch+MEPF | brooklyn | Local | occupied | Matterport |
| 9 | Riverside Parks | Natural Landscape (15) | 15 acres | Site | woodstock | Regional | None | None |
| 10 | Tech Innovation | Multi-Area Campus | Various | Various | troy | Regional | no_power | Mixed |

### Building Types Covered
Types 1, 2, 3, 4, 6, 7, 8, 9, 15 in main jobs + types 5, 10, 11, 12, 13, 14, 16 in Job 10's multi-area

---

## API Schema Reference

### Risk Factors (passed as array of strings)

| Risk ID | Label | Premium |
|---------|-------|---------|
| `occupied` | Occupied Building | +15% |
| `hazardous` | Hazardous Environment | +25% |
| `no_power` | No Power Available | +20% |

### DisciplineLod Object Format

```json
{
  "discipline": "architecture",
  "lod": "300",
  "scope": "full",
  "interiorLod": "300",
  "exteriorLod": "300"
}
```

### Services Object

```json
{
  "matterport": false,
  "actScan": false,
  "additionalElevations": 0
}
```

---

## Job 1: Simple Residential (Baseline Test)

### Full API Payload
```json
{
  "clientName": "Miller Family Trust",
  "projectName": "Miller Residence As-Built",
  "projectAddress": "123 Oak Lane, Troy, NY 12180",

  "areas": [
    {
      "name": "Main House",
      "buildingType": "1",
      "squareFeet": "2500",
      "disciplines": ["architecture"],
      "disciplineLods": {
        "architecture": {
          "discipline": "architecture",
          "lod": "200",
          "scope": "full"
        }
      }
    }
  ],

  "risks": [],

  "dispatchLocation": "troy",
  "distance": 0,

  "services": {
    "matterport": false,
    "actScan": false,
    "additionalElevations": 0
  },

  "paymentTerms": "net30"
}
```

### Lead Information (for CRM)
| Field | Value |
|-------|-------|
| Company Name | Miller Family Trust |
| Contact First Name | John |
| Contact Last Name | Miller |
| Contact Email | john.miller@email.com |
| Contact Phone | (518) 555-0101 |

### Expected Validation
- **Tier:** Smallest (0-5k sqft)
- **Premiums:** None
- **Travel:** No travel fees
- **Purpose:** Baseline test - simplest possible quote

---

## Job 2: Multi-Family with Hazardous Risk

### Full API Payload
```json
{
  "clientName": "Apex Development Group",
  "projectName": "Apex Apartments Renovation",
  "projectAddress": "456 Hudson Valley Road, Kingston, NY 12401",

  "areas": [
    {
      "name": "Building A",
      "buildingType": "2",
      "squareFeet": "45000",
      "disciplines": ["architecture", "structure"],
      "disciplineLods": {
        "architecture": {
          "discipline": "architecture",
          "lod": "300",
          "scope": "full"
        },
        "structure": {
          "discipline": "structure",
          "lod": "200",
          "scope": "full"
        }
      }
    }
  ],

  "risks": ["hazardous"],

  "dispatchLocation": "woodstock",
  "distance": 150,

  "services": {
    "matterport": false,
    "actScan": false,
    "additionalElevations": 0
  },

  "paymentTerms": "net45"
}
```

### Lead Information (for CRM)
| Field | Value |
|-------|-------|
| Company Name | Apex Development Group |
| Contact First Name | Sarah |
| Contact Last Name | Chen |
| Contact Email | schen@apexdev.com |
| Contact Phone | (845) 555-0202 |

### Expected Validation
- **Tier:** Mid-tier (30k-50k sqft)
- **Premiums:** Hazardous (+25%)
- **Travel:** Regional mileage fees (150 miles from Woodstock)
- **Purpose:** Test mid-size project with hazardous risk premium

---

## Job 3: Luxury Residential - All Disciplines

### Full API Payload
```json
{
  "clientName": "Luxe Properties LLC",
  "projectName": "Sterling Estate Documentation",
  "projectAddress": "789 Mansion Drive, Brooklyn, NY 11201",

  "areas": [
    {
      "name": "Main Residence",
      "buildingType": "3",
      "squareFeet": "12000",
      "disciplines": ["architecture", "structure", "mepf", "site"],
      "disciplineLods": {
        "architecture": {
          "discipline": "architecture",
          "lod": "350",
          "scope": "full"
        },
        "structure": {
          "discipline": "structure",
          "lod": "300",
          "scope": "full"
        },
        "mepf": {
          "discipline": "mepf",
          "lod": "350",
          "scope": "full"
        },
        "site": {
          "discipline": "site",
          "lod": "200",
          "scope": "full"
        }
      }
    }
  ],

  "risks": ["occupied"],

  "dispatchLocation": "brooklyn",
  "distance": 0,

  "services": {
    "matterport": false,
    "actScan": false,
    "additionalElevations": 4
  },

  "paymentTerms": "net30"
}
```

### Lead Information (for CRM)
| Field | Value |
|-------|-------|
| Company Name | Luxe Properties LLC |
| Contact First Name | Michael |
| Contact Last Name | Sterling |
| Contact Email | msterling@luxe.com |
| Contact Phone | (212) 555-0303 |

### Expected Validation
- **Tier:** Small-mid (10k-20k sqft)
- **Building Type:** Luxury multiplier applied
- **Disciplines:** All 4 disciplines priced
- **LoD:** High LoD premiums (350 for Arch & MEPF)
- **Services:** 4 additional elevations
- **Risk:** Occupied building premium (+15%)
- **Purpose:** Test luxury rate, all disciplines with varied LoDs

---

## Job 4: Large Commercial - Flyout with Stacked Risks

### Full API Payload
```json
{
  "clientName": "Metro Corporate Holdings",
  "projectName": "Downtown Tower BIM",
  "projectAddress": "100 Michigan Avenue, Chicago, IL 60601",

  "areas": [
    {
      "name": "Office Tower",
      "buildingType": "4",
      "squareFeet": "85000",
      "disciplines": ["architecture", "mepf"],
      "disciplineLods": {
        "architecture": {
          "discipline": "architecture",
          "lod": "300",
          "scope": "interior"
        },
        "mepf": {
          "discipline": "mepf",
          "lod": "350",
          "scope": "interior"
        }
      }
    }
  ],

  "risks": ["hazardous", "occupied"],

  "dispatchLocation": "troy",
  "distance": 0,
  "customTravelCost": 5000,

  "services": {
    "matterport": false,
    "actScan": false,
    "additionalElevations": 0
  },

  "paymentTerms": "net60"
}
```

### Lead Information (for CRM)
| Field | Value |
|-------|-------|
| Company Name | Metro Corporate Holdings |
| Contact First Name | Jennifer |
| Contact Last Name | Park |
| Contact Email | jpark@metrocorp.com |
| Contact Phone | (518) 555-0404 |

### Expected Validation
- **Tier:** Large (75k-100k sqft)
- **Scope:** Interior only (in disciplineLods scope field)
- **Travel:** Flyout pricing (customTravelCost = $5000)
- **Risk:** Hazardous (+25%) AND Occupied (+15%) stacked = +40%
- **Purpose:** Test flyout travel calculation, stacked risk factors, interior-only scope

---

## Job 5: Restaurant/Kitchen - MEPF Focus with ACT Scan

### Full API Payload
```json
{
  "clientName": "Bella Cucina Restaurant Group",
  "projectName": "New Kitchen Layout",
  "projectAddress": "222 Main Street, Woodstock, NY 12498",

  "areas": [
    {
      "name": "Commercial Kitchen",
      "buildingType": "6",
      "squareFeet": "8500",
      "disciplines": ["mepf"],
      "disciplineLods": {
        "mepf": {
          "discipline": "mepf",
          "lod": "350",
          "scope": "interior"
        }
      }
    }
  ],

  "risks": [],

  "dispatchLocation": "woodstock",
  "distance": 0,

  "services": {
    "matterport": false,
    "actScan": true,
    "additionalElevations": 0
  },

  "paymentTerms": "net30"
}
```

### Lead Information (for CRM)
| Field | Value |
|-------|-------|
| Company Name | Bella Cucina Restaurant Group |
| Contact First Name | Antonio |
| Contact Last Name | Rossi |
| Contact Email | arossi@bellacucina.com |
| Contact Phone | (845) 555-0505 |

### Expected Validation
- **Tier:** Small (5k-10k sqft)
- **Building Type:** Kitchen/Catering premium
- **Disciplines:** MEPF only (single discipline)
- **LoD:** High LoD (350)
- **Services:** ACT Scan enabled
- **Purpose:** Test single-discipline quote, kitchen building type, ACT service

---

## Job 6: Education Facility with No Power Risk

### Full API Payload
```json
{
  "clientName": "St. Mary's Academy",
  "projectName": "Campus Master Plan",
  "projectAddress": "500 Academy Lane, Queens, NY 11375",

  "areas": [
    {
      "name": "Main Academic Building",
      "buildingType": "7",
      "squareFeet": "120000",
      "disciplines": ["architecture", "structure", "mepf"],
      "disciplineLods": {
        "architecture": {
          "discipline": "architecture",
          "lod": "300",
          "scope": "full"
        },
        "structure": {
          "discipline": "structure",
          "lod": "200",
          "scope": "full"
        },
        "mepf": {
          "discipline": "mepf",
          "lod": "300",
          "scope": "full"
        }
      }
    }
  ],

  "risks": ["no_power"],

  "dispatchLocation": "brooklyn",
  "distance": 75,

  "services": {
    "matterport": false,
    "actScan": false,
    "additionalElevations": 0
  },

  "paymentTerms": "net45"
}
```

### Lead Information (for CRM)
| Field | Value |
|-------|-------|
| Company Name | St. Mary's Academy |
| Contact First Name | Catherine |
| Contact Last Name | Walsh |
| Contact Email | cwalsh@stmarys.edu |
| Contact Phone | (718) 555-0606 |

### Expected Validation
- **Tier:** Very large (100k-150k sqft)
- **Building Type:** Education rate
- **Disciplines:** 3 disciplines
- **Travel:** Regional (75 miles from Brooklyn)
- **Risk:** No Power premium (+20%)
- **Purpose:** Test large building, no_power risk

---

## Job 7: Hospitality - Maximum Complexity (All Risks)

### Full API Payload
```json
{
  "clientName": "Grand Hotels International",
  "projectName": "Grand Hotel & Spa BIM",
  "projectAddress": "1 Ocean Drive, Miami Beach, FL 33139",

  "areas": [
    {
      "name": "Hotel Main Complex",
      "buildingType": "8",
      "squareFeet": "200000",
      "disciplines": ["architecture", "structure", "mepf", "site"],
      "disciplineLods": {
        "architecture": {
          "discipline": "architecture",
          "lod": "350",
          "scope": "full",
          "interiorLod": "350",
          "exteriorLod": "300"
        },
        "structure": {
          "discipline": "structure",
          "lod": "350",
          "scope": "full"
        },
        "mepf": {
          "discipline": "mepf",
          "lod": "350",
          "scope": "full"
        },
        "site": {
          "discipline": "site",
          "lod": "300",
          "scope": "full"
        }
      }
    }
  ],

  "risks": ["occupied", "hazardous", "no_power"],

  "dispatchLocation": "troy",
  "distance": 0,
  "customTravelCost": 12000,

  "services": {
    "matterport": true,
    "actScan": true,
    "additionalElevations": 8
  },

  "paymentTerms": "net60"
}
```

### Lead Information (for CRM)
| Field | Value |
|-------|-------|
| Company Name | Grand Hotels International |
| Contact First Name | Elizabeth |
| Contact Last Name | Warren |
| Contact Email | ewarren@grandhotels.com |
| Contact Phone | (518) 555-0707 |

### Expected Validation
- **Tier:** Maximum (150k+ sqft)
- **Building Type:** Hotel/Theatre/Museum premium
- **Disciplines:** All 4 at highest LoD (350)
- **Services:** Matterport, ACT Scan, 8 additional elevations
- **Travel:** Flyout to Miami (customTravelCost = $12,000)
- **Risk:** All 3 risk factors (+15% + 25% + 20% = +60%)
- **Purpose:** Stress test - maximum complexity quote with all features enabled

---

## Job 8: Medical Facility with Matterport

### Full API Payload
```json
{
  "clientName": "City Medical Center",
  "projectName": "Hospital Wing Renovation",
  "projectAddress": "800 Medical Plaza, Brooklyn, NY 11215",

  "areas": [
    {
      "name": "East Wing",
      "buildingType": "9",
      "squareFeet": "350000",
      "disciplines": ["architecture", "mepf"],
      "disciplineLods": {
        "architecture": {
          "discipline": "architecture",
          "lod": "300",
          "scope": "interior"
        },
        "mepf": {
          "discipline": "mepf",
          "lod": "350",
          "scope": "interior"
        }
      }
    }
  ],

  "risks": ["occupied"],

  "dispatchLocation": "brooklyn",
  "distance": 0,

  "services": {
    "matterport": true,
    "actScan": false,
    "additionalElevations": 0
  },

  "paymentTerms": "net30"
}
```

### Lead Information (for CRM)
| Field | Value |
|-------|-------|
| Company Name | City Medical Center |
| Contact First Name | Robert |
| Contact Last Name | Kim |
| Contact Email | rkim@citymedical.org |
| Contact Phone | (718) 555-0808 |

### Expected Validation
- **Tier:** Highest tier (300k+ sqft)
- **Building Type:** Hospital/Mixed Use premium
- **Scope:** Interior only
- **Disciplines:** Architecture + MEPF (hospital-typical)
- **Risk:** Occupied building premium (+15%)
- **Services:** Matterport enabled
- **Purpose:** Test highest tier pricing, hospital rates, interior-only large building

---

## Job 9: Landscape Survey (Acres-Based)

### Full API Payload
```json
{
  "clientName": "Riverside Parks Foundation",
  "projectName": "Riverside Park Topographic Survey",
  "projectAddress": "Riverside Park, Poughkeepsie, NY 12601",

  "areas": [
    {
      "name": "Riverside Park",
      "buildingType": "15",
      "squareFeet": "15",
      "disciplines": ["site"],
      "disciplineLods": {
        "site": {
          "discipline": "site",
          "lod": "300",
          "scope": "full"
        }
      }
    }
  ],

  "risks": [],

  "dispatchLocation": "woodstock",
  "distance": 100,

  "services": {
    "matterport": false,
    "actScan": false,
    "additionalElevations": 0
  },

  "paymentTerms": "net30"
}
```

### Lead Information (for CRM)
| Field | Value |
|-------|-------|
| Company Name | Riverside Parks Foundation |
| Contact First Name | Amanda |
| Contact Last Name | Green |
| Contact Email | agreen@riversideparks.org |
| Contact Phone | (845) 555-0909 |

### Expected Validation
- **Unit:** ACRES (not sqft) - squareFeet field contains 15 = 15 acres
- **Building Type:** Natural Landscape (acreage-based pricing)
- **Disciplines:** Site only
- **Travel:** Regional (100 miles from Woodstock)
- **Purpose:** Test acreage-based pricing path, site discipline only

---

## Job 10: Multi-Area Campus (Comprehensive Building Type Coverage)

This job covers building types not tested in Jobs 1-9: Retail (5), Mechanical (10), Warehouse (11), Religious (12), Infrastructure (13), Built Landscape (14), ACT (16).

### Full API Payload
```json
{
  "clientName": "Tech Innovation Campus LLC",
  "projectName": "Innovation Campus Full BIM",
  "projectAddress": "1000 Innovation Way, Albany, NY 12203",

  "areas": [
    {
      "name": "Campus Retail Center",
      "buildingType": "5",
      "squareFeet": "15000",
      "disciplines": ["architecture", "mepf"],
      "disciplineLods": {
        "architecture": {
          "discipline": "architecture",
          "lod": "300",
          "scope": "full"
        },
        "mepf": {
          "discipline": "mepf",
          "lod": "300",
          "scope": "full"
        }
      }
    },
    {
      "name": "Mechanical Plant",
      "buildingType": "10",
      "squareFeet": "8000",
      "disciplines": ["architecture", "mepf"],
      "disciplineLods": {
        "architecture": {
          "discipline": "architecture",
          "lod": "200",
          "scope": "full"
        },
        "mepf": {
          "discipline": "mepf",
          "lod": "350",
          "scope": "full"
        }
      }
    },
    {
      "name": "Warehouse Storage",
      "buildingType": "11",
      "squareFeet": "50000",
      "disciplines": ["architecture"],
      "disciplineLods": {
        "architecture": {
          "discipline": "architecture",
          "lod": "200",
          "scope": "interior"
        }
      }
    },
    {
      "name": "Campus Chapel",
      "buildingType": "12",
      "squareFeet": "5000",
      "disciplines": ["architecture", "structure"],
      "disciplineLods": {
        "architecture": {
          "discipline": "architecture",
          "lod": "350",
          "scope": "full"
        },
        "structure": {
          "discipline": "structure",
          "lod": "300",
          "scope": "full"
        }
      }
    },
    {
      "name": "Access Bridge",
      "buildingType": "13",
      "squareFeet": "3000",
      "disciplines": ["structure"],
      "disciplineLods": {
        "structure": {
          "discipline": "structure",
          "lod": "300",
          "scope": "full"
        }
      }
    },
    {
      "name": "Campus Plaza",
      "buildingType": "14",
      "squareFeet": "3",
      "disciplines": ["site"],
      "disciplineLods": {
        "site": {
          "discipline": "site",
          "lod": "200",
          "scope": "full"
        }
      }
    },
    {
      "name": "Office Ceiling Survey",
      "buildingType": "16",
      "squareFeet": "25000",
      "disciplines": ["mepf"],
      "disciplineLods": {
        "mepf": {
          "discipline": "mepf",
          "lod": "300",
          "scope": "interior"
        }
      }
    }
  ],

  "risks": ["no_power"],

  "dispatchLocation": "troy",
  "distance": 200,

  "services": {
    "matterport": false,
    "actScan": true,
    "additionalElevations": 2
  },

  "paymentTerms": "net45"
}
```

### Lead Information (for CRM)
| Field | Value |
|-------|-------|
| Company Name | Tech Innovation Campus LLC |
| Contact First Name | David |
| Contact Last Name | Martinez |
| Contact Email | dmartinez@techinnovation.com |
| Contact Phone | (518) 555-1010 |

### Expected Validation
- **Multi-Area:** 7 separate areas aggregated
- **Building Types Covered:** 5, 10, 11, 12, 13, 14, 16
- **Mixed Units:** sqft for buildings, acres for landscape (3 acres for plaza)
- **Travel:** Regional (200 miles from Troy)
- **Risk:** No Power premium (+20%)
- **Services:** ACT Scan + 2 additional elevations
- **Purpose:** Test multi-area quote aggregation, all remaining building types

---

## Building Type Reference

| ID | Label | Unit |
|----|-------|------|
| 1 | Residential - Single Family | sqft |
| 2 | Residential - Multi Family | sqft |
| 3 | Residential - Luxury | sqft |
| 4 | Commercial / Office | sqft |
| 5 | Retail / Restaurants | sqft |
| 6 | Kitchen / Catering Facilities | sqft |
| 7 | Education | sqft |
| 8 | Hotel / Theatre / Museum | sqft |
| 9 | Hospitals / Mixed Use | sqft |
| 10 | Mechanical / Utility Rooms | sqft |
| 11 | Warehouse / Storage | sqft |
| 12 | Religious Buildings | sqft |
| 13 | Infrastructure / Roads / Bridges | sqft |
| 14 | Built Landscape | acres |
| 15 | Natural Landscape | acres |
| 16 | ACT (Above/Below Acoustic Ceiling Tiles) | sqft |

### Coverage Summary
- **Jobs 1-9:** Types 1, 2, 3, 4, 6, 7, 8, 9, 15
- **Job 10:** Types 5, 10, 11, 12, 13, 14, 16
- **Total:** All 16 building types covered

---

## Risk Factors Reference

| Value | Label | Premium |
|-------|-------|---------|
| occupied | Occupied Building | +15% |
| hazardous | Hazardous Environment | +25% |
| no_power | No Power Available | +20% |

**Risk Coverage by Job:**
- Job 1: None (baseline)
- Job 2: `hazardous` only
- Job 3: `occupied` only
- Job 4: `hazardous` + `occupied` (stacked)
- Job 5: None
- Job 6: `no_power` only
- Job 7: All three risks (maximum)
- Job 8: `occupied` only
- Job 9: None
- Job 10: `no_power` only

---

## Dispatch Location Reference

| Value | Label |
|-------|-------|
| troy | Troy, NY |
| woodstock | Woodstock, NY |
| brooklyn | Brooklyn, NY |

---

## LoD Reference

| Value | Label | Multiplier |
|-------|-------|------------|
| 200 | LOD 200 | 1.0x (base) |
| 300 | LOD 300 | 1.3x |
| 350 | LOD 350 | 1.5x |

---

## Validation Checklist

For each test job, verify:

### CRM Side
- [ ] Lead created with all contact information
- [ ] Quote created with correct settings
- [ ] API payload matches schema exactly
- [ ] Sync to CPQ initiated successfully

### CPQ Side
- [ ] Quote received with no validation errors
- [ ] Building type correctly mapped
- [ ] Disciplines and LoDs correctly parsed from disciplineLods objects
- [ ] Risk factors applied with correct premiums
- [ ] Travel fees calculated (distance or customTravelCost)
- [ ] Services priced correctly
- [ ] Total pricing matches expected tier/premiums

### Proposal Generation
- [ ] PandaDoc proposal generates successfully
- [ ] All line items appear correctly
- [ ] Pricing totals match CPQ calculations
- [ ] Contact information populated

### Bi-Directional Sync
- [ ] Quote updates sync back to CRM
- [ ] All field values preserved
- [ ] Quote number assigned and visible

---

## Test Execution Order

**Recommended sequence:**

1. **Job 1** - Baseline (validate simplest case works)
2. **Job 5** - Single discipline + ACT service (validate service add-on)
3. **Job 2** - Mid-size with hazardous risk (validate single risk)
4. **Job 9** - Landscape (validate acreage-based pricing)
5. **Job 3** - All disciplines + elevations (validate multi-discipline + services)
6. **Job 6** - No power risk (validate all risk types work)
7. **Job 4** - Flyout + stacked risks (validate customTravelCost + risk stacking)
8. **Job 8** - Highest tier + Matterport (validate tier ceiling + service)
9. **Job 7** - Maximum complexity (stress test all features + all risks)
10. **Job 10** - Multi-area (validate area aggregation + remaining building types)

---

## API Endpoint Reference

### Calculate Pricing
```
POST /api/pricing/calculate
Headers:
  Content-Type: application/json
  x-api-key: <CPQ_API_KEY>
```

### Example cURL
```bash
curl -X POST https://your-cpq-domain.com/api/pricing/calculate \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_API_KEY" \
  -d '{...payload from job above...}'
```

---

## Troubleshooting

### Common Issues

| Symptom | Likely Cause | Resolution |
|---------|--------------|------------|
| Validation error on buildingType | Wrong format | Use string ID "1" not integer 1 |
| disciplineLods validation fails | Wrong structure | Use full object format: `{"architecture": {"discipline": "architecture", "lod": "300"}}` |
| Travel not calculated | Wrong dispatch format | Use lowercase: "troy" not "TROY" |
| Landscape priced too high | Using sqft | For types 14/15, squareFeet is actually acres |
| Risk premium not applied | Wrong field format | Use `risks: ["occupied"]` array of strings |
| Risk premium wrong | Wrong risk ID | Use `no_power` not `noPower` or `phased` |
| Flyout travel wrong | Missing customTravelCost | For flyout, set customTravelCost instead of distance |

---

*Document Version: 3.0*  
*Last Updated: January 2026*  
*Schema Reference: shared/schema.ts (pricingCalculationRequestSchema)*
