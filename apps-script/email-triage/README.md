# AI Email Triage System

A self-improving, AI-powered email triage system built on Google Apps Script with Gemini 2.0 Flash.

## Features

- **Automated Email Processing**: Checks Gmail every 5 minutes for new emails
- **AI-Powered Triage**: Uses Gemini 2.0 Flash for intelligent categorization and routing
- **Project Matching**: Automatically links emails to active projects
- **Task Creation**: Extracts action items and creates tasks automatically
- **Self-Improving**: Learns from corrections to improve accuracy over time
- **Cost Efficient**: Runs under $10/month (typically $1-5)

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Google Apps Script                        │
├──────────────┬──────────────┬──────────────┬────────────────┤
│   Code.gs    │ GeminiService│ SheetService │ SelfImprovement│
│   (Main)     │   (.gs)      │    (.gs)     │     (.gs)      │
├──────────────┴──────────────┴──────────────┴────────────────┤
│                      Config.gs                               │
└─────────────────────────────────────────────────────────────┘
         │                    │                    │
         ▼                    ▼                    ▼
    ┌─────────┐        ┌───────────┐        ┌─────────────┐
    │  Gmail  │        │ Gemini API│        │Google Sheets│
    │  API    │        │ 2.0 Flash │        │  (Database) │
    └─────────┘        └───────────┘        └─────────────┘
```

## Google Sheet Structure

### Sheet 1: Projects Registry
| Column | Description |
|--------|-------------|
| Project ID | Unique identifier (PROJ001, PROJ002, etc.) |
| Project Name | Human-readable project name |
| Status | Active, On Hold, Completed |
| Priority | High, Medium, Low |
| Lead | Primary person responsible |
| AI Agents Assigned | Which AI agents work on this project |
| Context Doc URL | Link to project documentation |
| Last Activity | Timestamp of last update |
| Notes | Additional context for AI |

### Sheet 2: Tasks
| Column | Description |
|--------|-------------|
| Task ID | Unique identifier |
| Project ID | Linked project |
| Task Title | What needs to be done |
| Assigned To | Person or agent responsible |
| Status | New, In Progress, Done |
| Due Date | When it's due |
| Created | Creation timestamp |
| Priority | High, Medium, Low |
| Source Email | Email subject that triggered task |
| Notes | Additional context |

### Sheet 3: Email Log
| Column | Description |
|--------|-------------|
| Email ID | Gmail message ID |
| From | Sender address |
| Subject | Email subject |
| Received | When received |
| Project Match | Matched project or NONE |
| Agent Decision | Action Required, FYI, Reference, Archive |
| Routed To | Who should handle it |
| Status | Pending, Processed, Completed |
| Priority | High, Medium, Low |
| Category | Client, Project, Sales, Admin, etc. |
| Summary | AI-generated summary |
| Action Items | Extracted tasks |
| Confidence | AI confidence score (0-1) |

### Sheet 4: Agent Directory
| Column | Description |
|--------|-------------|
| Agent Name | Identifier (Gemini-Intake, Claude-Architect, etc.) |
| Type | Triage, Technical, Content, etc. |
| Primary Role | What this agent does |
| Active Projects | Projects this agent works on |
| API Model | Which AI model powers it |
| Cost This Month | Running cost tracker |
| Emails Processed | Count of processed emails |
| Tasks Created | Count of tasks created |
| Accuracy Score | Current accuracy percentage |
| Last Active | Last activity timestamp |
| Notes | Additional info |

## Setup Instructions

### Step 1: Create Google Sheet

1. Go to [Google Sheets](https://sheets.google.com) and create a new spreadsheet
2. Name it "Chase Command Center" (or your preferred name)
3. Copy the Spreadsheet ID from the URL:
   ```
   https://docs.google.com/spreadsheets/d/[THIS_IS_YOUR_ID]/edit
   ```

### Step 2: Get Gemini API Key

1. Go to [Google AI Studio](https://aistudio.google.com/apikey)
2. Click "Create API Key"
3. Copy your API key (keep it secure!)

**Cost estimate**: Gemini 2.0 Flash costs ~$0.075 per 1M input tokens
- 1000 emails/month = ~$0.50-$1.00
- Even heavy usage stays well under $10/month

### Step 3: Set Up Apps Script

1. In your Google Sheet, go to **Extensions > Apps Script**
2. Delete any existing code in `Code.gs`
3. Copy each `.gs` file from this repository into the Apps Script editor:
   - `Code.gs`
   - `Config.gs`
   - `GeminiService.gs`
   - `SheetService.gs`
   - `SelfImprovement.gs`
4. Create each file in Apps Script using **File > New > Script file**

### Step 4: Configure Script Properties

1. In Apps Script, click the **gear icon** (Project Settings)
2. Scroll to **Script Properties**
3. Add these properties:
   - `GEMINI_API_KEY`: Your Gemini API key
   - `SPREADSHEET_ID`: Your Google Sheet ID

Or run these functions in the script editor:
```javascript
setGeminiApiKey('your-api-key-here');
setSpreadsheetId('your-sheet-id-here');
```

### Step 5: Initialize the System

1. In Apps Script, select `initializeSystem` from the function dropdown
2. Click **Run**
3. Grant the required permissions when prompted:
   - Gmail access (read/modify)
   - Google Sheets access (read/write)
   - External URL access (for Gemini API)

### Step 6: Verify Setup

Run `testConfiguration()` to verify everything is working:
- Checks API key is set
- Tests Gemini API connectivity
- Verifies Sheet access

## Usage

### Automatic Processing
Once initialized, the system automatically:
- Checks for new emails every 5 minutes
- Analyzes each email with Gemini
- Logs results to the Email Log sheet
- Creates tasks for action items
- Applies Gmail labels for organization

### Manual Functions

| Function | Description |
|----------|-------------|
| `processNewEmails()` | Manually trigger email processing |
| `testProcessSingleEmail()` | Test with the most recent inbox email |
| `performSelfAssessment()` | Get system health report |
| `calculateAccuracy()` | Check current accuracy score |
| `reviewOptimizations()` | See AI-suggested improvements |
| `listTriggers()` | See all active triggers |

### Recording Corrections

When you override an AI decision, record it for learning:

```javascript
correctDecision('email-id-here', 'priority', 'High');
correctDecision('email-id-here', 'category', 'Client');
correctDecision('email-id-here', 'routeTo', 'Elijah');
```

The system uses these corrections to improve future decisions.

## Self-Improvement System

The system learns and improves over time:

1. **Correction Tracking**: When you change an AI decision, record it using `correctDecision()`
2. **Pattern Analysis**: After 50 corrections, the system analyzes patterns
3. **Prompt Optimization**: AI suggests improvements to the classification prompt
4. **Accuracy Monitoring**: Weekly self-assessment tracks performance

### How It Works

```
Email → AI Analysis → Decision
           ↓
     User Corrects
           ↓
  Correction Stored
           ↓
   Patterns Analyzed
           ↓
   Prompts Improved
           ↓
  Better Decisions
