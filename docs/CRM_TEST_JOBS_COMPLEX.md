# CRM-CPQ Integration Test Jobs - Complex Multi-Area Edition

This document contains 10 complex test jobs using the same companies but with increased scoping complexity. All contact emails use chase@scan2plan.io for email quote testing.

---

## Complexity Features Tested

- **Multi-area projects** (2-3 buildings/areas per quote)
- **Mixed LODs** across disciplines within same quote
- **Combined risk factors** (multiple risks per project)
- **All services enabled** on select quotes
- **Various payment terms** to test formatting
- **Interior/Exterior scope splits**

---

## Quick Reference Matrix

| Job | Property | Areas | Total Sqft | Risks | Services | Payment |
|-----|----------|-------|------------|-------|----------|---------|
| 11 | Purchase Estate | 3 | 22,500 | occupied | All | net30 |
| 12 | Greenwich St | 2 | 75,000 | occupied, hazardous | ACT | net45 |
| 13 | Philadelphia Historic | 2 | 35,000 | none | Matterport, 12 elev | net30 |
| 14 | Wilmington Logistics | 3 | 650,000 | occupied, hazardous, no_power | None | net60 |
| 15 | SoHo Retail | 2 | 12,000 | occupied | Matterport | net15 |
| 16 | Woolworth Building | 3 | 85,000 | occupied | All | net45 |
| 17 | Taunton Cold Storage | 2 | 150,000 | hazardous, no_power | ACT | net60 |
| 18 | Presidential City | 4 | 320,000 | occupied | Matterport, 8 elev | net60 |
| 19 | Tobin Center | 3 | 225,000 | occupied | All | 50/50 |
| 20 | Clark Ave Industrial | 2 | 28,000 | hazardous, no_power | None | net30 |

---

## Job 11: Purchase Estate - Full Property Survey (3 Areas)

**Test Focus:** Multi-building luxury estate with separate structures, mixed LODs, all services.

### Full API Payload
```json
{
  "clientName": "Purchase Estate Holdings LLC",
  "projectName": "Purchase Estate Complete As-Built",
  "projectAddress": "2525 Purchase St, Purchase, NY 10577",

  "contactFirstName": "Victoria",
  "contactLastName": "Ashworth",
  "contactEmail": "chase@scan2plan.io",
  "contactPhone": "(914) 555-0101",

  "areas": [
    {
      "name": "Main Residence",
      "buildingType": "3",
      "squareFeet": "14700",
      "disciplines": ["architecture", "mepf", "structure"],
      "disciplineLods": {
        "architecture": { "discipline": "architecture", "lod": "350", "scope": "full" },
        "mepf": { "discipline": "mepf", "lod": "300", "scope": "full" },
        "structure": { "discipline": "structure", "lod": "200", "scope": "full" }
      }
    },
    {
      "name": "Pool House & Cabana",
      "buildingType": "3",
      "squareFeet": "3800",
      "disciplines": ["architecture", "mepf"],
      "disciplineLods": {
        "architecture": { "discipline": "architecture", "lod": "300", "scope": "full" },
        "mepf": { "discipline": "mepf", "lod": "200", "scope": "interior" }
      }
    },
    {
      "name": "Carriage House / Garage",
      "buildingType": "11",
      "squareFeet": "4000",
      "disciplines": ["architecture", "structure"],
      "disciplineLods": {
        "architecture": { "discipline": "architecture", "lod": "200", "scope": "full" },
        "structure": { "discipline": "structure", "lod": "200", "scope": "full" }
      }
    }
  ],

  "risks": ["occupied"],

  "dispatchLocation": "brooklyn",
  "distance": 35,

  "services": {
    "matterport": true,
    "actScan": true,
    "additionalElevations": 6
  },

  "paymentTerms": "net30"
}
```

### Company Information
| Field | Value |
|-------|-------|
| Company Name | Purchase Estate Holdings LLC |
| Company Address | 1000 Westchester Ave, Suite 400, White Plains, NY 10604 |
| Industry | Real Estate Investment |

