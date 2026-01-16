/**
 * Google Sheets Service
 *
 * Handles all interactions with the Google Sheet database.
 * Manages the 4-tab structure: Projects Registry, Tasks, Email Log, Agent Directory
 */

// ============================================================================
// SHEET STRUCTURE CREATION
// ============================================================================

/**
 * Creates the complete sheet structure with all 4 tabs.
 * Run this once during initial setup.
 */
function createSheetsStructure() {
  const config = getConfig();
  let ss;

  try {
    ss = SpreadsheetApp.openById(config.SPREADSHEET_ID);
  } catch (error) {
    Logger.log('Could not open spreadsheet. Please check SPREADSHEET_ID.');
    throw new Error('Invalid SPREADSHEET_ID: ' + error.toString());
  }

  // Create each sheet if it doesn't exist
  createProjectsSheet(ss);
  createTasksSheet(ss);
  createEmailLogSheet(ss);
  createAgentsSheet(ss);

  Logger.log('Sheet structure created/verified successfully.');
}

/**
 * Creates the Projects Registry sheet.
 */
function createProjectsSheet(ss) {
  const sheetName = getConfig().SHEET_NAMES.PROJECTS;
  let sheet = ss.getSheetByName(sheetName);

  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
    Logger.log(`Created sheet: ${sheetName}`);
  }

  // Set headers
  const headers = [
    'Project ID',
    'Project Name',
    'Status',
    'Priority',
    'Lead',
    'AI Agents Assigned',
    'Context Doc URL',
    'Last Activity',
    'Notes'
  ];

  const headerRange = sheet.getRange(1, 1, 1, headers.length);
  headerRange.setValues([headers]);
  headerRange.setFontWeight('bold');
  headerRange.setBackground('#4285f4');
  headerRange.setFontColor('white');

  // Set column widths
  sheet.setColumnWidth(1, 100);  // Project ID
  sheet.setColumnWidth(2, 200);  // Project Name
  sheet.setColumnWidth(3, 80);   // Status
  sheet.setColumnWidth(4, 80);   // Priority
  sheet.setColumnWidth(5, 100);  // Lead
  sheet.setColumnWidth(6, 180);  // AI Agents
  sheet.setColumnWidth(7, 200);  // Context Doc URL
  sheet.setColumnWidth(8, 120);  // Last Activity
  sheet.setColumnWidth(9, 300);  // Notes

  // Freeze header row
  sheet.setFrozenRows(1);

  // Add sample data if empty
  if (sheet.getLastRow() === 1) {
    sheet.appendRow([
      'PROJ001',
      'Scan2Plan OS',
      'Active',
      'High',
      'Chase',
      'Claude-Architect',
      '',
      new Date(),
      'Growth Engine module in dev'
    ]);
  }
}

/**
 * Creates the Tasks sheet.
 */
function createTasksSheet(ss) {
  const sheetName = getConfig().SHEET_NAMES.TASKS;
  let sheet = ss.getSheetByName(sheetName);

  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
    Logger.log(`Created sheet: ${sheetName}`);
  }

  const headers = [
    'Task ID',
    'Project ID',
    'Task Title',
    'Assigned To',
    'Status',
    'Due Date',
    'Created',
    'Priority',
    'Source Email',
    'Notes'
  ];

  const headerRange = sheet.getRange(1, 1, 1, headers.length);
  headerRange.setValues([headers]);
  headerRange.setFontWeight('bold');
  headerRange.setBackground('#34a853');
  headerRange.setFontColor('white');

  sheet.setColumnWidth(1, 100);  // Task ID
  sheet.setColumnWidth(2, 100);  // Project ID
  sheet.setColumnWidth(3, 300);  // Task Title
  sheet.setColumnWidth(4, 120);  // Assigned To
  sheet.setColumnWidth(5, 100);  // Status
  sheet.setColumnWidth(6, 100);  // Due Date
  sheet.setColumnWidth(7, 120);  // Created
  sheet.setColumnWidth(8, 80);   // Priority
  sheet.setColumnWidth(9, 250);  // Source Email
  sheet.setColumnWidth(10, 300); // Notes

  sheet.setFrozenRows(1);
}

