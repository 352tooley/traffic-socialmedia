/**
 * Google Apps Script for Traffic Social Media App
 *
 * DEPLOYMENT INSTRUCTIONS:
 * 1. Open your Google Sheet
 * 2. Go to Extensions > Apps Script
 * 3. Paste this entire script
 * 4. Click Deploy > New deployment (or Manage deployments > Edit)
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
 * - "Photo Log" tab (created automatically)
 *
 * GOOGLE DRIVE:
 * - A folder "Traffic Social Media Photos" will be created automatically
 */

// Configuration
const ROSTER_SHEET_NAME = 'Roster';
const PASSWORDS_SHEET_NAME = 'Passwords';
const TRAFFIC_SHEET_NAME = 'Traffic Log';
const PHOTO_LOG_SHEET_NAME = 'Photo Log';
const DRIVE_FOLDER_NAME = 'Traffic Social Media Photos';

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
      case 'uploadPhoto':
        result = uploadPhoto(data.storeName, data.mobileExpertName, data.photoData, data.fileName);
        break;
      case 'getPhotos':
        result = getPhotos(data.storeName, data.includeDeleted);
        break;
      case 'deletePhoto':
        result = deletePhoto(data.fileId, data.storeName);
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
  const action = e.parameter.action;

  if (action === 'getPhotos') {
    const storeName = e.parameter.storeName;
    const includeDeleted = e.parameter.includeDeleted === 'true';
    const result = getPhotos(storeName, includeDeleted);
    return ContentService.createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);
  }

  return ContentService.createTextOutput(JSON.stringify({
    status: 'ok',
    message: 'Traffic Social Media API is running'
  })).setMimeType(ContentService.MimeType.JSON);
}

// ============ PHOTO FUNCTIONS ============

/**
 * Gets or creates the Drive folder for photos
 */
function getOrCreateFolder() {
  const folders = DriveApp.getFoldersByName(DRIVE_FOLDER_NAME);
  if (folders.hasNext()) {
    return folders.next();
  }
  return DriveApp.createFolder(DRIVE_FOLDER_NAME);
}

/**
 * Gets or creates the Photo Log sheet
 * Columns: Store Name, Mobile Expert, Date, Time, File Name, File URL, File ID, Deleted
 */
function getOrCreatePhotoLogSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(PHOTO_LOG_SHEET_NAME);

  if (!sheet) {
    sheet = ss.insertSheet(PHOTO_LOG_SHEET_NAME);
    sheet.getRange(1, 1, 1, 8).setValues([[
      'Store Name', 'Mobile Expert', 'Date', 'Time', 'File Name', 'File URL', 'File ID', 'Deleted'
    ]]);
    sheet.setFrozenRows(1);
  } else {
    // Check if Deleted column exists, add if not (for existing sheets)
    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    if (headers.length < 8 || headers[7] !== 'Deleted') {
      sheet.getRange(1, 8).setValue('Deleted');
    }
  }

  return sheet;
}

/**
 * Uploads a photo to Google Drive and logs it
 */
