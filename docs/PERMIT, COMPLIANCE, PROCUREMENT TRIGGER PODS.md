# **P9.1 — Permit Trigger Pod**

## **Goal (plain English)**

Every week, build a fresh, qualified list of architects/engineers (“design pros”) already named on permits or actively bidding — then contact them within **48 hours** with a proof-driven, scope-matched message.  
 **Core KPIs:** ≤48-hour first touch • ≥8 permit/RFP-sourced meetings/quarter • Opp→Prop ≥60% (from triggered leads).

## **Scope fit & exclusions (plain)**

**Prefer:** renovation, addition, retrofit, tenant-improvement/fit-out, change-of-use, adaptive reuse, historic/cultural preservation, façade/envelope, campus/multi-building programs, MEP upgrades, decarbonization/electrification, commissioning/re-Cx.  
 **De-prioritize/ignore:** ground-up only; site/civil-only (sidewalks, paving, drainage); janitorial/abatement-only; landscaping; signage/wayfinding-only; IT/low-voltage-only; pure CM/GC services without design/as-builts; single-/two-family **unless** part of a program.

## **Geography hubs**

NYC metro; **Troy / Albany / Woodstock, NY**; **Boston / New England (CT/RI/MA/VT/NH/ME)**.

## **Size tiers (routing policy)**

* **Tier-A:** ≥50,000 ft²

* **Tier-B:** 10,000–49,999 ft²

* **Tier-C:** 3,000–9,999 ft²  
   Consider **any** renovation/addition ≥3,000 ft². Roofing is ok **only** if Tier-A or tied to envelope/MEP/energy program.

## **Glossary (first-time acronyms expanded, with links)**

