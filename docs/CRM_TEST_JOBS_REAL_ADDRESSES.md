# CRM-CPQ Integration Test Jobs - Real Address Edition

This document contains 10 test jobs using real addresses for accurate travel calculation and mapping features. Each job exercises different building types, sizes, and geographic dispatch scenarios.

---

## Quick Reference Matrix

| Job | Property | Type | Est. Sqft | CPQ Type | Dispatch | Travel |
|-----|----------|------|-----------|----------|----------|--------|
| 1 | 2525 Purchase St, Purchase, NY | Mega Mansion | 14,700 | 3 (Luxury) | brooklyn | Regional |
| 2 | 255 Greenwich St, NYC | Class A Office | 51,500 | 4 (Commercial) | brooklyn | Local |
| 3 | 1218 Arch St, Philadelphia | Historic/AIA | 20,000 | 8 (Theatre/Museum) | brooklyn | Regional |
| 4 | 613 Warehouse, Wilmington, MA | Logistics Hub | 435,000 | 11 (Warehouse) | troy | Regional |
| 5 | 69 Mercer St, NYC | SoHo Loft | 5,200 | 5 (Retail) | brooklyn | Local |
| 6 | 233 Broadway, NYC | Woolworth Bldg | 30,000 | 4 (Commercial) | brooklyn | Local |
| 7 | 425 John Quincy Adams Rd, Taunton, MA | Cold Storage | 85,000 | 11 (Warehouse) | troy | Regional |
| 8 | 3900 City Ave, Philadelphia | Multi-Unit High-Rise | 120,000 | 2 (Multi Family) | brooklyn | Regional |
| 9 | Tobin Center, San Antonio, TX | Performing Arts | 175,000 | 8 (Theatre/Museum) | troy | Flyout |
| 10 | 2810 Clark Ave, St. Louis, MO | Industrial/Lab | 12,000 | 10 (Mechanical) | troy | Flyout |

---

## Job 1: Mega Mansion - Complex Internal Registration

**Test Focus:** Massive residential estate with 12 bathrooms. Tests complex internal room-to-room registration.

### Full API Payload
```json
{
  "clientName": "Purchase Estate Holdings",
  "projectName": "Purchase Mega Mansion As-Built",
  "projectAddress": "2525 Purchase St, Purchase, NY 10577",

  "areas": [
    {
      "name": "Main Residence",
      "buildingType": "3",
      "squareFeet": "14700",
      "disciplines": ["architecture", "mepf"],
      "disciplineLods": {
        "architecture": {
          "discipline": "architecture",
          "lod": "350",
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

  "risks": ["occupied"],

  "dispatchLocation": "brooklyn",
  "distance": 35,

  "services": {
    "matterport": true,
    "actScan": false,
    "additionalElevations": 4
  },

  "paymentTerms": "net30"
}
```

### Company Information
| Field | Value |
|-------|-------|
| Company Name | Purchase Estate Holdings LLC |
| Company Address | 1000 Westchester Ave, Suite 400, White Plains, NY 10604 |
| Company Phone | (914) 555-0100 |
| Company Website | www.purchaseestateholdings.com |
| Industry | Real Estate Investment |

### Primary Contact
| Field | Value |
|-------|-------|
| First Name | Victoria |
| Last Name | Ashworth |
| Title | Director of Property Management |
| Email | vashworth@purchaseestate.com |
| Phone | (914) 555-0101 |
| Mobile | (914) 555-0102 |

### Billing Contact
| Field | Value |
|-------|-------|
| First Name | Thomas |
| Last Name | Pemberton |
| Title | CFO |
| Email | tpemberton@purchaseestate.com |
| Phone | (914) 555-0105 |
| Billing Address | 1000 Westchester Ave, Suite 400, White Plains, NY 10604 |

### Expected Validation
- **Tier:** 10k-20k sqft
- **Building Type:** Luxury residential premium
- **LoD:** High detail (350 Arch, 300 MEPF)
- **Travel:** ~35 miles from Brooklyn
- **Risk:** Occupied (+15%)
- **Services:** Matterport + 4 additional elevations

---

## Job 2: Class A Office - High-Density Workspace

**Test Focus:** Large commercial floor plate in Lower Manhattan. Tests high-density workspace layout.