### Billing Contact
| Field | Value |
|-------|-------|
| First Name | Thomas |
| Last Name | Pemberton |
| Email | tpemberton@purchaseestate.com |

### Expected Validation
- **Total Area:** 22,500 sqft across 3 buildings
- **Mixed Building Types:** Luxury (3) + Warehouse (11)
- **Mixed LODs:** 350, 300, 200 across disciplines
- **All Services:** Matterport + ACT + 6 elevations
- **Risk:** Occupied (+15%)

---

## Job 12: Greenwich Street - Dual Floor Survey (2 Areas)

**Test Focus:** Two separate office floor surveys with different scopes, hazardous conditions.

### Full API Payload
```json
{
  "clientName": "Greenwich Street Partners LP",
  "projectName": "255 Greenwich Multi-Floor BIM",
  "projectAddress": "255 Greenwich St, New York, NY 10007",

  "contactFirstName": "Marcus",
  "contactLastName": "Chen",
  "contactEmail": "chase@scan2plan.io",
  "contactPhone": "(212) 555-0202",

  "areas": [
    {
      "name": "Executive Floors 38-42",
      "buildingType": "4",
      "squareFeet": "45000",
      "disciplines": ["architecture", "mepf", "structure"],
      "disciplineLods": {
        "architecture": { "discipline": "architecture", "lod": "350", "scope": "full" },
        "mepf": { "discipline": "mepf", "lod": "350", "scope": "full" },
        "structure": { "discipline": "structure", "lod": "300", "scope": "full" }
      }
    },
    {
      "name": "Mechanical Floors B1-B2",
      "buildingType": "10",
      "squareFeet": "30000",
      "disciplines": ["mepf", "structure"],
      "disciplineLods": {
        "mepf": { "discipline": "mepf", "lod": "350", "scope": "full" },
        "structure": { "discipline": "structure", "lod": "200", "scope": "full" }
      }
    }
  ],

  "risks": ["occupied", "hazardous"],

  "dispatchLocation": "brooklyn",
  "distance": 5,

  "services": {
    "matterport": false,
    "actScan": true,
    "additionalElevations": 0
  },

  "paymentTerms": "net45"
}
```

### Company Information
| Field | Value |
|-------|-------|
| Company Name | Greenwich Street Partners LP |
| Company Address | 255 Greenwich St, 40th Floor, New York, NY 10007 |
| Industry | Commercial Real Estate |

### Billing Contact
| Field | Value |
|-------|-------|
| First Name | Rebecca |
| Last Name | Goldman |
| Email | rgoldman@greenwichpartners.com |

### Expected Validation
- **Total Area:** 75,000 sqft across 2 areas
- **Mixed Building Types:** Commercial (4) + Mechanical (10)
- **High LODs:** Mostly 350 for executive space detail
- **Dual Risk:** Occupied (+15%) + Hazardous (+25%) = +40%
- **ACT Scan:** For ceiling grid documentation

---

## Job 13: Philadelphia Historic - Main + Annex (2 Areas)

**Test Focus:** Historic preservation with multiple structures, maximum elevations.

### Full API Payload
```json
{
  "clientName": "Philadelphia Preservation Society",
  "projectName": "1218 Arch Historic Complex Documentation",
  "projectAddress": "1218 Arch St, Philadelphia, PA 19107",

  "contactFirstName": "Eleanor",
  "contactLastName": "Richardson",
  "contactEmail": "chase@scan2plan.io",
  "contactPhone": "(215) 555-0303",

  "areas": [
    {
      "name": "Main Historic Building",
      "buildingType": "8",
      "squareFeet": "20000",
      "disciplines": ["architecture", "structure"],
      "disciplineLods": {
        "architecture": { "discipline": "architecture", "lod": "350", "scope": "full" },
        "structure": { "discipline": "structure", "lod": "350", "scope": "full" }
      }
    },
    {
      "name": "1920s Annex Building",
      "buildingType": "8",
      "squareFeet": "15000",
      "disciplines": ["architecture", "structure", "mepf"],
      "disciplineLods": {
        "architecture": { "discipline": "architecture", "lod": "350", "scope": "full" },
        "structure": { "discipline": "structure", "lod": "300", "scope": "full" },
        "mepf": { "discipline": "mepf", "lod": "200", "scope": "interior" }
      }
    }
  ],

  "risks": [],

  "dispatchLocation": "brooklyn",
  "distance": 95,

  "services": {
    "matterport": true,
    "actScan": false,
    "additionalElevations": 12
  },

  "paymentTerms": "net30"
}
```

