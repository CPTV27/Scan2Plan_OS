# Google Integrations Setup Guide

This guide covers setting up all Google integrations for Scan2Plan OS.

## What's Installed

| Tool | Purpose | Status |
|------|---------|--------|
| `clasp` | Deploy code to Google Apps Script | Installed |
| `@isaacphi/mcp-gdrive` | Claude access to Google Drive & Sheets | Installed |
| `mcp-gsuite` | Claude access to Gmail & Calendar | Installed |

## Quick Setup (10 minutes)

### Option 1: Run the Setup Script

```bash
./scripts/setup-google-integrations.sh
```

This interactive script will guide you through everything.

### Option 2: Manual Setup

#### Step 1: Create Google Cloud OAuth Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
2. Create project or select existing
3. Click **Create Credentials** > **OAuth client ID**
4. Choose **Desktop app**
5. Download JSON file

#### Step 2: Enable Required APIs

Go to [API Library](https://console.cloud.google.com/apis/library) and enable:
- Google Drive API
- Google Sheets API
- Gmail API
- Google Calendar API

#### Step 3: Set Up OAuth Consent Screen

1. Go to **OAuth consent screen**
2. User type: **External** (or Internal for Workspace)
3. Add scopes:
   - `https://www.googleapis.com/auth/drive.readonly`
   - `https://www.googleapis.com/auth/spreadsheets`
   - `https://www.googleapis.com/auth/gmail.modify`
   - `https://www.googleapis.com/auth/calendar`

#### Step 4: Configure Credentials

```bash
# Create credentials directory
mkdir -p config/mcp-credentials

# Copy your OAuth JSON file
cp ~/Downloads/client_secret_*.json config/mcp-credentials/gcp-oauth.keys.json
cp ~/Downloads/client_secret_*.json config/mcp-credentials/.gauth.json

# Create accounts file
cat > config/mcp-credentials/.accounts.json << 'EOF'
{
  "accounts": [{
    "email": "your-email@gmail.com",
    "account_type": "personal",
    "extra_info": "Primary account"
  }]
}
EOF
```

#### Step 5: Login to clasp

```bash
clasp login
```

#### Step 6: Add MCP Servers to Claude

Run these commands:
```bash
claude mcp add gdrive -- npx -y @isaacphi/mcp-gdrive
claude mcp add gsuite -- npx -y mcp-gsuite
```

Or manually add to `~/.claude/settings.json`:
```json
{
  "mcpServers": {
    "gdrive": {
      "command": "npx",
      "args": ["-y", "@isaacphi/mcp-gdrive"],
      "env": {
        "GDRIVE_CREDS_DIR": "/path/to/config/mcp-credentials"
      }
    },
    "gsuite": {
      "command": "npx",
      "args": ["-y", "mcp-gsuite"],
      "env": {
        "GSUITE_CREDS_DIR": "/path/to/config/mcp-credentials"
      }
    }
  }
}
```

## Deploying the Email Triage System

### Option 1: Automated Deployment

```bash
./scripts/deploy-email-triage.sh
```

### Option 2: Manual Deployment

```bash
cd apps-script/email-triage

# Login to clasp (if not already)
clasp login

# Create new Apps Script project linked to your Sheet
clasp create --type sheets --parentId YOUR_SHEET_ID --title "AI Email Triage"

# Push the code
clasp push

# Open in browser
clasp open
```

Then in Apps Script editor:
1. Go to **Project Settings** > **Script Properties**
2. Add:
   - `GEMINI_API_KEY`: Your Gemini API key
   - `SPREADSHEET_ID`: Your Google Sheet ID
3. Run `initializeSystem`
4. Authorize permissions

## What You Can Do After Setup

### With clasp
```bash
# Push code changes
clasp push

# Pull remote changes
clasp pull

# Open project in browser
clasp open

# Watch for changes and auto-push
clasp push --watch
```

### With Claude (after MCP setup)
Ask Claude to:
- "List my Google Drive files"
- "Read the contents of my spreadsheet"
- "Check my recent emails"
- "What's on my calendar this week?"
- "Create a new event for tomorrow at 2pm"

## Automation Levels

| Before Setup | After Setup |
|--------------|-------------|
| Manually copy 5 files to Apps Script | `clasp push` (one command) |
| Manually check Gmail | Claude reads emails directly |
| Manually update Sheets | Claude reads/writes Sheets |
| Navigate to Calendar | Claude checks calendar |

## Troubleshooting

### clasp login fails
```bash
# Clear existing credentials
rm ~/.clasprc.json
clasp login
```

### MCP server not connecting
1. Check credentials exist: `ls config/mcp-credentials/`
2. Restart Claude Code
3. Check logs in Claude

### Permission denied errors
- Ensure OAuth consent screen has required scopes
- Re-run authentication flow
- Add yourself as test user if using External consent

## File Structure

```
Scan2Plan_OS/
├── apps-script/
│   └── email-triage/
│       ├── Code.gs
│       ├── Config.gs
│       ├── GeminiService.gs
│       ├── SheetService.gs
│       ├── SelfImprovement.gs
│       └── appsscript.json
├── config/
│   ├── mcp-credentials/     # OAuth credentials (gitignored)
│   └── claude-mcp-config.json
└── scripts/
    ├── setup-google-integrations.sh
    └── deploy-email-triage.sh
```

## Security Notes

- **Never commit** credential files (already in `.gitignore`)
- OAuth tokens are stored locally in `~/.clasprc.json` and `config/mcp-credentials/`
- Use test/sandbox accounts for initial testing
- Review OAuth scopes to limit access as needed
