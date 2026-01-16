/**
 * Configuration for AI Email Triage System
 *
 * SETUP INSTRUCTIONS:
 * 1. Replace 'YOUR_SPREADSHEET_ID' with your Google Sheet ID
 * 2. Set your Gemini API key in Script Properties:
 *    - Go to Project Settings (gear icon) > Script Properties
 *    - Add: GEMINI_API_KEY = your_api_key_here
 * 3. Run initializeSystem() to set up sheets and triggers
 */

// ============================================================================
// CONFIGURATION
// ============================================================================

/**
 * Returns the system configuration object.
 * @returns {Object} Configuration settings.
 */
function getConfig() {
  return {
    // ========== REQUIRED SETTINGS ==========

    // Your Google Sheet ID (from the URL: docs.google.com/spreadsheets/d/{THIS_PART}/edit)
    SPREADSHEET_ID: PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID') || 'YOUR_SPREADSHEET_ID',

    // Gemini API Configuration
    GEMINI_API_KEY: PropertiesService.getScriptProperties().getProperty('GEMINI_API_KEY'),
    GEMINI_ENDPOINT: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent',

    // ========== PROCESSING SETTINGS ==========

    // Maximum emails to process per run (to stay within execution limits)
    MAX_EMAILS_PER_RUN: 20,

    // Maximum characters of email body to analyze (cost control)
    MAX_BODY_LENGTH: 2000,

    // Time window for email search (in minutes)
    SEARCH_WINDOW_MINUTES: 10,

    // ========== EMAIL FILTERING ==========

    // Labels to exclude from processing
    EXCLUDE_LABELS: [
      'AI-Processed',
      'AI-Triage/Processed'
    ],

    // Sender addresses/domains to exclude (newsletters, automated, etc.)
    EXCLUDE_SENDERS: [
      'noreply@',
      'no-reply@',
      'notifications@',
      'mailer-daemon@'
    ],

    // ========== CATEGORY LABELS ==========

    // Gmail labels to apply based on AI categorization
    CATEGORY_LABELS: {
      'Client': 'AI-Triage/Client',
      'Project': 'AI-Triage/Project',
      'Sales': 'AI-Triage/Sales',
      'Admin': 'AI-Triage/Admin',
      'Newsletter': 'AI-Triage/Newsletter',
      'Personal': 'AI-Triage/Personal',
      'Vendor': 'AI-Triage/Vendor',
      'Support': 'AI-Triage/Support'
    },

    // ========== AUTOMATION SETTINGS ==========

    // Automatically archive low-priority, no-action emails
    AUTO_ARCHIVE_LOW_PRIORITY: false,

    // Mark processed emails as read
    MARK_PROCESSED_AS_READ: true,

    // ========== GEMINI MODEL SETTINGS ==========

    // Temperature (0-1): Lower = more consistent, Higher = more creative
    GEMINI_TEMPERATURE: 0.3,

    // Maximum tokens in response
    GEMINI_MAX_TOKENS: 500,

    // ========== SHEET NAMES ==========

    SHEET_NAMES: {
      PROJECTS: 'Projects Registry',
      TASKS: 'Tasks',
      EMAIL_LOG: 'Email Log',
      AGENTS: 'Agent Directory'
    },

    // ========== TEAM ROUTING ==========

    // Default routing based on priority
    ROUTING: {
      HIGH_PRIORITY: 'Chase',
      MEDIUM_PRIORITY: 'Elijah',
      LOW_PRIORITY: 'Auto-Archive'
    },

    // Agent assignments by category
    AGENT_ROUTING: {
      'Technical': 'Claude-Architect',
      'Content': 'Gemini-Content',
      'Triage': 'Gemini-Intake',
      'Design': 'Claude-Designer'
    }
  };
}

// ============================================================================
// VALIDATION
// ============================================================================

/**
 * Validates the configuration and returns any errors.
 * @returns {Object} Validation result with isValid flag and errors array.
 */
function validateConfig() {
  const config = getConfig();
  const errors = [];

  if (!config.GEMINI_API_KEY) {
    errors.push('GEMINI_API_KEY not set. Add it to Script Properties.');
  }

  if (config.SPREADSHEET_ID === 'YOUR_SPREADSHEET_ID') {
    errors.push('SPREADSHEET_ID not configured. Update in Script Properties.');
  }

  return {
    isValid: errors.length === 0,
    errors: errors
  };
}

/**
 * Tests the configuration and API connectivity.
 */
function testConfiguration() {
  Logger.log('Testing configuration...');

  const validation = validateConfig();
  if (!validation.isValid) {
    validation.errors.forEach(err => Logger.log('ERROR: ' + err));
    return false;
  }

  // Test Gemini API
  try {
    const testResult = callGeminiAPI('Say "Configuration test successful" in exactly those words.');
    Logger.log('Gemini API Test: ' + (testResult.success ? 'PASSED' : 'FAILED'));
    if (testResult.success) {
      Logger.log('Response: ' + testResult.text);
    }
  } catch (error) {
    Logger.log('Gemini API Test FAILED: ' + error.toString());
    return false;
  }

  // Test Sheet access
  try {
    const ss = SpreadsheetApp.openById(getConfig().SPREADSHEET_ID);
    Logger.log('Sheet Access Test: PASSED - ' + ss.getName());
  } catch (error) {
    Logger.log('Sheet Access Test FAILED: ' + error.toString());
    return false;
  }

  Logger.log('All configuration tests passed!');
  return true;
}

// ============================================================================
// PROPERTY HELPERS
// ============================================================================

/**
 * Sets a script property.
 * @param {string} key - Property name.
 * @param {string} value - Property value.
 */
function setProperty(key, value) {
  PropertiesService.getScriptProperties().setProperty(key, value);
  Logger.log(`Property '${key}' has been set.`);
}

/**
 * Gets a script property.
 * @param {string} key - Property name.
 * @returns {string} Property value.
 */
function getProperty(key) {
  return PropertiesService.getScriptProperties().getProperty(key);
}

/**
 * Helper function to set the Gemini API key.
 * Run this from the script editor with your API key.
 */
function setGeminiApiKey(apiKey) {
  if (!apiKey || apiKey.length < 10) {
    throw new Error('Invalid API key provided');
  }
  setProperty('GEMINI_API_KEY', apiKey);
  Logger.log('Gemini API key has been saved to Script Properties.');
}

/**
 * Helper function to set the Spreadsheet ID.
 * Run this from the script editor with your Sheet ID.
 */
function setSpreadsheetId(sheetId) {
  if (!sheetId || sheetId.length < 10) {
    throw new Error('Invalid Spreadsheet ID provided');
  }
  setProperty('SPREADSHEET_ID', sheetId);
  Logger.log('Spreadsheet ID has been saved to Script Properties.');
}