### Company Information
| Field | Value |
|-------|-------|
| Company Name | Philadelphia Preservation Society |
| Company Address | 321 Chestnut St, Philadelphia, PA 19106 |
| Industry | Non-Profit / Historic Preservation |

### Billing Contact
| Field | Value |
|-------|-------|
| First Name | Harold |
| Last Name | Whitmore |
| Email | hwhitmore@philapres.org |

### Expected Validation
- **Total Area:** 35,000 sqft across 2 historic buildings
- **Consistent High LOD:** 350 for architecture (heritage detail)
- **Maximum Elevations:** 12 for full facade documentation
- **No Risk Factors:** Unoccupied during scan

---

## Job 14: Wilmington Mega-Warehouse Complex (3 Areas)

**Test Focus:** Massive industrial complex, all risk factors, maximum size tier.

### Full API Payload
```json
{
  "clientName": "Wilmington Logistics Corp",
  "projectName": "Wilmington Distribution Campus Survey",
  "projectAddress": "613 Warehouse, Wilmington, MA 01887",

  "contactFirstName": "James",
  "contactLastName": "O'Brien",
  "contactEmail": "chase@scan2plan.io",
  "contactPhone": "(978) 555-0404",

  "areas": [
    {
      "name": "Main Distribution Center",
      "buildingType": "11",
      "squareFeet": "435000",
      "disciplines": ["architecture", "structure"],
      "disciplineLods": {
        "architecture": { "discipline": "architecture", "lod": "200", "scope": "interior" },
        "structure": { "discipline": "structure", "lod": "200", "scope": "full" }
      }
    },
    {
      "name": "Automated Sorting Facility",
      "buildingType": "10",
      "squareFeet": "125000",
      "disciplines": ["architecture", "mepf", "structure"],
      "disciplineLods": {
        "architecture": { "discipline": "architecture", "lod": "200", "scope": "interior" },
        "mepf": { "discipline": "mepf", "lod": "300", "scope": "full" },
        "structure": { "discipline": "structure", "lod": "200", "scope": "full" }
      }
    },
    {
      "name": "Fleet Maintenance Building",
      "buildingType": "10",
      "squareFeet": "90000",
      "disciplines": ["architecture", "mepf"],
      "disciplineLods": {
        "architecture": { "discipline": "architecture", "lod": "200", "scope": "full" },
        "mepf": { "discipline": "mepf", "lod": "350", "scope": "full" }
      }
    }
  ],

  "risks": ["occupied", "hazardous", "no_power"],

  "dispatchLocation": "troy",
  "distance": 180,

  "services": {
    "matterport": false,
    "actScan": false,
    "additionalElevations": 0
  },

  "paymentTerms": "net60"
}
```

### Company Information
| Field | Value |
|-------|-------|
| Company Name | Wilmington Logistics Corp |
| Company Address | 100 Commerce Way, Wilmington, MA 01887 |
| Industry | Logistics / Supply Chain |

### Billing Contact
| Field | Value |
|-------|-------|
| First Name | Patricia |
| Last Name | Sullivan |
| Email | psullivan@wilmingtonlogistics.com |

### Expected Validation
- **Total Area:** 650,000 sqft - maximum size tier
- **3 Buildings:** Mixed warehouse + mechanical
- **All Risks:** Occupied (+15%) + Hazardous (+25%) + No Power (+20%) = +60%
- **High MEPF LOD:** 350 for fleet maintenance systems

---

## Job 15: SoHo Retail - Dual Storefront (2 Areas)

**Test Focus:** Connected retail spaces with different configurations, Net 15 terms.

