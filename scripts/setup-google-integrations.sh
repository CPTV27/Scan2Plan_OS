#!/bin/bash
# =============================================================================
# Scan2Plan OS - Google Integrations Setup Script
# =============================================================================
# This script helps set up all Google integrations:
# - clasp (Apps Script CLI)
# - MCP Google Drive/Sheets
# - MCP Gmail/Calendar
# =============================================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
CREDS_DIR="$PROJECT_ROOT/config/mcp-credentials"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}╔════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║       Scan2Plan OS - Google Integrations Setup                 ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════════╝${NC}"
echo ""

# -----------------------------------------------------------------------------
# Step 1: Check Prerequisites
# -----------------------------------------------------------------------------
echo -e "${YELLOW}Step 1: Checking prerequisites...${NC}"

check_command() {
    if command -v $1 &> /dev/null; then
        echo -e "  ${GREEN}✓${NC} $1 is installed"
        return 0
    else
        echo -e "  ${RED}✗${NC} $1 is NOT installed"
        return 1
    fi
}

check_command "node" || { echo "Please install Node.js first"; exit 1; }
check_command "npm" || { echo "Please install npm first"; exit 1; }
check_command "clasp" || npm install -g @google/clasp
check_command "mcp-gdrive" || npm install -g @isaacphi/mcp-gdrive
npm list -g mcp-gsuite &>/dev/null || npm install -g mcp-gsuite

echo ""

# -----------------------------------------------------------------------------
# Step 2: Google Cloud Project Setup Instructions
# -----------------------------------------------------------------------------
echo -e "${YELLOW}Step 2: Google Cloud Project Setup${NC}"
echo ""
echo "You need to create OAuth credentials in Google Cloud Console."
echo ""
echo -e "${BLUE}Quick Steps:${NC}"
echo "  1. Go to: https://console.cloud.google.com/apis/credentials"
echo "  2. Create a new project (or select existing)"
echo "  3. Click 'Create Credentials' > 'OAuth client ID'"
echo "  4. Choose 'Desktop app' as application type"
echo "  5. Download the JSON file"
echo ""
echo -e "${BLUE}Required APIs to Enable:${NC}"
echo "  - Google Drive API"
echo "  - Google Sheets API"
echo "  - Gmail API"
echo "  - Google Calendar API"
echo ""
echo "  Enable at: https://console.cloud.google.com/apis/library"
echo ""
echo -e "${BLUE}OAuth Consent Screen:${NC}"
echo "  - User type: External (or Internal for Workspace)"
echo "  - Add scopes:"
echo "    • https://www.googleapis.com/auth/drive.readonly"
echo "    • https://www.googleapis.com/auth/spreadsheets"
echo "    • https://www.googleapis.com/auth/gmail.modify"
echo "    • https://www.googleapis.com/auth/calendar"
echo ""

read -p "Press Enter when you have your OAuth credentials JSON file ready..."

# -----------------------------------------------------------------------------
# Step 3: Credential File Setup
# -----------------------------------------------------------------------------
echo ""
echo -e "${YELLOW}Step 3: Setting up credential files...${NC}"
echo ""

mkdir -p "$CREDS_DIR"

echo "Please provide the path to your downloaded OAuth credentials JSON file:"
read -p "Path: " OAUTH_FILE

if [ -f "$OAUTH_FILE" ]; then
    # For mcp-gdrive
    cp "$OAUTH_FILE" "$CREDS_DIR/gcp-oauth.keys.json"
    echo -e "  ${GREEN}✓${NC} Copied to gcp-oauth.keys.json (for Drive/Sheets)"

    # For mcp-gsuite (needs different format)
    cp "$OAUTH_FILE" "$CREDS_DIR/.gauth.json"
    echo -e "  ${GREEN}✓${NC} Copied to .gauth.json (for Gmail/Calendar)"
else
    echo -e "  ${RED}✗${NC} File not found: $OAUTH_FILE"
    echo "  Creating template files instead..."
    cp "$CREDS_DIR/gauth.template.json" "$CREDS_DIR/.gauth.json" 2>/dev/null || true
fi

# Setup accounts file for mcp-gsuite
echo ""
echo "Enter your Google email address:"
read -p "Email: " USER_EMAIL

cat > "$CREDS_DIR/.accounts.json" << EOF
{
  "accounts": [
    {
      "email": "$USER_EMAIL",
      "account_type": "personal",
      "extra_info": "Primary account for Scan2Plan OS"
    }
  ]
}
EOF
echo -e "  ${GREEN}✓${NC} Created .accounts.json"

# -----------------------------------------------------------------------------
# Step 4: clasp Authentication
# -----------------------------------------------------------------------------
echo ""
echo -e "${YELLOW}Step 4: Authenticating clasp (Apps Script CLI)...${NC}"
echo ""
echo "This will open a browser window for Google authentication."
read -p "Press Enter to continue..."

clasp login

echo -e "  ${GREEN}✓${NC} clasp authenticated"

# -----------------------------------------------------------------------------
# Step 5: MCP Authentication
# -----------------------------------------------------------------------------
echo ""
echo -e "${YELLOW}Step 5: Authenticating MCP servers...${NC}"
echo ""
echo "Running first-time auth for Google Drive MCP..."

cd "$CREDS_DIR"
GDRIVE_CREDS_DIR="$CREDS_DIR" npx -y @isaacphi/mcp-gdrive --auth 2>/dev/null || true

echo ""
echo "Running first-time auth for GSuite MCP..."
# mcp-gsuite will prompt for auth on first use

# -----------------------------------------------------------------------------
# Step 6: Claude MCP Configuration
# -----------------------------------------------------------------------------
echo ""
echo -e "${YELLOW}Step 6: Claude MCP Configuration${NC}"
echo ""
echo "Add this to your Claude settings (or merge with existing mcpServers):"
echo ""
echo -e "${BLUE}Location: ~/.claude/settings.json${NC}"
echo ""
cat "$PROJECT_ROOT/config/claude-mcp-config.json"
echo ""
echo ""
echo "Or run this command to update your settings:"
echo ""
echo -e "${GREEN}claude mcp add gdrive -- npx -y @isaacphi/mcp-gdrive${NC}"
echo -e "${GREEN}claude mcp add gsuite -- npx -y mcp-gsuite${NC}"
echo ""

# -----------------------------------------------------------------------------
# Summary
# -----------------------------------------------------------------------------
echo -e "${BLUE}╔════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║                    Setup Complete!                             ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${GREEN}Installed Tools:${NC}"
echo "  • clasp          - Deploy to Apps Script from terminal"
echo "  • mcp-gdrive     - Google Drive & Sheets access for Claude"
echo "  • mcp-gsuite     - Gmail & Calendar access for Claude"
echo ""
echo -e "${GREEN}Credential Files:${NC}"
echo "  • $CREDS_DIR/gcp-oauth.keys.json"
echo "  • $CREDS_DIR/.gauth.json"
echo "  • $CREDS_DIR/.accounts.json"
echo ""
echo -e "${GREEN}Next Steps:${NC}"
echo "  1. Restart Claude Code to load MCP servers"
echo "  2. Test with: 'List my Google Drive files'"
echo "  3. Deploy email triage: cd apps-script/email-triage && clasp push"
echo ""
echo -e "${YELLOW}Note: First use of each MCP may prompt for browser authentication.${NC}"
