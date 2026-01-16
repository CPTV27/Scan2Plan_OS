/**
 * Gemini API Service
 *
 * Handles all interactions with Google's Gemini 2.0 Flash API.
 * Optimized for cost efficiency while maintaining quality triage decisions.
 *
 * Cost estimate: ~$0.075 per 1M input tokens
 * Typical email: ~500 tokens = ~$0.000038 per email
 * 1000 emails/month = ~$0.04/month
 */

// ============================================================================
// GEMINI API CALLS
// ============================================================================

/**
 * Analyzes an email using Gemini for intelligent triage.
 * @param {Object} emailData - The email data to analyze.
 * @returns {Object} Analysis result with success flag and data.
 */
function analyzeEmailWithGemini(emailData) {
  const config = getConfig();

  // Get project context for better routing
  const projectsContext = getProjectsContext();

  const prompt = buildTriagePrompt(emailData, projectsContext);

  const result = callGeminiAPI(prompt);

  if (!result.success) {
    return { success: false, error: result.error };
  }

  // Parse the JSON response
  try {
    const analysis = parseGeminiResponse(result.text);
    return { success: true, data: analysis };
  } catch (error) {
    Logger.log('Failed to parse Gemini response: ' + error.toString());
    Logger.log('Raw response: ' + result.text);
    return {
      success: true,
      data: getDefaultAnalysis(emailData)
    };
  }
}

/**
 * Builds the triage prompt for Gemini.
 * @param {Object} emailData - The email data.
 * @param {string} projectsContext - Active projects context.
 * @returns {string} The prompt for Gemini.
 */
function buildTriagePrompt(emailData, projectsContext) {
  const attachmentInfo = emailData.attachments && emailData.attachments.length > 0
    ? `\nAttachments: ${emailData.attachments.map(a => `${a.name} (${a.type})`).join(', ')}`
    : '';

  return `You are Chase's Intake Agent for Scan2Plan OS. Analyze this email and make intelligent routing decisions.

ACTIVE PROJECTS:
${projectsContext || 'No active projects found.'}

EMAIL TO ANALYZE:
From: ${emailData.from}
To: ${emailData.to}
Subject: ${emailData.subject}
Date: ${emailData.date}
Body:
${emailData.body}${attachmentInfo}

INSTRUCTIONS:
1. Determine if this email relates to any active project
2. Assess urgency and required action
3. Decide who should handle it
4. Extract any actionable items

Respond ONLY with valid JSON (no markdown, no explanation):
{
  "projectMatch": "PROJ### (if matches a project) or NEW (if suggests new project) or NONE",
  "category": "Client|Project|Sales|Admin|Newsletter|Personal|Vendor|Support",
  "decision": "Action Required|FYI|Reference|Archive",
  "priority": "High|Medium|Low",
  "routeTo": "Chase|Elijah|AI-Agent-Name|Auto-Archive",
  "summary": "One concise sentence summarizing the email purpose",
  "sentiment": "Positive|Neutral|Negative|Urgent",
  "actionRequired": true or false,
  "actionItems": ["List of specific tasks if action required"] or [],
  "suggestedProject": "Project name if NEW project suggested",
  "responseNeeded": true or false,
  "responseDeadline": "ASAP|Today|This Week|No Rush|None",
  "confidence": 0.0 to 1.0
}`;
}

/**
 * Makes a raw call to the Gemini API.
 * @param {string} prompt - The prompt to send.
 * @returns {Object} Result with success flag and text/error.
 */
function callGeminiAPI(prompt) {
  const config = getConfig();

  if (!config.GEMINI_API_KEY) {
    return {
      success: false,
      error: 'Gemini API key not configured. Set it in Script Properties.'
    };
  }

  const payload = {
    contents: [{
      parts: [{ text: prompt }]
    }],
    generationConfig: {
      temperature: config.GEMINI_TEMPERATURE,
      maxOutputTokens: config.GEMINI_MAX_TOKENS,
      topP: 0.95,
      topK: 40
    },
    safetySettings: [
      {
        category: 'HARM_CATEGORY_HARASSMENT',
        threshold: 'BLOCK_NONE'
      },
      {
        category: 'HARM_CATEGORY_HATE_SPEECH',
        threshold: 'BLOCK_NONE'
      },
      {
        category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
        threshold: 'BLOCK_NONE'
      },
      {
        category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
        threshold: 'BLOCK_NONE'
      }
    ]
  };

  const options = {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify(payload),
    headers: {
      'x-goog-api-key': config.GEMINI_API_KEY
    },
    muteHttpExceptions: true
  };

  try {
    const response = UrlFetchApp.fetch(config.GEMINI_ENDPOINT, options);
    const responseCode = response.getResponseCode();

    if (responseCode !== 200) {
      const errorBody = response.getContentText();
      Logger.log(`Gemini API error (${responseCode}): ${errorBody}`);
      return {
        success: false,
        error: `API returned ${responseCode}: ${errorBody}`
      };
    }

    const json = JSON.parse(response.getContentText());

    if (!json.candidates || json.candidates.length === 0) {
      return {
        success: false,
        error: 'No response candidates from Gemini'
      };
    }

    const text = json.candidates[0].content.parts[0].text;

    // Track usage for cost monitoring
    trackGeminiUsage(json);

    return { success: true, text: text };

  } catch (error) {
    Logger.log('Gemini API call failed: ' + error.toString());
    return { success: false, error: error.toString() };
  }
}

/**
 * Parses the Gemini response and extracts JSON.
 * @param {string} responseText - The raw response text.
 * @returns {Object} Parsed analysis object.
 */