### Full API Payload
```json
{
  "clientName": "Mercer Street Retail LLC",
  "projectName": "SoHo Flagship Store Survey",
  "projectAddress": "69 Mercer St, New York, NY 10012",

  "contactFirstName": "Sofia",
  "contactLastName": "Martinez",
  "contactEmail": "chase@scan2plan.io",
  "contactPhone": "(212) 555-0505",

  "areas": [
    {
      "name": "Ground Floor Retail",
      "buildingType": "5",
      "squareFeet": "5200",
      "disciplines": ["architecture", "mepf"],
      "disciplineLods": {
        "architecture": { "discipline": "architecture", "lod": "350", "scope": "full" },
        "mepf": { "discipline": "mepf", "lod": "300", "scope": "interior" }
      }
    },
    {
      "name": "Basement Stockroom + Mechanical",
      "buildingType": "11",
      "squareFeet": "6800",
      "disciplines": ["architecture", "mepf", "structure"],
      "disciplineLods": {
        "architecture": { "discipline": "architecture", "lod": "200", "scope": "interior" },
        "mepf": { "discipline": "mepf", "lod": "350", "scope": "full" },
        "structure": { "discipline": "structure", "lod": "200", "scope": "full" }
      }
    }
  ],

  "risks": ["occupied"],

  "dispatchLocation": "brooklyn",
  "distance": 3,

  "services": {
    "matterport": true,
    "actScan": false,
    "additionalElevations": 0
  },

  "paymentTerms": "net15"
}
```

### Company Information
| Field | Value |
|-------|-------|
| Company Name | Mercer Street Retail LLC |
| Company Address | 69 Mercer St, 2nd Floor, New York, NY 10012 |
| Industry | Luxury Retail |

### Billing Contact
| Field | Value |
|-------|-------|
| First Name | Anthony |
| Last Name | Ricci |
| Email | aricci@mercerretail.com |

### Expected Validation
- **Total Area:** 12,000 sqft across 2 levels
- **Mixed Building Types:** Retail (5) + Warehouse (11)
- **Net 15 Terms:** Tests premium payment formatting
- **High MEPF in basement:** 350 for mechanical systems

---

## Job 16: Woolworth Building - Comprehensive Survey (3 Areas)

**Test Focus:** Iconic building with mixed floor types, all services, extensive scope.

### Full API Payload
```json
{
  "clientName": "Woolworth Building Management Inc",
  "projectName": "Woolworth Tower Comprehensive BIM",
  "projectAddress": "233 Broadway, New York, NY 10007",

  "contactFirstName": "Alexander",
  "contactLastName": "Thompson",
  "contactEmail": "chase@scan2plan.io",
  "contactPhone": "(212) 555-0606",

  "areas": [
    {
      "name": "Lobby & Common Areas",
      "buildingType": "8",
      "squareFeet": "15000",
      "disciplines": ["architecture", "structure"],
      "disciplineLods": {
        "architecture": { "discipline": "architecture", "lod": "350", "scope": "full" },
        "structure": { "discipline": "structure", "lod": "350", "scope": "full" }
      }
    },
    {
      "name": "Office Floors 20-35",
      "buildingType": "4",
      "squareFeet": "55000",
      "disciplines": ["architecture", "mepf", "structure"],
      "disciplineLods": {
        "architecture": { "discipline": "architecture", "lod": "300", "scope": "full" },
        "mepf": { "discipline": "mepf", "lod": "300", "scope": "interior" },
        "structure": { "discipline": "structure", "lod": "200", "scope": "full" }
      }
    },
    {
      "name": "Mechanical Penthouse",
      "buildingType": "10",
      "squareFeet": "15000",
      "disciplines": ["mepf", "structure"],
      "disciplineLods": {
        "mepf": { "discipline": "mepf", "lod": "350", "scope": "full" },
        "structure": { "discipline": "structure", "lod": "300", "scope": "full" }
      }
    }
  ],

  "risks": ["occupied"],

  "dispatchLocation": "brooklyn",
  "distance": 5,

  "services": {
    "matterport": true,
    "actScan": true,
    "additionalElevations": 8
  },

  "paymentTerms": "net45"
}
```

