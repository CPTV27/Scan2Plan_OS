# SuperChase Local Folder Structure

## Root Location
```
~/SuperChase/
```
This folder syncs with Google Drive.

---

## Folder Structure

```
~/SuperChase/
├── _INBOX/                    # Drop zone - files here get processed
│   └── (drop files here)
│
├── PROJECTS/                  # Active project folders
│   ├── [ProjectName]/
│   │   ├── assets/
│   │   ├── docs/
│   │   ├── deliverables/
│   │   └── notes.md
│   └── ...
│
├── CLIENTS/                   # Client-specific folders
│   ├── [ClientName]/
│   │   ├── contracts/
│   │   ├── communications/
│   │   └── projects → ../PROJECTS/[project]  (symlink)
│   └── ...
│
├── REFERENCE/                 # Templates, SOPs, knowledge base
│   ├── templates/
│   ├── sops/
│   └── research/
│
├── ARCHIVE/                   # Completed/inactive items
│   ├── 2024/
│   ├── 2025/
│   └── ...
│
└── _SYSTEM/                   # SuperChase config & logs
    ├── config.json
    ├── sync-log.txt
    └── agent-prompts/
```

---

## Mapping to Asana/Sheets

| Local Folder | Asana Project | Sheet Tab |
|--------------|---------------|-----------|
| _INBOX/ | SC: Tasks (To Do) | Tasks |
| PROJECTS/ | SC: Projects | Projects |
| CLIENTS/ | SC: Leads | Leads |
| CLIENTS/[name]/contracts/ | SC: Contracts | Contracts |
| _SYSTEM/ | (internal) | Config |

---

## Workflow

### Adding New Work
1. Drop file in `_INBOX/`
2. SuperChase processes it → creates task in Asana
3. Move file to appropriate `PROJECTS/` or `CLIENTS/` folder

### Starting a Project
1. Create folder in `PROJECTS/[ProjectName]/`
2. SuperChase detects new folder → creates Asana project entry
3. Add assets, docs as you work

### Client Onboarding
1. Create folder in `CLIENTS/[ClientName]/`
2. Add to SC: Leads in Asana
3. Contracts go in `contracts/` subfolder

---

## Google Drive Sync

Set up Google Drive Desktop to sync `~/SuperChase/` folder.

**In Google Drive Desktop:**
1. Preferences → Folders from your computer
2. Add folder: `~/SuperChase/`
3. Choose: "Mirror files" (keeps local copy)

This gives you:
- Local access (fast)
- Cloud backup (safe)
- Mobile access (via Drive app)
- Shareable (for clients/team)

---

## Quick Commands for Other Agent

Tell your other Claude agent:

```
The SuperChase local folder structure is:
~/SuperChase/
  - _INBOX/     → Drop zone for new items
  - PROJECTS/   → Active project folders
  - CLIENTS/    → Client folders with contracts/communications
  - REFERENCE/  → Templates and SOPs
  - ARCHIVE/    → Completed work by year
  - _SYSTEM/    → Config and logs

This syncs with Google Drive and maps to Asana projects:
SC: Tasks, SC: Projects, SC: Leads, SC: Contracts, SC: Expenses
```
