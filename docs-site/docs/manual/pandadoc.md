---
sidebar_position: 3
---

# PandaDoc / DocuSeal

E-signature integration for proposals.

## DocuSeal (Recommended)

Self-hosted, free e-signature solution.

### Setup
```bash
docker run -p 3001:3000 docuseal/docuseal
```

Add to `.env`:
```
DOCUSEAL_URL=http://localhost:3001
DOCUSEAL_API_KEY=your_api_key
```

## PandaDoc (Legacy)

Cloud-based e-signature service (paid).

### Setup
1. Get API key from PandaDoc Settings
2. Add `PANDADOC_API_KEY` to environment

## Sending Proposals

1. Open Proposal Builder
2. Preview and finalize
3. Click **Send for Signature**
4. Select DocuSeal or PandaDoc
5. Enter recipient email
6. Proposal sent automatically
