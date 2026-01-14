# Scan2Plan OS Quick Reference Card

> **For NotebookLM:** This is a condensed reference guide for common tasks and shortcuts.

---

## Quick Navigation

| Destination | How to Get There |
|-------------|------------------|
| Sales Pipeline | Sidebar → Sales |
| Create New Deal | Sales → "+ New Deal" button |
| Quote Builder | Open Lead → Quote tab |
| Proposal Builder | Open Lead → Proposal tab → Open Proposal Builder |
| Production Kanban | Sidebar → Production |
| FieldHub Mobile | Navigate to /field on any device |
| Analytics | Sidebar → Analytics |
| Settings | Sidebar → Settings (gear icon) |
| Help / Academy | Sidebar → "?" icon |

---

## Keyboard Shortcuts

| Action | Shortcut |
|--------|----------|
| Save lead/deal | ⌘+S (Mac) / Ctrl+S (Windows) |
| Close modal | Escape |
| Navigate back | Alt+← |

---

## Common Workflows

### Create a Quote (5 Steps)
1. Open lead from Sales Pipeline
2. Go to **Quote** tab
3. Click **Add Area**, configure building type/sqft/disciplines/LOD
4. Configure **Travel** (dispatch location + address)
5. Review sidebar pricing, click **Save Quote**

### Create a Proposal (4 Steps)
1. Open lead with saved quote
2. Go to **Proposal** tab
3. Click **Open Proposal Builder**
4. Select template, customize sections, Preview/Save

### Close a Deal (3 Steps)
1. Open lead, ensure quote is saved
2. Drag card to **Closed Won** column (or use stage dropdown)
3. Select **Lead Source** if prompted

### Clock In (Field Tech)
1. Go to /field on mobile
2. Tap **Clock In** Quick Action
3. Allow location permission when prompted
4. Status updates with GPS coordinates

### Record Voice Note
1. Go to /field → Quick Actions → **Voice Note**
2. Tap **Record Voice Note**
3. Speak clearly
4. Tap **Stop** → AI transcribes automatically

---

## CPQ Cheat Sheet

### Building Type → Pricing Tier
| Type | Complexity |
|------|------------|
| Warehouse, Commercial - Simple | Low |
| Office, Retail, Educational | Medium |
| Hospital, Industrial (Complex) | High |
| Historical/Renovation | Very High (auto LOD 350+) |

### LOD Summary
| LOD | Detail Level | Use Case |
|-----|--------------|----------|
| 200 | Basic geometry | Space planning |
| 300 | Precise geometry | Design development |
| 350 | Connections shown | Construction docs |
| 400 | Fabrication-ready | Prefab/shop drawings |

### Risk Factor Markups
| Factor | Markup |
|--------|--------|
| Occupied | +15% |
| Hazardous | +25% |
| No Power | +20% |
| Remote | +10% |
| Rush | +15% |

---

## Status Indicators

### Quote Margin Colors
| Color | Meaning |
|-------|---------|
| 🟢 Green | Healthy margin (>45%) |
| 🟡 Yellow | Below target (40-45%) |
| 🔴 Red | Below floor (<40%) |

### Integrity Audit Shields
| Icon | Meaning |
|------|---------|
| 🔴 Red Shield | Blocking error (must fix) |
| 🟡 Yellow Shield | Warning only |
| ✅ Green Check | All validations passed |

### Production Stage Colors
| Stage | Meaning |
|-------|---------|
| Scheduling | Waiting for date |
| Scanning | On-site capture |
| Modeling | BIM creation |
| QC | Quality check |
| Delivered | Complete |

---

## Integration Quick Setup

| Integration | Required Env Vars |
|-------------|-------------------|
| QuickBooks | QUICKBOOKS_CLIENT_ID, QUICKBOOKS_CLIENT_SECRET |
| PandaDoc | PANDADOC_API_KEY |
| Go High Level | GHL_API_KEY, GHL_LOCATION_ID |
| OpenAI | OPENAI_API_KEY |
| Google Maps | GOOGLE_MAPS_API_KEY |

---

## Troubleshooting Quick Fixes

| Problem | Solution |
|---------|----------|
| Can't save quote | Check Integrity Audit for red shield |
| Travel cost $0 | Enter valid Project Address |
| Can't close deal | Select a Lead Source |
| Can't deliver project | Check for unpaid invoices |
| GPS not working | Grant browser location permission |
| Voice recording fails | Grant microphone permission |

---

*Print this page for desk reference.*