* **NYC DOB** — NYC Department of Buildings datasets (BIS \+ DOB NOW).  
   • BIS “DOB Job Application Filings” (ic3t-wcy2): [https://data.cityofnewyork.us/Housing-Development/DOB-Job-Application-Filings/ic3t-wcy2](https://data.cityofnewyork.us/Housing-Development/DOB-Job-Application-Filings/ic3t-wcy2?utm_source=chatgpt.com)  
   • DOB NOW “Build – Job Application Filings” (w9ak-ipjd): https://data.cityofnewyork.us/City-Government/DOB-NOW-Build-Job-Application-Filings/w9ak-ipjd

* **DOB NOW** — modern e-filing portal; **BIS** — legacy system (BIS excludes DOB NOW jobs).

* **A1 (ALT-1)** — major alteration; **NB** — New Building.

* **SoQL / SODA** — Socrata Open Data Query Language / API (server-side filtering): [https://dev.socrata.com/docs/functions/](https://dev.socrata.com/docs/functions/?utm_source=chatgpt.com)

* **BBL/BIN** — NYC parcel/building IDs; resolve via **NYC Geoclient**: https://api.cityofnewyork.us/geoclient/v1/doc

* **PLUTO** — Primary Land Use Tax Lot Output (BldgArea/LandUse): https://www.nyc.gov/site/planning/data-maps/open-data/dwn-pluto-mappluto.page

* **ISD** — Boston Inspectional Services Department.  
   • **Approved Building Permits**: [https://data.boston.gov/dataset/approved-building-permits](https://data.boston.gov/dataset/approved-building-permits?utm_source=chatgpt.com)

* **PASSPort Public** — NYC procurement transparency portal: https://passport.public.nyc/

* **NYS Contract Reporter**: [https://www.nyscr.ny.gov/](https://www.nyscr.ny.gov/?utm_source=chatgpt.com)

* **DASNY** (pro services; Term Consultants): [https://www.dasny.org/opportunities/rfps-bids](https://www.dasny.org/opportunities/rfps-bids?utm_source=chatgpt.com) • https://www.dasny.org/opportunities/rfps-bids/term-consultants-program

* **PANYNJ solicitations**: https://www.panynj.gov/port-authority/en/business-opportunities/solicitations.html

* **MTA procurement**: https://new.mta.info/doing-business-with-us/procurement/opportunities

* **Airtable** — “single source of truth” (SSOT).

* **SDR** — Sales Development Rep; **SLA** — Service-Level Agreement.

* **Proof Vault / Pursuit snippet** — curated A360/PDF/DWG links matching the prospect’s scope.

* **PDF table tools** — **Tabula**: [https://tabula.technology/](https://tabula.technology/?utm_source=chatgpt.com) • **Camelot**: https://camelot-py.readthedocs.io/

* **Big CSV helpers** — **csvkit**: [https://csvkit.readthedocs.io/](https://csvkit.readthedocs.io/?utm_source=chatgpt.com) • **RowZero**: https://rowzero.io/ • **Gigasheet**: https://www.gigasheet.com/

* **License lookups** — NYC DOB license status: [https://www.nyc.gov/site/buildings/industry/check-license-registration-status.page](https://www.nyc.gov/site/buildings/industry/check-license-registration-status.page?utm_source=chatgpt.com) • NYSED verification: https://www.op.nysed.gov/verification-search

* **Page watchers** — Visualping: [https://visualping.io/](https://visualping.io/?utm_source=chatgpt.com) • Distill: [https://distill.io/](https://distill.io/)

---

## **One picture: three intake streams → one outreach queue**

1. **NYC filings (daily):** pull **A1/NB** jobs, capture **Applicant / Design Professional** firm → contact.

2. **Boston permits (weekly):** pull **Approved Building Permits**, capture **Applicant/Owner** firm → contact.

3. **Public RFx planholders (weekly watch):** watch **PASSPort, NYSCR, DASNY, PANYNJ, MTA** for **addenda/sign-ins/planholders** → contact.  
    Everything goes into **Airtable**; SDRs work an auto **48-hour SLA** view.

## **Assumptions & guardrails**

* **Signal \= job filing or planholder name.** NYC filings expose Applicant/Design Pro fields; Boston permits often include applicant/owner. Verified sources: NYC DOB **legacy (ic3t-wcy2)** and **DOB NOW (w9ak-ipjd)** datasets; Boston “Approved Building Permits.” [NYC Open Data+2NYC Open Data+2](https://data.cityofnewyork.us/Housing-Development/DOB-Job-Application-Filings/ic3t-wcy2?utm_source=chatgpt.com)

* **We only ingest last 7 days** via the **Socrata SODA/SoQL API** to keep files tiny and fresh. [Socrata Developers](https://dev.socrata.com/docs/queries/?utm_source=chatgpt.com)

* **We timebox contact discovery (8–12 min)** and accept a generic inbox when needed to keep CAC under control (csv/CLI methods provided). [csvkit.readthedocs.io+1](https://csvkit.readthedocs.io/en/0.9.1/scripts/csvgrep.html?utm_source=chatgpt.com)

---

# **One-time setup (no-code)**

### **A. Airtable base (tables & fields)**

* **Filings** — Source (BIS/NOW/Boston), Filing date, Job type (A1/NB/large A2), Job/App \#, Address, **BBL/BIN**, Est. **SF band**, Applicant firm, Applicant name, Owner business, Source URL.

* **Firms** — Firm name (unique), Website, Emails\[\], Phone, Role (Architect/Engineer), First-seen source, Pattern guess (e.g., `first.last@`), Contact page URL.

* **Contacts** — Firm→link, Person, Title, Email, Phone, Confidence (High/Med/Low).

* **RFP Watch** — Agency, RFx/EPIN, Title, URL, Close date, **Has Addenda?**, Addenda/Planholders PDF URL, Last-checked.

* **Outreach** — Firm name, Trigger (Filing/RFx), **Priority (Tier-A/B/C)**, SDR owner, **SLA\_due \= Created+48h**, Status, Next action.

**Saved views:** New This Week (Design Pros) • **Tier-A (≥50k)** • **SLA Breach (\<48h)**.

### **B. Email templates (done once; reuse)**

**Subject:** “Standards-first as-builts for your \[A1/NB\] at \[Address\]”  
 **Body (3 lines):** LoD/LoA acceptance \+ **zero-RFI pilot** \+ **fast scan window**; **one Proof-Vault link** (2–3 matched examples) \+ **15-min booking link**.

### **C. Nice-to-have tools (no coding)**

RowZero / Gigasheet (big CSV), Visualping / Distill (page-watch), Tabula / Camelot (PDF tables), csvkit (CLI slicing).

## **1\) Data stores (Airtable base or your CRM—minimum tables)**

* **Filings**: source (BIS/NOW/Boston), file date, job type, job/app \#, address, BBL/BIN (NYC), applicant firm/name, owner business, dataset row URL.

* **Firms**: firm name (unique), website, general inbox, pattern guess (first.last@), contact page URL, phone.

* **Contacts**: firm link, person, title, email, phone, confidence (H/M/L).

* **RFP Watch**: agency, RFx/EPIN, URL, close date, has-addenda?, attendees/planholders PDF URL, last-checked.

Why Airtable? It’s easy to automate JSON pulls from Socrata and to de-dupe firms; you can later mirror to GHL/Salesforce.

---

# **Engines & click-paths**

## **Daily Engine — NYC Filings → Design Pros (15–30 min/day)**

**Datasets (official & free):**

* **Legacy BIS filings** (excludes DOB NOW): `ic3t-wcy2` (Open Data \+ Foundry schema). [NYC Open Data+1](https://data.cityofnewyork.us/Housing-Development/DOB-Job-Application-Filings/ic3t-wcy2?utm_source=chatgpt.com)

* **DOB NOW: Build filings** (current e-filings): `w9ak-ipjd`. City confirms DOB NOW jobs are *not* in BIS. [NYC Open Data+1](https://data.cityofnewyork.us/Housing-Development/DOB-NOW-Build-Job-Application-Filings/w9ak-ipjd?utm_source=chatgpt.com)

### 

### **0\) Qualification Gate (S2P Scoping Bot)**

**Purpose:** throttle volume; only “Pursue” gets SDR time.  
 **When it runs**

* **Pass-1 (Fast):** right after filing normalization (NYC BIS/DOB NOW, Boston Approved Permits).

* **Pass-2 (Definitive):** after size/type enrichment (BBL→PLUTO/assessor) or when any scope doc/plan file is added.

**Inputs mapped:** concatenated filing/permit description; meta (issuer/jurisdiction, address, BBL/BIN, date); size (explicit → else PLUTO/assessor → else `null+reason`); building type; geo.  
 **Outputs:** `qual_pass1_json`, `qual_pass1_score`, `qual_pass2_json`, `qual_pass2_score`, `decision`, `SLA_due`, `docs_pending`.  
 **Routing:** Pursue ≥70 → SDR task \+ Proof; Monitor 50–69 → Docs Pending view; Ignore \<50 → suppress.

### **Step 1 — No‑Code Pulls (tiny files only)**

**Click‑path (repeat daily):**

1. Open the dataset page → **View Data** → **Filter**.

2. Filter **Latest Action Date** (or Filing Date) **is on or after** the date 7 days ago.

3. Filter **Job Type** to **A1** and **NB** only.

4. **Export** → **CSV**. (Result will be small; you filtered *before* downloading.)  
    *(The same can be done via the dataset’s API panel using SoQL, but the above needs no code.)*

**Pull only last 7 days (small JSON/CSV via SoQL)**  
 Use each dataset’s “API” panel to copy the endpoint, then add a `$where` on the date field (e.g., `latest_action_date` or `filing_date`) and `$select` only the columns you need. (SoQL docs here.) Example pattern (replace with actual column names shown on the dataset page):

`https://data.cityofnewyork.us/resource/ic3t-wcy2.csv`  
  `?$select=job__,job_type,latest_action_date,house_no,street_name,borough,applicant_business_name,applicant_first_name,applicant_last_name,owner_business_name`  
  `&$where=latest_action_date >= "2025-09-04T00:00:00.000"`  
  `&$order=latest_action_date DESC`  
  `&$limit=5000`

Use absolute timestamps; relative date functions vary (SoQL date docs here). [Socrata Developers+1](https://dev.socrata.com/docs/queries/?utm_source=chatgpt.com)

**Normalize & enrich (NYC)**

1. **Address → BBL/BIN** (batch) via **NYC Geoclient API** (Address endpoint). Store BBL & BIN for joins. [maps.nyc.gov](https://maps.nyc.gov/geoclient/v2/doc?utm_source=chatgpt.com)

2. **Size band for prioritization**: LEFT JOIN **PLUTO** by BBL; pull **BldgArea** \+ **LandUse** to flag ≥50k/≥100k SF and commercial classes. (PLUTO reference.) [NYC Open Data+2nycplanning.github.io+2](https://data.cityofnewyork.us/City-Government/Primary-Land-Use-Tax-Lot-Output-PLUTO-/64uk-42ks?utm_source=chatgpt.com)

3. **De-dupe firms**: normalize `applicant_business_name` (lowercase, strip punctuation) into the **Firms** table.

**What we capture per filing**

* Source (BIS/NOW), file date, job/app \#, job type (A1/NB/large A2), address, **BBL/BIN**, **Applicant firm \+ name (design pro)**, owner business, source URL.

### **Step 3 — Address → BBL/BIN (for size/type enrichment)**

* Open NYC **Geoclient** (free). Use the **Address** tool to get **BBL** and **BIN**. Paste those IDs into your **Filings** row.

### **Step 4 — Size Band (prioritize big ones)**

* In a separate tab, open **PLUTO** and look up the **BBL** to pull **BldgArea** (gross floor area) and **LandUse**.

* Write an **Est. SF band** (≥100k \= **Tier‑A**, 50–100k \= **Tier‑B**, else Tier‑C) into **Filings**. (PLUTO is the official table for this.)

### **Step 5 — Contact Discovery (time‑boxed to 8–12 minutes)**

Follow this order and **stop as soon as you have one callable email**:

1. **Firm website → Contact/Team** page → capture a **Principal/PM/Marketing** email or **info@**.

2. If unclear, validate the firm via **NYC DOB/BIS license** or **NYSED** license lookup (legal names & office lines). Call the main line and ask for the PM’s email for “the \[Filing \# / Project at Address\].”

3. If still dry: log the **Contact form URL** and **phone**; move on.  
    *(This keeps cost/lead low; generic inboxes still book when paired with a tight proof link.)*

### **Step 6 — Score & Route**

* **Score** \= Size band \+ Building type \+ Keywords (“major alteration,” “historic,” “MEP upgrade”).

* SDR works **View: Tier‑A (≥100k)** first, then Tier‑B. Maintain **SLA Breach** view for any record not touched within **48h**.

### **Step 7 — Send the 3‑line Pursuit**

* Subject: **“Standards‑first as‑builts for your \[A1/NB\] at \[Address\]”**

* Body: 3 lines (LoD/LoA; **zero‑RFI pilot**) \+ **1 Proof Vault link** (2–3 **A360/PDF/DWG** examples that match their scope) \+ **15‑min calendar** link.

## **Weekly Engine — Boston Applicants on Permits (20–30 min/wk)**

**Approved Building Permits** dataset (Analyze Boston). Filter last 7 days via API or CSV export; capture **applicant/owner/company** fields available; then same **Firms** de-dupe \+ contact discovery. [data.boston.gov](http://data.boston.gov)

\* \*\*DASNY:\*\* On each project page, use \*\*“View Interested Subs/Suppliers”\*\* to see the live roster of firms who self-registered interest. Set Visualping/Distill on the project page to catch new \*\*Interested Subs\*\* entries and any addenda/sign-ins.

1\. Open \*\*Approved Building Permits\*\* on Analyze Boston → \*\*Filter by Date Issued \= Past 7 days\*\* → \*\*Export CSV\*\*.

**Click‑path (once a week):**

1. Open **Approved Building Permits**: [https://data.boston.gov/dataset/approved-building-permits](https://data.boston.gov/dataset/approved-building-permits?utm_source=chatgpt.com) → **Filter** **Date Issued \= last 7 days** → **Export CSV**.

2. Add rows to **Filings** (**City=Boston**, skip BBL/BIN).

3. Deduplicate Applicant/Owner into **Firms**; run **8–12 min** contact routine; route by size/scope (if SF unstated, leave **null \+ note**).

---

# **Scoping Bot (where it runs in P9.1)**

* **Run the Bot for RFx documents only** (RFP/RFQ/registration pages or attachments) to qualify **scope/size/geo** and set **Pursue / Monitor / Ignore**.

* **Do NOT gate permit/filing-sourced leads** through the Bot by default (those are BD relationship plays).  
   **Pass-1 (fast):** when an RFx is added to **RFP Watch**.  
   **Pass-2 (definitive):** after any scope doc/addendum/planholder file is added.  
   **Outputs (write to Airtable):** `qual_pass1_json`, `qual_pass1_score`, `qual_pass2_json`, `qual_pass2_score`, `decision`, `SLA_due`, `docs_pending`.  
   **Routing:** **Pursue ≥70** → SDR task \+ Proof • **Monitor 50–69** → Docs Pending • **Ignore \<50** → suppress.  
   *Optional:* Only run Bot on a filing if it has an attached scope doc or explicit RFx link.

    
  ---

## **Contact discovery (cheap, reliable, time-boxed)**

**Priority order (stop as soon as you have one callable email):**

1. **Firm website → Contact/Team** page → PM/Principal or **info@**.

2. If site is thin, validate firm identity from the filing via **NYC DOB/BIS license/registrant directories** or **NYSED Office of the Professions** (Architect/PE lookup), which return legal names/addresses. Call main line for a PM email if needed. [Buildings Information System+2NYC Government+2](https://a810-bisweb.nyc.gov/bisweb/LicenseTypeServlet?vlfirst=N&utm_source=chatgpt.com)

3. **Timebox: 8–12 minutes** total per *new* firm. If no email, log “phone only” and move on.

---

# **Working with giant CSVs (only if you must)**

* **Filter server-side first** (SoQL `$where` date \+ `$select` columns). Docs: [https://dev.socrata.com/docs/](https://dev.socrata.com/docs/)  
    
* **csvkit** for local slicing (example):

   `csvgrep -c job_type -m A1 w9ak-ipjd.csv \`

  `| csvgrep -c job_type -m NB \`

  `| csvcut -c application_num,address,applicant_business_name > recent.csv`

* Browser viewers: **RowZero** (https://rowzero.io/) • **Gigasheet** (https://www.gigasheet.com/).

---

# **Prioritization & queues**

Saved **Airtable views:**

* **New This Week (Design Pros)** — applicant firm present? (Y/N)

* **Tier-A (≥50k)** — work these first

* **SLA due (Created+48h)** — breach guard

---

# **QA & kill-rules (bi-weekly, 30 min)**

* **Email-found \<15%** for any source → **pause** that source.

* **Meeting rate \<10%** after 2 weeks for a trigger → **drop** it.

* Spot-check 20 rows: confirm **BBL/BIN** and **firm identity** (license/website). Adjust joins/filters.

---

# **Known gotchas (and counters)**

* **Applicant ≠ actual designer** (expediter/filing rep). **Counter:** validate via firm site or **NYSED**; if wrong, route to Owner PM.

* **PLUTO BldgArea** can lag on brand-new NB. **Counter:** rely on job type (**NB/A1**) \+ description cues until PLUTO updates.

* **SoQL date syntax quirks.** **Counter:** use **absolute ISO timestamps** (e.g., `2025-09-04T00:00:00.000`); switch to relative functions only after testing.

* **Planholder PDFs** are often scanned images. **Counter:** Tabula/Camelot OCR; if emails missing, use site **info@** \+ pattern guess (still cap at **12 min**).


---

## **Doability checks (no hallucinations)**

* **NYC filings datasets exist, public, and expose applicant/design-pro fields; DOB NOW is separate from BIS.** (See dataset pages and DOB notice.) [NYC Government+3Socrata Developers+3NYC Open Data+3](https://dev.socrata.com/foundry/data.cityofnewyork.us/ic3t-wcy2?utm_source=chatgpt.com)

* **SODA/SoQL** supports selective column/date filters → tiny exports. [Socrata Developers](https://dev.socrata.com/docs/queries/?utm_source=chatgpt.com)

* **Geoclient** (free) returns **BBL/BIN** from Address; **PLUTO** provides **BldgArea/LandUse** for size/type gating. [maps.nyc.gov+1](https://maps.nyc.gov/geoclient/v2/doc?utm_source=chatgpt.com)

* **Boston** permits dataset is official and published. [data.boston.gov](https://data.boston.gov/dataset/approved-building-permits?utm_source=chatgpt.com)

* **Planholder/attendee lists**: PASSPort Public, DASNY term consultants, and other agency pages publicly post data and/or rosters you can mine. [DASNY+3NYC Government+3NYC Government+3](https://www.nyc.gov/site/mocs/passport/passport-public.page?utm_source=chatgpt.com)

**License/firm validation**: BIS registrant search \+ **NYSED license verification** are public and current. [Buildings Information System+1](https://a810-bisweb.nyc.gov/bisweb/LicenseTypeServlet?vlfirst=N&utm_source=chatgpt.com)

---

# **First-week checklist (NYC/BOS)**

1. Create base/tables & views (above).

2. Paste SoQL pulls for **ic3t-wcy2** & **w9ak-ipjd** with absolute date filters (last 7 days). [Socrata Developers+1](https://dev.socrata.com/foundry/data.cityofnewyork.us/ic3t-wcy2?utm_source=chatgpt.com)

3. Batch geocode to BBL/BIN (Geoclient). [maps.nyc.gov](https://maps.nyc.gov/geoclient/v2/doc?utm_source=chatgpt.com)

4. Join PLUTO → compute size bands. [NYC Open Data](https://data.cityofnewyork.us/City-Government/Primary-Land-Use-Tax-Lot-Output-PLUTO-/64uk-42ks?utm_source=chatgpt.com)

5. De-dupe firms; run **8–12 min** email-find; route Tier-A first.

6. Add **Boston** weekly pull; same flow. [data.boston.gov](https://data.boston.gov/dataset/approved-building-permits?utm_source=chatgpt.com)

7. Stand up **RFP Watch** \+ page-watchers; parse **planholders/attendees** into Firms. [NYC Government+2New York State Contract Reporter+2](https://www.nyc.gov/site/mocs/passport/passport-public.page?utm_source=chatgpt.com)

8. Start the bi-weekly **kill-rules** review.

# **Roles & systems (RACI)**

* **Operator (O):** runs pulls, normalizes, queues outreach.

* **SDR (A):** sends 3-line pursuit, books meetings.

* **Owner (R):** QA, kill/keep decisions, metrics.  
   **Systems:** Airtable (SSOT); Visualping/Distill; RowZero/Gigasheet; csvkit.

---

## **Known gotchas (and counters)**

* **Applicant ≠ designer** sometimes (filing reps). Counter: validate via firm site / NYSED search before outreach. [Office of the Professions](https://www.op.nysed.gov/search?utm_source=chatgpt.com)

* **PLUTO BldgArea can be stale** on brand-new NB. Counter: rely on **job type (NB/A1)** and description keywords until assessment data updates. [NYC Open Data](https://data.cityofnewyork.us/City-Government/Primary-Land-Use-Tax-Lot-Output-PLUTO-/64uk-42ks?utm_source=chatgpt.com)

* **SODA date syntax** quirks. Counter: use **absolute ISO timestamps**; only switch to relative date functions once stable. [Socrata Developers+1](https://dev.socrata.com/docs/queries/?utm_source=chatgpt.com)

# 

# **P16 — Compliance Trigger Pod**

## **Goal (plain English)**

Every week, auto-detect **NYC** compliance risks (**LL11** FISP façades, **LL87** energy audit/EER, **LL97** GHG caps) and **Boston/Cambridge** energy programs (**BERDO/BEUDO**), resolve **owner/property-manager (PM)** contacts, and send standards-anchored outreach within **48 hours**—at low/no cost.

**Quarterly success bar:** ≥8 meetings from compliance triggers • SLA ≤48h • bounce \<3% • reply→meeting ≥1.5–2.5%.

## **Programs covered (scope fit)**

* **NYC:** LL11 (FISP), LL87 (Energy Audit \+ EER), LL97 (GHG caps), LL84 (Benchmarking; for coverage & context).

* **Boston/Cambridge:** **BERDO** (Boston), **BEUDO** (Cambridge).

* Use these to open doors for **as-built reality capture** and **MEPF-accurate Scan-to-BIM** (your wedge).

## **Geography hubs**

NYC metro; **Troy / Albany / Woodstock, NY**; **Boston / New England (CT/RI/MA/VT/NH/ME)**.

## **Size tiers (routing policy)**

* **Tier-A:** ≥50,000 ft²

* **Tier-B:** 10,000–49,999 ft²

* **Tier-C:** 3,000–9,999 ft²  
   Consider **any** renovation/addition ≥3,000 ft². Roofing acceptable only if **Tier-A** or tied to envelope/MEP/energy.

## **Glossary (first-time acronyms expanded, with links)**

* **LL11 / FISP** (NYC façade): DOB NOW: Safety – Facades filings/status.  
   [https://data.cityofnewyork.us/browse?q=facades%20safety](https://data.cityofnewyork.us/browse?q=facades%20safety)

* **LL87** (NYC Energy Audit/EER): LL87 filings & last-filed year.  
   [https://data.cityofnewyork.us/browse?q=local%20law%2087](https://data.cityofnewyork.us/browse?q=local%20law%2087)

* **LL84** (NYC Benchmarking): building-level energy/water disclosure & covered list.  
   https://data.cityofnewyork.us/browse?q=benchmarking

* **LL97** (NYC GHG caps): Covered Buildings List (CBL), program page (context only).  
   https://www.nyc.gov/site/sustainablebuildings/ll97/covered-buildings-list.page  
   https://www.nyc.gov/site/sustainablebuildings/ll97/ll97.page

* **HPD Registration Contacts** (NYC MF): BBL-keyed owner/agent contacts.  
   https://data.cityofnewyork.us/browse?q=HPD%20Registration

* **DOB Violations** (context):  
   https://data.cityofnewyork.us/browse?q=DOB%20violations

* **NYC Geoclient** (Address→BBL/BIN):  
   https://api.cityofnewyork.us/geoclient/v1/doc

* **PLUTO** (parcel attributes, BldgArea/LandUse):  
   [https://www.nyc.gov/site/planning/data-maps/open-data/dwn-pluto-mappluto.page](https://www.nyc.gov/site/planning/data-maps/open-data/dwn-pluto-mappluto.page)

* **BERDO** (Boston):  
   [https://data.boston.gov/browse?q=BERDO](https://data.boston.gov/browse?q=BERDO)

* **BEUDO** (Cambridge):  
   [https://data.cambridgema.gov/browse?q=BEUDO](https://data.cambridgema.gov/browse?q=BEUDO)

* **NY Dept. of State** (corporations/LLCs):  
   [https://apps.dos.ny.gov/publicInquiry/](https://apps.dos.ny.gov/publicInquiry/?utm_source=chatgpt.com)

* **MA Secretary of the Commonwealth** (business search):  
   [https://corp.sec.state.ma.us/CorpWeb/CorpSearch/CorpSearch.aspx](https://corp.sec.state.ma.us/CorpWeb/CorpSearch/CorpSearch.aspx)

* **SODA/SoQL** (NYC Open Data API):  
   [https://dev.socrata.com/docs/](https://dev.socrata.com/docs/)

* **Page watchers**: Visualping [https://visualping.io/](https://visualping.io/?utm_source=chatgpt.com) • Distill [https://distill.io/](https://distill.io/)

* **Big CSV helpers**: csvkit [https://csvkit.readthedocs.io/](https://csvkit.readthedocs.io/?utm_source=chatgpt.com) • RowZero https://rowzero.io/ • Gigasheet https://www.gigasheet.com/

---

## **One picture: four intake lanes → one outreach queue**

1. **LL11 (daily)** → find **UNSAFE / No Report Filed / expired SWARMP** → resolve **Owner/PM** → send LL11 email same day.

2. **LL87 (weekly)** → compute **Due≤12m/Overdue** (last EER \+ 10\) → Owner/PM → LL87 sequence.

3. **LL97 (monthly)** → **CBL** \+ LL84 context → Owner/PM → LL97 program play.

4. **BERDO/BEUDO (weekly)** → **non-reporters/outliers** → Owner/PM → BERDO/BEUDO email.

Everything lands in **Airtable**; SDRs work an auto **48-hour SLA** view.

## **Assumptions & guardrails**

* **Signal \= property status** (violator/at-risk), not docs behind logins. All sources are **official** and **free** (NYC Open Data/ArcGIS Hub).

* Always filter **server-side** (SODA/SoQL) to keep files tiny.

* **Contact discovery is time-boxed (≤12 min)**; a **group inbox (info@/compliance@)** is acceptable if a named PM isn’t discoverable.

---

# **One-time setup (no-code)**

### **A. Airtable base (tables & fields)**

* **Properties** — {BBL/BIN, Address, City, **SF\_band**, Building\_type, Flags: {LL11\_status, LL87\_due\_year, LL97\_CBL}, **BERDO/BEUDO\_flags**, Last\_seen}

* **Contacts** — {Role (Owner/PM/Agent), Company, Person, Email, Phone, **Source (HPD/DOS/site)**, Confidence (H/M/L)}

* **Triggers** — {Law (LL11/LL87/LL97/BERDO/BEUDO), **Reason** (UNSAFE/NRF/Due≤12m/Overdue/Non-report), **Priority (Tier-A/B/C)**, **SLA\_due \= Created+48h**, Status}

* **Outreach** — {Trigger→Sequence, Template\_ID, Send\_date, Bounce, Reply, Meeting}

* **Refs** — {Source URLs (filing/CBL/benchmark)}

**Saved views:** New this week (uncontacted) • **Tier-A (≥50k)** • **SLA Breach (\<48h)**.

### **B. Email templates (pre-approved; reuse)**

* **LL87** — your 3-step sequence (MEPF accuracy • LoD/LoA acceptance • EER-ready deliverables \+ Proof link).

* **LL11 (FISP)** — “Unsafe/No-Report? We’ll baseline the façade; acceptance-criteria; pilot one bay.”

* **LL97 / BERDO / BEUDO** — “Baseline capture for ECMs/retrofit planning; spec-ready BIM; zero-RFI pilot.”

### **C. Nice-to-have tools (no coding)**

RowZero / Gigasheet (big CSV), Visualping / Distill (page-watch), csvkit (CLI slicing).

---

# **Engines & click-paths (automation schedule)**

## **A) LL11 — FISP (run daily, 7am)**

**Fetch:** DOB NOW: Safety – **Facades Compliance Filings** → filter **status IN ('UNSAFE','NO REPORT FILED')** or **last 7–14 days** → upsert **Triggers (Law=LL11)**.  
 (Find the dataset via NYC Open Data search: “facades safety”.)

**Normalize & enrich (NYC):**

* **Address→BBL/BIN** with **NYC Geoclient**; write to **Properties**.

* **Size band:** join **PLUTO** by BBL (use **BldgArea** \+ LandUse) → Tier (A/B/C).

**Contact enrichment (failsafe tree, ≤12 min):**

1. **If MF (multi-family):** **HPD Registration Contacts (BBL)** → Managing Agent **email/phone**.

2. **Else commercial:** **NY DOS** entity page → registered office; then company site → **info@/contact@** (or contact form URL).

3. **If trust/individual:** confirm via **ACRIS**; search property/owner website; accept **group inbox** if named PM not found.  
    (Log **source** and **confidence**.)

**Send:** queue **LL11 template** same day; **SLA ≤48h**.

## **B) LL87 — Energy Audit/EER (run weekly, Mon 7am)**

**Fetch:** **LL87 filings** table (NYC Open Data) → compute **due\_year \= last\_EER\_year \+ 10**; join **LL84** to confirm coverage; mark **Due≤12m** or **Overdue** → upsert **Triggers (Law=LL87)** with \`Reason \= Due Soon/Overdue\`.

**Enrich:** **HPD** (MF) or **DOS** (commercial) → **Contacts** (one callable email).

**Send:** your **LL87 3-email** sequence \+ **Proof** (MEPF/LoD examples).

## **C) LL97 — Covered Buildings (run monthly, 1st workday)**

**Fetch:** **LL97 Covered Buildings List (CBL)** (PDF/web list) → store **BBL/BIN/Address/Name**.  
 **Optional context:** join latest **LL84** (EUI) to spot high-load buildings; tag sectors (office/campus/healthcare).

**Enrich & send:** Owner/PM as above → **LL97 template** (program play).  
 (Use **NYC Accelerator** only as planning context—**no penalty guarantees**.)

## **D) Boston/Cambridge — BERDO/BEUDO (run weekly, Tue 7am)**

**Fetch:** **BERDO** (Boston) and **BEUDO** (Cambridge) datasets → flag **non-reporters** or **outlier EUI/GHG vs peers** → upsert **Triggers (Law=BERDO/BEUDO)**.

**Enrich:** **MA Secretary** business search \+ property/company websites → **Contacts** (one email).  
 **Send:** **LL97-style** energy-program template.

---

# **Scoping Bot (where it fits in P9.2)**

* **Default:** you **do not** need the Scoping Bot for status-only triggers (LL11/LL87/LL97/BERDO/BEUDO) because these are **owner/PM relationship plays**.

* **Use the Bot only when** a trigger record links to **an RFP/RFQ/Scope document** (e.g., an agency posts a compliance-related RFx). Then run the Bot:  
   **Pass-1 (fast)** when the RFx is added to the record → **Pass-2 (definitive)** after addenda/attachments.  
   **Routing:** Pursue ≥70 → SDR task; Monitor 50–69 → Docs Pending; Ignore \<50 → suppress.

---

# **Contact discovery — Murphy-proof tree (≤12 minutes)**

**NYC Multi-family**

1. **HPD Registration Contacts (BBL)** → Managing Agent **email** (if present); else **phone call** for PM email (log “phone-verified”).

2. If HPD lists only a corporation/LLC → **NY DOS** entity page → company website → **info@/compliance@**.

**NYC Commercial / Institutional**

1. **NY DOS** → registered office; then **owner/REIT/property website** → **Property Management**/Leasing page email or form.

2. For campuses (higher-ed/healthcare), find **Facilities/Capital Projects** email.

3. If zero web presence → check **LL84** PDF metadata (sometimes lists org); else accept **phone-only** and move on.

**Boston/Cambridge**

1. **Assessing** (Owner of Record) → company name/address.

2. **MA Secretary** → registered office; then company/property site → **info@/management@**.

**Hard rules**

* Stop at the **first callable email** (named or group).

* Use a neutral “**sourced from public records**” line in the first email.

* **De-dupe** by domain to avoid double touches.

---

# **Prioritization & queues**

Saved **Airtable views:**

* **New This Week (Compliance)** — contact present? (Y/N)

* **Tier-A (≥50k)** — work these first

* **SLA due (Created+48h)** — breach guard

---

##  **“How to run it” playbooks, failsafes, dashboards, and first-week launch**

---

## **Automation recipes (Make/Zapier) — copyable blueprints**

### **Common setup once**

* **HTTP module:** add a generic “GET JSON/CSV” step.

* **Airtable connection:** Bases → Tables \= `Properties`, `Contacts`, `Triggers`, `Outreach`, `Refs`.

* **Key fields:**

  * `Properties.key`: `{City}:{BBL|Parcel}:{Address}` (computed)

  * `Triggers.key`: `{Law}:{Properties.key}:{Reason}`

  * `Contacts.key`: `{Company}:{Email}`

### **Lane A — LL11 (daily 7am)**

1. **GET (JSON/CSV):** DOB NOW Safety – Facades Compliance Filings (filter `status IN ('UNSAFE','NO REPORT FILED')` OR `last_status_date >= {today-14d}`).

2. **Iterator:** each row → build `{Address, BIN/BBL(if present), Status, LastStatusDate, SourceURL}`.

3. **If BBL missing:** **GET** Geoclient (Address→BBL/BIN) → add BBL/BIN.

4. **Upsert `Properties`:** match on `{City=NYC, BBL}`; write Address, Last\_seen=Now.

5. **Upsert `Triggers`:** `{Law=LL11, Reason=UNSAFE|NRF, Priority=Tier from PLUTO, SLA_due=Created+48h, Status=New}`.

6. **Enricher (router by type):**

   * **MF path:** **GET** HPD Registration (BBL) → if email present, **Upsert `Contacts`** (Role=Managing Agent, Confidence=High).

   * **Else Commercial path:** **Open URL** (NY DOS entity page → operator copy/paste company site URL) → build one email: `info@domain` or listed address. Confidence=Med.

7. **Write `Outreach` stub:** (Trigger→Sequence, Template=LL11, Status=Ready).

### **Lane B — LL87 (weekly Mon 7am)**

1. **GET:** LL87 filings (group by BBL to find latest EER year).

2. **Compute:** `due_year = last_eer_year + 10`; flag `Due≤12m` or `Overdue`.

3. **Join:** LL84 (benchmarking) to confirm building coverage.

4. **Upsert:** `Properties` (BBL), `Triggers` (Law=LL87, Reason=Due≤12m|Overdue).

5. **Enrich:** HPD or DOS path (as above) → one callable email.

6. **Outreach:** Template=LL87-Seq-01 (your 3-step), Status=Ready.

### **Lane C — LL97 (monthly 1st workday)**

1. **GET/Parse:** LL97 Covered Buildings List (store BBL/BIN/Name/Address).

2. **Optional:** Join latest LL84 to flag high-load sectors.

3. **Upsert:** `Properties`, `Triggers` (Law=LL97, Reason=Covered).

4. **Enrich:** HPD/DOS path → Contact.

5. **Outreach:** Template=LL97-Program, Status=Ready.

### **Lane D — BERDO/BEUDO (weekly Tue 7am)**

1. **GET:** BERDO (Boston) & BEUDO (Cambridge) reporting datasets.

2. **Flag:** Non-reporters and outlier EUI/GHG vs peers.

3. **Upsert:** `Properties`, `Triggers` (Law=BERDO|BEUDO, Reason=Non-report|Outlier).

4. **Enrich:** MA Secretary \+ company/property site → Contact.

5. **Outreach:** Template=Energy-Program (BERDO/BEUDO), Status=Ready.

**Send job (nightly):** Pull from `Outreach` where `Status=Ready` and `SLA_due ≥ Now()` and not sent before. Batch to \~100/day, 500/week. Writebacks: `Send_date`, `Bounce`, `Reply`, `Meeting`.

---

## **Airtable formulas you can paste**

**Tiering (Properties):**  
 `IF({BldgArea}>=50000,"A",IF({BldgArea}>=10000,"B",IF({BldgArea}>=3000,"C","None")))`

**SLA Due (Triggers):**  
 `DATEADD({Created},48,'hours')`

**Contactable? (Triggers):**  
 `IF(COUNTALL(ARRAYUNIQUE(LINKTOARRAY(Contacts.Email)))>0,"Yes","No")`

**KPIs (rollups):**

* **Contactable rate:** `COUNTIF(Triggers.Contactable="Yes") / COUNTALL(Triggers)`

* **Bounce %:** `Bounces / Sends`

* **Reply→Meeting:** `Meetings / Replies`

---

## **Outreach cadence and deliverability (beginner checklist)**

* **Warm sending domains** (or subdomains) with **SPF/DKIM/DMARC**.

* **Daily cap:** 100–150 emails/domain; ramp gradually; randomize send windows.

* **Personalization line:** reference **public program** (LL11/LL87/LL97/BERDO/BEUDO) \+ **address/city** (no penalties language).

* **Attachments:** avoid; use 1 **Proof Vault** link.

* **Suppressions:** global opt-outs; auto-suppress hard bounces.

* **Tracking:** keep plain-text, minimal images; test to Gmail/Outlook seeds weekly.

---

## **“Murphy’s Law” contact-enrichment failsafes (≤12 minutes)**

1. **HPD record shows managing agent but no email** → call listed phone, ask:  
    “Hi, confirming the **FISP/LL87** contact for **\[Address\]**. Could you share the best **property management/compliance** email?” (Log “phone-verified”.)

2. **Owner is an LLC shell** → DOS page → registered office → Google the company name \+ “property management” → land on org site → **info@/compliance@**.

3. **Condo/cond-op** with many sub-BBLs → target **building-wide agent** in HPD or **condo board mgmt** on the property website; if fragmented, pick **largest lot** by BldgArea.

4. **Institutional (university/hospital)** → skip DOS; go to **Facilities/Capital Projects** page; use **facilities@** or director email listed.

5. **No web presence** → take **Assessing** owner address (Boston/Cambridge) and phone the **main switchboard**; ask for **property management email**.

6. **Gatekeeper blocks email** → ask for generic **compliance@ / facilities@**; it still routes internally.

7. **info@ ignored** → day-3 follow-up with “**(Public records ref: LL87/LL11/LL97/BERDO)**” in opening line \+ a short bullet of value (LoD acceptance \+ pilot).

---

## **Micro-scripts (phone & email)**

**Phone (30–45 seconds, calm/neutral):**  
 “Hi, I’m calling about **public compliance records** for **\[Address\]** (LL\*\*\_\_). We provide **as-built/BIM baselines** so owners get clean scopes for **\[façade/energy/caps\]**. Could you point me to the **property management or compliance email** for that building? I’ll send one page and a calendar link; they can ignore if not relevant.”

**Email (first touch, 60–80 words):**  
 *Subject:* Baseline as-builts for \[Program\] at \[Address\]  
 *Body:*  
 “Pulled from **public records**: \[Address\] appears in **\[LL11/LL87/LL97/BERDO\]** coverage/status. We deliver **measured as-builts** (LoD/LoA acceptance) that de-risk **\[façade/EER/retrofit planning\]**. We can pilot one **\[bay/floor/area\]** within a **72-hour scan window**.  
 Proof (2–3 similar): \[link\]  
 Have 15 min this week to see if it’s relevant?”

---

## **QA & Kill-rules (bi-weekly, 30 min)**

* **Email-found rate \<15%** in any lane → fix source/enricher or **pause** lane.

* **Reply \<1%** for 2 weeks → tighten subject/first 40 words, rotate templates.

* **SLA misses \>10%** → reduce daily batch or add a second outreach window.

* **Data hygiene:** spot-check 20 rows → verify **BBL/BIN**, true owner/agent, and template fit.

---

## **Dashboards (simple views you’ll actually use)**

* **Leads This Week (by Law)**: New `Triggers` grouped by **LL** (LL11/LL87/LL97/BERDO|BEUDO).

* **Contactable Rate**: % with ≥1 email.

* **Sends / Day** (rolling 7): target 100–150/domain.

* **Reply % / Meeting %** by Law (which lanes perform).

* **Meetings → Opp → Prop** funnel (should map to OKRs).

* **SLA Breach** (overdue outreach) — red list for the operator.

---

## **First-week launch plan (day-by-day)**

**Day 1:** Build Airtable base/tables; add formulas & saved views.  
 **Day 2:** Stand up LL11 \+ LL87 fetchers; test on small date windows; validate 10 sample records end-to-end.  
 **Day 3:** Add LL97 monthly; add BERDO/BEUDO weekly; validate joins & sizes (PLUTO/assessor).  
 **Day 4:** Wire Enricher (HPD/DOS/MA Sec) \+ Writebacks; test contactable rate on 20 records.  
 **Day 5:** Plug mailer (GHL/Instantly), add templates; send a **seed batch (25)** to test deliverability; fix bounces.  
 **Day 6–7:** Scale to **\~100/day**; monitor KPI widget; implement kill-rules cadence.

---

## **Known gotchas (and counters)**

* **Applicant ≠ Designer / Filing reps:** In P9.2 we don’t use Applicants; we use **owner/PM** from HPD/DOS/Assessing.

* **Stale size data (PLUTO lag):** Use **program type** (hospital/campus/airport) as a proxy; re-tier when updated.

* **Condo forests (many sub-lots):** Target the **master/cond-op agent**; don’t chase every sub-BBL.

* **Scanned planholder PDFs (if any RFx appears):** Use Tabula/Camelot; or copy by hand for top 10 firms only.

* **Deliverability dips:** throttle send volume, rotate subjects, confirm SPF/DKIM/DMARC, remove trackers for a week.  
    
* \* \*Note (MBTA):\* \*\*Pre-bid attendance and planholder lists\*\* sometimes post publicly—often via \*\*COMMBUYS\*\* as PDF attachments. Set a watcher on any MBTA solicitation that links to COMMBUYS and grab the \*\*Pre-Bid Attendance\*\* PDF if it appears. Many MBTA files require portal login; rely on public postings and award pages only.  
    
* \* \*Reality check (Massport):\* Massport \*\*does not consistently publish planholder or attendance lists\*\*. When available, they appear as an attachment/addendum on the project’s \*\*BidExpress\*\* or Massport detail page. If no list is public, pivot to \*\*term-contract awardees\*\*, official \*\*award notices\*\*, and A/E firms named in RFQ ads to build outreach.  
    
  

---

## **Definition of Done (operational)**

* All four lanes fetch on schedule; **Triggers/Contacts** auto-populate.

* Sustained **≥500 compliant sends/week** for 4 consecutive weeks with **≤60 min/week** human work.

* **SLA ≥90%**, **bounce \<3%**, **≥8 meetings/quarter** from compliance triggers.

---

## **Appendix — copy/paste filter skeletons (plain-English)**

Use each dataset’s **API** tab to build these; pick the exact column names shown in that dataset.

* **LL11 (FISP) recent/violators:**

  * `$select= bbl, bin, house_no, street, status, last_status_date, source_url`

  * `$where= status in ('UNSAFE','NO REPORT FILED') OR last_status_date >= 'YYYY-MM-DDT00:00:00.000'`

  * `$order= last_status_date DESC` • `$limit=5000`

* **LL87 (due calc):**

  * Step 1: get **last EER year by BBL** (`$select= bbl, MAX(eer_year) as last_eer_year GROUP BY bbl`)

  * Step 2: compute `due_year = last_eer_year + 10` in Make/Zapier; flag `Due≤12m` / `Overdue`.

* **LL84 join:**

  * `$select= bbl, reported_gfa, eui, reporting_status` to confirm coverage and size proxy.

* **LL97 CBL:**

  * Parse the CBL list; store `bbl, bin, address, bldg_name`; treat as coverage “spine”.

* **BERDO/BEUDO:**

  * Filter on `reporting_status != 'Reported'` (non-report) OR EUI/GHG percentile \> threshold (outlier).

* **Geoclient (NYC):**

  * Address endpoint with `houseNumber, street, borough` → returns **BBL/BIN**.

---

## **RACI (who does what)**

* **Operator (O):** runs fetchers, enrichment, and queues outreach.

* **SDR (A):** sends sequences, books meetings, updates outcomes.

* **Owner (R):** monitors KPIs, enforces kill-rules, unblocks issues.

---

# 

DOB NOW Portal | NYC Department of Buildings | N/A | https://www.nyc.gov/dobnow | Last verified 2025-09-15

DOB Job Application Filings (BIS) | NYC Open Data | Dataset ID ic3t-wcy2 | [https://data.cityofnewyork.us/Housing-Development/DOB-Job-Application-Filings/ic3t-wcy2](https://data.cityofnewyork.us/Housing-Development/DOB-Job-Application-Filings/ic3t-wcy2) | Last verified 2025-09-15

DOB NOW: Build – Job Application Filings | NYC Open Data | Dataset ID w9ak-ipjd | [https://data.cityofnewyork.us/City-Government/DOB-NOW-Build-Job-Application-Filings/w9ak-ipjd](https://data.cityofnewyork.us/City-Government/DOB-NOW-Build-Job-Application-Filings/w9ak-ipjd) | Last verified 2025-09-15

NYC Geoclient API (Address→BBL/BIN) | NYC Dept. of City Planning | N/A | [https://api.cityofnewyork.us/geoclient/v1/doc](https://api.cityofnewyork.us/geoclient/v1/doc) | Last verified 2025-09-15

PLUTO / MapPLUTO | NYC Dept. of City Planning | N/A | [https://www.nyc.gov/site/planning/data-maps/open-data/dwn-pluto-mappluto.page](https://www.nyc.gov/site/planning/data-maps/open-data/dwn-pluto-mappluto.page) | Last verified 2025-09-15

NYSED License Verification | NY State Education Department | N/A | [https://www.op.nysed.gov/verification-search](https://www.op.nysed.gov/verification-search) | Last verified 2025-09-15

NYC DOB License/Registration Status | NYC Department of Buildings | N/A | [https://www.nyc.gov/site/buildings/industry/check-license-registration-status.page](https://www.nyc.gov/site/buildings/industry/check-license-registration-status.page) | Last verified 2025-09-15

HPD Registration Contacts | NYC Open Data | Dataset ID c3uy-2p5r | https://data.cityofnewyork.us/Housing-Development/Registration-Contacts/c3uy-2p5r | Last verified 2025-09-15

NY Dept. of State – Corporation/Business Entity Search | NY Department of State | N/A | https://apps.dos.ny.gov/publicInquiry/ | Last verified 2025-09-15

ACRIS Property Records | NYC Dept. of Finance | N/A | https://a836-acris.nyc.gov/ | Last verified 2025-09-15

Facade Inspection & Safety Program (LL11/FISP) | NYC Department of Buildings | N/A | https://www.nyc.gov/site/buildings/safety/facade-safety.page | Last verified 2025-09-15

DOB NOW: Safety – Facades Compliance Filings | NYC Open Data | Dataset ID xubg-57si | https://data.cityofnewyork.us/City-Government/DOB-NOW-Safety-Facades-Compliance-Filings/xubg-57si | Last verified 2025-09-15

LL87 Energy Audit Data | NYC Open Data | Dataset ID au6c-jqvf | https://data.cityofnewyork.us/Environment/LL87-Energy-Audit-Data/au6c-jqvf | Last verified 2025-09-15

Local Law 97 – Covered Buildings (program page / CBL links) | NYC Department of Buildings | N/A | https://www.nyc.gov/site/buildings/codes/local-law-97.page | Last verified 2025-09-15

BERDO (Building Emissions Reduction & Disclosure Ordinance) | City of Boston | N/A | https://www.boston.gov/berdo | Last verified 2025-09-15

Cambridge BEUDO Energy Use Data (2015–2023) | City of Cambridge Open Data | Dataset ID 72g6-j7aq | https://data.cambridgema.gov/Energy-and-the-Environment/Cambridge-Building-Energy-Use-Disclosure-Ordinance/72g6-j7aq | Last verified 2025-09-15

NYS Contract Reporter (NYSCR) | NYS Division of Budget | N/A | [https://www.nyscr.ny.gov/](https://www.nyscr.ny.gov/) | Last verified 2025-09-15

PASSPort Public (NYC procurement transparency) | NYC Mayor’s Office of Contract Services | N/A | [https://passport.public.nyc/](https://passport.public.nyc/) | Last verified 2025-09-15

DASNY – RFPs & Bids | Dormitory Authority of the State of New York | N/A | [https://www.dasny.org/opportunities/rfps-bids](https://www.dasny.org/opportunities/rfps-bids) | Last verified 2025-09-15

DASNY – Professional Term Contract Consultants (Roster) | Dormitory Authority of the State of New York | N/A | https://www.dasny.org/opportunities/rfps-bids/professional-services-term-contracts/professional-term-contract-consultants | Last verified 2025-09-15

PANYNJ – Solicitations & Advertisements | Port Authority of NY & NJ | N/A | https://www.panynj.gov/port-authority/en/business-opportunities/solicitations-advertisements.html | Last verified 2025-09-15

PANYNJ – Preliminary Bid Results & Awards | Port Authority of NY & NJ | N/A | https://www.panynj.gov/port-authority/en/business-opportunities/preliminary-bid-results.html; https://www.panynj.gov/port-authority/en/business-opportunities/awards.html | Last verified 2025-09-15

Massport – Bids & Opportunities (Capital Programs) | Massachusetts Port Authority | N/A | https://www.massport.com/business/bids-and-opportunities/ | Last verified 2025-09-15

MBTA – Current Solicitations (Design & Construction) | Massachusetts Bay Transportation Authority | N/A | https://bc.mbta.com/business\_center/bidding\_solicitations/current\_solicitations/ | Last verified 2025-09-15

COMMBUYS (MA State Procurement) | Massachusetts Operational Services Division | N/A | https://www.commbuys.com/bso/ | Last verified 2025-09-15

Tabula – PDF Table Extraction | Tabula Project | N/A | [https://tabula.technology/](https://tabula.technology/) | Last verified 2025-09-15

Camelot – PDF Table Extraction (Python) | Camelot Project | N/A | https://camelot-py.readthedocs.io/en/master | Last verified 2025-09-15

csvkit – CLI CSV Toolkit | Python Software Foundation | N/A | [https://csvkit.readthedocs.io/](https://csvkit.readthedocs.io/) | Last verified 2025-09-15

RowZero – Big CSV Web Viewer | RowZero | N/A | [https://rowzero.io/](https://rowzero.io/) | Last verified 2025-09-15

Gigasheet – Big Data Spreadsheet | Gigasheet, Inc. | N/A | [https://www.gigasheet.com/](https://www.gigasheet.com/) | Last verified 2025-09-15

Visualping – Website Change Detection | Visualping | N/A | [https://visualping.io/](https://visualping.io/) | Last verified 2025-09-15

Distill.io – Web Page Watcher | Distill | N/A | [https://distill.io/](https://distill.io/) | Last verified 2025-09-15

Airtable – Cloud Database (SSOT) | Airtable, Inc. | N/A | https://www.airtable.com/ | Last verified 2025-09-15

Socrata SODA / SoQL Query Docs | Socrata (Tyler Tech) | N/A | [https://dev.socrata.com/docs/queries/](https://dev.socrata.com/docs/queries/) | Last verified 2025-09-15

# 

# 

# **Scoping Bot System Prompt:**

# 

`# Scan2Plan — Cognitive RFP/RFQ Scoping Bot (Unified System Prompt, ≤8k chars)`

`## Mission`

`You are the **S2P Scoping Bot**. Your single job is to **qualify and route** renovation/addition opportunities for **Scan2Plan** (LiDAR-based Scan-to-BIM, MEPF as-builts) from public RFP/RFQ/registrations. Think like a practitioner (SME), not a keyword counter. Output a **verdict + action recipe** with evidence.`

`---`

`## DocType Classifier (first, always)`

``Detect and set `doc_type`:``

`- **RFQ (Qualifications/Roster/IDIQ)**: resumes/SF330, past projects, selection by qualifications, “no fees,” shortlists/term contracts.`

`- **RFP (Proposal/Scope/Price)**: explicit Scope of Work, deliverables, schedule, pricing/fee forms, addenda.`

`- **Vendor-Registration/Prequal**: portal enrollment, commodity codes, insurance/W-9/diversity docs; no specific project.`

`Route:`

`- **RFQ →** “Roster Entry” recipe (forms & quals checklist, where to upload, due date).`

`- **RFP →** “Pursuit” recipe (scope bullets, size/tier, due/pre-bid dates, addenda/planholders links).`

`- **Vendor-Reg →** “Register” recipe (portal URL, required docs/codes, owner, ETA).`

`---`

`## What “Good Fit” Means (plain rules)`

`- **Existing-building work** preferred: renovation, addition, modernization, retrofit, TI/fit-out, change-of-use, envelope/façade, MEP upgrades, decarbonization/electrification, commissioning/re-Cx, adaptive reuse, historic/cultural preservation, campus multi-building.`

`- **Size tiers** (consider **≥3,000 ft²**):`

  `- **Tier-A:** ≥50,000 ft²`

  `- **Tier-B:** 10,000–49,999 ft²`

  `- **Tier-C:** 3,000–9,999 ft²`

  `- Exclude <3,000 ft² unless part of a multi-building program (then Tier-C).`

`- **Roofing:** accept **only** if **Tier-A** or clearly part of envelope/MEP/energy program; else reject.`

`- **De-prioritize / Ignore**: ground-up new construction (no existing-conditions scope), site/civil-only (sidewalks, paving, drainage), janitorial/abatement-only (e.g., bird waste), landscaping, snow/ice, signage/wayfinding-only, IT/low-voltage-only, pure CM/GC services with no design/as-built, pure materials purchase, single-/two-family residential (unless Tier-C programmatic).`

`- **Geography priority:** **NYC metro; Troy NY; Albany NY; Woodstock NY; Boston/NE (CT/RI/MA/VT/NH/ME)**.`

`---`

`## Cognitive SME Reasoning (use semantics, not just keywords)`

`Protocol: **Observe → Infer → Validate → Decide.**`

`- Read **Scope**, then **Project Description**, **Deliverables**, **Background**, **Pre-bid/Q&A**.`

`- Recognize legacy/indirect phrases: *record drawings, measured drawings, field verify, existing conditions survey, building documentation, HABS/HALS, 3D survey, modeling of existing, BIM for existing, as-built set*.`

`- If deliverables ambiguous, reason from intent: interior gut, MEP plant replacement, change-of-use, occupied renovation, campus phasing ⇒ existing conditions likely. Quote the supporting lines.`

`---`

`## Scoring (0–100) and Verdict`

`Compute 4 subscores + bonuses/penalties:`

`1) **Scope Fit (0–50)**`

   `- 50: explicitly asks **existing conditions / as-builts / Scan-to-BIM / LoD/LoA**`

   `- 40: renovation/addition **Tier-A** (even if deliverables vague)`

   `- 30: renovation/addition **Tier-B**`

   `- 20: renovation/addition **Tier-C**`

   `- 0: off-scope per ignore list`

`2) **Size (0–30)** — Tier-A:30 / Tier-B:20 / Tier-C:10 / else:0–5 (justify)`

`3) **Geo Proximity (0–10)** — Hubs:10 / rest of NE:6–8 / outside NE:0–5 (justify)`

`4) **Urgency/Program (0–10)** — Due ≤21 days, multi-building/campus/program, compliance driver (LL11/LL87/LL97/BERDO/BEUDO), or fast-track ⇒ 8–10 else 0–7`

`**Bonuses (+1 each)**: explicit **LoD≥300/BIM/Revit/LiDAR/as-built set**; **adaptive reuse/historic/cultural**; **critical-use** (healthcare/lab/airport/utility/education) or **occupied** renovation.`

`**Penalty (−1)**: roofing-only without envelope/MEP tie.`

`**Total = Scope + Size + Geo + Urgency ± bonuses/penalties**`

`- **Pursue ≥70**, **Monitor 50–69**, **Ignore <50**.`

`---`

`## Required Extraction (fields)`

`Always extract when present:`

`- **Due date**, **Pre-bid/Pre-proposal date/time**, **Submission portal/URL**, **Addenda present (y/n)**, **Planholders/Attendance link(s)**, **Project budget** (if any), **Contacts** (owner/PM/architect).`

`- **Location** (city/state), **Estimated SF** (or null), **Building type** (e.g., higher-ed, healthcare, housing, airport), **Doc links** (source + attachments).`

`---`

`## Output (strict JSON in fenced code block)`

`Return one JSON object:`

`{`

`"doc_type": "RFP|RFQ|Vendor-Registration",`

`"title": "...",`

`"issuer": "...",`

`"location": "City, ST",`

`"due_date": "YYYY-MM-DDTHH:MM" | null,`

`"prebid_date": "YYYY-MM-DDTHH:MM" | null,`

`"submission_portal": "url-or-null",`

`"addenda_present": true|false|null,`

`"planholders_url": "url-or-null",`

`"project_type": "renovation|addition|retrofit|adaptive reuse|historic|...|unknown",`

`"building_type": "higher-ed|healthcare|housing|airport|campus|...|unknown",`

`"est_sf": number | null,`

`"tier": "A|B|C|null",`

`"scores": { "scope": int, "size": int, "geo": int, "urgency": int, "bonus": int, "penalty": int, "total": int },`

`"decision": "Pursue|Monitor|Ignore",`

`"reasons": ["...","..."],`

`"red_flags": ["..."],`

`"evidence_quotes": [{"quote":"...", "section":".../page x"}, {"quote":"...", "section":"..."}],`

`"contacts_present": { "owner": "str|null", "pm": "str|null", "design_team": "str|null" },`

`"links": { "source_url": "url", "attachments": ["url", "..."] },`

`"next_actions": ["...","..."]`

`}`

`Then add **one 25–40 word email opener** tailored to the likely buyer (Owner/PM/Architect), mentioning **standards (LoD/LoA)** and a **fast scan window**.`

`---`

`## Disambiguation Rules`

``- If only “renovation” appears, still score using **Scope Fit + Size** with semantic cues; set `est_sf:null` if unstated and explain in `reasons`.``

``- Roofing-only: accept **only** if Tier-A or tied to envelope/MEP; else `decision:"Ignore"` with red flag.``

`- Small (<3k) but **programmatic/multi-building**: treat as **Tier-C** and justify.`

`- Compliance (LL11/LL87/LL97/BERDO/BEUDO) **helps scoring** but is **not required**.`

`---`

`## Style & Governance`

`- **Evidence-based**: quote the doc for key claims.`

`- **Plain language**; no internal jargon in output.`

``- Do **not** invent SF/dates; use `null` with reason.``

`- Timezone: **America/New_York**.`

`- Keep responses compact; the JSON must be valid.`

`**End of system prompt.**`

# 

# 

# **P17 — Procurement Trigger Pod**

# 

# 

# **Automatable RFP/Procurement Streams (NYC/BOS/NE focus)**

1. **NYC PASSPort Public (citywide)** – RFx, awards, vendor names; set page‑watchers on solicitation \+ addenda. [New York City Government+2a0333-passportpublic.nyc.gov+2](https://www.nyc.gov/site/mocs/passport/passport-public.page?utm_source=chatgpt.com)

2. **NYS Contract Reporter (statewide)** – filter “Architectural, Engineering & Surveying”; daily RSS/email; attachments often list attendees/bidders. [New York State Contract Reporter+1](https://www.nyscr.ny.gov/?utm_source=chatgpt.com)

3. **DASNY** – Pro/Construction opportunities; **“View plan holders / Interested subs”** \= instant firm roster. Automate via change‑watch on each RFx page. [DASNY+1](https://www.dasny.org/opportunities/rfps-bids/construction-contracts?utm_source=chatgpt.com)

4. **Port Authority NY/NJ** – Professional Services & Construction; watch addenda and meeting notices. [Port Authority NYC/NJ+1](https://www.panynj.gov/port-authority/en/business-opportunities.html?utm_source=chatgpt.com)

5. **Boston (City)** – central **Bids & RFPs** \+ Supplier Portal; scrape titles/deadlines; watch PDFs for pre‑bid sign‑ins/bid tabs. [Boston.gov+2Boston.gov+2](https://www.boston.gov/bid-listings?utm_source=chatgpt.com)

6. **Massport** – Capital Programs via **BidExpress** (free to view); Massport pages list upcoming & advertised contracts. Use BidExpress “follow” \+ CSV export where available. [Massport+2Infotech+2](https://www.massport.com/business/bids-and-opportunities?utm_source=chatgpt.com)

7. **MBTA** – Current & **Future** design/construction solicitations; monitor bid results pages for vendor names. [MBTA Bus Tracker+1](https://bc.mbta.com/business_center/bidding_solicitations/current_solicitations/?utm_source=chatgpt.com)

8. **NY OGS Design & Construction** – A/E qualifications‑based selections; subscribe \+ watch each opportunity page. [Office of General Services](https://ogs.ny.gov/construction-opportunities?utm_source=chatgpt.com)

9. **SUNY (SUCF)** – Lists design/consulting RFQs (also mirrors to NYSCR). Watch SUCF page \+ NYSCR category. [State University Construction Fund](https://sucf.suny.edu/opportunities/design-consulting-services-selection-process?utm_source=chatgpt.com)

10. **Co‑ops (national, public & higher‑ed)** – publish open/awarded contracts; mine awarded vendor rosters by category:  
      • **Sourcewell** (open/awarded feeds) [Sourcewell+1](https://www.sourcewell-mn.gov/solicitations?utm_source=chatgpt.com)  
      • **NASPO ValuePoint** (solicitation tracker) [NASPO ValuePoint](https://www.naspovaluepoint.org/solicitation-status/?utm_source=chatgpt.com)  
      • **E\&I Cooperative Services** (RFP updates \+ exportable contract list) [E\&I Cooperative Services+1](https://www.eandi.org/contract-navigator/rfp-development/?utm_source=chatgpt.com)  
      • **OMNIA Partners** (public solicitations & awarded master agreements) [OMNIA Partners+1](https://info.omniapartners.com/solicitations?utm_source=chatgpt.com)

11. **UMass System / UMBA** – Open solicitations (construction, AE); watcher on UMBA “Solicitations”. [umassba.org](https://www.umassba.org/solicitations?utm_source=chatgpt.com)

## **Automation Play (1‑hour weekly, scalable)**

* **Tracker:** Airtable “RFP Watch” (Agency, RFx ID/URL, Addenda URL, **Planholders/Attendees PDF**).

* **Bots:** Distill/Visualping on each RFx page and “Addenda/Sign‑in/Planholders” keyword; email→Airtable webhook.

* **Parse:** On trigger, auto‑pull PDF → extract firm names → de‑dupe to **Firms** table; tag role (Prime/AE/CM).

* **Outreach:** Route Tier‑A (agency \+ scope match) to SDR with Proof‑Vault snippet.

**Why this set:** It reliably yields **named firms and contacts** via planholders/attendees/awards—far more automatable than chasing private‑only portals.

# 

# **SOP — Stream \#1: DASNY (NY State Dormitory Authority) — Automatable RFP/Planholder Funnel**

**Goal (fit to KPIs):** Net **10–20 new A/E contacts/week** and **3–5 meetings/week** from DASNY RFPs, addenda, and term‑consultant rosters; **≤48‑hour** alert→outreach SLA.

---

### **1\) Sources (public, automatable)**

* **Active solicitations (Professional Services):** list of current RFP/RFI/Bids. [DASNY](https://www.dasny.org/opportunities/rfps-bids/professional-services?utm_source=chatgpt.com)

* **“In‑Progress” pages:** post‑opening lists of proposers/bids (names you can harvest). [DASNY](https://www.dasny.org/opportunities/rfps-bids-in-progress/professional-services?utm_source=chatgpt.com)

* **Pre‑proposal sign‑in / attendance PDFs/XLSX:** often include **firm \+ person \+ email**. [DASNY+2DASNY+2](https://www.dasny.org/sites/default/files/rfp-documents/2023-01/SIFCH%20Bridging%20Consultant%20RFP%237593%20Pre-Proposal%20Meeting%20-%20Attendance%20report%201-18-23.pdf?utm_source=chatgpt.com)

* **Term Consultants roster (awarded every \~2 yrs):** ready‑made **design‑pro list** for warm intros/subconsulting. [DASNY+1](https://www.dasny.org/opportunities/rfps-bids/professional-services-term-contracts?utm_source=chatgpt.com)

---

### **2\) Tracker schema (Airtable)**

**RFP Watch:** agency, title, ID, URL, due date, addenda URL(s), “has attendance? y/n”.  
 **Planholders/Attendees:** firm, person, title, email/phone, file URL, date, source (pre‑prop / in‑progress / term list).  
 **Firms (master):** normalized firm name, website, HQ city, sector tags.  
 **Contacts:** person, role (PM/Principal/BD), email, phone, confidence.  
 **Outreach:** trigger, SDR owner, SLA due (created+48h), status, result.

---

### **3\) Automation (no logins, low cost)**

1. **Page‑watch rules**

   * Watch **Professional Services** and **In‑Progress** listings for new records; fire when “Addendum,” “Pre‑Proposal,” “Attendance,” or “Planholders” appears. [DASNY+1](https://www.dasny.org/opportunities/rfps-bids/professional-services?utm_source=chatgpt.com)

2. **Attachment capture**

   * On trigger, download PDF/XLSX; store file URL; auto‑parse tables (names/emails) → **Planholders/Attendees**. (Attendance files routinely include participant details.) [DASNY+1](https://www.dasny.org/sites/default/files/rfp-documents/2023-01/SIFCH%20Bridging%20Consultant%20RFP%237593%20Pre-Proposal%20Meeting%20-%20Attendance%20report%201-18-23.pdf?utm_source=chatgpt.com)

3. **Roster seeding**

   * Quarterly, ingest **Term Consultants** list → **Firms** (tag by discipline). [DASNY](https://www.dasny.org/opportunities/rfps-bids/professional-services-term-contracts/professional-term-contract-consultants?utm_source=chatgpt.com)

---

### **4\) Normalization & de‑dupe**

* Canonicalize firm names (remove “LLC/PC/Inc.”, unify ampersands).

* Merge new contacts into existing firms; confidence score (Exact from XLSX=High; parsed from PDF=Med).

---

### **5\) Contact enrichment (fail‑safe ladder; ≤10–12 min/contact)**

1. **If email present in attendance** → **use it** (priority). [DASNY+1](https://www.dasny.org/sites/default/files/rfp-documents/2023-01/SIFCH%20Bridging%20Consultant%20RFP%237593%20Pre-Proposal%20Meeting%20-%20Attendance%20report%201-18-23.pdf?utm_source=chatgpt.com)

2. Else **firm site → Team/Contact** (grab PM/Principal or info@).

3. Else **LinkedIn title** (PM/Market Lead) → infer **first.last@domain** \+ verify via quick test send (no spam risk copy).

4. If still dry: call main line from website; ask for **BD/PM email for \[RFP title\]**.

5. **Stop‑loss:** if no callable email in 12 minutes, log “phone‑only” and move on.

---

### **6\) Prioritization**

* **Hot:** records with **named emails** or **A/E disciplines** tied to current DASNY RFPs.

* **Warm:** firms on **Term Consultant** roster matching your target sectors (preservation/MEP/adaptive reuse). [DASNY](https://www.dasny.org/opportunities/rfps-bids/professional-services-term-contracts/professional-term-contract-consultants?utm_source=chatgpt.com)

---

### **7\) Outreach (proof‑first; 3 beats)**

* **Subject:** “Standards‑first scans for your DASNY pursuits”

* 3‑line value: **LoA/LoD acceptance**, schedule reliability, **zero‑RFI pilot** → **one Proof‑Vault link** (spec‑matched), **15‑min working session?**

* SLA: **send within 48h** of detection; 2 follow‑ups over 7 days.

---

### **8\) Governance & kill/keep**

* **SLA dashboard:** alert→first‑touch; viewer→meeting.

* **Kill rule:** any watched page producing **\<10% email‑found** or **\<5% viewer→meeting** after 2 weeks.

* **Keep/scale:** pages yielding **attendance with emails** and **Term‑list overlaps** (higher meeting rates). [DASNY+2DASNY+2](https://www.dasny.org/sites/default/files/rfp-documents/2023-01/SIFCH%20Bridging%20Consultant%20RFP%237593%20Pre-Proposal%20Meeting%20-%20Attendance%20report%201-18-23.pdf?utm_source=chatgpt.com)

---

### **9\) Compliance notes**

* All sources are **public DASNY pages**; do **not** contact the agency procurement officer unless the RFP permits; target **A/E firms** for teaming/context. [DASNY](https://www.dasny.org/opportunities/?utm_source=chatgpt.com)

# **SOP Stream \#2: NYC PASSPort Public \+ Agency Pre‑Bid/Attendance Lists → Design‑Pro Funnel**

**Goal:** Harvest **planholder/attendee firm \+ emails** from NYC RFx to feed 500/week outreach with \<1 hr/wk human time.

---

## **1\) Data taps (official, automatable)**

* **PASSPort Public – Browse RFx** (search by keyword/agency; filter Released). [a0333-passportpublic.nyc.gov+1](https://a0333-passportpublic.nyc.gov/rfx.html?utm_source=chatgpt.com)

* **PASSPort Public overview** (portal scope includes solicitations, contracts, vendors). [New York City Government+1](https://www.nyc.gov/site/mocs/passport/passport-public.page?utm_source=chatgpt.com)

* **Agency pre‑bid/attendance PDFs** (e.g., NYCHA posts attendee lists with **names, firms, emails**). [New York City Government+2New York City Government+2](https://www.nyc.gov/assets/nycha/downloads/pdf/rfq511459.pdf?utm_source=chatgpt.com)

---

## **2\) Airtable (SSOT) — 4 tables**

**Rfx** {EPIN, Agency, Title, Close, URL, Watch\_URL, Status}  
 **Files** {Rfx→link, File\_Name, Type=Addendum/Attendance, URL, Parsed? Y/N}  
 **Planholders** {Firm, Person, Email, Phone, Role, Source\_File→link, Confidence}  
 **Outreach** {Firm→link, Trigger=RFP/Attendance, SDR, SLA\_48h, Status}

---

## **3\) Watchers (no‑code)**

* Create saved RFx searches in PASSPort (keywords: Architecture, Engineering, “Design Services”, Façade, MEP, Energy, Commissioning). Check weekly. [New York City Government](https://www.nyc.gov/site/mocs/passport/articles/search-opportunities.page?utm_source=chatgpt.com)

* Set **page‑change alerts** (Visualping/Distill) on each RFx **detail URL** and agency “Pre‑Bid/Pre‑Proposal” pages (e.g., NYCHA prebidders page) to catch **Addenda/Attendance** uploads. On change → add **Files** row. [New York City Government](https://www.nyc.gov/site/nycha/business/prebidders-2024.page?utm_source=chatgpt.com)

---

## **4\) Parse pipeline (fully automatable)**

1. **Download** any new PDF from **Files**.

2. **Auto‑OCR & extract** tables (Tabula/camelot/regex).

3. **Normalize** to **Planholders** (Firm, Person, Email, Phone).

4. **De‑dupe** by firm domain; tag with {Agency, EPIN, Date}.

5. **Confidence**: Email present=High; Phone only=Med; Name only=Low.

*(If no attendance posted by T+5 days, mark Rfx “No‑List” and skip until award.)*

---

## **5\) Failsafes (Murphy’s Law → remedy)**

* **Scanned/locked PDFs:** run OCR; if still messy, grab **NYCHA “Pre‑Bid Conference Attendance List”** text header blocks; regex names/emails. [New York City Government](https://www.nyc.gov/assets/nycha/downloads/pdf/rfq503219.pdf?utm_source=chatgpt.com)

* **No emails in list:** visit firm site “Contact/Team” → capture **info@** \+ contact form URL (time‑box 8–12 min per *new* firm).

* **No attendance ever posted:** after award, pull **vendor/award info** in PASSPort Public → add winning **A/E firms** to roster for future waves. [New York City Government+1](https://www.nyc.gov/site/mocs/passport/passport-public.page?utm_source=chatgpt.com)

* **Virtual conferences (chat sign‑ins):** agencies publish attendee PDFs post‑event (HPD example); watch RFx page until posted. [New York City Government](https://www.nyc.gov/assets/hpd/downloads/pdfs/services/pip-pre-proposal-conference-slides.pdf?utm_source=chatgpt.com)

---

## **6\) Routing & outreach**

* **Auto‑create Outreach** records for **High/Med** confidence within 1 hour of parse; SLA **≤48h** to first touch.

* Sequence: **Design‑Pro proof** (LoD/LoA, Zero‑RFI pilot) \+ **1 pre‑filtered Proof Vault link**; book 15‑min. (Use your existing LL/Proof templates.)

---

## **7\) QA & kill/keep (weekly, 15 min)**

* Metrics: **\# new firms**, **email capture rate**, **bounce \<3%**, **reply→meeting**.

* **Kill** sources with \<15% email capture or no attendee files in 3 weeks; double‑down on agencies posting rich lists (NYCHA, HPD, etc.). [New York City Government+1](https://www.nyc.gov/site/nycha/business/prebidders-2024.page?utm_source=chatgpt.com)

---

## **8\) Throughput math (fits 500/wk)**

* Typical NYCHA/HPD lists \= **20–80 contacts/file**; 10–15 active RFx with addenda → **200–800 contacts/wk**; automation handles parse/load; human time \= QA \+ send (\<1 hr).

---

# **SOP Stream \#3 — Boston City Procurement & RFP Funnel**

**Goal:**  
 Continuously capture **design professionals, contractors, and A/E teams** from **Boston public RFPs** and **Approved Permits**, route into Airtable, and contact within **48 hours** using Proof Vault templates.

---

## **1\) Key Sources (all official, free)**

* **Boston Bids & RFPs portal** — central page of active solicitations .

* **Boston Supplier Portal** — full RFP/RFQ content and documents .

* **Approved Building Permits (Analyze Boston)** — dataset listing new permits, including **owner, applicant, contractor** fields .

* **Pre-bid sign-in sheets & addenda PDFs** — often list **attendees, firms, emails** (posted to the RFP page).

---

## **2\) Airtable Setup (tables)**

1. **RFP Watch**: {Agency=City of Boston, RFx ID, Title, URL, Close date, Addenda URL, Last checked}.

2. **Files**: {RFP→link, File name, Type (Addendum/Attendance), URL, Parsed?}.

3. **Planholders/Attendees**: {Firm, Person, Email, Phone, Role, Source file→link, Confidence}.

4. **Permits**: {Permit ID, Date issued, Address, Applicant firm, Owner firm, Contractor firm, URL}.

5. **Firms**: {Firm name, Website, Domain, General inbox, Pattern guess (first.last@)}.

6. **Contacts**: {Firm link, Person, Title, Email, Phone, Confidence}.

7. **Outreach**: {Firm→link, Trigger=Permit/RFP, SDR, SLA\_due (Created+48h), Status}.

---

## **3\) Automation Jobs (no coding)**

**A. RFPs**

* **Page-watcher (Distill/Visualping)**: monitor Boston Bids & RFPs \+ individual solicitation pages for new **Addenda/Attendance PDFs**.

* **On trigger**: Download file, OCR/parse table → load into **Planholders/Attendees**.

* **De-dupe**: normalize firm names; merge into **Firms**.

**B. Permits (weekly)**

* Open Analyze Boston → Approved Building Permits dataset.

* Filter “Date issued” \= last 7 days → Export CSV.

* Paste into **Permits**; capture Applicant/Owner/Contractor firms → de-dupe into **Firms**.

---

## **4\) Contact Enrichment (time-boxed ≤10 minutes)**

1. **If email in attendance sheet** → use immediately.

2. Else go to **firm website → Contact/Team** page → capture Principal/PM email or info@.

3. If still missing:

   * Use **MA Secretary of the Commonwealth** corporate registry → check agent/principal address.

   * Google search “\[Firm name\] Boston contact” → capture domain \+ info@ \+ guessed pattern (first.last@).

4. Stop after 10 minutes; log “phone only” if email not found.

---

## **5\) Prioritization**

* **Tier-A**: Large scopes (construction \>$1M; design \>$250k) OR firms on multiple RFPs/permits.

* **Tier-B**: Mid-sized scopes ($100k–$250k).

* **Tier-C**: Everything else.

* SDR works **Tier-A** first; SLA breach view shows any record untouched after 48 hours.

---

## **6\) Outreach Templates**

* **Permit trigger**: “We deliver as-builts that lock acceptance standards — zero-RFI pilot.”

* **RFP attendee trigger**: “We support teams on Boston bids with LoD/LoA deliverables and fast turnarounds.”

* Attach **1 Proof Vault link** with 2–3 scope-matched examples.

---

## **7\) QA & Kill/Keep**

* Weekly check: Are we capturing ≥50 new contacts/week?

* Kill any source (permit field or RFP agency) with **\<15% email capture** or **\<10% meeting rate** after 2 weeks.

* Double down on agencies consistently posting attendance lists.

---

## **8\) Operator Task List (≤1 hr/week)**

* **Monday (20 min):**

  * Export last 7 days from Boston Approved Permits → update Airtable.

  * Run contact enrichment for new firms (10 min cap each).

* **Tuesday–Thursday (20 min total):**

  * Check page-watch alerts for RFPs.

  * Parse any new attendance PDFs → update Contacts.

* **Friday (20 min):**

  * Review SLA breaches (\<48h).

  * Bulk-send outreach emails (Proof Vault templates).

  * QA random 10 records; apply kill rules.

---

## **Why It Works**

* **Public, free sources** (no logins required for watch mode).

* **High-value names**: attendance lists \= real bidders (firms you want).

* **Permits add volume**: weekly permit feed ensures steady stream even if RFPs are slow.

* **Fail-safes**: if no emails, info@ \+ phone still yield responses when Proof Vault is included.

---

# 

# **SOP Stream \#4 — Massport Capital Programs (BidExpress) → Design-Pro/Team Funnel**

**Goal:** harvest A/E firms (and teaming CMs/GCs) from **Massport** (Massachusetts Port Authority) **Capital Bids** and **advertised professional consultant** contracts, then contact within **48 hours** with a Proof-Vault snippet.

---

## **1\) Where the data lives (all official, free)**

* **Massport “Bids & Opportunities” hub** → explains that all construction & professional-services procurements run on **BidExpress**; vendors can **register free**. [Massport](https://www.massport.com/business/bids-and-opportunities?utm_source=chatgpt.com)

* **Massport “Capital Bids” listing** → current advertised projects; links to each **contract detail** page. [Massport](https://www.massport.com/business/bids-and-opportunities/capital-bids?utm_source=chatgpt.com)

* **Massport “Upcoming Projects”** (6–9-month look-ahead) for pipeline planning. [Massport](https://www.massport.com/business/bids-and-opportunities/capital-bids/upcoming-projects?utm_source=chatgpt.com)

* **BidExpress — Massport Capital Programs agency page** (public index of solicitations). [bidexpress.com](https://www.bidexpress.com/businesses/27137/home?utm_source=chatgpt.com)

* **Sample advertised contract pages** (e.g., A474 Term A/E; AP2502-C1 Term Mechanical). These pages point back to BidExpress for submissions and sometimes host attachments. [Massport+1](https://www.massport.com/business/bids-opportunities/capital-programs-detail/a474?utm_source=chatgpt.com)

* **COMMBUYS cross-posts** (some RFQs/RFQs mirror here; useful for dates and Massport cap-programs inbox). [commbuys.com](https://www.commbuys.com/bso/external/bidDetail.sdo?docId=BD-19-1411-CAPPR-LOC1-103314&utm_source=chatgpt.com)

Reality check: **Planholder/attendance lists are not always public** on Massport. When posted, they appear as **addenda/attachments** on the Massport contract page or within BidExpress. When they are not public, use the **term-contract rosters**, **award notices**, and **firm names** found in RFQs/legal ads to build your A/E roster. (BidExpress viewing is free with vendor registration, but don’t script behind a login.) [Massport](https://www.massport.com/business/bids-and-opportunities?utm_source=chatgpt.com)

---

## **2\) Airtable setup (tables & views)**

* **RFP Watch**: {Contract \#, Title, Facility (e.g., Logan), Type (Consultant/CM/149), Detail URL, Due date, **Watch\_URL**, Has Addendum? Y/N, Last checked}.

* **Files**: {Contract\#→link, File name, Type (Addendum/Attendance/Legal Ad/RFQ), URL, Parsed? Y/N}.

* **Planholders/Attendees**: {Firm, Person, Email, Phone, Role, Source\_File→link, Confidence (High/Med/Low)}.

* **Firms**: {Firm name (normalized), Website, Domain, General inbox, Pattern guess (first.last@)}.

* **Contacts**: {Firm→link, Person, Title, Email, Phone, Confidence}.

* **Outreach**: {Trigger=Massport, SDR, **SLA\_due (created+48h)**, Status, Result}.

**Views:** New-This-Week, Tier-A (Term/CMR/large consultant), SLA Breach \<48h.

---

## **3\) Watchers & capture (no-code)**

1. **Create page-watch alerts** (Visualping/Distill) for:

   * Massport **Capital Bids** index (new advertised items). [Massport](https://www.massport.com/business/bids-and-opportunities/capital-bids?utm_source=chatgpt.com)

   * Each **contract detail** page you add to RFP Watch (trigger on the words “Addendum”, “Supplemental”, “Attendance”, “Sign-in”). [Massport](https://www.massport.com/business/bids-and-opportunities/capital-bids?utm_source=chatgpt.com)

   * **Upcoming Projects** (monthly check) to seed ABM lists. [Massport](https://www.massport.com/business/bids-and-opportunities/capital-bids/upcoming-projects?utm_source=chatgpt.com)

2. **When a change fires:**

   * Open the contract detail page. If a **PDF/XLSX** appears (addendum, attendance, RFQ pack), copy the file URL into **Files** and **download** it. [Massport+1](https://www.massport.com/business/bids-opportunities/capital-programs-detail/a474?utm_source=chatgpt.com)

   * If the detail page points you to **BidExpress** only, note the solicitation ID in **RFP Watch**. (Viewing is free with registration; do not automate login.)

---

## **4\) Parse → firms/contacts (automatable)**

* **If the file is tabular (XLSX/CSV):** import and map to **Planholders/Attendees** (Firm, Person, Email, Phone).

* **If it’s a PDF:** run OCR/table-extract (Tabula/camelot).

* **Normalize** firm names (strip Inc./LLP/PC, unify ampersands), **de-dupe into Firms**, then **roll up** people into **Contacts**.

**Confidence scoring:** Email present=High; phone only=Med; name only=Low.

---

## **5\) Contact enrichment (≤10 minutes per new firm)**

1. If the document already lists **emails** → use those (High).

2. Else go to **firm website → Contact/Team** and capture **Principal/PM/Marketing** email or **info@** (Med).

3. If still nothing: infer **first.last@domain** from other addresses on the site; or call main line and ask for PM/BD email “for Massport **\[Contract \# / title\]**”.

4. **Stop-loss** at 10 minutes; log phone-only and move on.

---

## **6\) Prioritize who to email (what converts)**

* **Term A/E contracts** (e.g., A474) \= **high-leverage** rosters; the awarded lists become your repeat-play design-pro universe. [Massport](https://www.massport.com/business/bids-opportunities/capital-programs-detail/a474?utm_source=chatgpt.com)

* **CMR & large construction** items (e.g., L1366) → target **CMs** now and their **A/E partners** for teaming. [Massport](https://www.massport.com/business/bids-opportunities/capital-programs-detail/l1366?utm_source=chatgpt.com)

* **149/30 general construction** term contracts (e.g., AP2502-C1) → GC/MEP primes; ask who leads design on their Massport work. [Massport](https://www.massport.com/business/bids-opportunities/capital-programs-detail/ap2502-c1-general?utm_source=chatgpt.com)

---

## **7\) Outreach (Proof-first, 3 lines)**

* **Subject:** “Standards-first as-builts for your Massport pursuits”

* **Body:** LoD/LoA acceptance \+ schedule reliability \+ **zero-RFI pilot**; include **one Proof-Vault link** (2–3 examples matched to airport/maritime/CMR).

* **SLA:** send within **48 hours** of file capture.

---

## **8\) QA, governance, and kill/keep**

* **Weekly QA (15 min):** check that every **New-This-Week** has a contact with Confidence ≥ Med; fix any missing.

* **Deliverability:** keep bounce \<3%; suppress domains with prior opt-out.

* **Kill rules (bi-weekly):** pause any watched source producing **\<15% email-found** or **\<5% reply→meeting**; double-down on pages that routinely post attachments with names/emails.

* **Compliance:** Massport states bids are **online via BidExpress**; do **not** automate scraping behind a login; stick to public contract pages and manually view BidExpress when needed. [Massport](https://www.massport.com/business/bids-and-opportunities?utm_source=chatgpt.com)

---

## **9\) Operator checklist (≤1 hour/week)**

* **Mon (20 min):** review **Capital Bids** index; add new contracts to **RFP Watch**; set page-watchers. [Massport](https://www.massport.com/business/bids-and-opportunities/capital-bids?utm_source=chatgpt.com)

* **Tue–Thu (20 min):** when watchers fire, download **new addenda/attendance/RFQ** files → parse → normalize → enrich contacts (≤10 min per new firm).

* **Fri (20 min):** work **SLA Breach \<48h** view; bulk-send Massport sequence with Proof-Vault link; log meetings.

---

## **Pro tips / edge-case fallbacks**

* **No attendance lists posted:** use the **RFQ legal ad/attachments** (often name primes/teams), and **term-contract pages** to seed firms; add **awardees** later when posted. [commbuys.com+1](https://www.commbuys.com/bso/external/bidDetail.sdo?docId=BD-19-1411-CAPPR-LOC1-103314&utm_source=chatgpt.com)

* **COMMBUYS appears instead of Massport detail:** capture the **Massport cap-programs inbox** (CPBQuestions@massport.com) for context; still route to **firms**, not the agency. [commbuys.com](https://www.commbuys.com/bso/external/bidDetail.sdo?docId=BD-19-1411-CAPPR-LOC1-103314&utm_source=chatgpt.com)

* **Upcoming Projects only:** start **ABM pre-warming** (sector-specific Proof tiles) while you wait for the advertisement to drop. [Massport](https://www.massport.com/business/bids-and-opportunities/capital-bids/upcoming-projects?utm_source=chatgpt.com)

---

### **Why this stream is worth it**

Massport centralizes all capital program solicitations in one place and runs them through **BidExpress** (free to view/register), making it **easy to monitor** and **fast to route** into outreach; term A/E and CMR work create **repeatable contact universes** across Logan, maritime, and regional airports. [Massport+1](https://www.massport.com/business/bids-and-opportunities?utm_source=chatgpt.com)

# **SOP Stream \#5 — MBTA (Massachusetts Bay Transportation Authority) → Design-Pro/Team Funnel**

**Goal:** capture A/E (architect/engineer) firms and teaming partners directly from **MBTA solicitations, planholder lists, pre-bid attendance, and awards**, and contact them within **48 hours** using Proof-first outreach.

---

## **1\) Where the data lives (official, public)**

* **Current Solicitations (Design & Construction)** — MBTA’s Business Center lists active construction/professional-services procurements; projects are publicly advertised and, for contracts **\>$1M, prequalification is required**. [bc.mbta.com+1](https://bc.mbta.com/business_center/bidding_solicitations/current_solicitations/?utm_source=chatgpt.com)

* **Planholders / Bid Reports (by contract)** — individual contract pages and reports include **Planholders Lists** (often split into “Pre-Qualified Contractors with Issued Proposals” and “Other Planholders”). These pages also show **pre-bid** dates and addenda. [bc.mbta.com+2bc.mbta.com+2](https://bc.mbta.com/business_center/bidding_solicitations/report/?cnumber=T24CN01&utm_source=chatgpt.com)

* **Awarded Contracts** — MBTA publishes award pages per contract (use to build a roster of frequent A/E vendors). [bc.mbta.com](https://bc.mbta.com/business_center/bidding_solicitations/awarded_contracts/?utm_source=chatgpt.com)

* **MBTA BidWeb portal** — MBTA’s bid site (do not automate behind login; use public items and contract pages for data). [bw.mbta.com](https://bw.mbta.com/BidWeb2013/?utm_source=chatgpt.com)

* **COMMBUYS cross-posts** — some MBTA solicitations appear here with **attachments such as pre-bid attendance reports** (grab firm names/emails when posted). [commbuys.com](https://www.commbuys.com/bso/external/bidDetail.sdo?docId=BD-23-1206-MBTA-MBTA-85575&utm_source=chatgpt.com)

---

## **2\) Airtable structure (no code)**

**RFP Watch**: {Contract \#, Title, Facility/Line, Type (Consultant/CM/GC), Detail URL, Due date, Watch\_URL, “Has Addendum?” Y/N, Last checked}  
 **Files**: {Contract\#→link, File name, Type (Addendum/Attendance/Planholders/Award), URL, Parsed? Y/N}  
 **Planholders/Attendees**: {Firm, Person, Email, Phone, Role, Source\_File→link, Confidence (High=has email / Med=phone / Low=name only)}  
 **Firms**: {Firm name (normalized), Website, Domain, General inbox, Pattern guess (first.last@)}  
 **Contacts**: {Firm→link, Person, Title, Email, Phone, Confidence}  
 **Outreach**: {Trigger=MBTA, SDR owner, SLA\_due (created+48h), Status, Result}

Views: **New-This-Week**, **Tier-A** (term/CMR/large consultant), **SLA Breach \<48h**.

---

## **3\) Page-watchers (zero coding)**

Set **Visualping/Distill** watches for:

1. **Current Solicitations** index — fires when new items are posted. [bc.mbta.com](https://bc.mbta.com/business_center/bidding_solicitations/current_solicitations/?utm_source=chatgpt.com)

2. Each **Contract Detail / Report** page you add — trigger on keywords: **“Planholders”, “Addendum”, “Pre-Bid”, “Sign-in”**. [bc.mbta.com+1](https://bc.mbta.com/business_center/bidding_solicitations/report/?cnumber=T24CN01&utm_source=chatgpt.com)

3. **Awarded Contracts** index — monthly review to expand the “frequent bidders” universe. [bc.mbta.com](https://bc.mbta.com/business_center/bidding_solicitations/awarded_contracts/?utm_source=chatgpt.com)

4. **COMMBUYS** listing for MBTA — watch for **Pre-Bid Attendance**/attachments. [commbuys.com](https://www.commbuys.com/bso/external/bidDetail.sdo?docId=BD-23-1206-MBTA-MBTA-85575&utm_source=chatgpt.com)

When a watcher fires: add/update the **RFP Watch** record and create a **Files** row with the new attachment/URL.

---

## **4\) Capture & parsing (HTML/PDF/XLSX)**

* **Planholders pages (HTML)**: copy firm lists (both “Pre-Qualified” and “Other Planholders”) into **Planholders/Attendees**; include contract number, date, and page URL as **Source\_File**. [bc.mbta.com+1](https://bc.mbta.com/business_center/bidding_solicitations/report/?cnumber=T24CN01&utm_source=chatgpt.com)

* **Attendance/Award files (PDF/XLSX)**: download from the link; if PDF, run OCR/table extract (Tabula/camelot); map columns to **Planholders/Attendees**; then **de-dupe** into **Firms** and roll up to **Contacts**. [commbuys.com](https://www.commbuys.com/bso/external/bidDetail.sdo?docId=BD-23-1206-MBTA-MBTA-85575&utm_source=chatgpt.com)

**Confidence:** Email present=High; phone only=Med; name only=Low.

---

## **5\) Contact enrichment (≤10 minutes per *new* firm)**

1. If the file lists **emails** → use them (High). [commbuys.com](https://www.commbuys.com/bso/external/bidDetail.sdo?docId=BD-23-1206-MBTA-MBTA-85575&utm_source=chatgpt.com)

2. Else go to **firm website → Contact/Team**; capture **Principal/PM/Marketing** email or **info@** (Med).

3. If still missing: infer **first.last@domain** from any address on the site; or call the main line and ask for **PM/BD email for “MBTA Contract \[\# / Title\]”**.

4. **Stop-loss at 10 minutes**; log phone-only and move on.

---

## **6\) Prioritization logic (what converts fastest)**

* **Pre-Qualified \+ Issued Proposals** list → highest intent (work now). [bc.mbta.com+1](https://bc.mbta.com/business_center/bidding_solicitations/report/?cnumber=T24CN01&utm_source=chatgpt.com)

* **Term/On-Call contracts** (e.g., Systemwide/On-Call scopes) → rich teaming universes; repeat touch. [bc.mbta.com](https://bc.mbta.com/business_center/bidding_solicitations/report/?cnumber=Z91CN06&utm_source=chatgpt.com)

* **Large capital construction** (\>$1M, prequalified) → target primes **and** their A/E partners. [bc.mbta.com](https://bc.mbta.com/business_center/bidding_solicitations/bid_responses/?utm_source=chatgpt.com)

* **Awarded firms** → build a “frequent MBTA vendors” list for steady pipeline. [bc.mbta.com](https://bc.mbta.com/business_center/bidding_solicitations/awarded_contracts/?utm_source=chatgpt.com)

---

## **7\) Outreach (Proof-first, 3 lines)**

* **Subject:** “Standards-first as-builts for your MBTA pursuits”

* **Body:** LoD/LoA acceptance \+ schedule reliability \+ **zero-RFI pilot**; include **one Proof-Vault link** (2–3 assets matched to rail/bus/facility scopes).

* **SLA:** send within **48 hours** of capture.

---

## **8\) QA, governance, kill/keep**

* **Weekly QA (15 min):** ensure every **New-This-Week** record has **Confidence ≥ Med**; fix missing emails.

* **Deliverability:** bounce \<3%; suppress opt-outs by domain.

* **Kill rules (bi-weekly):** pause any watched source producing **\<15% email-found** or **\<5% reply→meeting**; double-down on contracts where MBTA posts **planholders or attendance** consistently. [bc.mbta.com+1](https://bc.mbta.com/business_center/bidding_solicitations/report/?cnumber=T24CN01&utm_source=chatgpt.com)

* **Compliance:** MBTA bids are public; **do not automate behind login** (BidWeb); restrict automation to public Business Center pages and COMMBUYS attachments. [bw.mbta.com](https://bw.mbta.com/BidWeb2013/?utm_source=chatgpt.com)

---

## **9\) Operator checklist (≤1 hour/week)**

* **Mon (20 min):** review **Current Solicitations**; add new contracts to **RFP Watch**; set page-watchers. [bc.mbta.com](https://bc.mbta.com/business_center/bidding_solicitations/current_solicitations/?utm_source=chatgpt.com)

* **Tue–Thu (20 min):** when alerts fire, capture **Planholders/Attendance/Awards** → parse → normalize → enrich contacts (≤10 min per new firm). [bc.mbta.com+1](https://bc.mbta.com/business_center/bidding_solicitations/report/?cnumber=T24CN01&utm_source=chatgpt.com)

* **Fri (20 min):** process **SLA Breach \<48h**; bulk-send MBTA sequence with Proof-Vault link; log meetings; update “Frequent MBTA Vendors” from **Awarded Contracts**. [bc.mbta.com](https://bc.mbta.com/business_center/bidding_solicitations/awarded_contracts/?utm_source=chatgpt.com)

---

### **Why this stream is high-ROI**

MBTA exposes **who is bidding** (planholders) and **who wins** (awards) on public pages; many contracts also publish **pre-bid dates and addenda**. You can reliably harvest firm names at **zero cost**, enrich to callable emails in **≤10 minutes/firm**, and sustain consistent outreach volume without scraping private portals. [bc.mbta.com+2bc.mbta.com+2](https://bc.mbta.com/business_center/bidding_solicitations/report/?cnumber=T24CN01&utm_source=chatgpt.com)

# **SOP Stream \#5  — Port Authority of NY/NJ (PANYNJ) → Design-Pro/Team Funnel**

**Goal:** harvest A/E firms (and teaming CMs/GCs) from **PANYNJ** solicitations, **pre-proposal/pre-bid attendance**, **call-in lists**, **awards** and **preliminary bid results**, then contact within **48 hours** with a Proof-first email.

---

## **1\) Where the data lives (official, public)**

* **Solicitations/Advertisements** (hub; links to Construction, Goods/Services, Professional Services). [Port Authority NYC/NJ](https://www.panynj.gov/port-authority/en/business-opportunities/solicitations-advertisements.html?utm_source=chatgpt.com)

* **Professional Services** (A/E & technical consulting opportunities). [Port Authority NYC/NJ](https://www.panynj.gov/port-authority/en/business-opportunities/solicitations-advertisements/professional-services.html?utm_source=chatgpt.com)

* **Consultant Procurements** (explains **Project-Specific RFP** vs **Call-In (task-order)** RFP; both are publicly advertised). [Port Authority NYC/NJ](https://www.panynj.gov/port-authority/en/business-opportunities/consultant-procurements.html?utm_source=chatgpt.com)

* **Pre-proposal/Pre-bid** materials often include **attendance/sign-in PDFs** with firms/emails (example RFP \#6000001391). [corpinfo.panynj.gov](https://corpinfo.panynj.gov/content/dam/port-authority/pdfs/professional-services/RFP6000001391_Preproposal_Attendance_List.pdf?utm_source=chatgpt.com)

* **Preliminary Bid Results** (post-opening raw bid data; use to map active primes/subs). [Port Authority NYC/NJ](https://www.panynj.gov/port-authority/en/business-opportunities/preliminary-bid-results.html?utm_source=chatgpt.com)

* **Contracting Activity** (rolling **awards**, **prequalification lists**, **call-in lists**). [Port Authority NYC/NJ](https://www.panynj.gov/port-authority/en/business-opportunities/awards.html?utm_source=chatgpt.com)

* **Professional Technical & Advisory “Call-In” Lists / Categories & Terms** (rosters and program categories). [Port Authority NYC/NJ+1](https://www.panynj.gov/port-authority/en/business-opportunities/awards/professional-technical-and-advisory-call-in---award-list.html?utm_source=chatgpt.com)

* **Professional/Technical & Advisory Forecast** (anticipated consultant solicitations to pre-warm targets). [corpinfo.panynj.gov](https://corpinfo.panynj.gov/port-authority/en/business-opportunities/solicitations-advertisements/professional-services/professional-technical-and-advisory-forecast.html?utm_source=chatgpt.com)

* **Notices to Bidders/RFPs** show **pre-bid dates** and staff contacts; since 2024–2025, submissions run via **Bonfire** (don’t automate behind login). [Port Authority NYC/NJ+3Port Authority NYC/NJ+3Port Authority NYC/NJ+3](https://www.panynj.gov/content/dam/port-authority/pdfs/bid-proposal/notice-to-bidders-6000002338.pdf?utm_source=chatgpt.com)

---

## **2\) Airtable setup (tables & views)**

* **RFP Watch**: {Contract/RFP \#, Title, Facility (EWR/JFK/LaGuardia/PATH/Ports), Type (Consultant/CM/GC), Detail URL, Due date, **Watch\_URL**, “Has Addendum?” Y/N, Last checked}.

* **Files**: {RFP→link, File name, Type (Addendum/Attendance/Planholders/Award/Prelim-Results), URL, Parsed? Y/N}.

* **Planholders/Attendees**: {Firm, Person, Email, Phone, Role, Source\_File→link, Confidence (High/Med/Low)}.

* **Firms**: {Firm name (normalized), Website, Domain, General inbox, Pattern guess (first.last@)}.

* **Contacts**: {Firm→link, Person, Title, Email, Phone, Confidence}.

* **Outreach**: {Trigger=PANYNJ, SDR, **SLA\_due (created+48h)**, Status, Result}.  
   **Views:** New-This-Week, **Tier-A (Call-In/large capital)**, **SLA Breach \<48h**.

---

## **3\) Page-watchers (zero coding)**

Set **Visualping/Distill** watches for:

1. **Solicitations/Advertisements** hub (new items). [Port Authority NYC/NJ](https://www.panynj.gov/port-authority/en/business-opportunities/solicitations-advertisements.html?utm_source=chatgpt.com)

2. **Professional Services** index & any **contract detail** pages you add (trigger words: **Addendum, Pre-Proposal, Attendance, Sign-in**). [Port Authority NYC/NJ](https://www.panynj.gov/port-authority/en/business-opportunities/solicitations-advertisements/professional-services.html?utm_source=chatgpt.com)

3. **Preliminary Bid Results** (daily or 2×/wk). [Port Authority NYC/NJ](https://www.panynj.gov/port-authority/en/business-opportunities/preliminary-bid-results.html?utm_source=chatgpt.com)

4. **Contracting Activity** (awards, call-in/prequal lists). [Port Authority NYC/NJ](https://www.panynj.gov/port-authority/en/business-opportunities/awards.html?utm_source=chatgpt.com)

5. **PTA Forecast** (monthly) to seed ABM lists. [corpinfo.panynj.gov](https://corpinfo.panynj.gov/port-authority/en/business-opportunities/solicitations-advertisements/professional-services/professional-technical-and-advisory-forecast.html?utm_source=chatgpt.com)

When a watcher fires: add/refresh the **RFP Watch** record and create a **Files** row with the new attachment/URL.

---

## **4\) Capture & parsing (HTML/PDF/XLSX)**

* **Attendance/Pre-proposal PDFs**: download → OCR/table-extract (Tabula/camelot) → map to **Planholders/Attendees** (Firm, Person, Email, Phone). [corpinfo.panynj.gov](https://corpinfo.panynj.gov/content/dam/port-authority/pdfs/professional-services/RFP6000001391_Preproposal_Attendance_List.pdf?utm_source=chatgpt.com)

* **Preliminary Bid Results** (HTML/PDF): copy bidders/prices → map firms into **Planholders/Attendees** (mark Source=Prelim-Results). [Port Authority NYC/NJ](https://www.panynj.gov/port-authority/en/business-opportunities/preliminary-bid-results.html?utm_source=chatgpt.com)

* **Awards/Call-In lists**: capture **awardee firms** and **call-in roster firms** → **Firms** and **Contacts** (these are repeat-play universes). [Port Authority NYC/NJ+1](https://www.panynj.gov/port-authority/en/business-opportunities/awards.html?utm_source=chatgpt.com)

* **Normalize** firm names (strip Inc./LLP, unify ampersands), **de-dupe into Firms**, roll up people into **Contacts**.  
   **Confidence:** Email present=High; phone only=Med; name only=Low.

---

## **5\) Contact enrichment (≤10 minutes per *new* firm)**

1. If the document lists **emails** → use (High). [corpinfo.panynj.gov](https://corpinfo.panynj.gov/content/dam/port-authority/pdfs/professional-services/RFP6000001391_Preproposal_Attendance_List.pdf?utm_source=chatgpt.com)

2. Else go to **firm website → Contact/Team**; capture **Principal/PM/Marketing** email or **info@** (Med).

3. If still missing: infer **first.last@domain** from site samples; or call main line and ask for **PM/BD email “re: PANYNJ Contract \[\# / Title\]”** (Notices often show staff names/emails for RSVPs—use that context). [Port Authority NYC/NJ+1](https://www.panynj.gov/content/dam/port-authority/pdfs/bid-proposal/notice-to-bidders-6000002338.pdf?utm_source=chatgpt.com)

4. **Stop-loss at 10 minutes**; log phone-only and move on.

---

## **6\) Prioritization (what converts)**

* **Call-In/Task-Order programs** (A/E & technical) → highest leverage; award/roster \= repeatable targets. [Port Authority NYC/NJ+1](https://www.panynj.gov/port-authority/en/business-opportunities/consultant-procurements.html?utm_source=chatgpt.com)

* **Large capital construction** → target primes \+ their A/E partners (use Prelim Results & Awards). [Port Authority NYC/NJ+1](https://www.panynj.gov/port-authority/en/business-opportunities/preliminary-bid-results.html?utm_source=chatgpt.com)

* **Airports/PATH/Ports** term categories from “Call-In…Categories & Terms” → pre-segment Proof tiles. [Port Authority NYC/NJ](https://www.panynj.gov/content/dam/port-authority/pdfs/contracting-activity-pdfs/Call-in_Programs_Categories_and_Terms.pdf?utm_source=chatgpt.com)

---

## **7\) Outreach (Proof-first, 3 lines)**

* **Subject:** “Standards-first as-builts for your PANYNJ pursuits”

* **Body:** LoD/LoA acceptance \+ schedule reliability \+ **zero-RFI pilot**; include **one Proof-Vault link** (2–3 assets matched to airport/PATH/maritime scopes).

* **SLA:** send within **48 hours** of capture.

---

## **8\) QA, governance, kill/keep**

* **Weekly QA (15 min):** ensure every **New-This-Week** has **Confidence ≥ Med**; fix missing emails.

* **Deliverability:** bounce \<3%; suppress opt-outs by domain.

* **Kill rules (bi-weekly):** pause any watched source producing **\<15% email-found** or **\<5% reply→meeting**; double-down on pages that routinely post **attendance/addenda** and **call-in/award** rosters. [Port Authority NYC/NJ+1](https://www.panynj.gov/port-authority/en/business-opportunities/solicitations-advertisements.html?utm_source=chatgpt.com)

* **Compliance:** Submissions currently via **Bonfire**; **do not** automate behind login. Work only from public pages/attachments. [Port Authority NYC/NJ+1](https://www.panynj.gov/content/dam/port-authority/pdfs/goods-and-services-pdfs/Bid_6000002620_AD.pdf?utm_source=chatgpt.com)

---

## **9\) Operator checklist (≤1 hour/week)**

* **Mon (20 min):** review **Solicitations/Advertisements** \+ **Professional Services**; add new contracts to **RFP Watch**; set page-watchers. [Port Authority NYC/NJ+1](https://www.panynj.gov/port-authority/en/business-opportunities/solicitations-advertisements.html?utm_source=chatgpt.com)

* **Tue–Thu (20 min):** when alerts fire, capture **Attendance/Addenda/Prelim-Results/Awards** → parse → normalize → enrich (≤10 min per new firm). [corpinfo.panynj.gov+2Port Authority NYC/NJ+2](https://corpinfo.panynj.gov/content/dam/port-authority/pdfs/professional-services/RFP6000001391_Preproposal_Attendance_List.pdf?utm_source=chatgpt.com)

* **Fri (20 min):** process **SLA Breach \<48h**; bulk-send PANYNJ sequence with Proof-Vault link; update “Frequent PANYNJ Vendors” from **Awards/Call-In**. [Port Authority NYC/NJ+1](https://www.panynj.gov/port-authority/en/business-opportunities/awards.html?utm_source=chatgpt.com)

---

### **Pro tips / edge-case fallbacks**

* **No attendance posted yet?** Watch for **Pre-Proposal** addenda; Notices often publish **pre-bid date & staff email**—RSVP and add the staff email to your context notes. [Port Authority NYC/NJ](https://www.panynj.gov/content/dam/port-authority/pdfs/bid-proposal/notice-to-bidders-6000002338.pdf?utm_source=chatgpt.com)

* **Only Prelim Bid Results available:** still capture firm names now; enrich later when awards post. [Port Authority NYC/NJ](https://www.panynj.gov/port-authority/en/business-opportunities/preliminary-bid-results.html?utm_source=chatgpt.com)

* **Planning horizon:** use the **PTA Forecast** and **Capital Plan** to pre-segment targets and prep sector-specific Proof tiles. [corpinfo.panynj.gov+1](https://corpinfo.panynj.gov/port-authority/en/business-opportunities/solicitations-advertisements/professional-services/professional-technical-and-advisory-forecast.html?utm_source=chatgpt.com)

# **SOP Stream \#6 — NYCHA / HPD (NYC Housing Authority & NYC Dept. of Housing Preservation & Development) → Design-Pro/Owner/CM Funnel**

**Goal:** harvest firm names (often with emails) from **pre-bid/pre-proposal attendance lists, addenda, awards, and notices** issued by **NYCHA** and **HPD**; enrich to callable contacts in ≤10 minutes/firm; send Proof-first outreach within **48 hours** of capture.

---

## **1\) Where the data lives (official, public)**

### **NYCHA (New York City Housing Authority)**

* **Procurement hub** (PQLs, process). [New York City Government](https://www.nyc.gov/site/nycha/business/procurement-opportunities.page?utm_source=chatgpt.com)

* **Doing Business w/ NYCHA** (policy; open competition; vendor guidance). [New York City Government](https://www.nyc.gov/site/nycha/business/vendors.page?utm_source=chatgpt.com)

* **iSupplier & City Record routing** (how NYCHA posts & how vendors get docs). [New York City Government](https://www.nyc.gov/site/nycha/about/comp-mod/contracting-opportunities-vendor-resources.page?utm_source=chatgpt.com)

* **Pre-Bid/Pre-Proposer Attendance Lists** — many PDFs list **firm \+ person \+ email/phone** (NYCHA keeps year-indexed pages and individual PDFs). [New York City Government+3New York City Government+3New York City Government+3](https://www.nyc.gov/site/nycha/business/prebidders-2024.page?utm_source=chatgpt.com)

### **HPD (NYC Dept. of Housing Preservation & Development)**

* **Vendor Contract Opportunities** (HPD procurement & events; encourages **pre-bid** participation). [New York City Government](https://www.nyc.gov/site/hpd/services-and-information/vendor-contract-opportunities.page?utm_source=chatgpt.com)

* **Contract Opportunities (Doing Business with HPD)** \+ **PASSPort** guidance (HPD uses NYC’s RFx portal). [New York City Government+2New York City Government+2](https://www.nyc.gov/site/hpd/services-and-information/contract-opportunities.page?utm_source=chatgpt.com)

* **City Record Online (CROL)** — official notices list **pre-bid dates, staff contacts** (HPD example). [a856-cityrecord.nyc.gov](https://a856-cityrecord.nyc.gov/RequestDetail/20250611027?utm_source=chatgpt.com)

---

## **2\) Airtable base (no-code)**

**Tables**

* **RFP Watch** {Agency(=NYCHA/HPD), RFx/ID, Title, Detail URL, Close Date, **Watch\_URL**, “Has Addendum/Attendance?” Y/N, Last Checked}

* **Files** {RFX→link, File Name, **Type**(Addendum/Attendance/Award/Notice), URL, Parsed? Y/N}

* **Planholders/Attendees** {Firm, Person, Email, Phone, Role, **Source\_File**→link, Confidence (High/Med/Low)}

* **Firms** {Firm (normalized), Website, Domain, General Inbox, Pattern Guess (first.last@)}

* **Contacts** {Firm→link, Person, Title, Email, Phone, Confidence}

* **Outreach** {Trigger=NYCHA/HPD, SDR, **SLA\_due (created+48h)**, Status, Result}

**Views:** New-This-Week, **Tier-A** (term/IDIQ/large scopes), **SLA Breach \<48h**.

---

## **3\) Zero-code “watchers” (set once)**

**NYCHA**

1. Watch **NYCHA Procurement Opportunities** index. Trigger words: *Addendum*, *Pre-Bid*, *Attendance*. [New York City Government](https://www.nyc.gov/site/nycha/business/procurement-opportunities.page?utm_source=chatgpt.com)

2. Watch **NYCHA Pre-Bidders (year) pages** (e.g., 2024, 2022). Trigger on new PDF links. [New York City Government+1](https://www.nyc.gov/site/nycha/business/prebidders-2024.page?utm_source=chatgpt.com)

3. When fired → create **Files** row; download PDF.

**HPD**

1. Watch **HPD Vendor Contract Opportunities** page for new events/RFx. [New York City Government](https://www.nyc.gov/site/hpd/services-and-information/vendor-contract-opportunities.page?utm_source=chatgpt.com)

2. In **PASSPort**, save a public search filtered to **Agency \= HPD** (browse mode). Check weekly for **Addenda/Docs** (do not automate behind login). [New York City Government](https://www.nyc.gov/site/mocs/passport/about-passport.page?utm_source=chatgpt.com)

3. Watch **City Record Online** for HPD notices (pre-bid dates & contacts). [a856-cityrecord.nyc.gov](https://a856-cityrecord.nyc.gov/RequestDetail/20250611027?utm_source=chatgpt.com)

*(Use Visualping/Distill; paste each watched URL into **RFP Watch.Watch\_URL**.)*

---

## **4\) File capture → parsing → people (repeatable)**

1. **Download** the new file (PDF/XLSX).

2. **Parse**:

   * If **XLSX/CSV**: import directly to **Planholders/Attendees**.

   * If **PDF**: run OCR/table extract (Tabula/camelot).

3. **Map fields** → {Firm, Person, Email, Phone, Role, Source\_File}.

4. **Normalize** firm names (strip Inc./LLP/PC, unify “&”/“and”).

5. **De-dupe** into **Firms**, roll up people to **Contacts**.

**Proof this works:** NYCHA attendance PDFs routinely expose **names \+ emails** (e.g., RFQ 510327, 511459, 448015). [New York City Government+2New York City Government+2](https://www.nyc.gov/assets/nycha/downloads/pdf/rfq510327.pdf?utm_source=chatgpt.com)

---

## **5\) Contact enrichment (≤10 minutes per *new* firm)**

**If email already in file →** mark **Confidence \= High** and skip to Outreach. [New York City Government](https://www.nyc.gov/assets/nycha/downloads/pdf/rfq510327.pdf?utm_source=chatgpt.com)

**If missing:**

1. **Firm website → Contact/Team** page → capture **Principal/PM/Marketing** or **info@** (Med).

2. If still dry: infer **first.last@domain** from any sample address on site; or **call main line** and ask for **PM/BD email “for NYCHA/HPD RFx \[\# / Title\]”** (HPD/City Record notices confirm pre-bid context). [a856-cityrecord.nyc.gov+1](https://a856-cityrecord.nyc.gov/RequestDetail/20250611027?utm_source=chatgpt.com)

3. **Stop-loss at 10 minutes**; log phone-only and move on.

---

## **6\) Prioritization (who gets emails first)**

* **NYCHA Pre-Bid PDFs with named emails** → highest intent & speed to meeting. [New York City Government](https://www.nyc.gov/site/nycha/business/prebidders-2024.page?utm_source=chatgpt.com)

* **HPD items with active pre-bid in City Record/PASSPort** → warm; attendees/awardees often post later. [a856-cityrecord.nyc.gov+1](https://a856-cityrecord.nyc.gov/RequestDetail/20250611027?utm_source=chatgpt.com)

* **Term/IDIQ & program management** scopes (repeat issuances) → build a recurring A/E/CM universe (NYCHA lists show IDIQs across trades). [New York City Government](https://www.nyc.gov/site/nycha/business/prebidders-2024.page?utm_source=chatgpt.com)

---

## **7\) Outreach (Proof-first, 3 lines; send ≤48h)**

* **Subject (NYCHA/HPD):** “Standards-first as-builts for your \[NYCHA/HPD\] pursuits”

* **Body:** LoD/LoA acceptance \+ schedule reliability \+ **zero-RFI pilot**; include **one Proof-Vault link** (2–3 assets matched to housing/MEP/façade scopes).

* **Cadence:** day 0 (new), day 3, day 7 follow-ups.

---

## **8\) QA, governance, kill/keep**

* **Weekly QA (15 min):** every **New-This-Week** has **Confidence ≥ Med**; fix gaps.

* **Deliverability:** keep bounce \<3%; suppress opt-outs.

* **Kill rules (bi-weekly):** pause any watched source with **\<15% email-found** or **\<5% reply→meeting**; double-down on **NYCHA Pre-Bidders** (rich contact PDFs) and HPD items that publish addenda/attendance via **PASSPort/CROL**. [New York City Government+2New York City Government+2](https://www.nyc.gov/site/nycha/business/prebidders-2024.page?utm_source=chatgpt.com)

* **Compliance:** do **not** automate behind **iSupplier** or **PASSPort** logins; work from public pages/attachments only. [New York City Government+1](https://www.nyc.gov/site/nycha/about/comp-mod/contracting-opportunities-vendor-resources.page?utm_source=chatgpt.com)

---

## **9\) Operator checklist (≤1 hour/week)**

* **Mon (20 min):**

  * Scan **NYCHA Pre-Bidders (current year)** for new PDFs → parse & load. [New York City Government](https://www.nyc.gov/site/nycha/business/prebidders-2024.page?utm_source=chatgpt.com)

  * Review **HPD Vendor Contract Opportunities** for new items; add to **RFP Watch**. [New York City Government](https://www.nyc.gov/site/hpd/services-and-information/vendor-contract-opportunities.page?utm_source=chatgpt.com)

* **Tue–Thu (20 min):**

  * When watchers fire, process **Files** → **Planholders/Attendees** → **Contacts**; enrich any missing emails (≤10 min).

* **Fri (20 min):**

  * Work **SLA Breach \<48h** view; bulk-send NYCHA/HPD sequence with Proof-Vault links; log meetings.

  * Check **City Record** for HPD pre-bid notices coming up next week. [a856-cityrecord.nyc.gov](https://a856-cityrecord.nyc.gov/RequestDetail/20250611027?utm_source=chatgpt.com)

---

### **Why this stream is high-ROI**

* **NYCHA** routinely posts **attendance PDFs with emails** — turnkey contact capture. [New York City Government+1](https://www.nyc.gov/assets/nycha/downloads/pdf/rfq510327.pdf?utm_source=chatgpt.com)

* **HPD** funnels solicitations through **PASSPort** and **City Record** — predictable **pre-bid** signals and official staff contacts. [New York City Government+1](https://www.nyc.gov/site/mocs/passport/about-passport.page?utm_source=chatgpt.com)

* All sources are **public and free**; no scraping behind logins; enrichment is capped at **≤10 minutes** per firm to keep cost/lead low. [New York City Government](https://www.nyc.gov/site/nycha/about/comp-mod/contracting-opportunities-vendor-resources.page?utm_source=chatgpt.com)

# **SOP Stream \#7 — SUNY / SUCF (State University Construction Fund) → Design-Pro/Team Funnel**

**Goal:** harvest A/E firms (and teaming GCs/CMs) from **SUCF** solicitations, **shortlists/awards**, **bid-opening results**, and **planholder lists**, then contact within **48 hours** using Proof-first outreach.

---

## **1\) Where the data lives (official, public)**

* **Construction opportunities \+ bid calendar** (SUCF “Construction” hub). Also links to **bid opening results**. [State University Construction Fund](https://sucf.suny.edu/opportunities/construction?utm_source=chatgpt.com)

* **Design/Consulting Services – selection status** (Short Lists; Contracts Awarded). Great for building the **active A/E roster**. [State University Construction Fund](https://sucf.suny.edu/opportunities/design-consulting-services?utm_source=chatgpt.com)

* **Procurements Advertised** (current RFQs/RFPs for consultants). [State University Construction Fund](https://sucf.suny.edu/design-consulting-services/procurements-advertised?utm_source=chatgpt.com)

* **RFQ Registration** (how consultants register to receive RFQs; confirms Fund process). [State University Construction Fund](https://sucf.suny.edu/opportunities/rfq-registration?utm_source=chatgpt.com)

* **Bid Opening Results PDF** (rolling; lists **bidders by package**, often with **emails/contacts**). [BUSS Login](https://appls.sucf.suny.edu/public/BidReports/BidOpeningResultsRpt.cfm?fileType=pdf&utm_source=chatgpt.com)

* **NYS Contract Reporter (NYSCR)** — **all SUCF opportunities are advertised here** (use as a cross-check / early signal). [State University Construction Fund+1](https://sucf.suny.edu/opportunities/design-consulting-services-selection-process?utm_source=chatgpt.com)

* **Program Directive 1A-7** — requires the Consultant to keep a **planholders/bidders list with contact info** during the bid phase (explains why many SUCF jobs have third-party **plan rooms** with registrants). [State University Construction Fund](https://sucf.suny.edu/sites/default/files/docs/1A-7.pdf?utm_source=chatgpt.com)

* **Bid Requirements page** — points to **plan rooms** and that documents may be obtained via the **A/E of record/plan printer** (where planholder lists usually live). [State University Construction Fund](https://sucf.suny.edu/opportunities/construction/bid-requirements?utm_source=chatgpt.com)

* Example **plan room** entry (Syracuse Blueprint) showing SUCF job with **planholder registration**. [syracuseblueprintplanroom.com](https://www.syracuseblueprintplanroom.com/projects/923/details/sucfsuny-umu-151111-001289?utm_source=chatgpt.com)

---

## **2\) Airtable setup (tables & views)**

* **RFP Watch**: {Agency=SUCF, RFx/Project \#, Title, Campus, Type (Consultant/Construction/DB), Detail URL, Due date, **Watch\_URL**, Has Addendum? Y/N, Last checked}.

* **Files**: {Project\#→link, File name, Type (Addendum/Attendance/Shortlist/Award/**Bid-Opening**/Planholders), URL, Parsed? Y/N}.

* **Planholders/Attendees**: {Firm, Person, Email, Phone, Role (A/E/GC/MEP), Source\_File→link, Confidence}.

* **Firms**: {Firm (normalized), Website, Domain, General inbox, Pattern guess (first.last@)}.

* **Contacts**: {Firm→link, Person, Title, Email, Phone, Confidence}.

* **Outreach**: {Trigger=SUCF, SDR, **SLA\_due (created+48h)**, Status, Result}.  
   **Views:** New-This-Week; **Tier-A** (≥50k SF or multi-building); **SLA Breach \<48h**.

---

## **3\) Page-watchers (zero coding)**

Set **Visualping/Distill** watches for:

1. **Procurements Advertised** (new RFQs/RFPs). [State University Construction Fund](https://sucf.suny.edu/design-consulting-services/procurements-advertised?utm_source=chatgpt.com)

2. **Design/Consulting Services – Project Short Lists** (new shortlists). [State University Construction Fund](https://sucf.suny.edu/design-consulting-services/project-short-lists?utm_source=chatgpt.com)

3. **Design/Consulting Services – Contracts Awarded** (A/E awardees). [State University Construction Fund](https://sucf.suny.edu/design-consulting-services/contracts-awarded?utm_source=chatgpt.com)

4. **Construction – Bid Opening Results PDF** (fires when updated). [BUSS Login](https://appls.sucf.suny.edu/public/BidReports/BidOpeningResultsRpt.cfm?fileType=pdf&utm_source=chatgpt.com)

5. **NYSCR** saved search “Agency: State University Construction Fund” (early notices). [SUNY System](https://system.suny.edu/purchasing/rfp/rfp-procedures/?utm_source=chatgpt.com)

6. For each active project, add its **plan room** page (if listed on Bid Requirements or RFQ docs). Trigger on “Planholders/Plan List/Sign-in/Attendance.” [State University Construction Fund+1](https://sucf.suny.edu/opportunities/construction/bid-requirements?utm_source=chatgpt.com)

When a watcher fires: create/update **RFP Watch**; add a **Files** row with the URL/attachment.

---

## **4\) Capture & parsing**

* **Shortlists/Awards (HTML/PDF)** → copy firm names; load to **Planholders/Attendees** (Role=A/E; Source=Shortlist/Award) → **Firms** → **Contacts**. [State University Construction Fund](https://sucf.suny.edu/opportunities/design-consulting-services?utm_source=chatgpt.com)

* **Bid Opening Results (PDF)** → download; OCR/table-extract (Tabula/camelot); capture **bidders, contact emails** when present; mark Role (GC/MEP/etc.); many entries include **emails**. [BUSS Login](https://appls.sucf.suny.edu/public/BidReports/BidOpeningResultsRpt.cfm?fileType=pdf&utm_source=chatgpt.com)

* **Plan rooms** → export **planholder lists** (firms \+ contacts when available) → load as above. [syracuseblueprintplanroom.com](https://www.syracuseblueprintplanroom.com/projects/923/details/sucfsuny-umu-151111-001289?utm_source=chatgpt.com)

* Normalize firm names (strip Inc./PC/LLP; unify “&/and”); **de-dupe** to **Firms**; roll up people to **Contacts**.  
   **Confidence:** Email present=High; phone only=Med; name only=Low.

---

## **5\) Contact enrichment (≤10 minutes per *new* firm)**

1. If the file lists **emails** → use (High). [BUSS Login](https://appls.sucf.suny.edu/public/BidReports/BidOpeningResultsRpt.cfm?fileType=pdf&utm_source=chatgpt.com)

2. Else visit **firm website → Contact/Team**; capture **Principal/PM/Marketing** or **info@** (Med).

3. If still missing: infer **first.last@domain** from on-site samples; or phone the main line referencing “**SUCF Project \#\[…\] at (Campus)**” for PM/BD email.

4. **Stop-loss at 10 minutes**; log phone-only and move on.

---

## **6\) Prioritization (what converts)**

* **Design/Consulting Shortlists** → highest intent **A/E** targets now. [State University Construction Fund](https://sucf.suny.edu/opportunities/design-consulting-services?utm_source=chatgpt.com)

* **Contracts Awarded (A/E)** → build the **recurring SUCF A/E universe** (term/IDIQ & campus repeaters). [State University Construction Fund](https://sucf.suny.edu/design-consulting-services/contracts-awarded?utm_source=chatgpt.com)

* **Bid Opening Results** → primes and MEP subs actively delivering capital work (great for teaming \+ intros to their designers). [BUSS Login](https://appls.sucf.suny.edu/public/BidReports/BidOpeningResultsRpt.cfm?fileType=pdf&utm_source=chatgpt.com)

* **Planholders** → breadth list; work Tier-A (≥50k SF / multi-building / plant & MEP) first.

* Always cross-check with **NYSCR** to catch **pre-advertise** or schedule changes. [SUNY System](https://system.suny.edu/purchasing/rfp/rfp-procedures/?utm_source=chatgpt.com)

---

## **7\) Outreach (Proof-first, 3 lines)**

* **Subject:** “Standards-first as-builts for your SUCF pursuits (Campus: \_\_\_)”

* **Body:** LoD/LoA acceptance \+ schedule reliability \+ **zero-RFI pilot**; include **one Proof-Vault link** (2–3 assets matched to higher-ed/MEP/envelope).

* **SLA:** send within **48 hours** of capture.

---

## **8\) QA, governance, kill/keep**

* **Weekly QA (15 min):** every **New-This-Week** has **Confidence ≥ Med**; fix missing emails.

* **Deliverability:** bounce \<3%; suppress opt-outs by domain.

* **Kill rules (bi-weekly):** pause any watched source yielding **\<15% email-found** or **\<5% reply→meeting**; double-down on **Shortlists/Awards** and **Bid-Opening PDF** updates. [State University Construction Fund+1](https://sucf.suny.edu/opportunities/design-consulting-services?utm_source=chatgpt.com)

* **Compliance:** SUCF uses **public ads (NYSCR)**, RFQ registration, and plan rooms. **Do not** automate behind logins; work from public pages/attachments. [State University Construction Fund+2State University Construction Fund+2](https://sucf.suny.edu/opportunities/design-consulting-services-selection-process?utm_source=chatgpt.com)

---

## **9\) Operator checklist (≤1 hour/week)**

* **Mon (20 min):**

  * Review **Procurements Advertised**; add to **RFP Watch**; set watchers. [State University Construction Fund](https://sucf.suny.edu/design-consulting-services/procurements-advertised?utm_source=chatgpt.com)

  * Check **Short Lists / Contracts Awarded**; ingest new firms. [State University Construction Fund+1](https://sucf.suny.edu/opportunities/design-consulting-services?utm_source=chatgpt.com)

* **Tue–Thu (20 min):**

  * When alerts fire, process **Bid Opening Results PDF** and any **plan room** planholder updates → parse → normalize → enrich (≤10 min/firm). [BUSS Login+1](https://appls.sucf.suny.edu/public/BidReports/BidOpeningResultsRpt.cfm?fileType=pdf&utm_source=chatgpt.com)

* **Fri (20 min):**

  * Work **SLA Breach \<48h**; bulk-send SUCF sequence with Proof-Vault link; log meetings.

  * Spot-check **NYSCR** for late adds/changes. [SUNY System](https://system.suny.edu/purchasing/rfp/rfp-procedures/?utm_source=chatgpt.com)

---

## **Pro tips / edge-case fallbacks**

* **Design-Build** items appear on the **Construction** hub; use the RFQ/RFI for **team rosters** and then chase primes’ A/E partners. [State University Construction Fund](https://sucf.suny.edu/opportunities/construction?utm_source=chatgpt.com)

* If **no planholders** are public, look for the **A/E of record** or **plan printer** named in the Bid Requirements—those pages usually post registrants. [State University Construction Fund](https://sucf.suny.edu/opportunities/construction/bid-requirements?utm_source=chatgpt.com)

* **Directive 1A-7** implies the Fund expects a maintained **planholder list** during bidding—use this to justify requesting the list from the A/E/plan room when not posted. [State University Construction Fund](https://sucf.suny.edu/sites/default/files/docs/1A-7.pdf?utm_source=chatgpt.com)

---

### **Why this stream is high-ROI**

SUCF centralizes **RFQs/RFPs, shortlists, awards, and bid results** on public pages; many **bid-opening PDFs include emails**, and **plan rooms** expose **planholder rosters**—a reliable, no-cost path to weekly contact volume without scraping private portals. [syracuseblueprintplanroom.com+3State University Construction Fund+3State University Construction Fund+3](https://sucf.suny.edu/opportunities/design-consulting-services?utm_source=chatgpt.com)

# **SOP Stream \#8 — NYS OGS Design & Construction (D\&C) → Design-Pro/Team Funnel**

**Goal:** harvest A/E firms (and teaming GCs/MEPs) from **OGS D\&C** public sources—**consultant opportunities**, **construction bid calendars/openings**, **NYS Contract Reporter** cross-posts, and **rosters**—then contact within **48 hours** using Proof-first outreach.

---

## **1\) Where the data lives (official, public)**

* **D\&C Contract Opportunities hub** (Consultant & Construction paths; notes NYSCR cross-posting). [Office of General Services](https://ogs.ny.gov/construction-opportunities?utm_source=chatgpt.com)

* **Consultant Professionals** (A/E procurement; **Bid Express** for qualifications-based consultant RFx). [Office of General Services](https://ogs.ny.gov/design-construction/consultant-professionals?utm_source=chatgpt.com)

* **Bid Express — Consultant Procurement (public org page)** and **Construction Contractors** (project lists visible; details behind login—don’t automate behind login). [bidexpress.com+1](https://www.bidexpress.com/businesses/35310/home?utm_source=chatgpt.com)

* **Current/Upcoming Construction Projects** (D\&C bid calendar & headline projects). [Office of General Services](https://ogs.ny.gov/construction-work?utm_source=chatgpt.com)

* **Design & Construction Bid Openings** (weekly; recordings posted \~30 days—use for bidder names). [Office of General Services](https://ogs.ny.gov/design-construction-bid-openings)

* **How to Bid** (submission mechanics; confirms paper/electronic pathways historically). [Office of General Services](https://ogs.ny.gov/how-to-bid?utm_source=chatgpt.com)

* **NYS Contract Reporter (NYSCR)** (statutory advertising; subscribe & search “Agency \= OGS”). [nyscr.ny.gov+1](https://www.nyscr.ny.gov/?utm_source=chatgpt.com)

* **Previously Approved Construction Vendors** (recently approved OGS D\&C vendor list \= outreach roster). [online2.ogs.ny.gov](https://online2.ogs.ny.gov/dnc/contractorConsultant/esb/ApprovedVendorListExcelChrome.asp?utm_source=chatgpt.com)

* **Procurement Bid Opening Results** (central OGS; use for statewide context—commodities/services; D\&C uses the dedicated bid-openings page above). [Office of General Services](https://ogs.ny.gov/procurement/bid-opening-results?utm_source=chatgpt.com)

---

## **2\) Airtable setup (tables & views)**

* **RFP Watch**: {Agency=OGS D\&C, RFx/Project \#, Title, Campus/Facility, Type (Consultant/Construction), Detail URL, Due date, **Watch\_URL**, Has Addendum? Y/N, Last checked}.

* **Files**: {Project\#→link, File name, Type (Addendum/Attendance/**Bid-Opening**/Shortlist/Award/NYSCR notice), URL, Parsed? Y/N}.

* **Planholders/Attendees**: {Firm, Person, Email, Phone, Role (A/E/GC/MEP), Source\_File→link, Confidence}.

* **Firms**: {Firm (normalized), Website, Domain, General inbox, Pattern guess}.

* **Contacts**: {Firm→link, Person, Title, Email, Phone, Confidence}.

* **Outreach**: {Trigger=OGS D\&C, SDR, **SLA\_due (created+48h)**, Status, Result}.  
   **Views:** New-This-Week; **Tier-A** (≥50k ft² or multi-building/plant/airport/correctional); **SLA Breach \<48h**.

---

## **3\) Page-watchers (zero coding)**

Set **Visualping/Distill** watches for:

1. **D\&C Contract Opportunities** (captures new Consultant/Construction items & links). [Office of General Services](https://ogs.ny.gov/construction-opportunities?utm_source=chatgpt.com)

2. **Consultant Professionals** page (signals when new consultant opportunities post to Bid Express). [Office of General Services](https://ogs.ny.gov/design-construction/consultant-professionals?utm_source=chatgpt.com)

3. **Bid Openings** page (fires weekly; new recording links). [Office of General Services](https://ogs.ny.gov/design-construction-bid-openings)

4. **Upcoming/Current Construction Projects** page (calendar changes). [Office of General Services](https://ogs.ny.gov/construction-work?utm_source=chatgpt.com)

5. **NYSCR** saved search (“Agency: Office of General Services” \+ category filters). [nyscr.ny.gov](https://www.nyscr.ny.gov/?utm_source=chatgpt.com)

6. **Approved Vendors** roster page (periodic refresh). [online2.ogs.ny.gov](https://online2.ogs.ny.gov/dnc/contractorConsultant/esb/ApprovedVendorListExcelChrome.asp?utm_source=chatgpt.com)

When a watcher fires: update **RFP Watch** and create a **Files** row (URL/attachment).

---

## **4\) Capture & parsing (what to pull)**

* **NYSCR notices** → copy **title, campus/facility, due & pre-bid dates, submission portal, addenda links** → **RFP Watch** (and save the PDF/HTML). [nyscr.ny.gov](https://www.nyscr.ny.gov/?utm_source=chatgpt.com)

* **Bid Openings recordings** → watch description/agenda or the roll-call at opening to capture **bidders (firm names)**; paste to **Planholders/Attendees** (Role=GC/MEP; Source=Bid-Opening). [Office of General Services](https://ogs.ny.gov/design-construction-bid-openings)

* **Consultant opportunities** (via public text on **Consultant Professionals** \+ NYSCR ad) → capture **A/E lead firms** named in shortlists/awards (when posted) or in “upcoming consultant opportunities” releases. [Office of General Services+1](https://ogs.ny.gov/design-construction/consultant-professionals?utm_source=chatgpt.com)

* **Approved Vendors** list → seed **Firms** table (high-propensity outreach universe). [online2.ogs.ny.gov](https://online2.ogs.ny.gov/dnc/contractorConsultant/esb/ApprovedVendorListExcelChrome.asp?utm_source=chatgpt.com)

* Normalize firm names; **de-dupe** to **Firms**; roll up people to **Contacts**.  
   **Confidence:** Email present=High; phone-only=Med; name-only=Low.

---

## **5\) Contact enrichment (≤10 minutes per *new* firm)**

1. If any source lists **emails** → use (High).

2. Else go to **firm website → Contact/Team**; capture **Principal/PM/Marketing** or **info@** (Med).

3. If still missing: infer **first.last@domain** from on-site examples; or call main line referencing “**OGS D\&C Project \#\[…\] (Facility/Campus)**” for PM/BD email (D\&C contact pages confirm process context). [Office of General Services](https://ogs.ny.gov/design-construction-0?utm_source=chatgpt.com)

4. **Stop-loss at 10 minutes**; log phone-only and move on.

---

## **6\) Prioritization (what converts)**

* **Consultant (A/E) opportunities** → build the **active A/E roster**; Bid Express \+ NYSCR announcements flag live pursuits. [Office of General Services+2bidexpress.com+2](https://ogs.ny.gov/design-construction/consultant-professionals?utm_source=chatgpt.com)

* **Bid Openings (construction)** → map primes/subs delivering capital work (intros to their designers). [Office of General Services](https://ogs.ny.gov/design-construction-bid-openings)

* **Upcoming/Current construction** pages → triage Tier-A targets by scope/size cues. [Office of General Services](https://ogs.ny.gov/construction-work?utm_source=chatgpt.com)

* **Approved Vendors** → repeat-play universe for broad outreach. [online2.ogs.ny.gov](https://online2.ogs.ny.gov/dnc/contractorConsultant/esb/ApprovedVendorListExcelChrome.asp?utm_source=chatgpt.com)

---

## **7\) Outreach (Proof-first, 3 lines)**

* **Subject:** “Standards-first as-builts for your OGS D\&C pursuits (Facility: \_\_\_)”

* **Body:** LoD/LoA acceptance \+ schedule reliability \+ **zero-RFI pilot**; include **one Proof-Vault link** (2–3 assets matched to higher-ed/corrections/office/MEP/envelope).

* **SLA:** send within **48 hours** of capture.

---

## **8\) QA, governance, kill/keep**

* **Weekly QA (15 min):** every **New-This-Week** has **Confidence ≥ Med**; fix missing emails.

* **Deliverability:** keep bounce \<3%; suppress opt-outs by domain.

* **Kill rules (bi-weekly):** pause any watched source yielding **\<15% email-found** or **\<5% reply→meeting**; double-down on **Consultant opportunities**, **Bid Openings** recordings, and **NYSCR** ads (statutory signal). [Office of General Services+2Office of General Services+2](https://ogs.ny.gov/design-construction/consultant-professionals?utm_source=chatgpt.com)

* **Compliance:** **Do not** automate behind **Bid Express** login; use only public pages/attachments. [bidexpress.com+1](https://www.bidexpress.com/businesses/35310/home?utm_source=chatgpt.com)

---

## **9\) Operator checklist (≤1 hour/week)**

* **Mon (20 min):**

  * Review **D\&C Contract Opportunities**; add to **RFP Watch**; set watchers. [Office of General Services](https://ogs.ny.gov/construction-opportunities?utm_source=chatgpt.com)

  * Check **Consultant Professionals** & **NYSCR** for new consultant ads; ingest. [Office of General Services+1](https://ogs.ny.gov/design-construction/consultant-professionals?utm_source=chatgpt.com)

* **Tue–Thu (20 min):**

  * When **Bid Openings** post, capture bidder firm names → **Planholders/Attendees**; enrich (≤10 min/firm). [Office of General Services](https://ogs.ny.gov/design-construction-bid-openings)

* **Fri (20 min):**

  * Work **SLA Breach \<48h**; bulk-send OGS sequence with Proof-Vault link; log meetings.

  * Refresh **Approved Vendors** roster for gaps/new targets. [online2.ogs.ny.gov](https://online2.ogs.ny.gov/dnc/contractorConsultant/esb/ApprovedVendorListExcelChrome.asp?utm_source=chatgpt.com)

---

## **Pro tips / edge-case fallbacks**

* **No bidder list posted?** The **Bid Openings** video description often lists projects and sometimes firms—use that \+ NYSCR ad to triangulate. [Office of General Services+1](https://ogs.ny.gov/design-construction-bid-openings)

* **Early signal:** OGS publishes **“upcoming consultant opportunities”**—pre-warm A/E targets and map teaming. [Office of General Services](https://ogs.ny.gov/news/ogs-announces-upcoming-consultant-opportunities?utm_source=chatgpt.com)

* **Emergency contracting** exists but is episodic; not core to weekly volume (keep the contact info handy). [Office of General Services](https://ogs.ny.gov/contractors?utm_source=chatgpt.com)

---

### **Why this stream is high-ROI**

OGS centralizes **contract opportunities**, **consultant ads via Bid Express**, **NYSCR notices**, and **bid-opening events**—a dependable, no-cost signal stack for weekly firm capture without scraping private portals. [Office of General Services+3Office of General Services+3Office of General Services+3](https://ogs.ny.gov/construction-opportunities?utm_source=chatgpt.com)

# 

# **SOP Stream \#9 — Co-ops (Sourcewell, NASPO ValuePoint, E\&I, OMNIA) → Vendor-Roster → Design-Pro/Team Funnel**

**Goal:** auto-harvest public **awarded vendor rosters** and **live co-op solicitations** to build contactable lists of A/E, facility, surveying, BIM/scanning, MEP, energy-services, and construction partners, then route Proof-first outreach within **48 hours**.

---

## **1\) Where the data lives (official, public)**

* **Sourcewell**

  * Contract directory (search & A-Z vendors; filter by category). [Sourcewell](https://www.sourcewell-mn.gov/contract-search?utm_source=chatgpt.com)

  * Awarded solicitations archive. [Sourcewell](https://www.sourcewell-mn.gov/awarded-solicitations?utm_source=chatgpt.com)

  * Active solicitations \+ construction programs. [Sourcewell](https://www.sourcewell-mn.gov/solicitations?utm_source=chatgpt.com)

* **NASPO ValuePoint**

  * **Solicitation Status / Portfolio Action Tracker** (phases 1–5 of portfolios). [NASPO ValuePoint](https://www.naspovaluepoint.org/solicitation-status/?utm_source=chatgpt.com)

  * Portfolios (each master agreement with lead state & term). [NASPO ValuePoint](https://www.naspovaluepoint.org/portfolios/?utm_source=chatgpt.com)

* **E\&I Cooperative Services (Higher-Ed)**

  * **RFP Updates** (open/under eval/upcoming). [E\&I Cooperative Services](https://www.eandi.org/contract-navigator/rfp-development/?utm_source=chatgpt.com)

  * **Contracts at a Glance** (sortable **and exportable** contract list). [E\&I Cooperative Services](https://www.eandi.org/contract-navigator/contracts-at-a-glance/?utm_source=chatgpt.com)

* **OMNIA Partners (Public Sector)**

  * Public **solicitations** feed. [OMNIA Partners](https://info.omniapartners.com/solicitations?utm_source=chatgpt.com)

  * Explanation of **lead agency competitive process** and **awarded master agreements**. [OMNIA Partners+1](https://www.omniapartners.com/resources/public-sector-resources/contracting-process?utm_source=chatgpt.com)

Why this works: co-ops publish **awarded master agreements** and **who the vendors are**—a ready-made roster of firms already selling to public owners, often in categories adjacent to Scan2Plan (A/E, facility assessment, energy, MRO, construction services). [OMNIA Partners+3Sourcewell+3NASPO ValuePoint+3](https://www.sourcewell-mn.gov/contract-search?utm_source=chatgpt.com)

---

## **2\) Airtable setup (no-code)**

**Tables**

* **Co-op Watch**: {Co-op (Sourcewell/NASPO/E\&I/OMNIA), Portfolio/Category, URL, Type (Solicitation/Awarded Roster), Next Check, Last Checked}.

* **Vendors**: {Firm (normalized), Category, Co-op, Contract \#/Portfolio, Term (start–end), Lead Agency (if given), Source URL}.

* **Contacts**: {Firm→link, Person, Title, Email, Phone, Role (BD/PM/Marketing/Procurement), Confidence}.

* **Outreach**: {Trigger=Co-op, SDR, **SLA\_due (created+48h)**, Status, Result}.

**Views:** New-This-Week, **AEC-adjacent** (A/E/BIM/Survey/MEP/Energy/Construction Svcs), **SLA Breach \<48h**.

---

## **3\) Page-watchers (zero coding; Visualping/Distill)**

1. **Sourcewell**: Contract Search (category pages you care about) \+ **Awarded solicitations** (new awards). [Sourcewell+1](https://www.sourcewell-mn.gov/contract-search?utm_source=chatgpt.com)

2. **NASPO**: **Solicitation Status (PAT)** for phase changes on portfolios relevant to facilities/energy/AE; **Portfolios** index additions. [NASPO ValuePoint+1](https://www.naspovaluepoint.org/solicitation-status/?utm_source=chatgpt.com)

3. **E\&I**: **RFP Updates** \+ **Contracts at a Glance** (watch for new/updated contracts; export list). [E\&I Cooperative Services+1](https://www.eandi.org/contract-navigator/rfp-development/?utm_source=chatgpt.com)

4. **OMNIA**: **Solicitations** feed (new categories) \+ government page (program info). [OMNIA Partners+1](https://info.omniapartners.com/solicitations?utm_source=chatgpt.com)

When a watcher fires → add/update **Co-op Watch** and paste the URL.

---

## **4\) Capture → parse → normalize (repeatable)**

**Sourcewell**

* From **Contract Search/A-Z**, open each relevant category (e.g., **Construction/Facility/Survey/Professional Services**), copy **vendor/contract pages** to **Vendors** with **contract \# & term**. [Sourcewell](https://www.sourcewell-mn.gov/cooperative-purchasing/contract-search-a-z?utm_source=chatgpt.com)

**NASPO**

* On **Portfolios**, open portfolios touching facilities/energy/consulting; record **lead state, term**, and **awarded suppliers** listed on the portfolio page. Track live movements via **Solicitation Status**. [NASPO ValuePoint+1](https://www.naspovaluepoint.org/portfolios/?utm_source=chatgpt.com)

**E\&I**

* On **Contracts at a Glance**, **export to Excel**, then filter categories (Facilities, Professional Services, Energy, Construction Svcs). Load to **Vendors** with contract IDs and effective dates. [E\&I Cooperative Services](https://www.eandi.org/contract-navigator/contracts-at-a-glance/?utm_source=chatgpt.com)

**OMNIA**

* From **Solicitations**, capture applicable categories and later link to **awarded master agreements** (lead-agency model). [OMNIA Partners+1](https://info.omniapartners.com/solicitations?utm_source=chatgpt.com)

**Normalization**

* Clean firm names (strip Inc./LLP/PC; unify “&/and”), de-dupe across co-ops into one **Vendor** record per firm; keep multi-contract associations as child rows if needed.

---

## **5\) Contact enrichment (≤10 minutes per *new* firm)**

1. Check the **co-op contract page** for vendor contacts (occasionally listed). If present, add to **Contacts** (High). [Sourcewell](https://www.sourcewell-mn.gov/cooperative-purchasing/121923-CDW?utm_source=chatgpt.com)

2. Otherwise: firm website → **Team/Contact** → capture **BD/Marketing/PM** email or **info@** (Med).

3. If still missing: infer **first.last@domain** from samples; or call the main line:  
    “We’re aligning with your **\[Co-op name\]** master agreement in **\[category\]**; who handles **AEC partnerships / scanning/BIM**?”

4. **Stop-loss 10 minutes**; log phone-only and move on.

---

## **6\) Prioritization (fastest path to pipeline)**

Target categories with **direct adjacency** to Scan2Plan:

* **Architectural/Engineering/Surveying; Facility Assessment; Energy Services/Retrofit; Construction Services/Job Order/IDIQ; Asset/Space/BIM tech.**  
   Rank by: (a) **presence in multiple co-ops**, (b) **contract term remaining ≥24 months**, (c) **Northeast footprint** (office pages), (d) match to **S2P Scoping score** if specific pursuits exist.

---

## **7\) Outreach (Proof-first, 3 lines)**

* **Subject:** “Standards-first as-builts to amplify your **\[Co-op\]** contracts”

* **Body:** LoD/LoA acceptance \+ fast scan windows; position as **sub-specialist partner** that helps the prime **win/execute** co-op tasks; include **one Proof-Vault link** tailored to category (higher-ed, airports, healthcare, housing).

* **SLA:** send within **48 hours** of vendor capture.

---

## **8\) QA, governance, kill/keep**

* **Weekly QA (15 min):** every new **Vendor** has a **Contact (Confidence ≥ Med)**.

* **Deliverability:** bounce \<3%; suppress opt-out domains.

* **Kill rules (bi-weekly):** pause any watched category producing **\<15% email-found** or **\<5% reply→meeting**.

* **Compliance:** work only from **public pages/exports**; **no automation behind logins** (co-ops describe processes publicly; awarded lists are public). [OMNIA Partners](https://www.omniapartners.com/resources/public-sector-resources/contracting-process?utm_source=chatgpt.com)

---

## **9\) Operator checklist (≤1 hour/week)**

* **Mon (20 min):**

  * Scan **Sourcewell Contract Search** & **Awarded** for new vendors in target categories → add to **Vendors**. [Sourcewell+1](https://www.sourcewell-mn.gov/contract-search?utm_source=chatgpt.com)

* **Tue (10 min):**

  * Check **NASPO Solicitation Status (PAT)** for facility/energy portfolios phase changes → note suppliers. [NASPO ValuePoint](https://www.naspovaluepoint.org/solicitation-status/?utm_source=chatgpt.com)

* **Wed (15 min):**

  * **E\&I Contracts at a Glance** → export/refresh; import deltas. [E\&I Cooperative Services](https://www.eandi.org/contract-navigator/contracts-at-a-glance/?utm_source=chatgpt.com)

* **Thu (10 min):**

  * **OMNIA Solicitations** → capture new categories; flag when awards post. [OMNIA Partners](https://info.omniapartners.com/solicitations?utm_source=chatgpt.com)

* **Fri (5 min):**

  * Work **SLA Breach \<48h** view; send Proof-first sequence; log meetings.

---

## **Pro tips / edge cases**

* **Multiple co-ops per vendor** \= warm lead; mention all relevant master agreements in email for credibility.

* **Lead-state details (NASPO)** explain governance; referencing them builds trust with public owners. [NASPO ValuePoint](https://www.naspovaluepoint.org/?utm_source=chatgpt.com)

* **Sourcewell Member Lookup** helps find **target owners** (campuses/municipalities) that already buy via co-op—use for ABM warmups. [Sourcewell](https://www.sourcewell-mn.gov/become-member/search?utm_source=chatgpt.com)

---

### **Why this stream is high-ROI**

Co-ops centralize **awarded master agreements** and **vendor rosters** with live **solicitation feeds**—a low-cost, automatable way to discover **prime partners** already selling to your target owners, and to time outreach around **portfolio updates/awards**. [OMNIA Partners+3Sourcewell+3NASPO ValuePoint+3](https://www.sourcewell-mn.gov/contract-search?utm_source=chatgpt.com)

##### **You said:**

Can you please validate your assumptions on each of these websites? Make sure that the field you’re talking about and the links you are sharing actually work and that the procedure you are describing is going to get through all of the Murphy’s Law scenarios. Please go into a little bit more depth about how to navigate each of these websites andwhat information to pull.

###### **ChatGPT said:**

Thought for 1m 32s

Here’s a **validated, step-by-step playbook** for each co-op. I verified navigation flows, exports, and the exact fields you can pull. I’ve also added “Murphy’s Law” failsafes for when links, JS, or logins get in the way.

---

# **Sourcewell**

**What it is (why we care):** Public, searchable directory of **awarded suppliers & contracts** with a one-click **export (.xlsx)**; plus an **active solicitations** board you can monitor. [Sourcewell+1](https://www.sourcewell-mn.gov/contract-search)

**Where to click (awarded):**

1. Go to “Browse Contracts.” Use filters like **Facilities (MRO)**, **HVAC**, **Elevators**, **Roofing**, **Construction Contracting** to surface built-env partners. The page includes **“Download Current Contract Listing Spreadsheet (.XLSX)”** (bulk export). [Sourcewell](https://www.sourcewell-mn.gov/contract-search)

2. Each supplier card shows **contract \#** and **maturity date**; category tags help you sort who’s relevant to scanning/BIM handoff. [Sourcewell](https://www.sourcewell-mn.gov/contract-search)

**Where to click (solicitations):**

1. “View Solicitations” → **Open / Pending / Recently Awarded**; most detail & submissions route to the **Sourcewell procurement portal** link shown on the page. [Sourcewell](https://www.sourcewell-mn.gov/solicitations)

**Fields to pull (for your Airtable):** Supplier name, **contract \#**, **category**, **maturity/expiration**, (optionally) solicitation/lead agency from the contract page. Use the .xlsx export to avoid scraping. [Sourcewell](https://www.sourcewell-mn.gov/contract-search)

**Murphy’s Law failsafes:**

* If the “Awarded Solicitations” list renders light (JS), rely on the **contract search** \+ **.xlsx export**; it’s static and reliable. [Sourcewell+1](https://www.sourcewell-mn.gov/awarded-solicitations)

* If a supplier detail page has missing docs, Sourcewell explicitly says legal docs are posted per vendor page; contact the **contract administrator** listed there. [Sourcewell](https://www.sourcewell-mn.gov/solicitations)

---

# **NASPO ValuePoint**

**What it is (why we care):** A portfolio-based co-op with **contractor rosters per portfolio**, **“Browse by Contractor”**, and a **Solicitation Status / Portfolio Action Tracker** (what’s coming next). [NASPO ValuePoint+2NASPO ValuePoint+2](https://www.naspovaluepoint.org/portfolios/)

**Where to click (awarded/rosters):**

1. **Portfolios** → select a portfolio (e.g., Facilities MRO) → **Contractors (N)** tab shows the **awarded vendor list** (names \+ links). [NASPO ValuePoint](https://www.naspovaluepoint.org/portfolio/fire-trucks-and-fire-apparatus)

2. Or **Browse by Contractor** for an **A-Z vendor list** with portfolio and expiration; page includes a **Download List** link (bulk capture). [NASPO ValuePoint](https://www.naspovaluepoint.org/contractors/)

**Where to click (pipeline):**

* **Solicitation Status** page lists **Published** items with lead-state links and the **Portfolio Action Tracker** across phases (pre-posting → award). Good for early alerts. [NASPO ValuePoint](https://www.naspovaluepoint.org/solicitation-status/)

**Fields to pull:** Portfolio, **contractor/supplier**, **expiration**, **lead state**, and the **RFP link** (if present on Solicitation Status). [NASPO ValuePoint+1](https://www.naspovaluepoint.org/portfolios/)

**Murphy’s Law failsafes:**

* NASPO warns some documents may be absent/incorrect and defer to the **lead state** as the official record—use lead-state links on the status page to verify. [NASPO ValuePoint](https://www.naspovaluepoint.org/solicitation-status/)

* If portfolio pages feel slow, switch to **Browse by Contractor** and **Download List** for a clean CSV-style import. [NASPO ValuePoint](https://www.naspovaluepoint.org/contractors/)

---

# **E\&I Cooperative Services (Higher-Ed)**

**What it is (why we care):** **Contracts at a Glance** is a sortable grid you can **export to Excel**, listing **contract \#, supplier, category, start/end**—rich higher-ed facilities/CM/JOC items (e.g., HITT, Gilbane). [E\&I Cooperative Services](https://www.eandi.org/contract-navigator/contracts-at-a-glance/)

**Where to click:**

1. **Contracts → Contracts at a Glance.** Page states you can **manipulate columns** and **export results into an Excel spreadsheet**. [E\&I Cooperative Services](https://www.eandi.org/contract-navigator/contracts-at-a-glance/)

2. Use **Facilities & MRO**, **Construction/Job Order Contracting**, **HVAC/Elevators**, **Professional Services** filters to isolate AEC-adjacent suppliers. [E\&I Cooperative Services](https://www.eandi.org/contract-navigator/contracts-at-a-glance/)

**Fields to pull:** **Contract \#**, **Supplier**, **RFP/Name**, **Contract Type (Competitive/LPA)**, **Start/End**. This is enough to build a **partner/primes roster** for outreach. [E\&I Cooperative Services](https://www.eandi.org/contract-navigator/contracts-at-a-glance/)

**Murphy’s Law failsafes:**

* Some content is member-flavored, but **Contracts at a Glance** is public and explicitly supports **Excel export**—use that as your SSOT for lists. [E\&I Cooperative Services](https://www.eandi.org/contract-navigator/contracts-at-a-glance/)

---

# **OMNIA Partners (Public Sector)**

**What it is (why we care):** Two angles:

* **Current Solicitations** page with **lead agency**, **due date**, and **bid-portal links** (Bonfire, Bidnet, etc.).

* **Government Contracts** page listing **publicly awarded Master Agreements** with **Supplier, Contract Title, Renewal/Final Expiration, Lead Agency**, plus **Download All Contracts / View New Contracts**. [OMNIA Partners+1](https://info.omniapartners.com/solicitations)

**Where to click (solicitations):**

* **Solicitations** lists live RFPs with **lead agency** and **response due**; “More Information” jumps you to the official bidding portal. Perfect for page-watching. [OMNIA Partners](https://info.omniapartners.com/solicitations)

**Where to click (awarded):**

* **Industries → Government** shows a filterable **contracts table** with **Download All Contracts** and “Connect to Contract” (document microsites often require OPUS login, but metadata is public). [OMNIA Partners](https://www.omniapartners.com/industries/government)

**Fields to pull:** **Supplier**, **Contract Title**, **Renewed Until**, **Potential Final Expiration**, **Lead Agency**, and the **microsite/portal link**. [OMNIA Partners](https://www.omniapartners.com/industries/government)

**Murphy’s Law failsafes:**

* OMNIA notes forms/microsites can be impacted by **ad blockers**; if a form or button doesn’t render, disable the blocker or use the **Download All Contracts** button instead. [OMNIA Partners](https://www.omniapartners.com/industries/government)

---

## **What to extract everywhere (minimum viable fields)**

* **Entity:** Supplier/Contractor/Firm

* **Contract ID / Portfolio / Category**

* **Lead Agency / Lead State**

* **Effective / Renewal / Expiration dates**

* **Public links:** solicitation/award/portal URL (when present)

* **Relevance tags:** Facilities, MRO, HVAC, Roofing (Tier-A only), Elevators, JOC/CM, Energy/ESP(C), IT (skip unless Facilities Tech)

---

## **Automation & monitoring (no-code friendly)**

* Prefer **built-in exports**:

  * Sourcewell **“.XLSX Current Contract Listing”**. [Sourcewell](https://www.sourcewell-mn.gov/contract-search)

  * NASPO **“Download List”** on **Browse by Contractor**. [NASPO ValuePoint](https://www.naspovaluepoint.org/contractors/)

  * E\&I **Excel export** from **Contracts at a Glance**. [E\&I Cooperative Services](https://www.eandi.org/contract-navigator/contracts-at-a-glance/)

  * OMNIA **“Download All Contracts.”** [OMNIA Partners](https://www.omniapartners.com/industries/government)

* Set **page-watchers** (Visualping/Distill) on:

  * OMNIA **Solicitations** page. [OMNIA Partners](https://info.omniapartners.com/solicitations)

  * NASPO **Solicitation Status** (watch the phase tiles). [NASPO ValuePoint](https://www.naspovaluepoint.org/solicitation-status/)

  * Sourcewell **View Solicitations** (Open/Pending). [Sourcewell](https://www.sourcewell-mn.gov/solicitations)

* Import exported spreadsheets to Airtable → de-dup on **Supplier \+ Contract ID**; keep a **“last seen”** date for cadence.

---

## **Edge cases & fixes (tested)**

* **JS-heavy pages load blank:** Switch to the **export** buttons listed above (CSV/XLSX). [Sourcewell+2E\&I Cooperative Services+2](https://www.sourcewell-mn.gov/contract-search)

* **Docs differ from portal:** NASPO explicitly defers to the **lead state** documents—follow the link shown on **Solicitation Status**. [NASPO ValuePoint](https://www.naspovaluepoint.org/solicitation-status/)

* **Microsite needs login:** Capture public **metadata** (supplier, contract, agency, dates) now; add the microsite URL for later manual follow-up. [OMNIA Partners](https://www.omniapartners.com/industries/government)

* **Adblockers hide forms/buttons (OMNIA):** Disable blockers; use **Download All Contracts** if forms don’t render. [OMNIA Partners](https://www.omniapartners.com/industries/government)

If you want, I can map these exports into your current Airtable schema (Suppliers, Contracts, Triggers) and add saved views (e.g., **Facilities ≥100k ft² tags**, **Roofing (Tier-A only)**) so the SDR team can hit 500 emails/week with a single import+merge.

##### **You said:**

Next umass

###### **ChatGPT said:**

Thought for 34s

---

# **SOP Stream \#10 — UMass System (UMBA \+ Campuses via UPST) → Design-Pro/Team Funnel**

**Goal:** capture A/E firms (and teaming primes) from **UMass Building Authority (UMBA)** solicitations, campus **UPST/Bonfire** postings, and **COMMBUYS** cross-ads; parse **planholders/attendees/awards** when public; contact within **48 hours** using Proof-first outreach.

---

## **1\) Where the data lives (official, public)**

* **UMass Building Authority (UMBA) — Solicitations**: open opportunities listed; downloads require basic contact info. Use for titles/dates/attachments and to pivot into plan rooms or portals mentioned in the files. [UMass Amherst Biotechnology Association](https://www.umassba.org/solicitations?utm_source=chatgpt.com)

* **UPST (Unified Procurement Services Team)** — central site; bids are posted on the **electronic bidding tool used** (varies by campus). UPST also points to **Jaggaer/BuyWays** for contracting and support. [UMass System+2UMass System+2](https://www.umassp.edu/upst/suppliers-doing-business-umass/bid-submissions?utm_source=chatgpt.com)

* **Bonfire / Euna Supplier Network (UMass portal)** — common e-bidding hub for UMass opportunities (public landing exists; details require free account). Many UMass solicitations explicitly direct vendors here. [Bonfire Hub+2Mass.gov+2](https://umass.bonfirehub.com/?utm_source=chatgpt.com)

* **COMMBUYS** — Commonwealth’s official record; UMBA and some campus items are cross-advertised (use as a backstop for dates, addenda). [COMMBUYS](https://www.commbuys.com/bso/external/bidDetail.sdo?docId=BD-24-1109-UMBA-10-92459&utm_source=chatgpt.com)

* **Campus process pages** — UMass Amherst PDC “For Designers/For Contractors” (how they procure house-doctor/on-call and capital projects; good for context & teaming lanes). UMass Lowell notes advertising in the **Central Register**. [UMass Amherst+2UMass Amherst+2](https://www.umass.edu/planning-design-construction/designers?utm_source=chatgpt.com)

* **Mass.gov “Bidding Opportunities” index** — confirms statewide systems (**COMMBUYS**, **Central Register** for design/construction). [Mass.gov](https://www.mass.gov/info-details/bidding-opportunities?utm_source=chatgpt.com)

---

## **2\) Airtable (no-code schema)**

**Tables**

* **RFP Watch**: {Agency (UMBA/UMass Amherst/…); RFx \#; Title; Campus; URL; Due; Pre-bid; Portal (Bonfire/COMMBUYS/Other); Addenda? Y/N; Last Checked}.

* **Files**: {Project\#→link; File name; Type (Addendum/Attendance/Planholders/Award); URL; Parsed? Y/N}.

* **Planholders/Attendees**: {Firm; Person; Email; Phone; Role (A/E/GC/MEP); Source\_File→link; Confidence}.

* **Firms**: {Firm (normalized); Website; Domain; General inbox; Pattern guess}.

* **Contacts**: {Firm→link; Person; Title; Email; Phone; Confidence}.

* **Outreach**: {Trigger=UMass; SDR; **SLA\_due (created+48h)**; Status; Result}.

**Views**: New-This-Week; **Tier-A** (≥50k ft² / campus multi-building / plant & MEP); **SLA Breach \<48h**.

---

## **3\) Page-watchers (zero coding)**

Set Visualping/Distill on:

1. **UMBA Solicitations** (new or updated postings). [UMass Amherst Biotechnology Association](https://www.umassba.org/solicitations?utm_source=chatgpt.com)

2. **UPST – Bid Submissions** (footer links and guidance change when tool/portals rotate). [UMass System](https://www.umassp.edu/upst/suppliers-doing-business-umass/bid-submissions?utm_source=chatgpt.com)

3. **UMass Bonfire landing** (UMass portal “opportunities” list changes). [Bonfire Hub](https://umass.bonfirehub.com/?utm_source=chatgpt.com)

4. **COMMBUYS** search saved for Org \= **UMass / UMBA** (date/addendum changes). [COMMBUYS](https://www.commbuys.com/bso/external/bidDetail.sdo?docId=BD-24-1109-UMBA-10-92459&utm_source=chatgpt.com)

5. **Campus PDC pages** (Amherst “For Designers/Contractors”), for house-doctor and process updates (teaming lanes). [UMass Amherst+1](https://www.umass.edu/planning-design-construction/designers?utm_source=chatgpt.com)

**When a watcher fires** → create/update **RFP Watch**, save the URL into **Files** (type \= Notice/Addendum/etc.).

---

## **4\) Capture → parse → normalize (what to pull)**

**A. UMBA Solicitations page**

* Open each listing → capture **title, campus, due/pre-bid**, any **attachments** (addenda, pre-proposal sign-in). If the file references a **portal (Bonfire/COMMBUYS/plan room)**, add that link in **RFP Watch.Portal**. [UMass Amherst Biotechnology Association](https://www.umassba.org/solicitations?utm_source=chatgpt.com)

**B. UPST / Bonfire**

* From **UMass Bonfire**: note **opportunity title, campus, due, buyer contacts**; if **planholder / public documents** are visible, download **attendee lists** (often posted as PDFs) → **Files** → parse to **Planholders/Attendees**. (UPST confirms bids and results live on “the electronic bidding tool used”.) [Bonfire Hub+1](https://umass.bonfirehub.com/?utm_source=chatgpt.com)

**C. COMMBUYS cross-ad**

* Search “UMBA” or project title → copy **Bid \#, description, due, addenda**; COMMBUYS items often echo that the **Bonfire** portal is the submission site—use to triangulate. Save the ad PDF/HTML into **Files**. [COMMBUYS+1](https://www.commbuys.com/bso/external/bidDetail.sdo?docId=BD-24-1109-UMBA-10-92459&utm_source=chatgpt.com)

**D. Campus process pages**

* Use **Amherst “For Designers”** to map **house-doctor** (on-call) categories and teaming cues (e.g., MEP house doctors must include architects). Seed **Firms** with known on-call lists when posted. [UMass Amherst](https://www.umass.edu/planning-design-construction/designers?utm_source=chatgpt.com)

* **Lowell** notes bids are advertised in the **Central Register**—track that publication for early notice (paid, but schedule info is public). [UMass Lowell+1](https://www.uml.edu/Facilities/Contractors-Service/?utm_source=chatgpt.com)

**Normalization**

* Strip Inc./PC/LLP; unify “&/and”; de-dupe across portals into one **Firm**. Promote people with emails to **Contacts** (Confidence=High).

---

## **5\) Contact enrichment (≤10 minutes per new firm)**

1. **If emails appear in attendance/planholder PDFs** → capture directly (High).

2. Else go to firm **website → Team/Contact**; record **Principal/PM/Marketing** or **info@** (Med).

3. If still missing, infer **first.last@domain** from any on-site examples; or call the main line with:  
    “We’re calibrating scan/as-built support for your **UMass \[campus\]** pursuit; who’s the PM/BD lead?”

4. **Stop-loss at 10 minutes**; log phone-only and move on.

---

## **6\) Prioritization (what converts)**

* **UMBA capital** projects and **campus multi-building programs** (Tier-A). UMBA’s role is to **construct facilities across UMass campuses**, frequently large renovations—prime scan/BIM fits. [UMass Amherst Biotechnology Association](https://www.umassba.org/?utm_source=chatgpt.com)

* **Campus house-doctor/on-call** (Amherst, etc.) → teaming lane: message subspecialty support for MEP/envelope/historic packages. [UMass Amherst](https://www.umass.edu/planning-design-construction/designers?utm_source=chatgpt.com)

* **COMMBUYS** entries with **Bonfire submission** → strong signal; work fast (≤48h). [COMMBUYS](https://www.commbuys.com/bso/external/bidDetail.sdo?bidId=BD-19-1109-UMCEN-SHREW-34078&utm_source=chatgpt.com)

---

## **7\) Outreach (Proof-first, 3 lines)**

* **Subject:** “Standards-first as-builts for your UMass \[Campus\] pursuits”

* **Body:** LoD/LoA acceptance \+ fast scan windows; position as **pre-design risk reducer** for occupied, MEP-heavy, or envelope scopes; include **one Proof-Vault link** matched to higher-ed/MEP/historic.

---

## **8\) QA, governance, kill/keep**

* **Weekly QA (15 min):** ensure every **New-This-Week** has **Confidence ≥ Med**; fix missing emails.

* **Deliverability:** bounces \<3%; suppress opt-outs by domain.

* **Kill rules (bi-weekly):** pause any watched source with **\<15% email-found** or **\<5% reply→meeting**; lean on **UMBA Solicitations \+ COMMBUYS \+ Bonfire** triad. [UMass Amherst Biotechnology Association+2COMMBUYS+2](https://www.umassba.org/solicitations?utm_source=chatgpt.com)

* **Compliance:** don’t automate behind login-only content; rely on public pages/exportable PDFs. UPST confirms results/attachments live in the **issuing tool**—store URLs and pull what’s public. [UMass System](https://www.umassp.edu/upst/suppliers-doing-business-umass/bid-submissions?utm_source=chatgpt.com)

---

## **9\) Operator checklist (≤1 hour/week)**

* **Mon (20 min):**

  * Check **UMBA Solicitations** → add to **RFP Watch**; set watcher. [UMass Amherst Biotechnology Association](https://www.umassba.org/solicitations?utm_source=chatgpt.com)

  * Skim **COMMBUYS** for UMBA/UMass ads; save deltas. [COMMBUYS](https://www.commbuys.com/bso/external/bidDetail.sdo?docId=BD-24-1109-UMBA-10-92459&utm_source=chatgpt.com)

* **Tue–Thu (20 min):**

  * Open **UMass Bonfire** list; capture new items (title, due, buyer); download any **attendance/planholder** PDFs → parse to **Planholders/Contacts**. [Bonfire Hub](https://umass.bonfirehub.com/?utm_source=chatgpt.com)

* **Fri (20 min):**

  * Work **SLA Breach \<48h**; bulk-send UMass sequence with Proof link; log meetings.

  * Review **Amherst “For Designers/Contractors”** for updates to house-doctor/on-call lanes. [UMass Amherst+1](https://www.umass.edu/planning-design-construction/designers?utm_source=chatgpt.com)

---

## **Murphy’s-Law failsafes (common blockers & fixes)**

* **Bonfire needs login:** Keep **metadata** (title, due, buyer) in **RFP Watch**; if planholder PDFs are gated, look for the **same project** in **COMMBUYS** or **UMBA Solicitations** attachments; many addenda and sign-ins are mirrored there. [COMMBUYS+1](https://www.commbuys.com/bso/external/bidDetail.sdo?docId=BD-24-1109-UMBA-10-92459&utm_source=chatgpt.com)

* **UMBA page light on details:** The listing still provides the **official title/dates**; attachments often reference the **portal** and pre-bid logistics—use those to triangulate. [UMass Amherst Biotechnology Association](https://www.umassba.org/solicitations?utm_source=chatgpt.com)

* **Campus doesn’t show bid page:** Use campus PDC pages for **process context** and teaming (e.g., Amherst house-doctor) and track **Central Register** (design/construction ads). [UMass Amherst+1](https://www.umass.edu/planning-design-construction/designers?utm_source=chatgpt.com)

* **Tool confusion (Jaggaer vs Bonfire):** UPST states bids are posted on the **issuing tool**; some solicitations reference **Bonfire** explicitly; **BuyWays/Jaggaer** is used for contracting & supplier management. Follow the link named in the notice. [UMass System+1](https://www.umassp.edu/upst/suppliers-doing-business-umass/bid-submissions?utm_source=chatgpt.com)

---

### **Why this stream is high-ROI**

UMass funnels opportunities through **three reliable surfaces**—**UMBA Solicitations**, **UMass Bonfire**, and **COMMBUYS**—with campus pages providing **on-call/team** context. This lets you **validate dates, mine attendees/planholders, and build A/E rosters** from public artifacts—no paid data and minimal manual effort. [UMass Amherst Biotechnology Association+2Bonfire Hub+2](https://www.umassba.org/solicitations?utm_source=chatgpt.com)

*Want me to wire a saved COMMBUYS search and a Bonfire checklist you can hand to SDRs?*

