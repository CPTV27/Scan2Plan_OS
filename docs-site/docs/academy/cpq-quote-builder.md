---
sidebar_position: 8
---

# CPQ Quote Builder

The CPQ (Configure-Price-Quote) system calculates accurate project pricing based on scope configuration.

## Building a Quote

1. Open a lead from the Sales Pipeline
2. Click the **Quote** tab
3. Add one or more **Areas** (buildings/spaces)
4. Configure each area:
   - Building Type
   - Square Footage
   - Scope (Full/Interior/Exterior)
   - Disciplines (Architecture, Structure, MEP, Site)
   - LOD per discipline (200/300/350)
5. Add Risk Factors if applicable
6. Configure Travel
7. Review the **Live Pricing Preview**
8. Click **Save Quote**

## Pricing Components

| Component | Calculation |
|-----------|-------------|
| **Scanning** | Based on sqft, complexity, disciplines |
| **Modeling** | LOD level × discipline hours |
| **Travel** | Distance-based with tier pricing |
| **Risk** | Percentage multiplier for complexity |

## Quote Statuses

- **Draft**: Work in progress
- **Sent**: Delivered to client
- **Accepted**: Client approved
- **Rejected**: Client declined
- **Expired**: Past valid date
