# SuperChase - Hotel Setup Checklist

Everything you need to do when you get to your hotel. Estimated time: 15-20 minutes.

---

## Priority 1: Get Voice Working (5 min)

### ElevenLabs Conversational AI

Your agent is published but you need the share link.

1. Go to: https://elevenlabs.io/app/conversational-ai
2. Click on your agent (SuperChase / Support agent)
3. Click **Widget** tab
4. Copy the **Public URL** or **Embed code**
5. Test on your phone

**If no public link:**
- Click the **"..."** menu next to Publish
- Look for "Share" or "Make Public"
- Or click **Security** tab and enable public access

---

## Priority 2: Learning System Sheets (5 min)

### Option A: Quick Script (recommended)

1. Open Apps Script: https://script.google.com
2. Open your SuperChaseCC project
3. Paste this and run it:

```javascript
function setupLearningTabs() {
  const ss = SpreadsheetApp.openById('1mBfl_0f6MQ0RjezYmwt4bT6m2sMESzwWdxnmFzrRTY4');

  let fb = ss.getSheetByName('Feedback');
  if (!fb) {
    fb = ss.insertSheet('Feedback');
    fb.getRange('A1:F1').setValues([['ID', 'Timestamp', 'Request', 'Response', 'Rating', 'Notes']]);
    fb.getRange('A1:F1').setFontWeight('bold');
  }

  let pt = ss.getSheetByName('Patterns');
  if (!pt) {
    pt = ss.insertSheet('Patterns');
    pt.getRange('A1:G1').setValues([['ID', 'Request_Type', 'Approach', 'Outcome', 'Score', 'Last_Used', 'Notes']]);
    pt.getRange('A1:G1').setFontWeight('bold');
  }

  let sn = ss.getSheetByName('Sessions');
  if (!sn) {
    sn = ss.insertSheet('Sessions');
    sn.getRange('A1:E1').setValues([['Date', 'Summary', 'Outcome', 'Wins', 'Lessons']]);
    sn.getRange('A1:E1').setFontWeight('bold');
  }

  Logger.log('Done!');
}
```

### Option B: Manual

1. Open your Sheet: https://docs.google.com/spreadsheets/d/1mBfl_0f6MQ0RjezYmwt4bT6m2sMESzwWdxnmFzrRTY4
2. Add tab "Feedback" with columns: ID, Timestamp, Request, Response, Rating, Notes
3. Add tab "Patterns" with columns: ID, Request_Type, Approach, Outcome, Score, Last_Used, Notes
4. Add tab "Sessions" with columns: Date, Summary, Outcome, Wins, Lessons

---

## Priority 3: Push Learning Files to GitHub (2 min)

```bash
cd ~/Scan2Plan_OS
git add superchase/CLAUDE.md superchase/LEARNINGS.md superchase/SHEETS_SETUP.md superchase/HOTEL_TODO.md
git commit -m "Add learning system for SuperChase"
git push origin claude/ai-email-triage-system-2loD0
```

---

## Priority 4: Verify Everything Works (5 min)

### Test Checklist

- [ ] ElevenLabs voice agent responds on phone
- [ ] Google Sheets has Feedback, Patterns, Sessions tabs
- [ ] Asana sync still working (check SC: Tasks)
- [ ] Can access SuperChase context via CLAUDE.md

---

## What's Already Done

✅ ElevenLabs agent created and published (agent_6601kfc80k2qftha80gdxca6ym0m)
✅ System prompt configured with SuperChase personality
✅ Voice set (George)
✅ CLAUDE.md created with full context
✅ LEARNINGS.md created with today's session documented
✅ self_improvement.json config exists
✅ Asana projects syncing to Sheets
✅ Web voice interface at superchase.vercel.app (backup)

---

## What I Can't Do (Needs You)

❌ Get ElevenLabs public share link (requires your login)
❌ Run Apps Script to create Sheets tabs (requires your auth)
❌ Push to GitHub from cloud instance (signing restriction)

---

## Files Created This Session

| File | Purpose |
|------|---------|
| `superchase/CLAUDE.md` | Main AI context and instructions |
| `superchase/LEARNINGS.md` | Session-by-session learning log |
| `superchase/SHEETS_SETUP.md` | Instructions for Sheets tabs |
| `superchase/HOTEL_TODO.md` | This checklist |

---

## Quick Reference

- **Sheets ID**: `1mBfl_0f6MQ0RjezYmwt4bT6m2sMESzwWdxnmFzrRTY4`
- **Asana Token**: `2/1209628858878583/1209636557792729:d3e3...`
- **ElevenLabs Agent**: `agent_6601kfc80k2qftha80gdxca6ym0m`
- **Voice ID**: `JBFqnCBsd6RMkjVDRZzb` (George)
- **Vercel URL**: https://superchase.vercel.app