```

## Customization

### Adding Categories

Edit the `CATEGORY_LABELS` in `Config.gs`:

```javascript
CATEGORY_LABELS: {
  'Client': 'AI-Triage/Client',
  'MyNewCategory': 'AI-Triage/MyNewCategory',
  // ...
}
```

### Changing Routing Rules

Edit the `ROUTING` section in `Config.gs`:

```javascript
ROUTING: {
  HIGH_PRIORITY: 'Chase',
  MEDIUM_PRIORITY: 'Elijah',
  LOW_PRIORITY: 'Auto-Archive'
}
```

### Excluding Senders

Add to `EXCLUDE_SENDERS` in `Config.gs`:

```javascript
EXCLUDE_SENDERS: [
  'noreply@',
  'marketing@example.com',
  // ...
]
```

## Cost Management

The system tracks costs automatically:
- View in Agent Directory sheet under "Cost This Month"
- Reset monthly with `resetMonthlyCosts()` (runs automatically on 1st)
- Adjust `MAX_BODY_LENGTH` to reduce token usage

**Typical costs**:
- Light use (100 emails/month): ~$0.05
- Medium use (500 emails/month): ~$0.25
- Heavy use (2000 emails/month): ~$1.00

## Troubleshooting

### Emails Not Processing
1. Run `listTriggers()` to check if trigger is active
2. Run `processNewEmails()` manually to see errors
3. Check execution logs: View > Executions

### API Errors
1. Run `testConfiguration()` to verify API key
2. Check quotas at [Google Cloud Console](https://console.cloud.google.com)

### Low Accuracy
1. Run `performSelfAssessment()` for diagnosis
2. Record more corrections with `correctDecision()`
3. Run `triggerPromptOptimization()` after 50+ corrections

## Files

| File | Purpose |
|------|---------|
| `Code.gs` | Main entry point, triggers, email processing |
| `Config.gs` | All configuration settings |
| `GeminiService.gs` | Gemini API integration |
| `SheetService.gs` | Google Sheets operations |
| `SelfImprovement.gs` | Learning and optimization system |

## License

MIT License - Use freely for personal or commercial projects.

## Support

For issues or questions, check the [Scan2Plan OS repository](https://github.com/CPTV27/Scan2Plan_OS).
