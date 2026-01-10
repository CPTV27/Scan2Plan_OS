# CPQ Pricing Calculation API

## Overview

The Scan2Plan CPQ (Configure-Price-Quote) system provides a stateless pricing calculation API that allows external systems to submit project questionnaire data and receive a complete pricing breakdown in return.

**Base URL**: `https://scan2plan-cpq.replit.app`

**Authentication**: Bearer token using `CPQ_API_KEY`

---

## Authentication

All requests to the pricing API must include an Authorization header with a valid API key:

```
Authorization: Bearer YOUR_CPQ_API_KEY
```

If authentication fails, you'll receive:
- `401 Unauthorized` - Missing or invalid API key
- `500 Internal Server Error` - API key not configured on server

---

## Endpoint: Calculate Pricing

### `POST /api/pricing/calculate`

Submit project details and receive a complete pricing breakdown.

### Request Headers

| Header | Value | Required |
|--------|-------|----------|
| `Content-Type` | `application/json` | Yes |
| `Authorization` | `Bearer YOUR_CPQ_API_KEY` | Yes |

### Request Body Schema

```json
{
  "clientName": "string (optional)",
  "projectName": "string (optional)",
  "projectAddress": "string (optional)",

  "areas": [
    {
      "name": "string (optional) - Display name for this area",
      "buildingType": "string (required) - Building type ID (see table below)",
      "squareFeet": "string (required) - Square footage, or acres for landscape types",
      "disciplines": ["array of discipline IDs (optional)"],
      "disciplineLods": {
        "disciplineId": {
          "discipline": "string - discipline ID",
          "lod": "string - '200', '300', or '350'",
          "scope": "string - 'full', 'interior', 'exterior', or 'mixed' (optional)"
        }
      }
    }
  ],

  "risks": ["array of risk IDs (optional)"],

  "dispatchLocation": "string (required) - 'troy', 'woodstock', 'brooklyn', or 'fly_out'",
  "distance": "number (optional) - Distance in miles from dispatch location",
  "customTravelCost": "number (optional) - Override calculated travel cost",

  "services": {
    "matterport": "boolean (optional) - Include Matterport virtual tour",
    "actScan": "boolean (optional) - Include Above Ceiling Tile scan",
    "additionalElevations": "number (optional) - Count of additional interior elevations"
  },

  "paymentTerms": "string (optional) - 'partner', 'owner', 'net30', 'net60', 'net90'",

  "leadId": "number (optional) - CRM lead ID for tracking"
}
```

### Building Type IDs

| ID | Building Type |
|----|---------------|
| 1 | Commercial Office |
| 2 | Retail |
| 3 | Industrial/Warehouse |
| 4 | Healthcare |
| 5 | Education |
| 6 | Hospitality |
| 7 | Residential Multi-Family |
| 8 | Residential Single-Family |
| 9 | Mixed Use |
| 10 | Religious |
| 11 | Government |
| 12 | Data Center |
| 13 | Parking Structure |
| 14 | Built Landscape (uses acres, not sqft) |
| 15 | Natural Landscape (uses acres, not sqft) |

### Discipline IDs

| ID | Discipline |
|----|------------|
| `arch` | Architecture |
| `mepf` | Mechanical, Electrical, Plumbing, Fire |
| `structure` | Structural |
| `site` | Site/Topography |

### Risk IDs

| ID | Risk Factor | Premium |
|----|-------------|---------|
| `occupied` | Occupied Building | +15% on Architecture |
| `hazardous` | Hazardous Materials | +25% on Architecture |
| `no_power` | No Power Available | +20% on Architecture |

### Payment Terms

| Term | Premium |
|------|---------|
| `partner` | No premium (default) |
| `owner` | No premium |
| `net30` | +5% |
| `net60` | +10% |
| `net90` | +15% |

---

## Response Schema

```json
{
  "success": true,

  "totalClientPrice": 120448.12,
  "totalUpteamCost": 69712.50,
  "grossMargin": 50735.62,
  "grossMarginPercent": 42.12,

  "lineItems": [
    {
      "id": "area-0-arch",
      "label": "Main Building - Architecture (LoD 300)",
      "category": "discipline",
      "clientPrice": 48750.00,
      "upteamCost": 31687.50,
      "details": {
        "sqft": 15000,
        "discipline": "arch",
        "lod": "300",
        "scope": "full",
        "clientRate": 3.25,
        "upteamRate": 2.1125
      }
    },
    {
      "id": "risk-premium",
      "label": "Risk Premium (occupied)",
      "category": "risk",
      "clientPrice": 7312.50,
      "upteamCost": 0
    },
    {
      "id": "travel",
      "label": "Travel - 50 mi @ $3/mi",
      "category": "travel",
      "clientPrice": 150.00,
      "upteamCost": 0
    },
    {
      "id": "total",
      "label": "Total",
      "category": "total",
      "clientPrice": 120448.12,
      "upteamCost": 69712.50
    }
  ],

  "subtotals": {
    "modeling": 107250.00,
    "travel": 150.00,
    "riskPremiums": 7312.50,
    "services": 0,
    "paymentPremium": 5735.62
  },

  "integrityStatus": "pass | warning | blocked",
  "integrityFlags": [
    {
      "code": "LOW_MARGIN",
      "message": "Gross margin 42.1% is below 45% threshold",
      "severity": "warning | error"
    }
  ],

  "calculatedAt": "2026-01-10T19:17:54.103Z",
  "engineVersion": "1.0.0"
}
```

