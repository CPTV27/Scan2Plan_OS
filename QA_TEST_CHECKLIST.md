# Scan2Plan OS - QA Test Checklist

## Pre-Testing Setup
- [ ] Verify app is running at the production URL
- [ ] Log in with your Replit account
- [ ] Confirm you see the Dashboard

---

## 1. Dashboard Tests

### Metrics Display
- [ ] Total Pipeline value displays correctly
- [ ] Active Projects count is accurate
- [ ] Weighted Forecast shows probability-adjusted total
- [ ] Stale Deals count shows leads needing attention

### Charts & Visualizations
- [ ] Pipeline chart renders with deal values by stage
- [ ] Recent activity section shows latest updates

### Google Workspace Widget
- [ ] Calendar tab shows upcoming events
- [ ] Events display correct date/time
- [ ] Clicking event links opens in Google Calendar
- [ ] Email tab shows compose form
- [ ] Can fill in To, Subject, Body fields
- [ ] Send button is enabled when all fields filled

---

## 2. Sales Pipeline Tests

### Navigation
- [ ] Click "Pipeline" in sidebar navigates to /pipeline
- [ ] Page title shows "Sales Pipeline"

### Kanban View
- [ ] Four columns visible: Discovery, Proposal, Negotiation, Closed Won
- [ ] Deal cards display in correct columns based on stage
- [ ] Cards show client name, value, and probability

### Deal Card Details
- [ ] Clicking a deal card opens detail view
- [ ] All fields display correctly (building type, sqft, scope, etc.)
- [ ] Contact information is visible
- [ ] Quote number displays if available

### Create New Deal
- [ ] "New Deal" button is visible
- [ ] Dialog opens with form fields
- [ ] Required fields: Client Name, Address, Value
- [ ] Submit creates new deal in Discovery column
- [ ] New deal appears without page refresh

### Edit Deal
- [ ] Edit button opens edit dialog
- [ ] Changes save correctly
- [ ] Deal card updates with new values

### Move Deal Between Stages
- [ ] Can drag deal to different column (if drag enabled)
- [ ] Or use dropdown to change stage
- [ ] Stage change persists after refresh

### CPQ Integration
- [ ] "Generate Quote" button visible on deal cards
- [ ] Button opens CPQ tool with pre-filled data

### Staleness Indicators
- [ ] Deals without recent contact show warning badge
- [ ] Days since last contact displays correctly

---

## 3. Production Tracker Tests

### Navigation
- [ ] Click "Production" in sidebar navigates to /production
- [ ] Page title shows "Production Tracker"

### Kanban View
- [ ] Four columns: Scanning, Processing, QC, Delivery
- [ ] Projects display in correct columns

### Project Cards
- [ ] Project name visible
- [ ] Priority indicator shows (High/Medium/Low)
- [ ] Progress percentage displays
- [ ] Due date shows if set

### Create Project
- [ ] "New Project" button visible
- [ ] Dialog opens with form
- [ ] Can link to existing lead
- [ ] Submit creates project in Scanning column

### Move Project
- [ ] Can change project status
- [ ] Project moves to new column
- [ ] Change persists after refresh

### Field Mode (Mobile)
- [ ] Switch to mobile viewport (375px width)
- [ ] Field Mode toggle appears
- [ ] Enabling Field Mode shows list view
- [ ] Large touch targets for status buttons
- [ ] One-tap to advance project status

---

## 4. Meeting Scoping Tests

### Navigation
- [ ] Click "Scoping" in sidebar navigates to /scoping
- [ ] Page shows field notes input area

### Text Input
- [ ] Text area accepts field notes
- [ ] "Process Notes" button visible
- [ ] Button enabled when text entered

### AI Processing
- [ ] Submit field notes
- [ ] Loading indicator appears
- [ ] Processed scope displays after completion
- [ ] Scope includes structured sections (Location, Deliverables, etc.)

### Audio Recording (if available)
- [ ] Record button visible
- [ ] Can record audio
- [ ] Transcription appears after recording stops
- [ ] Can process transcribed text

### Create Deal from Scope
- [ ] "Create Deal" button appears after processing
- [ ] Clicking opens new deal form
- [ ] Extracted values pre-fill form fields

---

## 5. AI Assistant Tests

### Open Assistant
- [ ] AI Assistant button visible on dashboard
- [ ] Clicking opens chat interface
- [ ] Input field for typing messages

### Conversation
- [ ] Type a question about the pipeline
- [ ] Send message
- [ ] AI response appears
- [ ] Response is contextually relevant
- [ ] Can ask follow-up questions

### Suggested Actions
- [ ] AI provides actionable suggestions
- [ ] Can request email drafts
- [ ] Can ask for probability recommendations

---

## 6. Settings Page Tests

### Navigation
- [ ] Click "Settings" in sidebar navigates to /settings
- [ ] Page displays business configuration options

### Business Settings
- [ ] Company name field editable
- [ ] Base rates configurable
- [ ] Default values saveable

### Vocabulary Settings (if available)
- [ ] Building Types list visible
- [ ] Scopes list visible
- [ ] LOD levels visible
- [ ] Disciplines configurable

---

## 7. Airtable Integration Tests

### Sync Status
- [ ] Integration status indicator visible
- [ ] Shows connected/disconnected state

### Deal Sync
- [ ] Close a deal (move to Closed Won)
- [ ] Verify deal appears in Airtable Projects table
- [ ] All fields map correctly

### Bi-directional Sync
- [ ] Changes in Airtable reflect in app (if enabled)

---

## 8. Responsive Design Tests

### Desktop (1920x1080)
- [ ] Full sidebar visible
- [ ] All columns display side-by-side
- [ ] Charts render at full size

### Tablet (768x1024)
- [ ] Sidebar collapsible
- [ ] Kanban columns may stack or scroll
- [ ] Touch targets adequate size

### Mobile (375x667)
- [ ] Sidebar hidden by default
- [ ] Hamburger menu to toggle sidebar
- [ ] Single-column layout
- [ ] Field Mode optimized for touch
- [ ] All text readable without zoom

---

## 9. Performance Tests

### Page Load
- [ ] Dashboard loads in < 3 seconds
- [ ] Pipeline page loads in < 3 seconds
- [ ] No visible layout shifts after load

### Data Refresh
- [ ] Mutations trigger immediate UI updates
- [ ] Cache invalidation works correctly
- [ ] No stale data after actions

---

## 10. Error Handling Tests

### Invalid Input
- [ ] Empty required fields show validation errors
- [ ] Invalid email format caught
- [ ] Negative values rejected where inappropriate

### Network Errors
- [ ] Graceful handling if API unavailable
- [ ] Toast notifications for errors
- [ ] Retry options where appropriate

### Auth Errors
- [ ] Unauthorized access redirects to login
- [ ] Session expiry handled gracefully

---

## Test Results Summary

| Section | Pass | Fail | Notes |
|---------|------|------|-------|
| Dashboard | | | |
| Pipeline | | | |
| Production | | | |
| Scoping | | | |
| AI Assistant | | | |
| Settings | | | |
| Airtable | | | |
| Responsive | | | |
| Performance | | | |
| Errors | | | |

**Tester:** ___________________  
**Date:** ___________________  
**Version:** ___________________
