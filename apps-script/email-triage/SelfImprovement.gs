/**
 * Self-Improvement / Recursive Learning System
 *
 * This module enables the AI Email Triage system to learn and improve over time.
 * It tracks accuracy, learns from corrections, and optimizes prompts automatically.
 *
 * Key capabilities:
 * 1. Track decision accuracy through user feedback
 * 2. Learn routing patterns from corrections
 * 3. Automatically optimize prompts based on performance
 * 4. Suggest new categories and routing rules
 * 5. Self-assess and report on system health
 */

// ============================================================================
// LEARNING DATA STORAGE
// ============================================================================

/**
 * Records a correction/feedback on an AI decision.
 * This is the core learning mechanism - call when user overrides AI.
 *
 * @param {string} emailId - The email ID.
 * @param {Object} originalDecision - The AI's original decision.
 * @param {Object} correctedDecision - The user's correction.
 */
function recordCorrection(emailId, originalDecision, correctedDecision) {
  const props = PropertiesService.getScriptProperties();

  // Get existing corrections
  let corrections = JSON.parse(props.getProperty('LEARNING_CORRECTIONS') || '[]');

  corrections.push({
    timestamp: new Date().toISOString(),
    emailId: emailId,
    original: originalDecision,
    corrected: correctedDecision,
    fields: Object.keys(correctedDecision).filter(
      k => correctedDecision[k] !== originalDecision[k]
    )
  });

  // Keep last 500 corrections for learning
  if (corrections.length > 500) {
    corrections = corrections.slice(-500);
  }

  props.setProperty('LEARNING_CORRECTIONS', JSON.stringify(corrections));

  Logger.log(`Recorded correction for email ${emailId}`);

  // Check if we have enough data for optimization
  if (corrections.length % 50 === 0) {
    triggerPromptOptimization();
  }
}

/**
 * Gets learning patterns from correction history.
 * @returns {Object} Learning insights.
 */
function getLearningPatterns() {
  const props = PropertiesService.getScriptProperties();
  const corrections = JSON.parse(props.getProperty('LEARNING_CORRECTIONS') || '[]');

  if (corrections.length < 10) {
    return { status: 'insufficient_data', count: corrections.length };
  }

  // Analyze correction patterns
  const patterns = {
    totalCorrections: corrections.length,
    categoryMistakes: {},
    priorityMistakes: {},
    routingMistakes: {},
    commonFromDomains: {},
    subjectPatterns: []
  };

  corrections.forEach(c => {
    // Category mistakes
    if (c.original.category !== c.corrected.category) {
      const key = `${c.original.category} -> ${c.corrected.category}`;
      patterns.categoryMistakes[key] = (patterns.categoryMistakes[key] || 0) + 1;
    }

    // Priority mistakes
    if (c.original.priority !== c.corrected.priority) {
      const key = `${c.original.priority} -> ${c.corrected.priority}`;
      patterns.priorityMistakes[key] = (patterns.priorityMistakes[key] || 0) + 1;
    }

    // Routing mistakes
    if (c.original.routeTo !== c.corrected.routeTo) {
      const key = `${c.original.routeTo} -> ${c.corrected.routeTo}`;
      patterns.routingMistakes[key] = (patterns.routingMistakes[key] || 0) + 1;
    }
  });

  return patterns;
}

// ============================================================================
// PROMPT OPTIMIZATION
// ============================================================================

/**
 * Generates optimized prompt additions based on learning data.
 * @returns {string} Additional prompt context.
 */
function getLearnedPromptContext() {
  const patterns = getLearningPatterns();

  if (patterns.status === 'insufficient_data') {
    return '';
  }

  let context = '\n\nLEARNED ROUTING RULES (from user corrections):\n';

  // Add category corrections
  const topCategoryMistakes = Object.entries(patterns.categoryMistakes)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);

  if (topCategoryMistakes.length > 0) {
    context += 'Category corrections:\n';
    topCategoryMistakes.forEach(([pattern, count]) => {
      context += `- Avoid categorizing as ${pattern.split(' -> ')[0]} when it should be ${pattern.split(' -> ')[1]} (corrected ${count} times)\n`;
    });
  }

  // Add priority corrections
  const topPriorityMistakes = Object.entries(patterns.priorityMistakes)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);

  if (topPriorityMistakes.length > 0) {
    context += 'Priority corrections:\n';
    topPriorityMistakes.forEach(([pattern, count]) => {
      context += `- Avoid marking as ${pattern.split(' -> ')[0]} priority when it should be ${pattern.split(' -> ')[1]} (corrected ${count} times)\n`;
    });
  }

  // Add routing corrections
  const topRoutingMistakes = Object.entries(patterns.routingMistakes)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);

  if (topRoutingMistakes.length > 0) {
    context += 'Routing corrections:\n';
    topRoutingMistakes.forEach(([pattern, count]) => {
      context += `- Avoid routing to ${pattern.split(' -> ')[0]} when it should go to ${pattern.split(' -> ')[1]} (corrected ${count} times)\n`;
    });
  }

  return context;
}

