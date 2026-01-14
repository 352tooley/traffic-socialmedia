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
const NOTIFICATIONS_SHEET_NAME = 'Notifications';
const DRIVE_FOLDER_NAME = 'Traffic Social Media Photos';
const TIMEZONE = 'America/Chicago'; // Central Time

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
      case 'getRoster':
        result = getRoster(data.storeName);
        break;
      case 'getNotificationEmail':
        result = getNotificationEmail(data.storeName);
        break;
      case 'setNotificationEmail':
        result = setNotificationEmail(data.storeName, data.email);
        break;
      case 'featurePhoto':
        result = featurePhoto(data.fileId, data.featuredBy);
        break;
      case 'approvePhoto':
        result = approvePhoto(data.fileId);
        break;
      case 'rejectPhoto':
        result = rejectPhoto(data.fileId);
        break;
      case 'uploadTeamPhoto':
        result = uploadTeamPhoto(data.storeName, data.uploadedBy, data.photoData, data.fileName);
        break;
      case 'uploadDMPhoto':
        result = uploadDMPhoto(data.photoData, data.fileName, data.uploadedBy);
        break;
      case 'getPendingPhotos':
        result = getPendingPhotos();
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
 * Columns: Store Name, Mobile Expert, Date, Time, File Name, File URL, File ID, Deleted, Featured Status, Featured By, Photo Type
 */
function getOrCreatePhotoLogSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(PHOTO_LOG_SHEET_NAME);

  if (!sheet) {
    sheet = ss.insertSheet(PHOTO_LOG_SHEET_NAME);
    sheet.getRange(1, 1, 1, 11).setValues([[
      'Store Name', 'Mobile Expert', 'Date', 'Time', 'File Name', 'File URL', 'File ID', 'Deleted', 'Featured Status', 'Featured By', 'Photo Type'
    ]]);
    sheet.setFrozenRows(1);
  } else {
    // Check if new columns exist, add if not
    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    if (headers.length < 8 || headers[7] !== 'Deleted') {
      sheet.getRange(1, 8).setValue('Deleted');
    }
    if (headers.length < 9 || headers[8] !== 'Featured Status') {
      sheet.getRange(1, 9).setValue('Featured Status');
    }
    if (headers.length < 10 || headers[9] !== 'Featured By') {
      sheet.getRange(1, 10).setValue('Featured By');
    }
    if (headers.length < 11 || headers[10] !== 'Photo Type') {
      sheet.getRange(1, 11).setValue('Photo Type');
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

    // Get current date/time in Central Time
    const now = new Date();
    Logger.log('Raw UTC time: ' + now.toISOString());
    Logger.log('Timezone being used: ' + TIMEZONE);
    const date = Utilities.formatDate(now, 'America/Chicago', 'MM/dd/yyyy');
    const time = Utilities.formatDate(now, 'America/Chicago', 'hh:mm a');
    Logger.log('Formatted date: ' + date + ' time: ' + time);

    // Log to Photo Log sheet
    const sheet = getOrCreatePhotoLogSheet();
    sheet.appendRow([
      storeName,
      mobileExpertName,
      date,
      time,
      fileName,
      file.getUrl(),
      file.getId(),
      '', // Deleted
      '', // Featured Status
      '', // Featured By
      'mobile_expert' // Photo Type
    ]);

    // Send email notification to RSM (if configured)
    sendPhotoNotification(storeName, mobileExpertName, file.getUrl(), date, time);

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
        dateStr = Utilities.formatDate(dateStr, TIMEZONE, 'MM/dd/yyyy');
      } else if (dateStr) {
        dateStr = String(dateStr);
      }

      // Format time properly
      let timeStr = row[3];
      if (timeStr instanceof Date) {
        timeStr = Utilities.formatDate(timeStr, TIMEZONE, 'hh:mm a');
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
        deleted: isDeleted,
        featuredStatus: row[8] || '',
        featuredBy: row[9] || '',
        photoType: row[10] || 'mobile_expert'
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

/**
 * Gets roster for a specific store (or all stores if storeName is empty)
 * Returns directly from sheet - no caching delays
 */
function getRoster(storeName) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(ROSTER_SHEET_NAME);

    if (!sheet) {
      return { success: true, roster: [] };
    }

    const data = sheet.getDataRange().getValues();
    const rosterMap = {};

    // Skip header row
    for (let i = 1; i < data.length; i++) {
      const rowStoreName = data[i][0]?.toString().trim();
      const mobileExpert = data[i][1]?.toString().trim();

      if (!rowStoreName || !mobileExpert) continue;

      // Filter by store if provided
      if (storeName && rowStoreName !== storeName) continue;

      if (!rosterMap[rowStoreName]) {
        rosterMap[rowStoreName] = [];
      }
      if (!rosterMap[rowStoreName].includes(mobileExpert)) {
        rosterMap[rowStoreName].push(mobileExpert);
      }
    }

    // Convert to array format
    const roster = Object.keys(rosterMap).map(store => ({
      storeName: store,
      mobileExperts: rosterMap[store].sort()
    }));

    return { success: true, roster: roster };
  } catch (error) {
    return { success: false, error: error.toString(), roster: [] };
  }
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

// ============ NOTIFICATION FUNCTIONS ============

/**
 * Gets or creates the Notifications sheet
 * Columns: Store Name, Email
 */
function getOrCreateNotificationsSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(NOTIFICATIONS_SHEET_NAME);

  if (!sheet) {
    sheet = ss.insertSheet(NOTIFICATIONS_SHEET_NAME);
    sheet.getRange(1, 1, 1, 2).setValues([['Store Name', 'Email']]);
    sheet.setFrozenRows(1);
  }

  return sheet;
}