/**
 * Creates the Email Log sheet.
 */
function createEmailLogSheet(ss) {
  const sheetName = getConfig().SHEET_NAMES.EMAIL_LOG;
  let sheet = ss.getSheetByName(sheetName);

  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
    Logger.log(`Created sheet: ${sheetName}`);
  }

  const headers = [
    'Email ID',
    'From',
    'Subject',
    'Received',
    'Project Match',
    'Agent Decision',
    'Routed To',
    'Status',
    'Priority',
    'Category',
    'Summary',
    'Action Items',
    'Confidence'
  ];

  const headerRange = sheet.getRange(1, 1, 1, headers.length);
  headerRange.setValues([headers]);
  headerRange.setFontWeight('bold');
  headerRange.setBackground('#fbbc04');
  headerRange.setFontColor('black');

  sheet.setColumnWidth(1, 150);  // Email ID
  sheet.setColumnWidth(2, 200);  // From
  sheet.setColumnWidth(3, 300);  // Subject
  sheet.setColumnWidth(4, 150);  // Received
  sheet.setColumnWidth(5, 100);  // Project Match
  sheet.setColumnWidth(6, 120);  // Agent Decision
  sheet.setColumnWidth(7, 100);  // Routed To
  sheet.setColumnWidth(8, 80);   // Status
  sheet.setColumnWidth(9, 80);   // Priority
  sheet.setColumnWidth(10, 100); // Category
  sheet.setColumnWidth(11, 350); // Summary
  sheet.setColumnWidth(12, 300); // Action Items
  sheet.setColumnWidth(13, 80);  // Confidence

  sheet.setFrozenRows(1);
}

/**
 * Creates the Agent Directory sheet.
 */
function createAgentsSheet(ss) {
  const sheetName = getConfig().SHEET_NAMES.AGENTS;
  let sheet = ss.getSheetByName(sheetName);

  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
    Logger.log(`Created sheet: ${sheetName}`);
  }

  const headers = [
    'Agent Name',
    'Type',
    'Primary Role',
    'Active Projects',
    'API Model',
    'Cost This Month',
    'Emails Processed',
    'Tasks Created',
    'Accuracy Score',
    'Last Active',
    'Notes'
  ];

  const headerRange = sheet.getRange(1, 1, 1, headers.length);
  headerRange.setValues([headers]);
  headerRange.setFontWeight('bold');
  headerRange.setBackground('#ea4335');
  headerRange.setFontColor('white');

  sheet.setColumnWidth(1, 150);  // Agent Name
  sheet.setColumnWidth(2, 100);  // Type
  sheet.setColumnWidth(3, 200);  // Primary Role
  sheet.setColumnWidth(4, 180);  // Active Projects
  sheet.setColumnWidth(5, 150);  // API Model
  sheet.setColumnWidth(6, 120);  // Cost This Month
  sheet.setColumnWidth(7, 120);  // Emails Processed
  sheet.setColumnWidth(8, 100);  // Tasks Created
  sheet.setColumnWidth(9, 100);  // Accuracy Score
  sheet.setColumnWidth(10, 150); // Last Active
  sheet.setColumnWidth(11, 250); // Notes

  sheet.setFrozenRows(1);

  // Add default agents if empty
  if (sheet.getLastRow() === 1) {
    const defaultAgents = [
      ['Gemini-Intake', 'Triage', 'Email processing & routing', 'ALL', 'Gemini 2.0 Flash', 0, 0, 0, 0, new Date(), 'Runs every 5 min'],
      ['Claude-Architect', 'Technical', 'System design & architecture', '', 'Claude Sonnet 4.5', 0, 0, 0, 0, '', 'High reasoning tasks'],
      ['Gemini-Content', 'Content', 'Content generation & editing', '', 'Gemini 2.0 Flash', 0, 0, 0, 0, '', 'Blog posts, copy']
    ];

    defaultAgents.forEach(agent => sheet.appendRow(agent));
  }
}