### Line Item Categories

| Category | Description |
|----------|-------------|
| `discipline` | Per-discipline pricing for an area |
| `area` | Landscape area pricing (consolidated) |
| `risk` | Risk premium charges |
| `travel` | Travel costs |
| `service` | Additional services (Matterport, ACT, elevations) |
| `subtotal` | Payment term premiums and other adjustments |
| `total` | Final totals |

### Integrity Status

| Status | Meaning |
|--------|---------|
| `pass` | Quote meets all business rules |
| `warning` | Quote has minor issues that should be reviewed |
| `blocked` | Quote has critical issues that require override approval |

---

## Example Requests

### Basic Quote - Single Area

```bash
curl -X POST https://scan2plan-cpq.replit.app/api/pricing/calculate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_CPQ_API_KEY" \
  -d '{
    "areas": [
      {
        "name": "Main Building",
        "buildingType": "1",
        "squareFeet": "15000",
        "disciplines": ["arch"],
        "disciplineLods": {
          "arch": {"discipline": "arch", "lod": "300", "scope": "full"}
        }
      }
    ],
    "dispatchLocation": "troy",
    "distance": 30
  }'
```

### Full Quote - Multiple Areas with All Options

```bash
curl -X POST https://scan2plan-cpq.replit.app/api/pricing/calculate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_CPQ_API_KEY" \
  -d '{
    "clientName": "ABC Corporation",
    "projectName": "Corporate HQ Renovation",
    "projectAddress": "123 Main St, New York, NY",

    "areas": [
      {
        "name": "Main Office Building",
        "buildingType": "1",
        "squareFeet": "25000",
        "disciplines": ["arch", "mepf", "structure"],
        "disciplineLods": {
          "arch": {"discipline": "arch", "lod": "300", "scope": "full"},
          "mepf": {"discipline": "mepf", "lod": "300", "scope": "full"},
          "structure": {"discipline": "structure", "lod": "200", "scope": "full"}
        }
      },
      {
        "name": "Parking Garage",
        "buildingType": "13",
        "squareFeet": "50000",
        "disciplines": ["arch"],
        "disciplineLods": {
          "arch": {"discipline": "arch", "lod": "200", "scope": "full"}
        }
      }
    ],

    "risks": ["occupied"],

    "dispatchLocation": "brooklyn",
    "distance": 25,

    "services": {
      "matterport": true,
      "actScan": false,
      "additionalElevations": 15
    },

    "paymentTerms": "net30",
    "leadId": 12345
  }'
```

### Landscape Project

```bash
curl -X POST https://scan2plan-cpq.replit.app/api/pricing/calculate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_CPQ_API_KEY" \
  -d '{
    "areas": [
      {
        "name": "Campus Grounds",
        "buildingType": "14",
        "squareFeet": "10",
        "disciplineLods": {
          "site": {"discipline": "site", "lod": "300", "scope": "full"}
        }
      }
    ],
    "dispatchLocation": "troy",
    "distance": 45
  }'
```

Note: For landscape building types (14, 15), the `squareFeet` field represents **acres**, not square feet.

---

## Error Responses

### 400 Bad Request - Validation Error

```json
{
  "success": false,
  "error": "Invalid request",
  "details": {
    "formErrors": [],
    "fieldErrors": {
      "areas": ["Required"],
      "dispatchLocation": ["Required"]
    }
  }
}
```

### 401 Unauthorized

```json
{
  "success": false,
  "error": "Authorization header required"
}
```

```json
{
  "success": false,
  "error": "Invalid API key"
}
```

### 500 Internal Server Error

```json
{
  "success": false,
  "error": "Pricing calculation failed",
  "message": "Error description"
}
```

---

## Integration Notes

### CRM Workflow

1. **Collect questionnaire data** in the CRM form
2. **Call the pricing API** with collected data
3. **Display pricing breakdown** to the user
4. **Store the response** with the lead/deal for reference
5. **Use integrity flags** to warn users about quotes that need review

### Best Practices

- Always check `integrityStatus` in the response - quotes with `blocked` status should not be finalized without override approval
- Cache the `engineVersion` to detect when pricing logic changes
- Store the full `lineItems` array for detailed quote documentation
- Use `leadId` to correlate quotes with CRM records

### Rate Limiting

Currently no rate limiting is enforced, but please be mindful of request volume. For bulk operations, consider implementing client-side throttling.

---

## Support

For API issues or questions, contact the development team or open an issue in the project repository.
