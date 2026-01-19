/**
 * ASANA INTEGRATION FOR SUPERCHASE
 * Two-way sync between Google Sheets and Asana
 *
 * SETUP:
 * 1. Add this file to your Apps Script project
 * 2. Run: setAsanaCredentials('YOUR_TOKEN', 'YOUR_WORKSPACE_ID')
 * 3. Run: initializeAsanaSync()
 */

// ============================================================================
// CONFIGURATION
// ============================================================================

function getAsanaConfig() {
  const props = PropertiesService.getScriptProperties();
  return {
    TOKEN: props.getProperty('ASANA_TOKEN'),
    WORKSPACE_ID: props.getProperty('ASANA_WORKSPACE_ID'),
    PROJECT_ID: props.getProperty('ASANA_PROJECT_ID'),
    BASE_URL: 'https://app.asana.com/api/1.0'
  };
}

/**
 * Set Asana credentials - run this once
 */
function setAsanaCredentials(token, workspaceId, projectId) {
  const props = PropertiesService.getScriptProperties();
  props.setProperty('ASANA_TOKEN', token || '2/1211216881488767/1212853076925160:b41b0208bf5921d0ed414a0513e322e7');
  props.setProperty('ASANA_WORKSPACE_ID', workspaceId || '1211216881488780');
  if (projectId) props.setProperty('ASANA_PROJECT_ID', projectId);
  Logger.log('Asana credentials saved!');
}

/**
 * Initialize with your credentials
 */
function initializeAsanaSync() {
  // Set your credentials
  setAsanaCredentials(
    '2/1211216881488767/1212853076925160:b41b0208bf5921d0ed414a0513e322e7',
    '1211216881488780'
  );

  // Find or create SuperChaseLive project
  const project = findOrCreateProject('SuperChaseLive');
  if (project) {
    PropertiesService.getScriptProperties().setProperty('ASANA_PROJECT_ID', project.gid);
    Logger.log('Asana project ID: ' + project.gid);
  }

  // Create sync trigger
  setupAsanaSyncTrigger();

  Logger.log('Asana sync initialized!');
  return { success: true, projectId: project ? project.gid : null };
}

// ============================================================================
// ASANA API CALLS
// ============================================================================

function asanaRequest(endpoint, method, payload) {
  const config = getAsanaConfig();
  if (!config.TOKEN) {
    Logger.log('Asana token not set. Run setAsanaCredentials() first.');
    return null;
  }

  const options = {
    method: method || 'GET',
    headers: {
      'Authorization': 'Bearer ' + config.TOKEN,
      'Content-Type': 'application/json'
    },
    muteHttpExceptions: true
  };

  if (payload) {
    options.payload = JSON.stringify({ data: payload });
  }

  try {
    const response = UrlFetchApp.fetch(config.BASE_URL + endpoint, options);
    const json = JSON.parse(response.getContentText());

    if (json.errors) {
      Logger.log('Asana API error: ' + JSON.stringify(json.errors));
      return null;
    }

    return json.data;
  } catch (error) {
    Logger.log('Asana request failed: ' + error);
    return null;
  }
}

// ============================================================================
// PROJECT MANAGEMENT
// ============================================================================

function getAsanaProjects() {
  const config = getAsanaConfig();
  return asanaRequest('/workspaces/' + config.WORKSPACE_ID + '/projects');
}

function findOrCreateProject(projectName) {
  const projects = getAsanaProjects();
  if (!projects) return null;

  // Find existing project
  const existing = projects.find(p => p.name === projectName);
  if (existing) {
    Logger.log('Found existing Asana project: ' + existing.gid);
    return existing;
  }

  // Need to get team ID first for workspaces with teams
  const config = getAsanaConfig();
  const teams = asanaRequest('/workspaces/' + config.WORKSPACE_ID + '/teams');

  if (!teams || teams.length === 0) {
    Logger.log('No teams found - trying to create project without team');
    // Try without team (for personal workspaces)
    const newProject = asanaRequest('/projects', 'POST', {
      name: projectName,
      workspace: config.WORKSPACE_ID,
      default_view: 'list',
      public: false
    });
    if (newProject) {
      Logger.log('Created new Asana project: ' + newProject.gid);
      createAsanaSections(newProject.gid);
    }
    return newProject;
  }

  // Use first team (or you can specify a preferred team name)
  const team = teams[0];
  Logger.log('Using team: ' + team.name + ' (' + team.gid + ')');

  // Create new project with team
  const newProject = asanaRequest('/projects', 'POST', {
    name: projectName,
    team: team.gid,
    default_view: 'list',
    public: false
  });

  if (newProject) {
    Logger.log('Created new Asana project: ' + newProject.gid);
    createAsanaSections(newProject.gid);
  }

  return newProject;
}

