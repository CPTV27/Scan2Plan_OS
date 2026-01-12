# CPQ Integrity Auditor Integration Guide

This document describes how Scan2Plan OS validates quotes against business rules to protect profitability.

## Overview

The Integrity Auditor runs **client-side** during `calculatePricing()` in `client/src/features/cpq/pricing.ts`. It validates quotes against FY26 margin goals before allowing them to be saved.

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                  pricing.ts (Client-Side)                │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  calculatePricing() {                                    │
│    // Calculate costs and prices                         │
│    // ...                                                │
│                                                          │
│    // Run integrity checks                               │
│    const integrityResult = checkIntegrity(margin);       │
│                                                          │
│    return {                                              │
│      ...pricing,                                         │
│      integrityStatus: integrityResult.status,           │
│      integrityFlags: integrityResult.flags              │
│    };                                                    │
│  }                                                       │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

## Validation Checks

| Check | Warning Threshold | Block Threshold | Description |
|-------|------------------|-----------------|-------------|
| Margin Floor | 40-45% gross margin | < 40% gross margin | FY26 profitability floor |
| Margin Guardrail | - | - | 45% is the target margin |

## Audit Status Values

| Status | Meaning | Can Save Quote? |
|--------|---------|-----------------|
| `passed` | Margin >= 45% | Yes |
| `warning` | Margin 40-45% | Yes (with warning) |
| `blocked` | Margin < 40% | No |

## Quote Fields from Integrity Check

When `calculatePricing()` runs, these fields are included in the result:

| Field | Type | Description |
|-------|------|-------------|
| `integrityStatus` | string | `passed`, `warning`, or `blocked` |
| `integrityFlags` | array | List of flag objects with code, severity, message |

## Flag Codes Reference

| Code | Severity | Trigger |
|------|----------|---------|
| `BELOW_GUARDRAIL` | warning | Margin 40-45% |
| `BELOW_FLOOR` | error | Margin < 40% |

## UI Integration

The integrity status is displayed in the Quote Builder sidebar:

```typescript
// Example: Check if quote can be saved
function canSaveQuote(pricingResult) {
  return pricingResult.integrityStatus !== 'blocked';
}

// Example: Display audit badge
function getAuditBadge(pricingResult) {
  switch (pricingResult.integrityStatus) {
    case 'passed': return { color: 'green', text: 'Audit Passed' };
    case 'warning': return { color: 'yellow', text: 'Below Target' };
    case 'blocked': return { color: 'red', text: 'Blocked - Below Floor' };
    default: return { color: 'gray', text: 'Not Audited' };
  }
}
```

## FY26 Margin Goals

Defined in `shared/config/constants.ts`:

```typescript
export const FY26_GOALS = {
  MARGIN_FLOOR: 0.40,    // 40% - HARD BLOCK
  MARGIN_STRETCH: 0.45,  // 45% - Target/Guardrail
};
```

## Save Quote Flow

1. User configures quote in UI
2. `calculatePricing()` runs on every change
3. Integrity checks included in pricing result
4. "Save Quote" button disabled if `integrityStatus === 'blocked'`
5. Warning badge shown if `integrityStatus === 'warning'`
6. Quote saved to database via `POST /api/cpq-quotes`

## Configuration

Guardrail thresholds are defined in `shared/config/constants.ts` and `client/src/features/cpq/pricing.ts`.

## Note on CEO Overrides

The legacy override system (request/approve workflow) has been simplified. If a quote falls below the 40% floor, the margin target slider must be adjusted to bring it above the floor before saving. This enforces margin discipline at the point of quote creation.