// ============================================================================
// LOGGING FUNCTIONS
// ============================================================================

/**
 * Logs an email and its analysis to the Email Log sheet.
 * @param {Object} emailData - The email data.
 * @param {Object} analysis - The AI analysis results.
 */
function logEmailToSheet(emailData, analysis) {
  const config = getConfig();
  const ss = SpreadsheetApp.openById(config.SPREADSHEET_ID);
  const sheet = ss.getSheetByName(config.SHEET_NAMES.EMAIL_LOG);

  if (!sheet) {
    Logger.log('Email Log sheet not found!');
    return;
  }

  const row = [
    emailData.id,
    emailData.from,
    emailData.subject,
    emailData.date,
    analysis.projectMatch || 'NONE',
    analysis.decision || 'FYI',
    analysis.routeTo || 'Chase',
    'Pending',
    analysis.priority || 'Medium',
    analysis.category || 'General',
    analysis.summary || '',
    (analysis.actionItems || []).join('; '),
    analysis.confidence || 0
  ];

  sheet.appendRow(row);

  // Update agent statistics
  updateAgentStats('Gemini-Intake', {
    emailsProcessed: 1,
    tasksCreated: analysis.actionRequired ? (analysis.actionItems || []).length : 0
  });
}

/**
 * Logs a system event to the Email Log sheet.
 * @param {string} type - Event type (SYSTEM, ERROR, etc.)
 * @param {string} subject - Event subject.
 * @param {string} details - Event details.
 */
function logToSheet(type, subject, details) {
  try {
    const config = getConfig();
    const ss = SpreadsheetApp.openById(config.SPREADSHEET_ID);
    const sheet = ss.getSheetByName(config.SHEET_NAMES.EMAIL_LOG);

    if (!sheet) return;

    const row = [
      `${type}_${Date.now()}`,
      type,
      subject,
      new Date(),
      '',
      type,
      'SYSTEM',
      'Logged',
      '',
      'System',
      details,
      '',
      ''
    ];

    sheet.appendRow(row);
  } catch (error) {
    Logger.log('Failed to log to sheet: ' + error.toString());
  }
}

// ============================================================================
// DATA RETRIEVAL FUNCTIONS
// ============================================================================

/**
 * Gets project context for AI prompts.
 * @returns {string} Formatted project list.
 */
function getProjectsContext() {
  try {
    const config = getConfig();
    const ss = SpreadsheetApp.openById(config.SPREADSHEET_ID);
    const sheet = ss.getSheetByName(config.SHEET_NAMES.PROJECTS);

    if (!sheet || sheet.getLastRow() <= 1) {
      return 'No active projects.';
    }

    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const rows = data.slice(1);

    const statusIndex = headers.indexOf('Status');
    const idIndex = headers.indexOf('Project ID');
    const nameIndex = headers.indexOf('Project Name');
    const notesIndex = headers.indexOf('Notes');
    const leadIndex = headers.indexOf('Lead');

    return rows
      .filter(row => row[statusIndex] === 'Active')
      .map(row => {
        const id = row[idIndex] || '';
        const name = row[nameIndex] || '';
        const lead = row[leadIndex] || '';
        const notes = row[notesIndex] || 'No context';
        return `${id}: ${name} (Lead: ${lead}) - ${notes}`;
      })
      .join('\n') || 'No active projects.';

  } catch (error) {
    Logger.log('Failed to get projects context: ' + error.toString());
    return 'Error loading projects.';
  }
}

/**
 * Gets a specific project by ID.
 * @param {string} projectId - The project ID.
 * @returns {Object|null} Project data or null.
 */
function getProject(projectId) {
  const config = getConfig();
  const ss = SpreadsheetApp.openById(config.SPREADSHEET_ID);
  const sheet = ss.getSheetByName(config.SHEET_NAMES.PROJECTS);

  if (!sheet) return null;

  const data = sheet.getDataRange().getValues();
  const headers = data[0];

  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === projectId) {
      const project = {};
      headers.forEach((header, index) => {
        project[header] = data[i][index];
      });
      return project;
    }
  }

  return null;
}

