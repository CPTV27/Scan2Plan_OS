# Quick Start Guide

Get your AI Email Triage system running in 10 minutes.

## 1. Create Your Sheet (2 min)

1. Open [Google Sheets](https://sheets.google.com)
2. Create new spreadsheet named "Chase Command Center"
3. Copy the ID from URL: `docs.google.com/spreadsheets/d/[COPY_THIS]/edit`

## 2. Get Gemini API Key (2 min)

1. Go to [Google AI Studio](https://aistudio.google.com/apikey)
2. Click "Create API Key"
3. Copy and save the key

## 3. Set Up Apps Script (5 min)

1. In your Sheet: **Extensions > Apps Script**
2. Click **File > New > Script file** to create these files:
   - `Code`
   - `Config`
   - `GeminiService`
   - `SheetService`
   - `SelfImprovement`

3. Copy contents from each `.gs` file in this folder

4. Click **gear icon** (Settings) > **Script properties** > Add:
   | Property | Value |
   |----------|-------|
   | `GEMINI_API_KEY` | Your API key |
   | `SPREADSHEET_ID` | Your sheet ID |

## 4. Initialize (1 min)

1. Select `initializeSystem` from dropdown
2. Click **Run**
3. Grant permissions when prompted

## 5. Verify

Run `testConfiguration()` - you should see:
```
Gemini API Test: PASSED
Sheet Access Test: PASSED
All configuration tests passed!
```

## You're Done!

The system will now:
- Check your inbox every 5 minutes
- Analyze emails with AI
- Log everything to your sheet
- Create tasks automatically

## First Test

Send yourself a test email about one of your projects, then:
1. Wait 5 minutes, OR
2. Run `processNewEmails()` manually

Check your Email Log sheet - you'll see the AI's analysis!

## Need Help?

- Run `performSelfAssessment()` for system health
- Check **View > Executions** for error logs
- See README.md for detailed documentation
