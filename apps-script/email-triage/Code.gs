/**
 * AI Email Triage System
 *
 * Main entry point for Gmail monitoring and AI-powered email triage.
 * Uses Gemini 2.0 Flash for intelligent email analysis and routing.
 *
 * Cost estimate: ~$5-10/month for typical email volume (500-1000 emails/month)
 *
 * @author Scan2Plan OS
 * @version 1.0.0
 */

// ============================================================================
// MAIN TRIGGERS AND ENTRY POINTS
// ============================================================================

/**
 * Sets up the time-driven trigger to check emails every 5 minutes.
 * Run this function once manually to initialize the system.
 */
function setupTriggers() {
  // Remove any existing triggers to avoid duplicates
  const triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(trigger => {
    if (trigger.getHandlerFunction() === 'processNewEmails') {
      ScriptApp.deleteTrigger(trigger);
    }
  });

  // Create new trigger to run every 5 minutes
  ScriptApp.newTrigger('processNewEmails')
    .timeBased()
    .everyMinutes(5)
    .create();

  Logger.log('Trigger setup complete. Email processing will run every 5 minutes.');
  logToSheet('SYSTEM', 'Triggers initialized', 'Email processing trigger set to run every 5 minutes');
}

/**
 * Removes all triggers - use to disable the system.
 */
function removeTriggers() {
  const triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(trigger => ScriptApp.deleteTrigger(trigger));
  Logger.log('All triggers removed.');
  logToSheet('SYSTEM', 'Triggers removed', 'All automated email processing stopped');
}

/**
 * Main function that processes new emails.
 * Called automatically by the time-driven trigger every 5 minutes.
 */
function processNewEmails() {
  const config = getConfig();
  const startTime = new Date();

  try {
    // Get the last processed timestamp
    const lastProcessed = getLastProcessedTimestamp();

    // Search for unread emails newer than last processed
    const searchQuery = buildSearchQuery(lastProcessed);
    const threads = GmailApp.search(searchQuery, 0, config.MAX_EMAILS_PER_RUN);

    if (threads.length === 0) {
      Logger.log('No new emails to process.');
      return;
    }

    Logger.log(`Found ${threads.length} email thread(s) to process.`);

    let processedCount = 0;
    let errorCount = 0;

    for (const thread of threads) {
      const messages = thread.getMessages();

      for (const message of messages) {
        // Skip if already processed
        if (isMessageProcessed(message.getId())) {
          continue;
        }

        try {
          const result = processEmail(message);
          if (result.success) {
            processedCount++;
            markMessageProcessed(message.getId());
          } else {
            errorCount++;
            logError('Email processing failed', message.getSubject(), result.error);
          }
        } catch (error) {
          errorCount++;
          logError('Email processing error', message.getSubject(), error.toString());
        }
      }
    }

    // Update last processed timestamp
    setLastProcessedTimestamp(startTime);

    // Log summary
    const duration = (new Date() - startTime) / 1000;
    logToSheet('SYSTEM', 'Processing complete',
      `Processed: ${processedCount}, Errors: ${errorCount}, Duration: ${duration}s`);

  } catch (error) {
    logError('Main process error', 'processNewEmails', error.toString());
    throw error;
  }
}

/**
 * Processes a single email message.
 * @param {GmailMessage} message - The Gmail message to process.
 * @returns {Object} Processing result with success status.
 */
function processEmail(message) {
  const config = getConfig();

  // Extract email data
  const emailData = {
    id: message.getId(),
    threadId: message.getThread().getId(),
    from: message.getFrom(),
    to: message.getTo(),
    cc: message.getCc() || '',
    subject: message.getSubject(),
    body: message.getPlainBody().substring(0, config.MAX_BODY_LENGTH),
    date: message.getDate(),
    isUnread: message.isUnread(),
    labels: message.getThread().getLabels().map(l => l.getName()),
    attachments: message.getAttachments().map(a => ({
      name: a.getName(),
      type: a.getContentType(),
      size: a.getSize()
    }))
  };

  // Call Gemini for analysis
  const analysis = analyzeEmailWithGemini(emailData);

  if (!analysis.success) {
    return { success: false, error: analysis.error };
  }

  // Log the email and analysis
  logEmailToSheet(emailData, analysis.data);

  // Apply actions based on analysis
  applyEmailActions(message, emailData, analysis.data);

  return { success: true, data: analysis.data };
}

/**
 * Applies actions to the email based on AI analysis.
 * @param {GmailMessage} message - The Gmail message.
 * @param {Object} emailData - Extracted email data.
 * @param {Object} analysis - AI analysis results.
 */
function applyEmailActions(message, emailData, analysis) {
  const config = getConfig();
  const thread = message.getThread();

  // Apply label based on category
  if (analysis.category && config.CATEGORY_LABELS[analysis.category]) {
    const labelName = config.CATEGORY_LABELS[analysis.category];
    let label = GmailApp.getUserLabelByName(labelName);
    if (!label) {
      label = GmailApp.createLabel(labelName);
    }
    thread.addLabel(label);
  }

  // Apply priority label
  if (analysis.priority) {
    const priorityLabel = `Priority/${analysis.priority}`;
    let label = GmailApp.getUserLabelByName(priorityLabel);
    if (!label) {
      label = GmailApp.createLabel(priorityLabel);
    }
    thread.addLabel(label);
  }

  // Create task if action items identified
  if (analysis.actionRequired && analysis.actionItems && analysis.actionItems.length > 0) {
    createTasksFromEmail(emailData, analysis);
  }

  // Archive if configured and low priority
  if (config.AUTO_ARCHIVE_LOW_PRIORITY && analysis.priority === 'Low' && !analysis.actionRequired) {
    thread.moveToArchive();
  }

  // Mark as read if configured
  if (config.MARK_PROCESSED_AS_READ) {
    message.markRead();
  }
}