function parseGeminiResponse(responseText) {
  // Try to extract JSON from the response (Gemini sometimes adds markdown)
  let jsonText = responseText.trim();

  // Remove markdown code blocks if present
  if (jsonText.startsWith('```json')) {
    jsonText = jsonText.replace(/^```json\s*/, '').replace(/\s*```$/, '');
  } else if (jsonText.startsWith('```')) {
    jsonText = jsonText.replace(/^```\s*/, '').replace(/\s*```$/, '');
  }

  // Try to find JSON object in the text
  const jsonMatch = jsonText.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    jsonText = jsonMatch[0];
  }

  const parsed = JSON.parse(jsonText);

  // Validate required fields
  const requiredFields = ['decision', 'priority', 'summary'];
  for (const field of requiredFields) {
    if (!parsed[field]) {
      throw new Error(`Missing required field: ${field}`);
    }
  }

  // Normalize values
  parsed.priority = normalizeValue(parsed.priority, ['High', 'Medium', 'Low'], 'Medium');
  parsed.decision = normalizeValue(parsed.decision,
    ['Action Required', 'FYI', 'Reference', 'Archive'], 'FYI');
  parsed.actionRequired = parsed.actionRequired === true ||
    parsed.decision === 'Action Required';
  parsed.actionItems = Array.isArray(parsed.actionItems) ? parsed.actionItems : [];

  return parsed;
}

/**
 * Returns a default analysis when Gemini fails.
 * @param {Object} emailData - The email data.
 * @returns {Object} Default analysis object.
 */
function getDefaultAnalysis(emailData) {
  return {
    projectMatch: 'NONE',
    category: 'General',
    decision: 'FYI',
    priority: 'Medium',
    routeTo: 'Chase',
    summary: `Email from ${emailData.from}: ${emailData.subject}`,
    sentiment: 'Neutral',
    actionRequired: false,
    actionItems: [],
    responseNeeded: false,
    responseDeadline: 'None',
    confidence: 0.0
  };
}

/**
 * Normalizes a value to one of the allowed options.
 * @param {string} value - The value to normalize.
 * @param {Array} allowed - Allowed values.
 * @param {string} defaultValue - Default if not in allowed.
 * @returns {string} Normalized value.
 */
function normalizeValue(value, allowed, defaultValue) {
  if (!value) return defaultValue;
  const normalized = value.trim();
  return allowed.includes(normalized) ? normalized : defaultValue;
}

// ============================================================================
// COST TRACKING
// ============================================================================

/**
 * Tracks Gemini API usage for cost monitoring.
 * @param {Object} response - The Gemini API response.
 */
function trackGeminiUsage(response) {
  try {
    const ss = SpreadsheetApp.openById(getConfig().SPREADSHEET_ID);
    const agentsSheet = ss.getSheetByName(getConfig().SHEET_NAMES.AGENTS);

    if (!agentsSheet) return;

    // Find the Gemini-Intake agent row
    const data = agentsSheet.getDataRange().getValues();
    const headers = data[0];
    const costColIndex = headers.indexOf('Cost This Month');
    const agentNameIndex = headers.indexOf('Agent Name');

    if (costColIndex === -1 || agentNameIndex === -1) return;

    for (let i = 1; i < data.length; i++) {
      if (data[i][agentNameIndex] === 'Gemini-Intake') {
        // Estimate cost: ~$0.075 per 1M input tokens
        // Rough estimate: 1 token ≈ 4 characters
        const usageMetadata = response.usageMetadata;
        let tokenCount = 500; // Default estimate

        if (usageMetadata) {
          tokenCount = (usageMetadata.promptTokenCount || 0) +
            (usageMetadata.candidatesTokenCount || 0);
        }

        const costPerToken = 0.075 / 1000000;
        const callCost = tokenCount * costPerToken;

        const currentCost = parseFloat(data[i][costColIndex]) || 0;
        const newCost = currentCost + callCost;

        agentsSheet.getRange(i + 1, costColIndex + 1).setValue(newCost.toFixed(4));
        break;
      }
    }
  } catch (error) {
    // Don't fail the main process if cost tracking fails
    Logger.log('Cost tracking error: ' + error.toString());
  }
}

/**
 * Resets the monthly cost tracking (run at start of each month).
 */
function resetMonthlyCosts() {
  try {
    const ss = SpreadsheetApp.openById(getConfig().SPREADSHEET_ID);
    const agentsSheet = ss.getSheetByName(getConfig().SHEET_NAMES.AGENTS);

    if (!agentsSheet) return;

    const data = agentsSheet.getDataRange().getValues();
    const headers = data[0];
    const costColIndex = headers.indexOf('Cost This Month');

    if (costColIndex === -1) return;

    for (let i = 1; i < data.length; i++) {
      agentsSheet.getRange(i + 1, costColIndex + 1).setValue(0);
    }

    Logger.log('Monthly costs reset for all agents.');
    logToSheet('SYSTEM', 'Monthly costs reset', 'All agent costs set to $0.00');

  } catch (error) {
    Logger.log('Failed to reset monthly costs: ' + error.toString());
  }
}

/**
 * Sets up a monthly trigger to reset costs on the 1st of each month.
 */
function setupMonthlyCostReset() {
  // Remove existing monthly triggers
  const triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(trigger => {
    if (trigger.getHandlerFunction() === 'resetMonthlyCosts') {
      ScriptApp.deleteTrigger(trigger);
    }
  });

  // Create new monthly trigger for the 1st of each month at midnight
  ScriptApp.newTrigger('resetMonthlyCosts')
    .timeBased()
    .onMonthDay(1)
    .atHour(0)
    .create();

  Logger.log('Monthly cost reset trigger configured.');
}