### Company Information
| Field | Value |
|-------|-------|
| Company Name | Woolworth Building Management Inc |
| Company Address | 233 Broadway, Suite 2700, New York, NY 10007 |
| Industry | Property Management |

### Billing Contact
| Field | Value |
|-------|-------|
| First Name | Catherine |
| Last Name | Wright |
| Email | cwright@woolworthbldg.com |

### Expected Validation
- **Total Area:** 85,000 sqft across 3 distinct areas
- **3 Building Types:** Museum/Theatre (8), Commercial (4), Mechanical (10)
- **Lobby LOD 350:** Historic detail preservation
- **All Services:** Full documentation package

---

## Job 17: Taunton Cold Storage - Dual Facility (2 Areas)

**Test Focus:** Challenging industrial environment, dual hazardous facilities.

### Full API Payload
```json
{
  "clientName": "Taunton Cold Storage Inc",
  "projectName": "Cold Chain Facility Complete Survey",
  "projectAddress": "425 John Quincy Adams Rd, Taunton, MA 02780",

  "contactFirstName": "Robert",
  "contactLastName": "Kelly",
  "contactEmail": "chase@scan2plan.io",
  "contactPhone": "(508) 555-0707",

  "areas": [
    {
      "name": "Primary Cold Storage",
      "buildingType": "11",
      "squareFeet": "85000",
      "disciplines": ["architecture", "mepf"],
      "disciplineLods": {
        "architecture": { "discipline": "architecture", "lod": "200", "scope": "interior" },
        "mepf": { "discipline": "mepf", "lod": "350", "scope": "full" }
      }
    },
    {
      "name": "Ammonia Refrigeration Plant",
      "buildingType": "10",
      "squareFeet": "65000",
      "disciplines": ["architecture", "mepf", "structure"],
      "disciplineLods": {
        "architecture": { "discipline": "architecture", "lod": "200", "scope": "full" },
        "mepf": { "discipline": "mepf", "lod": "350", "scope": "full" },
        "structure": { "discipline": "structure", "lod": "300", "scope": "full" }
      }
    }
  ],

  "risks": ["hazardous", "no_power"],

  "dispatchLocation": "troy",
  "distance": 200,

  "services": {
    "matterport": false,
    "actScan": true,
    "additionalElevations": 0
  },

  "paymentTerms": "net60"
}
```

### Company Information
| Field | Value |
|-------|-------|
| Company Name | Taunton Cold Storage Inc |
| Company Address | 425 John Quincy Adams Rd, Taunton, MA 02780 |
| Industry | Cold Chain / Food Storage |

### Billing Contact
| Field | Value |
|-------|-------|
| First Name | Diane |
| Last Name | Murphy |
| Email | dmurphy@tauntoncold.com |

### Expected Validation
- **Total Area:** 150,000 sqft across 2 facilities
- **High MEPF Everywhere:** 350 for refrigeration systems
- **Dual Risk:** Hazardous (+25%) + No Power (+20%) = +45%
- **ACT Scan:** For ceiling systems documentation

---

## Job 18: Presidential City - Multi-Tower Campus (4 Areas)

**Test Focus:** Maximum area count, repetitive residential towers.