function createAsanaSections(projectId) {
  const sections = ['To Do', 'In Progress', 'Done'];
  sections.forEach(name => {
    asanaRequest('/projects/' + projectId + '/sections', 'POST', { name: name });
  });
  Logger.log('Created sections for project');
}

function getProjectSections(projectId) {
  return asanaRequest('/projects/' + projectId + '/sections');
}

// ============================================================================
// TASK SYNC: SHEET → ASANA
// ============================================================================

/**
 * Create task in Asana from sheet data
 */
function createAsanaTask(taskData) {
  const config = getAsanaConfig();
  if (!config.PROJECT_ID) {
    Logger.log('No Asana project ID set');
    return null;
  }

  const payload = {
    name: taskData.description || taskData.name,
    notes: buildTaskNotes(taskData),
    workspace: config.WORKSPACE_ID,
    projects: [config.PROJECT_ID]
  };

  // Add due date if exists
  if (taskData.dueDate) {
    payload.due_on = formatDateForAsana(taskData.dueDate);
  }

  // Map priority to custom field or tag (using notes for now)

  const result = asanaRequest('/tasks', 'POST', payload);

  if (result) {
    // Store Asana task ID back to sheet
    linkAsanaTaskToSheet(taskData.id, result.gid);
    Logger.log('Created Asana task: ' + result.gid);
  }

  return result;
}

function buildTaskNotes(taskData) {
  let notes = '';
  if (taskData.client) notes += 'Client: ' + taskData.client + '\n';
  if (taskData.project) notes += 'Project: ' + taskData.project + '\n';
  if (taskData.priority) notes += 'Priority: ' + taskData.priority + '\n';
  if (taskData.source) notes += 'Source: ' + taskData.source + '\n';
  if (taskData.category) notes += 'Category: ' + taskData.category + '\n';
  notes += '\n---\nCreated by SuperChase';
  return notes;
}

function formatDateForAsana(date) {
  if (!date) return null;
  const d = new Date(date);
  return Utilities.formatDate(d, Session.getScriptTimeZone(), 'yyyy-MM-dd');
}

/**
 * Link Asana task ID back to sheet
 */
function linkAsanaTaskToSheet(sheetTaskId, asanaTaskId) {
  const ss = SpreadsheetApp.openById(getConfig().SPREADSHEET_ID);
  const sheet = ss.getSheetByName('Tasks');
  if (!sheet) return;

  const data = sheet.getDataRange().getValues();
  const headers = data[0];

  // Find or create Asana ID column
  let asanaCol = headers.indexOf('Asana ID');
  if (asanaCol === -1) {
    asanaCol = headers.length;
    sheet.getRange(1, asanaCol + 1).setValue('Asana ID');
  }

  // Find task row and update
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === sheetTaskId) {
      sheet.getRange(i + 1, asanaCol + 1).setValue(asanaTaskId);
      return;
    }
  }
}

/**
 * Update Asana task status
 */
function updateAsanaTaskStatus(asanaTaskId, newStatus) {
  const config = getAsanaConfig();

  // Get sections to find the right one
  const sections = getProjectSections(config.PROJECT_ID);
  if (!sections) return;

  const sectionMap = {
    'Open': 'To Do',
    'In Progress': 'In Progress',
    'Done': 'Done',
    'Completed': 'Done'
  };

  const targetSectionName = sectionMap[newStatus] || 'To Do';
  const section = sections.find(s => s.name === targetSectionName);

  if (section) {
    // Move task to section
    asanaRequest('/sections/' + section.gid + '/addTask', 'POST', {
      task: asanaTaskId
    });
  }

  // If done, mark complete
  if (newStatus === 'Done' || newStatus === 'Completed') {
    asanaRequest('/tasks/' + asanaTaskId, 'PUT', { completed: true });
  }
}

