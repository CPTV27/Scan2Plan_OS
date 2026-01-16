#!/bin/bash
# =============================================================================
# Deploy AI Email Triage to Google Apps Script
# =============================================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
APPS_SCRIPT_DIR="$PROJECT_ROOT/apps-script/email-triage"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}╔════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║         Deploy AI Email Triage to Apps Script                  ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════════╝${NC}"
echo ""

cd "$APPS_SCRIPT_DIR"

# Check if clasp is logged in
if ! clasp login --status &>/dev/null; then
    echo -e "${YELLOW}Not logged in to clasp. Running login...${NC}"
    clasp login
fi

# Check if .clasp.json exists (project already created)
if [ -f ".clasp.json" ]; then
    echo -e "${GREEN}Found existing Apps Script project. Pushing updates...${NC}"
    clasp push
    echo ""
    echo -e "${GREEN}✓ Code pushed successfully!${NC}"
else
    echo -e "${YELLOW}No existing project found. Creating new Apps Script project...${NC}"
    echo ""

    # Option 1: Create standalone script
    echo "Choose deployment option:"
    echo "  1) Create standalone Apps Script project"
    echo "  2) Link to existing Google Sheet (recommended)"
    echo ""
    read -p "Enter choice (1 or 2): " CHOICE

    if [ "$CHOICE" == "2" ]; then
        echo ""
        echo "Enter your Google Sheet URL:"
        echo "(e.g., https://docs.google.com/spreadsheets/d/ABC123/edit)"
        read -p "URL: " SHEET_URL

        # Extract sheet ID from URL
        SHEET_ID=$(echo "$SHEET_URL" | grep -oP '(?<=/d/)[^/]+')

        if [ -z "$SHEET_ID" ]; then
            echo -e "${RED}Could not extract Sheet ID from URL${NC}"
            exit 1
        fi

        echo ""
        echo "Creating container-bound script for Sheet: $SHEET_ID"
        clasp create --type sheets --parentId "$SHEET_ID" --title "AI Email Triage"
    else
        echo ""
        clasp create --type standalone --title "AI Email Triage"
    fi

    echo ""
    echo -e "${GREEN}✓ Project created!${NC}"
    echo ""
    echo "Pushing code..."
    clasp push
    echo ""
    echo -e "${GREEN}✓ Code pushed successfully!${NC}"
fi

echo ""
echo -e "${BLUE}Opening Apps Script editor...${NC}"
clasp open

echo ""
echo -e "${GREEN}╔════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║                    Deployment Complete!                        ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo "Next steps in Apps Script editor:"
echo "  1. Click Project Settings (gear icon)"
echo "  2. Add Script Properties:"
echo "     - GEMINI_API_KEY: your-api-key"
echo "     - SPREADSHEET_ID: your-sheet-id"
echo "  3. Run 'initializeSystem' function"
echo "  4. Authorize permissions when prompted"
echo ""