/**
 * Creates tasks in the Tasks sheet based on email analysis.
 * @param {Object} emailData - Extracted email data.
 * @param {Object} analysis - AI analysis results.
 */
function createTasksFromEmail(emailData, analysis) {
  const ss = SpreadsheetApp.openById(getConfig().SPREADSHEET_ID);
  const tasksSheet = ss.getSheetByName('Tasks');

  if (!tasksSheet) {
    Logger.log('Tasks sheet not found. Creating...');
    createSheetsStructure();
    return createTasksFromEmail(emailData, analysis);
  }

  const now = new Date();

  for (const actionItem of analysis.actionItems) {
    const taskRow = [
      Utilities.getUuid(),                              // Task ID
      now,                                              // Created Date
      actionItem.task || actionItem,                    // Task Description
      analysis.category || 'General',                   // Category
      analysis.priority || 'Medium',                    // Priority
      'Open',                                           // Status
      actionItem.dueDate || '',                         // Due Date
      emailData.from,                                   // Source (email sender)
      emailData.subject,                                // Source Reference
      `https://mail.google.com/mail/u/0/#inbox/${emailData.threadId}`, // Email Link
      analysis.suggestedProject || '',                  // Project
      '',                                               // Assigned To
      '',                                               // Completed Date
      ''                                                // Notes
    ];

    tasksSheet.appendRow(taskRow);
  }

  Logger.log(`Created ${analysis.actionItems.length} task(s) from email: ${emailData.subject}`);
}

/**
 * Builds the Gmail search query based on configuration.
 * @param {Date} lastProcessed - Last processed timestamp.
 * @returns {string} Gmail search query.
 */
function buildSearchQuery(lastProcessed) {
  const config = getConfig();
  let query = 'is:inbox';

  // Add date filter if we have a last processed time
  if (lastProcessed) {
    const dateStr = Utilities.formatDate(lastProcessed,
      Session.getScriptTimeZone(), 'yyyy/MM/dd');
    query += ` after:${dateStr}`;
  }

  // Add exclusions
  if (config.EXCLUDE_LABELS && config.EXCLUDE_LABELS.length > 0) {
    config.EXCLUDE_LABELS.forEach(label => {
      query += ` -label:${label}`;
    });
  }

  // Add sender exclusions
  if (config.EXCLUDE_SENDERS && config.EXCLUDE_SENDERS.length > 0) {
    config.EXCLUDE_SENDERS.forEach(sender => {
      query += ` -from:${sender}`;
    });
  }

  return query;
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Gets the last processed timestamp from script properties.
 * @returns {Date|null} Last processed timestamp or null.
 */
function getLastProcessedTimestamp() {
  const props = PropertiesService.getScriptProperties();
  const timestamp = props.getProperty('LAST_PROCESSED_TIMESTAMP');
  return timestamp ? new Date(timestamp) : null;
}

/**
 * Sets the last processed timestamp in script properties.
 * @param {Date} timestamp - The timestamp to set.
 */
function setLastProcessedTimestamp(timestamp) {
  const props = PropertiesService.getScriptProperties();
  props.setProperty('LAST_PROCESSED_TIMESTAMP', timestamp.toISOString());
}

/**
 * Checks if a message has already been processed.
 * @param {string} messageId - The Gmail message ID.
 * @returns {boolean} True if already processed.
 */
function isMessageProcessed(messageId) {
  const cache = CacheService.getScriptCache();
  return cache.get(`processed_${messageId}`) !== null;
}

/**
 * Marks a message as processed.
 * @param {string} messageId - The Gmail message ID.
 */
function markMessageProcessed(messageId) {
  const cache = CacheService.getScriptCache();
  // Cache for 24 hours (max allowed)
  cache.put(`processed_${messageId}`, 'true', 86400);
}

/**
 * Logs an error to the console and sheet.
 * @param {string} context - Error context.
 * @param {string} subject - Email subject or identifier.
 * @param {string} error - Error message.
 */
function logError(context, subject, error) {
  Logger.log(`ERROR [${context}]: ${subject} - ${error}`);
  logToSheet('ERROR', `${context}: ${subject}`, error);
}

/**
 * Manual test function - process a specific email by ID.
 * @param {string} messageId - Optional specific message ID to process.
 */
function testProcessSingleEmail(messageId) {
  const threads = GmailApp.search('is:inbox', 0, 1);
  if (threads.length > 0) {
    const message = threads[0].getMessages()[0];
    Logger.log(`Testing with email: ${message.getSubject()}`);
    const result = processEmail(message);
    Logger.log(`Result: ${JSON.stringify(result)}`);
  } else {
    Logger.log('No emails found to test.');
  }
}

/**
 * Initializes the entire system - run this first!
 */
function initializeSystem() {
  Logger.log('Initializing AI Email Triage System...');

  // Create sheet structure
  createSheetsStructure();

  // Setup triggers
  setupTriggers();

  // Log initialization
  logToSheet('SYSTEM', 'System initialized',
    'AI Email Triage System is now active. Emails will be processed every 5 minutes.');

  Logger.log('System initialization complete!');
  Logger.log('IMPORTANT: Make sure to set your GEMINI_API_KEY in Config.gs');
}