/**
 * Sync all unsynced tasks to Asana
 */
function syncAllTasksToAsana() {
  const ss = SpreadsheetApp.openById(getConfig().SPREADSHEET_ID);
  const sheet = ss.getSheetByName('Tasks');
  if (!sheet || sheet.getLastRow() <= 1) return { synced: 0 };

  const data = sheet.getDataRange().getValues();
  const headers = data[0];

  let asanaCol = headers.indexOf('Asana ID');
  if (asanaCol === -1) {
    asanaCol = headers.length;
    sheet.getRange(1, asanaCol + 1).setValue('Asana ID');
  }

  let synced = 0;

  for (let i = 1; i < data.length; i++) {
    const asanaId = data[i][asanaCol];

    // Skip if already synced
    if (asanaId) continue;

    const taskData = {
      id: data[i][0],
      description: data[i][2],
      category: data[i][3],
      priority: data[i][4],
      status: data[i][5],
      dueDate: data[i][6],
      source: data[i][7],
      client: data[i][10],
      project: data[i][11]
    };

    const result = createAsanaTask(taskData);
    if (result) synced++;

    // Rate limiting
    Utilities.sleep(200);
  }

  Logger.log('Synced ' + synced + ' tasks to Asana');
  return { synced: synced };
}

// ============================================================================
// TASK SYNC: ASANA → SHEET
// ============================================================================

/**
 * Get all tasks from Asana project
 */
function getAsanaTasks() {
  const config = getAsanaConfig();
  if (!config.PROJECT_ID) return [];

  return asanaRequest('/projects/' + config.PROJECT_ID + '/tasks?opt_fields=name,completed,due_on,notes,assignee,memberships.section.name');
}

/**
 * Pull new tasks from Asana to Sheet
 */
function pullTasksFromAsana() {
  const asanaTasks = getAsanaTasks();
  if (!asanaTasks || asanaTasks.length === 0) return { imported: 0 };

  const ss = SpreadsheetApp.openById(getConfig().SPREADSHEET_ID);
  const sheet = ss.getSheetByName('Tasks');
  const data = sheet.getDataRange().getValues();

  // Get existing Asana IDs
  const headers = data[0];
  let asanaCol = headers.indexOf('Asana ID');
  const existingAsanaIds = new Set();

  if (asanaCol >= 0) {
    for (let i = 1; i < data.length; i++) {
      if (data[i][asanaCol]) existingAsanaIds.add(data[i][asanaCol]);
    }
  }

  let imported = 0;

  for (const task of asanaTasks) {
    // Skip if already exists
    if (existingAsanaIds.has(task.gid)) continue;

    // Determine status from section
    let status = 'Open';
    if (task.completed) {
      status = 'Done';
    } else if (task.memberships && task.memberships.length > 0) {
      const sectionName = task.memberships[0].section?.name;
      if (sectionName === 'In Progress') status = 'In Progress';
      else if (sectionName === 'Done') status = 'Done';
    }

    // Parse notes for client/priority info
    const parsed = parseAsanaNotes(task.notes || '');

    // Add to sheet
    const taskId = 'TASK-' + Utilities.getUuid().substring(0, 8).toUpperCase();
    const row = [
      taskId,
      new Date(),
      task.name,
      parsed.category || 'General',
      parsed.priority || 'Medium',
      status,
      task.due_on || '',
      'Asana',
      '',
      '',
      parsed.client || '',
      parsed.project || '',
      '',
      task.gid
    ];

    sheet.appendRow(row);
    imported++;
  }

  Logger.log('Imported ' + imported + ' tasks from Asana');
  return { imported: imported };
}

function parseAsanaNotes(notes) {
  const result = {};
  const lines = notes.split('\n');

  lines.forEach(line => {
    if (line.startsWith('Client:')) result.client = line.replace('Client:', '').trim();
    if (line.startsWith('Priority:')) result.priority = line.replace('Priority:', '').trim();
    if (line.startsWith('Project:')) result.project = line.replace('Project:', '').trim();
    if (line.startsWith('Category:')) result.category = line.replace('Category:', '').trim();
  });

  return result;
}