/**
 * Triggers a prompt optimization cycle using AI.
 */
function triggerPromptOptimization() {
  const patterns = getLearningPatterns();

  if (patterns.status === 'insufficient_data') {
    return;
  }

  const optimizationPrompt = `You are a prompt optimization specialist. Analyze these correction patterns from an email triage system and suggest 3-5 specific improvements to the classification prompt.

CORRECTION PATTERNS:
${JSON.stringify(patterns, null, 2)}

Provide specific, actionable suggestions in JSON format:
{
  "suggestions": [
    {
      "type": "category|priority|routing|general",
      "issue": "What's going wrong",
      "fix": "Specific prompt addition or modification",
      "priority": "high|medium|low"
    }
  ],
  "overallAccuracy": "estimated accuracy percentage",
  "recommendRetraining": true/false
}`;

  const result = callGeminiAPI(optimizationPrompt);

  if (result.success) {
    const props = PropertiesService.getScriptProperties();
    props.setProperty('OPTIMIZATION_SUGGESTIONS', result.text);
    props.setProperty('LAST_OPTIMIZATION', new Date().toISOString());

    logToSheet('SYSTEM', 'Prompt optimization completed',
      'New optimization suggestions available. Run reviewOptimizations() to see them.');
  }
}

/**
 * Reviews and displays optimization suggestions.
 */
function reviewOptimizations() {
  const props = PropertiesService.getScriptProperties();
  const suggestions = props.getProperty('OPTIMIZATION_SUGGESTIONS');
  const lastRun = props.getProperty('LAST_OPTIMIZATION');

  Logger.log('=== OPTIMIZATION REVIEW ===');
  Logger.log(`Last optimization: ${lastRun || 'Never'}`);
  Logger.log('');
  Logger.log('Suggestions:');
  Logger.log(suggestions || 'No suggestions available. Need more corrections data.');

  return { lastRun, suggestions: JSON.parse(suggestions || '{}') };
}

// ============================================================================
// ACCURACY TRACKING
// ============================================================================

/**
 * Calculates the current accuracy score.
 * @returns {Object} Accuracy metrics.
 */
function calculateAccuracy() {
  const config = getConfig();
  const ss = SpreadsheetApp.openById(config.SPREADSHEET_ID);
  const emailSheet = ss.getSheetByName(config.SHEET_NAMES.EMAIL_LOG);

  const data = emailSheet.getDataRange().getValues().slice(1);
  const props = PropertiesService.getScriptProperties();
  const corrections = JSON.parse(props.getProperty('LEARNING_CORRECTIONS') || '[]');

  const totalProcessed = data.filter(row =>
    !row[0].startsWith('SYSTEM') && !row[0].startsWith('ERROR')
  ).length;

  const correctionCount = corrections.length;

  const accuracy = totalProcessed > 0
    ? ((totalProcessed - correctionCount) / totalProcessed * 100).toFixed(2)
    : 100;

  return {
    totalProcessed,
    corrections: correctionCount,
    accuracy: parseFloat(accuracy),
    rating: accuracy >= 90 ? 'Excellent' :
      accuracy >= 80 ? 'Good' :
        accuracy >= 70 ? 'Fair' : 'Needs Improvement'
  };
}

/**
 * Updates the accuracy score in the Agents sheet.
 */
function updateAccuracyScore() {
  const accuracy = calculateAccuracy();
  const config = getConfig();
  const ss = SpreadsheetApp.openById(config.SPREADSHEET_ID);
  const agentsSheet = ss.getSheetByName(config.SHEET_NAMES.AGENTS);

  const data = agentsSheet.getDataRange().getValues();
  const headers = data[0];
  const nameIndex = headers.indexOf('Agent Name');
  const accuracyIndex = headers.indexOf('Accuracy Score');

  if (accuracyIndex === -1) return;

  for (let i = 1; i < data.length; i++) {
    if (data[i][nameIndex] === 'Gemini-Intake') {
      agentsSheet.getRange(i + 1, accuracyIndex + 1).setValue(accuracy.accuracy + '%');
      break;
    }
  }

  Logger.log(`Accuracy updated: ${accuracy.accuracy}% (${accuracy.rating})`);
}