function uploadPhoto(storeName, mobileExpertName, photoData, fileName) {
  try {
    const folder = getOrCreateFolder();

    // Decode base64 photo data
    const decodedData = Utilities.base64Decode(photoData);
    const blob = Utilities.newBlob(decodedData, 'image/jpeg', fileName);

    // Create file in Drive
    const file = folder.createFile(blob);
    file.setDescription(`Store: ${storeName}, Mobile Expert: ${mobileExpertName}`);

    // Make file viewable by anyone with link
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

    // Get current date/time
    const now = new Date();
    const date = Utilities.formatDate(now, Session.getScriptTimeZone(), 'MM/dd/yyyy');
    const time = Utilities.formatDate(now, Session.getScriptTimeZone(), 'hh:mm a');

    // Log to Photo Log sheet
    const sheet = getOrCreatePhotoLogSheet();
    sheet.appendRow([
      storeName,
      mobileExpertName,
      date,
      time,
      fileName,
      file.getUrl(),
      file.getId()
    ]);

    return {
      success: true,
      fileUrl: file.getUrl(),
      fileId: file.getId()
    };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

/**
 * Gets all photos for a store (or all photos if storeName is empty/null)
 * @param {string} storeName - Filter by store name (empty for all)
 * @param {boolean} includeDeleted - If true, includes soft-deleted photos (for counting)
 */
function getPhotos(storeName, includeDeleted) {
  try {
    const sheet = getOrCreatePhotoLogSheet();
    const data = sheet.getDataRange().getValues();

    const photos = [];
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const photoStoreName = row[0];
      const isDeleted = row[7] === 'Yes' || row[7] === true;

      // Skip deleted photos unless includeDeleted is true
      if (isDeleted && !includeDeleted) {
        continue;
      }

      // Filter by store if provided
      if (storeName && photoStoreName !== storeName) {
        continue;
      }

      // Format date properly - Google Sheets may return Date objects
      let dateStr = row[2];
      if (dateStr instanceof Date) {
        dateStr = Utilities.formatDate(dateStr, Session.getScriptTimeZone(), 'MM/dd/yyyy');
      } else if (dateStr) {
        dateStr = String(dateStr);
      }

      // Format time properly
      let timeStr = row[3];
      if (timeStr instanceof Date) {
        timeStr = Utilities.formatDate(timeStr, Session.getScriptTimeZone(), 'hh:mm a');
      } else if (timeStr) {
        timeStr = String(timeStr);
      }

      photos.push({
        storeName: photoStoreName,
        mobileExpert: row[1],
        date: dateStr,
        time: timeStr,
        fileName: row[4],
        fileUrl: row[5],
        fileId: row[6],
        deleted: isDeleted
      });
    }

    // Sort by date/time descending (newest first)
    photos.reverse();

    return { success: true, photos: photos };
  } catch (error) {
    return { success: false, error: error.toString(), photos: [] };
  }
}

/**
 * Soft-deletes a photo - removes from Drive but keeps record for reporting
 * Marks the row as deleted instead of removing it
 */
function deletePhoto(fileId, storeName) {
  try {
    // Delete from Drive (frees up storage)
    try {
      const file = DriveApp.getFileById(fileId);
      file.setTrashed(true);
    } catch (driveError) {
      // File may already be deleted, continue with soft delete
      Logger.log('Drive file not found or already deleted: ' + driveError.toString());
    }

    // Soft delete - mark as deleted in Photo Log (keeps record for reporting)
    const sheet = getOrCreatePhotoLogSheet();
    const data = sheet.getDataRange().getValues();

    for (let i = 1; i < data.length; i++) {
      if (data[i][6] === fileId) {
        // Mark column 8 (Deleted) as "Yes"
        sheet.getRange(i + 1, 8).setValue('Yes');
        break;
      }
    }

    return { success: true };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
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

  const lastOccurrence = new Map();
  for (let i = 1; i < data.length; i++) {
    const storeName = data[i][storeColIndex]?.toString().trim();
    if (!storeName || storeName.toLowerCase() === 'total') continue;
    lastOccurrence.set(storeName, i);
  }

  const rowsToDelete = [];
  const seenStores = new Set();

  for (let i = data.length - 1; i >= 1; i--) {
    const storeName = data[i][storeColIndex]?.toString().trim();
    if (!storeName || storeName.toLowerCase() === 'total') continue;

    if (seenStores.has(storeName)) {
      rowsToDelete.push(i + 1);
    } else {
      seenStores.add(storeName);
    }
  }

  rowsToDelete.sort((a, b) => b - a);
  for (const row of rowsToDelete) {
    sheet.deleteRow(row);
  }

  Logger.log('Cleanup complete! Removed ' + rowsToDelete.length + ' duplicate rows.');
}

function setupDailyCleanup() {
  const triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(trigger => {
    if (trigger.getHandlerFunction() === 'cleanupTrafficLog') {
      ScriptApp.deleteTrigger(trigger);
    }
  });

  ScriptApp.newTrigger('cleanupTrafficLog')
    .timeBased()
    .everyDays(1)
    .atHour(6)
    .create();

  Logger.log('Daily cleanup scheduled for 6 AM');
}

function testScript() {
  Logger.log('Testing...');
  const photos = getPhotos('');
  Logger.log(photos);
  Logger.log('Done!');
}
