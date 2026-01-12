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
 */

// Configuration - update these to match your sheet
const ROSTER_SHEET_NAME = 'Roster';
const PASSWORDS_SHEET_NAME = 'Passwords';

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const action = data.action;

    let result;

    switch (action) {
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

/**
 * Add a mobile expert to the roster
 */
function addToRoster(storeName, mobileExpertName) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(ROSTER_SHEET_NAME);

  // Create sheet if it doesn't exist
  if (!sheet) {
    sheet = ss.insertSheet(ROSTER_SHEET_NAME);
    sheet.getRange(1, 1, 1, 2).setValues([['Store Name', 'Mobile Expert Name']]);
  }

  // Check if already exists
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === storeName && data[i][1] === mobileExpertName) {
      return { success: false, error: 'Already exists' };
    }
  }

  // Add new row
  sheet.appendRow([storeName, mobileExpertName]);

  return { success: true };
}

/**
 * Remove a mobile expert from the roster
 */
function removeFromRoster(storeName, mobileExpertName) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(ROSTER_SHEET_NAME);

  if (!sheet) {
    return { success: false, error: 'Roster sheet not found' };
  }

  const data = sheet.getDataRange().getValues();

  // Find and delete the row
  for (let i = data.length - 1; i >= 1; i--) {
    if (data[i][0] === storeName && data[i][1] === mobileExpertName) {
      sheet.deleteRow(i + 1);
      return { success: true };
    }
  }

  return { success: false, error: 'Not found' };
}

/**
 * Update a store password
 */
function updatePassword(storeName, password) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(PASSWORDS_SHEET_NAME);

  // Create sheet if it doesn't exist
  if (!sheet) {
    sheet = ss.insertSheet(PASSWORDS_SHEET_NAME);
    sheet.getRange(1, 1, 1, 2).setValues([['Store Name', 'Password']]);
  }

  const data = sheet.getDataRange().getValues();

  // Find existing row and update
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === storeName) {
      sheet.getRange(i + 1, 2).setValue(password);
      return { success: true };
    }
  }

  // Add new row if not found
  sheet.appendRow([storeName, password]);

  return { success: true };
}

/**
 * Test function - run this to verify the script works
 */
function testScript() {
  Logger.log('Testing addToRoster...');
  const addResult = addToRoster('Test Store', 'Test Expert');
  Logger.log(addResult);

  Logger.log('Testing updatePassword...');
  const passResult = updatePassword('Test Store', 'testpass123');
  Logger.log(passResult);

  Logger.log('Testing removeFromRoster...');
  const removeResult = removeFromRoster('Test Store', 'Test Expert');
  Logger.log(removeResult);

  Logger.log('All tests complete!');
}