/**
 * Gets the notification email for a store
 */
function getNotificationEmail(storeName) {
  try {
    const sheet = getOrCreateNotificationsSheet();
    const data = sheet.getDataRange().getValues();

    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === storeName) {
        return { success: true, email: data[i][1] || '' };
      }
    }

    return { success: true, email: '' };
  } catch (error) {
    return { success: false, error: error.toString(), email: '' };
  }
}

/**
 * Sets the notification email for a store
 */
function setNotificationEmail(storeName, email) {
  try {
    const sheet = getOrCreateNotificationsSheet();
    const data = sheet.getDataRange().getValues();

    // Check if store already exists
    for (let i = 1; i < data.length; i++) {
      if (data[i][0] === storeName) {
        sheet.getRange(i + 1, 2).setValue(email);
        return { success: true };
      }
    }

    // Add new row
    sheet.appendRow([storeName, email]);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

/**
 * Sends email notification when a photo is uploaded
 */
function sendPhotoNotification(storeName, mobileExpertName, fileUrl, date, time) {
  Logger.log('sendPhotoNotification called for store: ' + storeName);
  
  try {
    const result = getNotificationEmail(storeName);
    Logger.log('getNotificationEmail result: ' + JSON.stringify(result));
    
    if (!result.success) {
      Logger.log('Failed to get notification email: ' + result.error);
      return;
    }
    
    if (!result.email) {
      Logger.log('No email configured for store: ' + storeName);
      return;
    }

    const email = result.email;
    Logger.log('Sending email to: ' + email);
    
    const subject = '📸 New Photo Upload - ' + storeName;
    const body = 'A new photo has been uploaded!\n\n' +
      'Store: ' + storeName + '\n' +
      'Mobile Expert: ' + mobileExpertName + '\n' +
      'Date: ' + date + '\n' +
      'Time: ' + time + '\n\n' +
      'View Photo: ' + fileUrl + '\n\n' +
      '---\nTraffic Social Media App';

    MailApp.sendEmail(email, subject, body);

    Logger.log('Notification email sent successfully to ' + email);
  } catch (error) {
    Logger.log('ERROR in sendPhotoNotification: ' + error.toString());
    Logger.log('Error stack: ' + error.stack);
    // Don't throw - notification failure shouldn't break upload
  }
}

// ============ PHOTO FEATURING & APPROVAL ============

/**
 * Marks a photo as pending approval (RSM recommends for homepage)
 */
function featurePhoto(fileId, featuredBy) {
  try {
    const sheet = getOrCreatePhotoLogSheet();
    const data = sheet.getDataRange().getValues();

    for (let i = 1; i < data.length; i++) {
      if (data[i][6] === fileId) {
        sheet.getRange(i + 1, 9).setValue('pending'); // Featured Status
        sheet.getRange(i + 1, 10).setValue(featuredBy); // Featured By
        return { success: true };
      }
    }

    return { success: false, error: 'Photo not found' };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

/**
 * Approves a photo for homepage display (DM only)
 */
function approvePhoto(fileId) {
  try {
    const sheet = getOrCreatePhotoLogSheet();
    const data = sheet.getDataRange().getValues();

    for (let i = 1; i < data.length; i++) {
      if (data[i][6] === fileId) {
        sheet.getRange(i + 1, 9).setValue('approved');
        return { success: true };
      }
    }

    return { success: false, error: 'Photo not found' };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

/**
 * Rejects a photo from homepage (DM only)
 */
function rejectPhoto(fileId) {
  try {
    const sheet = getOrCreatePhotoLogSheet();
    const data = sheet.getDataRange().getValues();

    for (let i = 1; i < data.length; i++) {
      if (data[i][6] === fileId) {
        sheet.getRange(i + 1, 9).setValue('rejected');
        return { success: true };
      }
    }

    return { success: false, error: 'Photo not found' };
  } catch (error) {
    return { success: false, error: error.toString() };
  }
}

/**
 * RSM uploads a team photo (goes to DM approval)
 */
function uploadTeamPhoto(storeName, uploadedBy, photoData, fileName) {
  try {
    const folder = getOrCreateFolder();

    // Decode base64 photo data
    const decodedData = Utilities.base64Decode(photoData);
    const blob = Utilities.newBlob(decodedData, 'image/jpeg', fileName);

    // Create file in Drive
    const file = folder.createFile(blob);
    file.setDescription(`Store: ${storeName}, Team Photo by: ${uploadedBy}`);
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

    // Get current date/time
    const now = new Date();
    const date = Utilities.formatDate(now, 'America/Chicago', 'MM/dd/yyyy');
    const time = Utilities.formatDate(now, 'America/Chicago', 'hh:mm a');

    // Log to Photo Log sheet
    const sheet = getOrCreatePhotoLogSheet();
    sheet.appendRow([
      storeName,
      uploadedBy,
      date,
      time,
      fileName,
      file.getUrl(),
      file.getId(),
      '', // Deleted
      'pending', // Featured Status - auto-pending for team photos
      uploadedBy, // Featured By
      'team' // Photo Type
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
 * DM uploads a photo (auto-approved for homepage)
 */
function uploadDMPhoto(photoData, fileName, uploadedBy) {
  try {
    const folder = getOrCreateFolder();

    // Decode base64 photo data
    const decodedData = Utilities.base64Decode(photoData);
    const blob = Utilities.newBlob(decodedData, 'image/jpeg', fileName);

    // Create file in Drive
    const file = folder.createFile(blob);
    file.setDescription('DM Photo by: ' + uploadedBy);
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

    // Get current date/time
    const now = new Date();
    const date = Utilities.formatDate(now, 'America/Chicago', 'MM/dd/yyyy');
    const time = Utilities.formatDate(now, 'America/Chicago', 'hh:mm a');

    // Log to Photo Log sheet
    const sheet = getOrCreatePhotoLogSheet();
    sheet.appendRow([
      'District',
      uploadedBy,
      date,
      time,
      fileName,
      file.getUrl(),
      file.getId(),
      '', // Deleted
      'approved', // Featured Status - auto-approved for DM
      uploadedBy, // Featured By
      'dm' // Photo Type
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
 * Gets all pending photos for DM approval
 */
function getPendingPhotos() {
  try {
    const sheet = getOrCreatePhotoLogSheet();
    const data = sheet.getDataRange().getValues();

    const photos = [];
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const isDeleted = row[7] === 'Yes' || row[7] === true;
      const featuredStatus = row[8] || '';

      // Only get pending, non-deleted photos
      if (isDeleted || featuredStatus !== 'pending') {
        continue;
      }

      // Format dates
      let dateStr = row[2];
      if (dateStr instanceof Date) {
        dateStr = Utilities.formatDate(dateStr, TIMEZONE, 'MM/dd/yyyy');
      } else if (dateStr) {
        dateStr = String(dateStr);
      }

      let timeStr = row[3];
      if (timeStr instanceof Date) {
        timeStr = Utilities.formatDate(timeStr, TIMEZONE, 'hh:mm a');
      } else if (timeStr) {
        timeStr = String(timeStr);
      }

      photos.push({
        storeName: row[0],
        mobileExpert: row[1],
        date: dateStr,
        time: timeStr,
        fileName: row[4],
        fileUrl: row[5],
        fileId: row[6],
        featuredBy: row[9] || '',
        photoType: row[10] || 'mobile_expert'
      });
    }

    return { success: true, photos: photos };
  } catch (error) {
    return { success: false, error: error.toString(), photos: [] };
  }
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

/**
 * Test function to debug timezone and email - run this from Apps Script editor
 */
function testTimezoneAndEmail() {
  const now = new Date();
  Logger.log('=== TIMEZONE TEST ===');
  Logger.log('Raw Date object: ' + now);
  Logger.log('toISOString (UTC): ' + now.toISOString());
  Logger.log('Script timezone setting: ' + Session.getScriptTimeZone());
  Logger.log('Formatted with America/Chicago: ' + Utilities.formatDate(now, 'America/Chicago', 'MM/dd/yyyy hh:mm:ss a'));
  Logger.log('Formatted with UTC: ' + Utilities.formatDate(now, 'UTC', 'MM/dd/yyyy hh:mm:ss a'));
  
  Logger.log('\n=== EMAIL TEST ===');
  // Test getting notification emails
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('Notifications');
  if (sheet) {
    const data = sheet.getDataRange().getValues();
    Logger.log('Notifications sheet data:');
    for (let i = 0; i < data.length; i++) {
      Logger.log('Row ' + i + ': ' + JSON.stringify(data[i]));
    }
  } else {
    Logger.log('Notifications sheet does not exist');
  }
  
  // Test sending email to yourself
  Logger.log('\nAttempting to send test email...');
  try {
    const testEmail = Session.getActiveUser().getEmail();
    Logger.log('Sending to: ' + testEmail);
    MailApp.sendEmail(testEmail, 'Test Email from Traffic App', 'This is a test email to verify email sending works.');
    Logger.log('Test email sent successfully!');
  } catch (e) {
    Logger.log('Failed to send test email: ' + e.toString());
  }
}
