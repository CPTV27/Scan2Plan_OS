# Google Sheets Setup for Learning System

Add these tabs to your SuperChase Sheet (`1mBfl_0f6MQ0RjezYmwt4bT6m2sMESzwWdxnmFzrRTY4`)

---

## Tab 1: Feedback

Create a tab named `Feedback` with these columns:

| A | B | C | D | E | F |
|---|---|---|---|---|---|
| ID | Timestamp | Request | Response | Rating | Notes |

- **ID**: Auto-increment (1, 2, 3...)
- **Timestamp**: When feedback was given
- **Request**: What was asked
- **Response**: What SuperChase did
- **Rating**: thumbs_up / thumbs_down / neutral
- **Notes**: Any additional context

---

## Tab 2: Patterns

Create a tab named `Patterns` with these columns:

| A | B | C | D | E | F | G |
|---|---|---|---|---|---|---|
| ID | Request_Type | Approach | Outcome | Score | Last_Used | Notes |

- **ID**: Unique pattern ID (P001, P002...)
- **Request_Type**: Category (task_creation, email_triage, status_report, etc.)
- **Approach**: What approach was taken
- **Outcome**: success / partial / failure
- **Score**: Running score (+1 for success, -1 for failure)
- **Last_Used**: Timestamp
- **Notes**: Details

**Reinforcement rules:**
- Score >= 3: This approach is validated, use it by default
- Score <= -3: Deprecate this approach, try alternatives

---

## Tab 3: Sessions

Create a tab named `Sessions` with these columns:

| A | B | C | D | E |
|---|---|---|---|---|
| Date | Summary | Outcome | Wins | Lessons |

This mirrors LEARNINGS.md but in a queryable format.

---

## Quick Setup Script

Paste this in Apps Script to create the tabs automatically:

```javascript
function setupLearningTabs() {
  const ss = SpreadsheetApp.openById('1mBfl_0f6MQ0RjezYmwt4bT6m2sMESzwWdxnmFzrRTY4');

  // Feedback tab
  let fb = ss.getSheetByName('Feedback');
  if (!fb) {
    fb = ss.insertSheet('Feedback');
    fb.getRange('A1:F1').setValues([['ID', 'Timestamp', 'Request', 'Response', 'Rating', 'Notes']]);
    fb.getRange('A1:F1').setFontWeight('bold');
  }

  // Patterns tab
  let pt = ss.getSheetByName('Patterns');
  if (!pt) {
    pt = ss.insertSheet('Patterns');
    pt.getRange('A1:G1').setValues([['ID', 'Request_Type', 'Approach', 'Outcome', 'Score', 'Last_Used', 'Notes']]);
    pt.getRange('A1:G1').setFontWeight('bold');
  }

  // Sessions tab
  let sn = ss.getSheetByName('Sessions');
  if (!sn) {
    sn = ss.insertSheet('Sessions');
    sn.getRange('A1:E1').setValues([['Date', 'Summary', 'Outcome', 'Wins', 'Lessons']]);
    sn.getRange('A1:E1').setFontWeight('bold');
  }

  Logger.log('Learning tabs created!');
}
```

Run `setupLearningTabs()` once to create all three tabs.