/**
 * Adds a new project to the registry.
 * @param {Object} projectData - Project data.
 * @returns {string} The new project ID.
 */
function addProject(projectData) {
  const config = getConfig();
  const ss = SpreadsheetApp.openById(config.SPREADSHEET_ID);
  const sheet = ss.getSheetByName(config.SHEET_NAMES.PROJECTS);

  const lastRow = sheet.getLastRow();
  const projectId = 'PROJ' + String(lastRow).padStart(3, '0');

  const row = [
    projectId,
    projectData.name || 'New Project',
    projectData.status || 'Active',
    projectData.priority || 'Medium',
    projectData.lead || 'Chase',
    projectData.agents || '',
    projectData.contextUrl || '',
    new Date(),
    projectData.notes || ''
  ];

  sheet.appendRow(row);
  Logger.log(`Created project: ${projectId} - ${projectData.name}`);

  return projectId;
}

/**
 * Updates agent statistics.
 * @param {string} agentName - The agent name.
 * @param {Object} stats - Statistics to update.
 */
function updateAgentStats(agentName, stats) {
  try {
    const config = getConfig();
    const ss = SpreadsheetApp.openById(config.SPREADSHEET_ID);
    const sheet = ss.getSheetByName(config.SHEET_NAMES.AGENTS);

    if (!sheet) return;

    const data = sheet.getDataRange().getValues();
    const headers = data[0];

    const nameIndex = headers.indexOf('Agent Name');
    const emailsIndex = headers.indexOf('Emails Processed');
    const tasksIndex = headers.indexOf('Tasks Created');
    const lastActiveIndex = headers.indexOf('Last Active');

    for (let i = 1; i < data.length; i++) {
      if (data[i][nameIndex] === agentName) {
        if (stats.emailsProcessed && emailsIndex !== -1) {
          const current = parseInt(data[i][emailsIndex]) || 0;
          sheet.getRange(i + 1, emailsIndex + 1).setValue(current + stats.emailsProcessed);
        }
        if (stats.tasksCreated && tasksIndex !== -1) {
          const current = parseInt(data[i][tasksIndex]) || 0;
          sheet.getRange(i + 1, tasksIndex + 1).setValue(current + stats.tasksCreated);
        }
        if (lastActiveIndex !== -1) {
          sheet.getRange(i + 1, lastActiveIndex + 1).setValue(new Date());
        }
        break;
      }
    }
  } catch (error) {
    Logger.log('Failed to update agent stats: ' + error.toString());
  }
}

/**
 * Gets email processing statistics.
 * @returns {Object} Processing statistics.
 */
function getProcessingStats() {
  const config = getConfig();
  const ss = SpreadsheetApp.openById(config.SPREADSHEET_ID);
  const emailSheet = ss.getSheetByName(config.SHEET_NAMES.EMAIL_LOG);
  const taskSheet = ss.getSheetByName(config.SHEET_NAMES.TASKS);

  const now = new Date();
  const thirtyDaysAgo = new Date(now - 30 * 24 * 60 * 60 * 1000);

  // Count emails in last 30 days
  const emailData = emailSheet.getDataRange().getValues().slice(1);
  const recentEmails = emailData.filter(row => {
    const date = new Date(row[3]);
    return date >= thirtyDaysAgo && !row[0].startsWith('SYSTEM') && !row[0].startsWith('ERROR');
  });

  // Count tasks in last 30 days
  const taskData = taskSheet.getDataRange().getValues().slice(1);
  const recentTasks = taskData.filter(row => {
    const date = new Date(row[6]);
    return date >= thirtyDaysAgo;
  });

  return {
    emailsProcessed30d: recentEmails.length,
    tasksCreated30d: recentTasks.length,
    avgConfidence: recentEmails.reduce((sum, row) => sum + (parseFloat(row[12]) || 0), 0) / recentEmails.length || 0
  };
}