### Full API Payload
```json
{
  "clientName": "Presidential City Partners LLC",
  "projectName": "Presidential City Campus Master BIM",
  "projectAddress": "3900 City Ave, Philadelphia, PA 19131",

  "contactFirstName": "David",
  "contactLastName": "Washington",
  "contactEmail": "chase@scan2plan.io",
  "contactPhone": "(215) 555-0808",

  "areas": [
    {
      "name": "Tower A - Washington",
      "buildingType": "2",
      "squareFeet": "95000",
      "disciplines": ["architecture", "mepf"],
      "disciplineLods": {
        "architecture": { "discipline": "architecture", "lod": "300", "scope": "full" },
        "mepf": { "discipline": "mepf", "lod": "300", "scope": "interior" }
      }
    },
    {
      "name": "Tower B - Jefferson",
      "buildingType": "2",
      "squareFeet": "95000",
      "disciplines": ["architecture", "mepf"],
      "disciplineLods": {
        "architecture": { "discipline": "architecture", "lod": "300", "scope": "full" },
        "mepf": { "discipline": "mepf", "lod": "300", "scope": "interior" }
      }
    },
    {
      "name": "Tower C - Adams",
      "buildingType": "2",
      "squareFeet": "95000",
      "disciplines": ["architecture", "mepf"],
      "disciplineLods": {
        "architecture": { "discipline": "architecture", "lod": "300", "scope": "full" },
        "mepf": { "discipline": "mepf", "lod": "300", "scope": "interior" }
      }
    },
    {
      "name": "Central Amenity Building",
      "buildingType": "8",
      "squareFeet": "35000",
      "disciplines": ["architecture", "mepf", "structure"],
      "disciplineLods": {
        "architecture": { "discipline": "architecture", "lod": "350", "scope": "full" },
        "mepf": { "discipline": "mepf", "lod": "300", "scope": "full" },
        "structure": { "discipline": "structure", "lod": "200", "scope": "full" }
      }
    }
  ],

  "risks": ["occupied"],

  "dispatchLocation": "brooklyn",
  "distance": 100,

  "services": {
    "matterport": true,
    "actScan": false,
    "additionalElevations": 8
  },

  "paymentTerms": "net60"
}
```

### Company Information
| Field | Value |
|-------|-------|
| Company Name | Presidential City Partners LLC |
| Company Address | 3900 City Ave, Suite 100, Philadelphia, PA 19131 |
| Industry | Multi-Family Residential |

### Billing Contact
| Field | Value |
|-------|-------|
| First Name | Linda |
| Last Name | Jackson |
| Email | ljackson@presidentialcity.com |

### Expected Validation
- **Total Area:** 320,000 sqft across 4 buildings
- **4 Areas:** Tests maximum area handling
- **Consistent Tower Specs:** Tests repetitive unit pricing
- **Amenity Building LOD 350:** Higher detail for public spaces

---

## Job 19: Tobin Center - Full Campus (3 Areas)

**Test Focus:** Performing arts complex, 50/50 payment terms, site discipline.

### Full API Payload
```json
{
  "clientName": "Tobin Center for the Performing Arts",
  "projectName": "Tobin Center Complete Campus BIM",
  "projectAddress": "100 Auditorium Cir, San Antonio, TX 78205",

  "contactFirstName": "Maria",
  "contactLastName": "Rodriguez",
  "contactEmail": "chase@scan2plan.io",
  "contactPhone": "(210) 555-0909",

  "areas": [
    {
      "name": "Main Performance Hall",
      "buildingType": "8",
      "squareFeet": "125000",
      "disciplines": ["architecture", "structure", "mepf"],
      "disciplineLods": {
        "architecture": { "discipline": "architecture", "lod": "350", "scope": "full" },
        "structure": { "discipline": "structure", "lod": "300", "scope": "full" },
        "mepf": { "discipline": "mepf", "lod": "350", "scope": "full" }
      }
    },
    {
      "name": "Studio Theater & Rehearsal",
      "buildingType": "8",
      "squareFeet": "50000",
      "disciplines": ["architecture", "mepf"],
      "disciplineLods": {
        "architecture": { "discipline": "architecture", "lod": "300", "scope": "full" },
        "mepf": { "discipline": "mepf", "lod": "300", "scope": "interior" }
      }
    },
    {
      "name": "Plaza & Exterior Grounds",
      "buildingType": "15",
      "squareFeet": "50000",
      "kind": "landscape",
      "disciplines": ["site"],
      "disciplineLods": {
        "site": { "discipline": "site", "lod": "200", "scope": "full" }
      }
    }
  ],

  "risks": ["occupied"],

  "dispatchLocation": "troy",
  "distance": 0,
  "customTravelCost": 12500,

  "services": {
    "matterport": true,
    "actScan": true,
    "additionalElevations": 10
  },

  "paymentTerms": "50/50"
}
```

### Company Information
| Field | Value |
|-------|-------|
| Company Name | Tobin Center for the Performing Arts |
| Company Address | 100 Auditorium Cir, San Antonio, TX 78205 |
| Industry | Arts / Entertainment |