// ============================================================================
// AUTO-SYNC TRIGGER
// ============================================================================

function setupAsanaSyncTrigger() {
  // Remove existing triggers
  ScriptApp.getProjectTriggers().forEach(trigger => {
    if (trigger.getHandlerFunction() === 'runAsanaSync') {
      ScriptApp.deleteTrigger(trigger);
    }
  });

  // Create new trigger - every 10 minutes
  ScriptApp.newTrigger('runAsanaSync')
    .timeBased()
    .everyMinutes(10)
    .create();

  Logger.log('Asana sync trigger created');
}

/**
 * Main sync function - runs every 10 minutes
 */
function runAsanaSync() {
  Logger.log('Running Asana sync...');

  // Push new tasks to Asana
  const pushed = syncAllTasksToAsana();

  // Pull new tasks from Asana
  const pulled = pullTasksFromAsana();

  // Sync status changes
  syncStatusChanges();

  Logger.log('Asana sync complete: ' + pushed.synced + ' pushed, ' + pulled.imported + ' pulled');
}

/**
 * Sync status changes both ways
 */
function syncStatusChanges() {
  const ss = SpreadsheetApp.openById(getConfig().SPREADSHEET_ID);
  const sheet = ss.getSheetByName('Tasks');
  if (!sheet) return;

  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const asanaCol = headers.indexOf('Asana ID');
  const statusCol = 5; // Status column index

  if (asanaCol === -1) return;

  for (let i = 1; i < data.length; i++) {
    const asanaId = data[i][asanaCol];
    if (!asanaId) continue;

    const sheetStatus = data[i][statusCol];

    // Get Asana task status
    const asanaTask = asanaRequest('/tasks/' + asanaId + '?opt_fields=completed,memberships.section.name');
    if (!asanaTask) continue;

    let asanaStatus = 'Open';
    if (asanaTask.completed) {
      asanaStatus = 'Done';
    } else if (asanaTask.memberships && asanaTask.memberships.length > 0) {
      const sectionName = asanaTask.memberships[0].section?.name;
      if (sectionName === 'In Progress') asanaStatus = 'In Progress';
      else if (sectionName === 'Done') asanaStatus = 'Done';
    }

    // If different, update (Asana wins for now)
    if (sheetStatus !== asanaStatus) {
      sheet.getRange(i + 1, statusCol + 1).setValue(asanaStatus);
      Logger.log('Updated task ' + data[i][0] + ' status to ' + asanaStatus);
    }
  }
}

// ============================================================================
// ENHANCED TASK CREATION (hooks into existing api_createTask)
// ============================================================================

/**
 * Create task in both Sheet and Asana
 * Call this instead of api_createTask for Asana-synced tasks
 */
function createTaskWithAsana(taskData) {
  // Create in sheet first (using existing function)
  const sheetResult = api_createTask(taskData);

  if (sheetResult.success) {
    // Then create in Asana
    taskData.id = sheetResult.taskId;
    const asanaResult = createAsanaTask(taskData);

    return {
      success: true,
      taskId: sheetResult.taskId,
      asanaTaskId: asanaResult ? asanaResult.gid : null
    };
  }

  return sheetResult;
}

// ============================================================================
// TEST FUNCTIONS
// ============================================================================

function testAsanaConnection() {
  const config = getAsanaConfig();
  Logger.log('Testing Asana connection...');
  Logger.log('Token: ' + (config.TOKEN ? 'Set (' + config.TOKEN.substring(0, 10) + '...)' : 'NOT SET'));
  Logger.log('Workspace: ' + config.WORKSPACE_ID);
  Logger.log('Project: ' + config.PROJECT_ID);

  const me = asanaRequest('/users/me');
  if (me) {
    Logger.log('Connected as: ' + me.name + ' (' + me.email + ')');
    return { success: true, user: me.name };
  } else {
    Logger.log('Connection failed');
    return { success: false };
  }
}

function testCreateTask() {
  const result = createAsanaTask({
    id: 'TEST-001',
    description: 'Test task from SuperChase',
    priority: 'High',
    client: 'Test Client'
  });
  Logger.log('Test task result: ' + JSON.stringify(result));
  return result;
}
