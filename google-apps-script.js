/**
 * Google Apps Script for Traffic Social Media App
 *
 * DEPLOYMENT INSTRUCTIONS:
 * 1. Open your Google Sheet
 * 2. Go to Extensions > Apps Script
 * 3. Paste this entire script
 * 4. Click Deploy > New deployment
 * 5. Select type: Web app
 * 6. Set "Execute as" to your account
 * 7. Set "Who has access" to "Anyone"
 * 8. Click Deploy and copy the URL
 * 9. Paste the URL into src/config.ts APPS_SCRIPT_URL
 *
 * REQUIRED SHEETS:
 * - "Roster" tab with columns: Store Name, Mobile Expert Name
 * - "Passwords" tab with columns: Store Name, Password
 * - "Traffic Log" tab (your main data)
 */

// Configuration - update these to match your sheet
const ROSTER_SHEET_NAME = 'Roster';
const PASSWORDS_SHEET_NAME = 'Passwords';
const TRAFFIC_SHEET_NAME = 'Traffic Log';

// ============ WEB APP HANDLERS ============

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    let result;

    switch (data.action) {
      case 'addRoster':
        result = addToRoster(data.storeName, data.mobileExpertName);
        break;
      case 'removeRoster':
        result = removeFromRoster(data.storeName, data.mobileExpertName);
        break;
      case 'updatePassword':
        result = updatePassword(data.storeName, data.password);
        break;
      default:
        result = { success: false, error: 'Unknown action' };
    }

    return ContentService.createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet(e) {
  return ContentService.createTextOutput(JSON.stringify({
    status: 'ok',
    message: 'Traffic Social Media API is running'
  })).setMimeType(ContentService.MimeType.JSON);
}

// ============ ROSTER FUNCTIONS ============

function addToRoster(storeName, mobileExpertName) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(ROSTER_SHEET_NAME);

  if (!sheet) {
    sheet = ss.insertSheet(ROSTER_SHEET_NAME);
    sheet.getRange(1, 1, 1, 2).setValues([['Store Name', 'Mobile Expert Name']]);
  }

  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === storeName && data[i][1] === mobileExpertName) {
      return { success: false, error: 'Already exists' };
    }
  }

  sheet.appendRow([storeName, mobileExpertName]);
  return { success: true };
}

function removeFromRoster(storeName, mobileExpertName) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(ROSTER_SHEET_NAME);

  if (!sheet) return { success: false, error: 'Sheet not found' };

  const data = sheet.getDataRange().getValues();
  for (let i = data.length - 1; i >= 1; i--) {
    if (data[i][0] === storeName && data[i][1] === mobileExpertName) {
      sheet.deleteRow(i + 1);
      return { success: true };
    }
  }
  return { success: false, error: 'Not found' };
}

// ============ PASSWORD FUNCTIONS ============

function updatePassword(storeName, password) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(PASSWORDS_SHEET_NAME);

  if (!sheet) {
    sheet = ss.insertSheet(PASSWORDS_SHEET_NAME);
    sheet.getRange(1, 1, 1, 2).setValues([['Store Name', 'Password']]);
  }

  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === storeName) {
      sheet.getRange(i + 1, 2).setValue(password);
      return { success: true };
    }
  }

  sheet.appendRow([storeName, password]);
  return { success: true };
}

// ============ TRAFFIC DATA CLEANUP ============

/**
 * IMPORTANT: Run this function to remove duplicate rows in Traffic Log
 * Keeps only the LAST (newest) occurrence of each store
 *
 * To run: Select this function from dropdown and click Run
 */
function cleanupTrafficLog() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(TRAFFIC_SHEET_NAME);

  if (!sheet) {
    Logger.log('Traffic Log sheet not found!');
    return;
  }

  const data = sheet.getDataRange().getValues();
  if (data.length < 2) {
    Logger.log('No data to clean');
    return;
  }

  const headers = data[0];

  // Find Store Name column
  let storeColIndex = -1;
  for (let i = 0; i < headers.length; i++) {
    if (headers[i].toString().toLowerCase().includes('store')) {
      storeColIndex = i;
      break;
    }
  }

  if (storeColIndex === -1) {
    Logger.log('Store Name column not found!');
    return;
  }

  // Find duplicates - keep track of LAST occurrence of each store
  const lastOccurrence = new Map();

  for (let i = 1; i < data.length; i++) {
    const storeName = data[i][storeColIndex]?.toString().trim();
    if (!storeName || storeName.toLowerCase() === 'total') continue;
    lastOccurrence.set(storeName, i);
  }

  // Find rows to delete (all except the last occurrence)
  const rowsToDelete = [];
  const seenStores = new Set();

  for (let i = data.length - 1; i >= 1; i--) {
    const storeName = data[i][storeColIndex]?.toString().trim();
    if (!storeName || storeName.toLowerCase() === 'total') continue;

    if (seenStores.has(storeName)) {
      rowsToDelete.push(i + 1); // +1 for 1-based row index
    } else {
      seenStores.add(storeName);
    }
  }

  // Delete from bottom up
  rowsToDelete.sort((a, b) => b - a);
  for (const row of rowsToDelete) {
    sheet.deleteRow(row);
  }

  Logger.log('Cleanup complete! Removed ' + rowsToDelete.length + ' duplicate rows.');
  Logger.log('Kept newest data for ' + seenStores.size + ' stores.');
}

/**
 * Set up automatic daily cleanup at 6 AM
 * Run this once to enable auto-cleanup
 */
function setupDailyCleanup() {
  // Remove existing triggers
  const triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(trigger => {
    if (trigger.getHandlerFunction() === 'cleanupTrafficLog') {
      ScriptApp.deleteTrigger(trigger);
    }
  });

  // Create new daily trigger
  ScriptApp.newTrigger('cleanupTrafficLog')
    .timeBased()
    .everyDays(1)
    .atHour(6)
    .create();

  Logger.log('Daily cleanup scheduled for 6 AM');
}

/**
 * Test function
 */
function testScript() {
  Logger.log('Testing cleanup...');
  cleanupTrafficLog();
  Logger.log('Done!');
}