### Billing Contact
| Field | Value |
|-------|-------|
| First Name | Carlos |
| Last Name | Hernandez |
| Email | chernandez@tobincenter.org |

### Expected Validation
- **Total Area:** 225,000 sqft across 3 areas
- **Site/Landscape Area:** Tests buildingType 15 + kind:landscape
- **50/50 Payment:** Tests "50% Deposit / 50% on Completion" display
- **Flyout Travel:** $12,500 custom travel cost
- **All Services:** Full documentation package

---

## Job 20: Clark Ave Industrial - Dual Facility (2 Areas)

**Test Focus:** Industrial complex, high MEPF focus, dual hazardous zones.

### Full API Payload
```json
{
  "clientName": "Clark Avenue Industrial LLC",
  "projectName": "Clark Ave Industrial Complex Survey",
  "projectAddress": "2810 Clark Ave, St. Louis, MO 63103",

  "contactFirstName": "Michael",
  "contactLastName": "Johnson",
  "contactEmail": "chase@scan2plan.io",
  "contactPhone": "(314) 555-1010",

  "areas": [
    {
      "name": "Inspection Facility A",
      "buildingType": "10",
      "squareFeet": "12000",
      "disciplines": ["architecture", "mepf", "structure"],
      "disciplineLods": {
        "architecture": { "discipline": "architecture", "lod": "200", "scope": "interior" },
        "mepf": { "discipline": "mepf", "lod": "350", "scope": "full" },
        "structure": { "discipline": "structure", "lod": "300", "scope": "full" }
      }
    },
    {
      "name": "Heavy Equipment Testing Lab",
      "buildingType": "10",
      "squareFeet": "16000",
      "disciplines": ["architecture", "mepf", "structure"],
      "disciplineLods": {
        "architecture": { "discipline": "architecture", "lod": "200", "scope": "interior" },
        "mepf": { "discipline": "mepf", "lod": "350", "scope": "full" },
        "structure": { "discipline": "structure", "lod": "350", "scope": "full" }
      }
    }
  ],

  "risks": ["hazardous", "no_power"],

  "dispatchLocation": "troy",
  "distance": 0,
  "customTravelCost": 6500,

  "services": {
    "matterport": false,
    "actScan": false,
    "additionalElevations": 0
  },

  "paymentTerms": "net30"
}
```

### Company Information
| Field | Value |
|-------|-------|
| Company Name | Clark Avenue Industrial LLC |
| Company Address | 2810 Clark Ave, St. Louis, MO 63103 |
| Industry | Industrial Inspection Services |

### Billing Contact
| Field | Value |
|-------|-------|
| First Name | Karen |
| Last Name | Williams |
| Email | kwilliams@clarkaveindustrial.com |

### Expected Validation
- **Total Area:** 28,000 sqft across 2 industrial facilities
- **Consistent Building Type:** Both Mechanical (10)
- **High MEPF + Structure:** 350 for equipment documentation
- **Dual Risk:** Hazardous (+25%) + No Power (+20%) = +45%
- **Flyout Travel:** $6,500 custom travel cost

---

## Validation Checklist

### Payment Terms Display
| Job | Expected Display |
|-----|------------------|
| 11 | Net 30 |
| 12 | Net 45 |
| 13 | Net 30 |
| 14 | Net 60 |
| 15 | Net 15 |
| 16 | Net 45 |
| 17 | Net 60 |
| 18 | Net 60 |
| 19 | 50% Deposit / 50% on Completion |
| 20 | Net 30 |

### Multi-Area Display
All quotes should show multiple areas in the scope table, not combined into single rows.

### LOD Display
Per-discipline LODs should be visible, especially:
- Job 11: Mixed 350/300/200
- Job 14: Mostly 200 with one 350 MEPF
- Job 16: 350 lobby, 300 office, 350 mechanical

### Contact Email
All proposals should show: **chase@scan2plan.io**

---

*Document Version: 1.0*  
*Last Updated: January 2026*  
*Complex multi-area test suite for CRM-CPQ validation*
