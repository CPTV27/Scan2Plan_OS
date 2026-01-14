---
sidebar_position: 18
---

# SQFT Variance Audit

Verify actual scope matches quoted scope before modeling.

## Purpose

Catch scope creep or estimation errors before they impact margin.

## Process

1. After scanning, enter **Actual SQFT**
2. System calculates variance from estimate
3. If variance > 10%, warning triggers
4. Must clear variance alert before modeling

## Variance Calculation

```
Variance % = |Actual SQFT - Estimated SQFT| / Estimated SQFT × 100
```

## Resolution Options

- Update project scope and pricing
- Document reason for variance
- CEO acknowledgment for major variance