// ============================================================================
// SELF-ASSESSMENT & HEALTH MONITORING
// ============================================================================

/**
 * Performs a comprehensive self-assessment of the system.
 * @returns {Object} Health report.
 */
function performSelfAssessment() {
  const config = getConfig();
  const accuracy = calculateAccuracy();
  const patterns = getLearningPatterns();
  const stats = getProcessingStats();

  const healthReport = {
    timestamp: new Date().toISOString(),
    overall: 'healthy',
    issues: [],
    recommendations: [],
    metrics: {
      accuracy: accuracy,
      processing: stats,
      learning: patterns.status === 'insufficient_data'
        ? { status: 'building', samples: patterns.count }
        : { status: 'active', corrections: patterns.totalCorrections }
    }
  };

  // Check for issues
  if (accuracy.accuracy < 80) {
    healthReport.overall = 'needs_attention';
    healthReport.issues.push('Accuracy below 80%');
    healthReport.recommendations.push('Review recent corrections and run triggerPromptOptimization()');
  }

  if (stats.emailsProcessed30d === 0) {
    healthReport.issues.push('No emails processed in last 30 days');
    healthReport.recommendations.push('Check trigger is active with listTriggers()');
  }

  // Check API cost
  try {
    const ss = SpreadsheetApp.openById(config.SPREADSHEET_ID);
    const agentsSheet = ss.getSheetByName(config.SHEET_NAMES.AGENTS);
    const data = agentsSheet.getDataRange().getValues();
    const headers = data[0];
    const costIndex = headers.indexOf('Cost This Month');
    const nameIndex = headers.indexOf('Agent Name');

    let totalCost = 0;
    for (let i = 1; i < data.length; i++) {
      totalCost += parseFloat(data[i][costIndex]) || 0;
    }

    healthReport.metrics.costThisMonth = totalCost.toFixed(2);

    if (totalCost > 8) {
      healthReport.issues.push('Monthly cost approaching $10 limit');
      healthReport.recommendations.push('Consider reducing MAX_EMAILS_PER_RUN or MAX_BODY_LENGTH');
    }
  } catch (e) {
    // Ignore cost tracking errors
  }

  // Log the assessment
  logToSheet('SYSTEM', 'Self-assessment complete',
    `Status: ${healthReport.overall}, Issues: ${healthReport.issues.length}`);

  Logger.log('=== SELF-ASSESSMENT REPORT ===');
  Logger.log(JSON.stringify(healthReport, null, 2));

  return healthReport;
}

/**
 * Sets up weekly self-assessment trigger.
 */
function setupSelfAssessmentTrigger() {
  const triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(trigger => {
    if (trigger.getHandlerFunction() === 'performSelfAssessment') {
      ScriptApp.deleteTrigger(trigger);
    }
  });

  // Run every Sunday at 9 AM
  ScriptApp.newTrigger('performSelfAssessment')
    .timeBased()
    .onWeekDay(ScriptApp.WeekDay.SUNDAY)
    .atHour(9)
    .create();

  Logger.log('Weekly self-assessment trigger configured for Sundays at 9 AM.');
}

// ============================================================================
// MANUAL CORRECTION INTERFACE
// ============================================================================

/**
 * Records a manual correction from the Email Log sheet.
 * Call this when you manually change a decision in the sheet.
 *
 * @param {string} emailId - The email ID to correct.
 * @param {string} field - Field to correct (priority, category, routeTo, decision).
 * @param {string} newValue - The corrected value.
 */
function correctDecision(emailId, field, newValue) {
  const config = getConfig();
  const ss = SpreadsheetApp.openById(config.SPREADSHEET_ID);
  const sheet = ss.getSheetByName(config.SHEET_NAMES.EMAIL_LOG);

  const data = sheet.getDataRange().getValues();
  const headers = data[0];

  const emailIdIndex = headers.indexOf('Email ID');
  const fieldIndex = headers.indexOf(field === 'routeTo' ? 'Routed To' :
    field === 'decision' ? 'Agent Decision' :
      field.charAt(0).toUpperCase() + field.slice(1));

  if (fieldIndex === -1) {
    Logger.log(`Field '${field}' not found in headers`);
    return false;
  }

  for (let i = 1; i < data.length; i++) {
    if (data[i][emailIdIndex] === emailId) {
      const originalValue = data[i][fieldIndex];

      // Update the sheet
      sheet.getRange(i + 1, fieldIndex + 1).setValue(newValue);

      // Record the correction for learning
      recordCorrection(emailId,
        { [field]: originalValue },
        { [field]: newValue }
      );

      Logger.log(`Corrected ${field} for ${emailId}: ${originalValue} -> ${newValue}`);
      return true;
    }
  }

  Logger.log(`Email ${emailId} not found`);
  return false;
}

