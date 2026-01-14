---
sidebar_position: 15
---

# Templates & Variables

Proposal templates use variables to auto-fill project data.

## Available Variables

| Variable | Description |
|----------|-------------|
| `{{clientName}}` | Company name |
| `{{contactName}}` | Primary contact |
| `{{projectName}}` | Project title |
| `{{projectAddress}}` | Site address |
| `{{totalPrice}}` | Quote total |
| `{{scanningCost}}` | Scanning line item |
| `{{modelingCost}}` | Modeling line item |
| `{{disciplines}}` | Selected disciplines |
| `{{lod}}` | Level of detail |
| `{{buildingType}}` | Building type |
| `{{sqft}}` | Square footage |
| `{{paymentTerms}}` | Payment structure |
| `{{timeline}}` | Estimated timeline |
| `{{validUntil}}` | Quote expiration date |

## Creating Templates

Templates are managed in **Settings > Proposal Templates**.

## Variable Syntax

Variables use double curly braces: `{{variableName}}`

If a variable is not available, it will render as blank.