### Full API Payload
```json
{
  "clientName": "Greenwich Street Partners",
  "projectName": "255 Greenwich Office BIM",
  "projectAddress": "255 Greenwich St, New York, NY 10007",

  "areas": [
    {
      "name": "Office Floors 10-15",
      "buildingType": "4",
      "squareFeet": "51500",
      "disciplines": ["architecture", "mepf", "structure"],
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
        },
        "structure": {
          "discipline": "structure",
          "lod": "200",
          "scope": "full"
        }
      }
    }
  ],

  "risks": ["occupied"],

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
| Company Phone | (212) 555-0200 |
| Company Website | www.greenwichstreetpartners.com |
| Industry | Commercial Real Estate |

### Primary Contact
| Field | Value |
|-------|-------|
| First Name | Marcus |
| Last Name | Chen |
| Title | VP of Facilities |
| Email | mchen@greenwichpartners.com |
| Phone | (212) 555-0202 |
| Mobile | (917) 555-0203 |

### Billing Contact
| Field | Value |
|-------|-------|
| First Name | Rebecca |
| Last Name | Goldman |
| Title | Controller |
| Email | rgoldman@greenwichpartners.com |
| Phone | (212) 555-0210 |
| Billing Address | 255 Greenwich St, 40th Floor, New York, NY 10007 |

### Expected Validation
- **Tier:** 50k-75k sqft
- **Building Type:** Commercial/Office
- **Scope:** Interior only for Arch/MEPF
- **Travel:** ~5 miles from Brooklyn (local)
- **Risk:** Occupied (+15%)
- **Services:** ACT Scan

---

## Job 3: Historic/AIA Building - Precision Architecture

**Test Focus:** Historic structure with ornate details. Tests precision in non-standard architecture.

### Full API Payload
```json
{
  "clientName": "Philadelphia Preservation Society",
  "projectName": "1218 Arch Historic Documentation",
  "projectAddress": "1218 Arch St, Philadelphia, PA 19107",

  "areas": [
    {
      "name": "Historic Main Building",
      "buildingType": "8",
      "squareFeet": "20000",
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
    }
  ],

  "risks": [],

  "dispatchLocation": "brooklyn",
  "distance": 95,

  "services": {
    "matterport": true,
    "actScan": false,
    "additionalElevations": 8
  },

  "paymentTerms": "net30"
}
```

### Company Information
| Field | Value |
|-------|-------|
| Company Name | Philadelphia Preservation Society |
| Company Address | 321 Chestnut St, Philadelphia, PA 19106 |
| Company Phone | (215) 555-0300 |
| Company Website | www.philadelphiapreservation.org |
| Industry | Non-Profit / Historic Preservation |

### Primary Contact
| Field | Value |
|-------|-------|
| First Name | Eleanor |
| Last Name | Richardson |
| Title | Executive Director |
| Email | erichardson@philapres.org |
| Phone | (215) 555-0303 |
| Mobile | (215) 555-0304 |

### Billing Contact
| Field | Value |
|-------|-------|
| First Name | Harold |
| Last Name | Whitmore |
| Title | Finance Director |
| Email | hwhitmore@philapres.org |
| Phone | (215) 555-0315 |
| Billing Address | 321 Chestnut St, Philadelphia, PA 19106 |

### Expected Validation
- **Tier:** 10k-20k sqft (or 20k-30k depending on tier boundaries)
- **Building Type:** Hotel/Theatre/Museum (historic premium)
- **LoD:** Maximum detail (350) for ornate architecture
- **Travel:** ~95 miles from Brooklyn to Philadelphia
- **Services:** Matterport + 8 additional elevations (facade details)

---

## Job 4: Logistics Hub - Long-Range LiDAR

**Test Focus:** Massive open warehouse with 54 loading docks. Tests long-range LiDAR and loop closure.

### Full API Payload
```json
{
  "clientName": "Wilmington Logistics Corp",
  "projectName": "613 Warehouse Facility Scan",
  "projectAddress": "613 Warehouse, Wilmington, MA 01887",

  "areas": [
    {
      "name": "Main Warehouse",
      "buildingType": "11",
      "squareFeet": "435000",
      "disciplines": ["architecture", "structure"],
      "disciplineLods": {
        "architecture": {
          "discipline": "architecture",
          "lod": "200",
          "scope": "interior"
        },
        "structure": {
          "discipline": "structure",
          "lod": "200",
          "scope": "full"
        }
      }
    }
  ],

  "risks": ["occupied", "hazardous"],

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
| Company Phone | (978) 555-0400 |
| Company Website | www.wilmingtonlogistics.com |
| Industry | Logistics / Supply Chain |

### Primary Contact
| Field | Value |
|-------|-------|
| First Name | James |
| Last Name | O'Brien |
| Title | Operations Manager |
| Email | jobrien@wilmingtonlogistics.com |
| Phone | (978) 555-0404 |
| Mobile | (978) 555-0405 |

### Billing Contact
| Field | Value |
|-------|-------|
| First Name | Patricia |
| Last Name | Sullivan |
| Title | Accounts Payable Manager |
| Email | psullivan@wilmingtonlogistics.com |
| Phone | (978) 555-0420 |
| Billing Address | 100 Commerce Way, Wilmington, MA 01887 |

### Expected Validation
- **Tier:** Highest tier (300k+ sqft)
- **Building Type:** Warehouse/Storage
- **LoD:** Base level (200) - open warehouse doesn't need high detail
- **Travel:** ~180 miles from Troy to Wilmington, MA
- **Risk:** Occupied (+15%) + Hazardous (+25%) = +40%

---

## Job 5: SoHo Loft - Cast-Iron Architecture

**Test Focus:** Classic cast-iron building with high ceilings and columns. Tests "SoHo style" retail space mapping.

### Full API Payload
```json
{
  "clientName": "Mercer Street Retail LLC",
  "projectName": "69 Mercer SoHo Loft Survey",
  "projectAddress": "69 Mercer St, New York, NY 10012",

  "areas": [
    {
      "name": "Retail Loft Space",
      "buildingType": "5",
      "squareFeet": "5200",
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
          "scope": "interior"
        }
      }
    }
  ],

  "risks": ["occupied"],

  "dispatchLocation": "brooklyn",
  "distance": 3,

  "services": {
    "matterport": true,
    "actScan": false,
    "additionalElevations": 2
  },

  "paymentTerms": "net30"
}
```

### Company Information
| Field | Value |
|-------|-------|
| Company Name | Mercer Street Retail LLC |
| Company Address | 69 Mercer St, 2nd Floor, New York, NY 10012 |
| Company Phone | (212) 555-0500 |
| Company Website | www.mercerstreetretail.com |
| Industry | Luxury Retail |

### Primary Contact
| Field | Value |
|-------|-------|
| First Name | Sofia |
| Last Name | Martinez |
| Title | Store Development Director |
| Email | smartinez@mercerretail.com |
| Phone | (212) 555-0505 |
| Mobile | (917) 555-0506 |

### Billing Contact
| Field | Value |
|-------|-------|
| First Name | Anthony |
| Last Name | Ricci |
| Title | Finance Manager |
| Email | aricci@mercerretail.com |
| Phone | (212) 555-0515 |
| Billing Address | 69 Mercer St, 2nd Floor, New York, NY 10012 |

### Expected Validation
- **Tier:** 5k-10k sqft
- **Building Type:** Retail/Restaurants
- **Travel:** ~3 miles from Brooklyn (local)
- **Risk:** Occupied (+15%)
- **Services:** Matterport + 2 elevations

---

## Job 6: Woolworth Building - Vertical Alignment

**Test Focus:** Segment scan of the iconic skyscraper. Tests vertical alignment and high-traffic area scanning.

### Full API Payload
```json
{
  "clientName": "Woolworth Building Management",
  "projectName": "Woolworth Building Partial BIM",
  "projectAddress": "233 Broadway, New York, NY 10007",

  "areas": [
    {
      "name": "Floors 15-25",
      "buildingType": "4",
      "squareFeet": "30000",
      "disciplines": ["architecture", "structure", "mepf"],
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
          "lod": "300",
          "scope": "interior"
        }
      }
    }
  ],

  "risks": ["occupied"],

  "dispatchLocation": "brooklyn",
  "distance": 5,

  "services": {
    "matterport": true,
    "actScan": true,
    "additionalElevations": 6
  },

  "paymentTerms": "net45"
}
```

### Company Information
| Field | Value |
|-------|-------|
| Company Name | Woolworth Building Management Inc |
| Company Address | 233 Broadway, Suite 2700, New York, NY 10007 |
| Company Phone | (212) 555-0600 |
| Company Website | www.woolworthbuilding.com |
| Industry | Property Management |

### Primary Contact
| Field | Value |
|-------|-------|
| First Name | Alexander |
| Last Name | Thompson |
| Title | Building Manager |
| Email | athompson@woolworthbldg.com |
| Phone | (212) 555-0606 |
| Mobile | (917) 555-0607 |

### Billing Contact
| Field | Value |
|-------|-------|
| First Name | Catherine |
| Last Name | Wright |
| Title | Director of Finance |
| Email | cwright@woolworthbldg.com |
| Phone | (212) 555-0625 |
| Billing Address | 233 Broadway, Suite 2700, New York, NY 10007 |

### Expected Validation
- **Tier:** 20k-30k sqft (or 30k-50k)
- **Building Type:** Commercial/Office
- **LoD:** High detail (350 Arch) for ornate historic office
- **Travel:** ~5 miles from Brooklyn (local)
- **Risk:** Occupied (+15%)
- **Services:** Matterport + ACT Scan + 6 elevations (iconic facade)

---

## Job 7: Cold Storage - Reflective/Metallic Environments

**Test Focus:** Industrial facility with specialized thermal zones. Tests mapping in highly reflective/metallic areas.

### Full API Payload
```json
{
  "clientName": "Taunton Cold Storage Inc",
  "projectName": "Cold Storage Facility BIM",
  "projectAddress": "425 John Quincy Adams Rd, Taunton, MA 02780",

  "areas": [
    {
      "name": "Cold Storage Facility",
      "buildingType": "11",
      "squareFeet": "85000",
      "disciplines": ["architecture", "mepf"],
      "disciplineLods": {
        "architecture": {
          "discipline": "architecture",
          "lod": "200",
          "scope": "interior"
        },
        "mepf": {
          "discipline": "mepf",
          "lod": "350",
          "scope": "full"
        }
      }
    }
  ],

  "risks": ["hazardous", "no_power"],

  "dispatchLocation": "troy",
  "distance": 200,

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
| Company Name | Taunton Cold Storage Inc |
| Company Address | 425 John Quincy Adams Rd, Taunton, MA 02780 |
| Company Phone | (508) 555-0700 |
| Company Website | www.tauntoncoldstorage.com |
| Industry | Cold Chain / Food Storage |

### Primary Contact
| Field | Value |
|-------|-------|
| First Name | Robert |
| Last Name | Kelly |
| Title | Facility Director |
| Email | rkelly@tauntoncold.com |
| Phone | (508) 555-0707 |
| Mobile | (508) 555-0708 |

### Billing Contact
| Field | Value |
|-------|-------|
| First Name | Diane |
| Last Name | Murphy |
| Title | Accounting Manager |
| Email | dmurphy@tauntoncold.com |
| Phone | (508) 555-0720 |
| Billing Address | 425 John Quincy Adams Rd, Taunton, MA 02780 |

### Expected Validation
- **Tier:** 75k-100k sqft
- **Building Type:** Warehouse/Storage
- **LoD:** High MEPF (350) for refrigeration systems, low Arch (200)
- **Travel:** ~200 miles from Troy to Taunton, MA
- **Risk:** Hazardous (+25%) + No Power (+20%) = +45%

---

## Job 8: Multi-Unit High-Rise - Repetitive Corridors

**Test Focus:** Large apartment complex (Presidential City). Tests repetitive corridor and unit-stacking logic.

### Full API Payload
```json
{
  "clientName": "Presidential City Partners",
  "projectName": "Presidential City Tower Survey",
  "projectAddress": "3900 City Ave, Philadelphia, PA 19131",

  "areas": [
    {
      "name": "Residential Tower",
      "buildingType": "2",
      "squareFeet": "120000",
      "disciplines": ["architecture", "mepf", "structure"],
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
        },
        "structure": {
          "discipline": "structure",
          "lod": "200",
          "scope": "full"
        }
      }
    }
  ],

  "risks": ["occupied"],

  "dispatchLocation": "brooklyn",
  "distance": 100,

  "services": {
    "matterport": false,
    "actScan": true,
    "additionalElevations": 4
  },

  "paymentTerms": "net60"
}
```

### Company Information
| Field | Value |
|-------|-------|
| Company Name | Presidential City Partners LLC |
| Company Address | 3900 City Ave, Suite 100, Philadelphia, PA 19131 |
| Company Phone | (215) 555-0800 |
| Company Website | www.presidentialcityapts.com |
| Industry | Multi-Family Residential |

### Primary Contact
| Field | Value |
|-------|-------|
| First Name | David |
| Last Name | Washington |
| Title | Property Manager |
| Email | dwashington@presidentialcity.com |
| Phone | (215) 555-0808 |
| Mobile | (215) 555-0809 |

### Billing Contact
| Field | Value |
|-------|-------|
| First Name | Linda |
| Last Name | Jackson |
| Title | VP of Finance |
| Email | ljackson@presidentialcity.com |
| Phone | (215) 555-0830 |
| Billing Address | 3900 City Ave, Suite 100, Philadelphia, PA 19131 |

### Expected Validation
- **Tier:** 100k-150k sqft
- **Building Type:** Residential - Multi Family
- **Travel:** ~100 miles from Brooklyn to Philadelphia
- **Risk:** Occupied (+15%)
- **Services:** ACT Scan + 4 elevations

---

## Job 9: Performing Arts Center - Non-Linear Walls

**Test Focus:** Complex theater seating and curved acoustics. Tests the AI's ability to handle non-linear walls.

### Full API Payload
```json
{
  "clientName": "Tobin Center for the Performing Arts",
  "projectName": "Tobin Center Full BIM",
  "projectAddress": "100 Auditorium Cir, San Antonio, TX 78205",

  "areas": [
    {
      "name": "Main Theater Complex",
      "buildingType": "8",
      "squareFeet": "175000",
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

  "dispatchLocation": "troy",
  "distance": 0,
  "customTravelCost": 8500,

  "services": {
    "matterport": true,
    "actScan": true,
    "additionalElevations": 6
  },

  "paymentTerms": "net45"
}
```

### Company Information
| Field | Value |
|-------|-------|
| Company Name | Tobin Center for the Performing Arts |
| Company Address | 100 Auditorium Cir, San Antonio, TX 78205 |
| Company Phone | (210) 555-0900 |
| Company Website | www.tobincenter.org |
| Industry | Arts / Entertainment |

### Primary Contact
| Field | Value |
|-------|-------|
| First Name | Maria |
| Last Name | Rodriguez |
| Title | Director of Operations |
| Email | mrodriguez@tobincenter.org |
| Phone | (210) 555-0909 |
| Mobile | (210) 555-0910 |

### Billing Contact
| Field | Value |
|-------|-------|
| First Name | Carlos |
| Last Name | Hernandez |
| Title | CFO |
| Email | chernandez@tobincenter.org |
| Phone | (210) 555-0925 |
| Billing Address | 100 Auditorium Cir, San Antonio, TX 78205 |

### Expected Validation
- **Tier:** 150k+ sqft
- **Building Type:** Hotel/Theatre/Museum (performing arts premium)
- **LoD:** Maximum detail (350) for curved acoustics/architecture
- **Travel:** Flyout to San Antonio (customTravelCost = $8,500)
- **Risk:** Occupied (+15%)
- **Services:** All services enabled

---

## Job 10: Industrial/Lab - Cluttered Environment

**Test Focus:** Heavy industrial inspection facility. Tests "cluttered" environments with machinery and pipes.

### Full API Payload
```json
{
  "clientName": "Clark Avenue Industrial",
  "projectName": "Industrial Lab BIM Documentation",
  "projectAddress": "2810 Clark Ave, St. Louis, MO 63103",

  "areas": [
    {
      "name": "Inspection Facility",
      "buildingType": "10",
      "squareFeet": "12000",
      "disciplines": ["architecture", "mepf", "structure"],
      "disciplineLods": {
        "architecture": {
          "discipline": "architecture",
          "lod": "200",
          "scope": "interior"
        },
        "mepf": {
          "discipline": "mepf",
          "lod": "350",
          "scope": "full"
        },
        "structure": {
          "discipline": "structure",
          "lod": "300",
          "scope": "full"
        }
      }
    }
  ],

  "risks": ["hazardous", "no_power"],

  "dispatchLocation": "troy",
  "distance": 0,
  "customTravelCost": 4500,

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
| Company Phone | (314) 555-1000 |
| Company Website | www.clarkaveindustrial.com |
| Industry | Industrial Inspection Services |

### Primary Contact
| Field | Value |
|-------|-------|
| First Name | Michael |
| Last Name | Johnson |
| Title | Plant Manager |
| Email | mjohnson@clarkaveindustrial.com |
| Phone | (314) 555-1010 |
| Mobile | (314) 555-1011 |

### Billing Contact
| Field | Value |
|-------|-------|
| First Name | Karen |
| Last Name | Williams |
| Title | Controller |
| Email | kwilliams@clarkaveindustrial.com |
| Phone | (314) 555-1030 |
| Billing Address | 2810 Clark Ave, St. Louis, MO 63103 |

### Expected Validation
- **Tier:** 10k-20k sqft
- **Building Type:** Mechanical/Utility Rooms
- **LoD:** High MEPF (350) for pipes/machinery, low Arch (200)
- **Travel:** Flyout to St. Louis (customTravelCost = $4,500)
- **Risk:** Hazardous (+25%) + No Power (+20%) = +45%

---

## Geographic Coverage Summary

### Local (Brooklyn dispatch, <20 miles)
- Job 2: 255 Greenwich St, NYC (~5 mi)
- Job 5: 69 Mercer St, NYC (~3 mi)
- Job 6: 233 Broadway, NYC (~5 mi)

### Regional (Brooklyn dispatch, 20-150 miles)
- Job 1: Purchase, NY (~35 mi)
- Job 3: Philadelphia, PA (~95 mi)
- Job 8: Philadelphia, PA (~100 mi)

### Regional (Troy dispatch, 150-250 miles)
- Job 4: Wilmington, MA (~180 mi)
- Job 7: Taunton, MA (~200 mi)

### Flyout
- Job 9: San Antonio, TX ($8,500 travel)
- Job 10: St. Louis, MO ($4,500 travel)

---

## Building Type Coverage

| CPQ Type | Count | Jobs |
|----------|-------|------|
| 2 - Multi Family | 1 | Job 8 |
| 3 - Luxury | 1 | Job 1 |
| 4 - Commercial/Office | 2 | Jobs 2, 6 |
| 5 - Retail | 1 | Job 5 |
| 8 - Hotel/Theatre/Museum | 2 | Jobs 3, 9 |
| 10 - Mechanical/Utility | 1 | Job 10 |
| 11 - Warehouse/Storage | 2 | Jobs 4, 7 |

---

## Risk Factor Coverage

| Risk Combination | Jobs |
|------------------|------|
| Occupied only | Jobs 1, 2, 5, 6, 8, 9 |
| Occupied + Hazardous | Job 4 |
| Hazardous + No Power | Jobs 7, 10 |
| None | Job 3 |

---

## Database Record Summary (January 2026)

All 10 test jobs have been created in the development database:

| Job | Lead ID | Quote ID | Quote Number | Total Price | Margin |
|-----|---------|----------|--------------|-------------|--------|
| 1 | 66 | 76 | Q-2026-TEST-001 | $6,800 | 50% |
| 2 | 67 | 77 | Q-2026-TEST-002 | $42,500 | 50% |
| 3 | 68 | 78 | Q-2026-TEST-003 | $18,500 | 50% |
| 4 | 69 | 79 | Q-2026-TEST-004 | $125,000 | 50% |
| 5 | 70 | 80 | Q-2026-TEST-005 | $4,800 | 50% |
| 6 | 71 | 81 | Q-2026-TEST-006 | $32,500 | 50% |
| 7 | 72 | 82 | Q-2026-TEST-007 | $52,000 | 50% |
| 8 | 73 | 83 | Q-2026-TEST-008 | $78,000 | 50% |
| 9 | 74 | 84 | Q-2026-TEST-009 | $165,000 | 50% |
| 10 | 75 | 85 | Q-2026-TEST-010 | $18,500 | 50% |

**Total Pipeline Value:** $544,100

### Data Normalization Applied
- **Dispatch Locations:** All normalized to UPPERCASE (BROOKLYN, TROY) for database/QuickBooks/Salesforce compatibility
- **Area Kind:** All areas set to `standard` (landscape areas would use `14-15` buildingType)
- **Pricing Breakdown:** Each quote includes `totalClientPrice`, `totalUpteamCost`, `areaBreakdown`, `travelCost`, `riskPremium`, `servicesTotal`, and `margin` fields

### How to Query Test Data
```sql
-- Get all test leads with quotes
SELECT l.id, l.client_name, l.value, q.quote_number, q.total_price
FROM leads l
JOIN cpq_quotes q ON q.lead_id = l.id
WHERE l.id BETWEEN 66 AND 75
ORDER BY l.id;
```

---

*Document Version: 1.1*  
*Last Updated: January 2026*  
*Based on real property addresses for accurate travel/mapping testing*
