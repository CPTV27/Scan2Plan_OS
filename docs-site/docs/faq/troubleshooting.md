---
sidebar_position: 1
---

# Troubleshooting

Common issues and their solutions.

## Quote Issues

### Can't save quote?
Check the **Integrity Audit** panel:
- Red Shield = Blocking error (margin below 40%)
- Yellow Shield = Warning only

CEO can acknowledge and proceed with low margin.

### Travel cost showing $0?
Enter a valid **Project Address** in Lead Details. The system needs an address to calculate distance.

## Pipeline Issues

### Can't move deal to Closed Won?
**Lead Source Attribution Gate**: Select a Lead Source before closing.

## Delivery Issues

### Can't deliver a project?
Check for:
- Unpaid invoices
- SQFT variance > 10% not cleared
- QC not passed

## Connection Issues

### QuickBooks connection expired?
Go to **Settings > Integrations > QuickBooks** and click **Reconnect**.

### PandaDoc not working?
Verify `PANDADOC_API_KEY` is set in environment variables.