// ============================================================================
// ADAPTIVE PROMPT BUILDING
// ============================================================================

/**
 * Builds an enhanced triage prompt with learned context.
 * This is the "recursive" part - prompts improve based on feedback.
 *
 * @param {Object} emailData - The email data.
 * @param {string} projectsContext - Active projects context.
 * @returns {string} Enhanced prompt.
 */
function buildAdaptiveTriagePrompt(emailData, projectsContext) {
  // Get base prompt
  const basePrompt = buildTriagePrompt(emailData, projectsContext);

  // Add learned context
  const learnedContext = getLearnedPromptContext();

  // Add recent high-confidence decisions as examples
  const examplesContext = getRecentExamples();

  return basePrompt + learnedContext + examplesContext;
}

/**
 * Gets recent high-confidence decisions as few-shot examples.
 * @returns {string} Examples context.
 */
function getRecentExamples() {
  try {
    const config = getConfig();
    const ss = SpreadsheetApp.openById(config.SPREADSHEET_ID);
    const sheet = ss.getSheetByName(config.SHEET_NAMES.EMAIL_LOG);

    const data = sheet.getDataRange().getValues().slice(1);

    // Get high-confidence recent decisions (not corrected)
    const props = PropertiesService.getScriptProperties();
    const corrections = JSON.parse(props.getProperty('LEARNING_CORRECTIONS') || '[]');
    const correctedIds = new Set(corrections.map(c => c.emailId));

    const goodExamples = data
      .filter(row =>
        !row[0].startsWith('SYSTEM') &&
        !row[0].startsWith('ERROR') &&
        parseFloat(row[12]) >= 0.8 &&
        !correctedIds.has(row[0])
      )
      .slice(-3);

    if (goodExamples.length === 0) {
      return '';
    }

    let context = '\n\nRECENT SUCCESSFUL CLASSIFICATIONS (for reference):\n';
    goodExamples.forEach((row, i) => {
      context += `Example ${i + 1}: Subject "${row[2]}" -> ${row[5]} (${row[8]} priority, ${row[9]} category)\n`;
    });

    return context;
  } catch (error) {
    return '';
  }
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Lists all active triggers for debugging.
 */
function listTriggers() {
  const triggers = ScriptApp.getProjectTriggers();
  Logger.log(`Found ${triggers.length} trigger(s):`);
  triggers.forEach((trigger, i) => {
    Logger.log(`${i + 1}. ${trigger.getHandlerFunction()} - ${trigger.getEventType()}`);
  });
}

/**
 * Resets all learning data (use with caution!).
 */
function resetLearningData() {
  const props = PropertiesService.getScriptProperties();
  props.deleteProperty('LEARNING_CORRECTIONS');
  props.deleteProperty('OPTIMIZATION_SUGGESTIONS');
  props.deleteProperty('LAST_OPTIMIZATION');
  Logger.log('All learning data has been reset.');
  logToSheet('SYSTEM', 'Learning data reset', 'All corrections and optimization history cleared');
}

/**
 * Exports learning data for backup.
 * @returns {Object} All learning data.
 */
function exportLearningData() {
  const props = PropertiesService.getScriptProperties();
  return {
    corrections: JSON.parse(props.getProperty('LEARNING_CORRECTIONS') || '[]'),
    optimizations: props.getProperty('OPTIMIZATION_SUGGESTIONS'),
    lastOptimization: props.getProperty('LAST_OPTIMIZATION'),
    exportDate: new Date().toISOString()
  };
}

/**
 * Imports learning data from backup.
 * @param {Object} data - Learning data to import.
 */
function importLearningData(data) {
  const props = PropertiesService.getScriptProperties();
  if (data.corrections) {
    props.setProperty('LEARNING_CORRECTIONS', JSON.stringify(data.corrections));
  }
  if (data.optimizations) {
    props.setProperty('OPTIMIZATION_SUGGESTIONS', data.optimizations);
  }
  if (data.lastOptimization) {
    props.setProperty('LAST_OPTIMIZATION', data.lastOptimization);
  }
  Logger.log('Learning data imported successfully.');
}
