---
sidebar_position: 19
---

# Production Gates

Hard stops that protect project quality and profitability.

## Available Gates

### Retainer Gate
- **Trigger**: Can't start scanning
- **Condition**: Retainer invoice not paid
- **Resolution**: Receive payment

### QC Gate
- **Trigger**: Can't deliver
- **Condition**: SQFT variance exceeds threshold
- **Resolution**: Clear variance alert

### Invoice Gate
- **Trigger**: Can't deliver
- **Condition**: Invoices unpaid
- **Resolution**: Receive payment

## Gate Override

CEO role can override gates with documented acknowledgment.

## Gate Visibility

Active gates appear as:
- Red indicators on project cards
- Blocking messages in workflows
- Alerts in CEO dashboard
