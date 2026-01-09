# Scan2Plan Universal Nomenclature Standards (UNS)
**Version:** 2.0  
**Effective Date:** January 7, 2026  
**Status:** Mandatory for all Project and Lead records.

---

## 1. The Universal Project ID (UPID)
The UPID is the "License Plate" for every transaction. It must be unique and consistent across all platforms (Scan2Plan OS, QuickBooks, Google Drive, and Airtable). The UPID includes a Referral Prefix to track marketing sources.

### **Format Pattern**
`[REFERRAL]-[CLIENT_CODE]-[PROJ_CODE]-[YYYYMMDD]`

### **Components**
1. **REFERRAL (2-5 Characters):** - Uppercase code indicating the lead source.
   - See Referral Source Codes below.
2. **CLIENT_CODE (2-4 Characters):** - Uppercase alphanumeric abbreviation of the Client Name.
   - *Example:* Macy's -> `MACY`, Rachael Associates -> `RACH`.
3. **PROJ_CODE (1-5 Characters):** - Uppercase alphanumeric abbreviation of the Project/Building Name.
   - *Example:* Crystal Mall -> `CRYST`, Logan Airport -> `LOGAN`.
4. **DATE (8 Characters):** - The date the Lead was converted to "Closed Won" in `YYYYMMDD` format.

### **Referral Source Codes**
| Code | Source Type |
|------|-------------|
| AMP | Amplify (Primary Referral Partner) |
| DIR | Direct (Organic/Website) |
| REP | Repeat Client / Returning |
| REF | General Referral |
| PART | Partner (Non-Amplify) |
| PDF | PDF Import |
| WEB | Website Lead |
| COLD | Cold Outreach/LinkedIn |
| LINK | LinkedIn |
| GOOG | Google |
| MAIL | Email Campaign |
| INB | Inbound Marketing |
| OUT | Outbound Marketing |
| MATT | Matterport Partner |
| AYON | AYON Partner |
| GEN | General/Unknown Source |

### **Example Cases**
- Amplify Lead: `AMP-MACY-CRYST-20260107`
- Direct Lead: `DIR-TPG-412MA-20260107`
- Repeat Client: `REP-SKYL-FACAD-20260107`
- PDF Import: `PDF-ASHI-TANKS-20260107`

---

## 2. Multi-Asset Differentiation
For projects involving multiple separate buildings or distinct phases under one contract, append a suffix:

- **Buildings:** `-B01`, `-B02`
- **Phases:** `-P01`, `-P02`

*Example:* `AMP-MACY-CRYST-20260107-B01`

---

## 3. Google Drive Folder Hierarchy
When the system triggers the **Drive API**, it must use the UPID for the parent folder and create the following subfolders:

- `[UPID] / 01_Field_Capture` (Raw scans, Scan Tech Walkthroughs)
- `[UPID] / 02_BIM_Production` (Point Clouds, Revit Models)
- `[UPID] / 03_Accounting_Financials` (Contracts, Invoices, Retainer Proof)
- `[UPID] / 04_Client_Final_Deliverables` (Final exports for client download)

---

## 4. Communication Standards
- **Email Subject Lines:** Must begin with the UPID (e.g., `Subject: [AMP-MACY-CRYST-20260107] Updated Schedule`).
- **File Uploads:** Any file dragged into the OS must be renamed: `[UPID]_Asset_[Original_Filename]`.

---

## 5. System Enforcement (Replit Logic)
- **Validation:** The OS shall reject any project creation where the UPID does not match the Regex: `^[A-Z0-9]{2,5}-[A-Z0-9]{2,4}-[A-Z0-9]{1,5}-[0-9]{8}$`.
- **Primary Key:** The UPID shall serve as the `universalProjectId` field in the PostgreSQL database, linking the `leads` and `projects` tables.
- **Generation:** The UPID is auto-generated when a Lead transitions to "Closed Won" status.
- **Referral Prefix:** The prefix is derived from the `leadSource` field on the Lead record.

---

## 6. Legacy Format (Deprecated)
The previous 3-part format `[CLIENT_CODE]-[PROJ_CODE]-[YYYYMMDD]` is deprecated but may still exist in historical records. Legacy regex: `^[A-Z0-9]{3,4}-[A-Z0-9]{4,5}-[0-9]{8}$`.
