// ============================================
// UPDATED GOOGLE APPS SCRIPT FOR MULTI-DISTRICT
// ============================================
// This replaces your existing Apps Script
// Adds 'district' parameter to all functions
// Writes district as FIRST column in all sheets
// ============================================

// Configuration
const SPREADSHEET_ID = '1xuPzxV40q-i3CZbr6ghnVNJyjfYYHL1ZC4OzFVXHEdA';
const DRIVE_FOLDER_ID = '1eQU0tIlrPS_b9hk01hac5FfgKoIiXR3F';

// Sheet names
const UPLOADS_SHEET = 'Photo Log';
const ROSTER_SHEET = 'Roster';
const PASSWORDS_SHEET = 'Password';
const STORES_SHEET = 'Stores';
const DEFAULT_STORE_PASSWORD = 'password';

/**
 * Main entry point for all requests
 */
function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const action = data.action;

    // Route to appropriate handler
    switch (action) {
      case 'uploadPhoto':
        return uploadPhoto(data);
      case 'uploadTeamPhoto':
        return uploadTeamPhoto(data);
      case 'uploadDMPhoto':
        return uploadDMPhoto(data);
      case 'getPhotos':
        return getPhotos(data);
      case 'deletePhoto':
        return deletePhoto(data);
      case 'featurePhoto':
        return featurePhoto(data);
      case 'approvePhoto':
        return approvePhoto(data);
      case 'rejectPhoto':
        return rejectPhoto(data);
      case 'unapprovePhoto':
        return unapprovePhoto(data);
      case 'getPendingPhotos':
        return getPendingPhotos(data);
      case 'getApprovedPhotos':
        return getApprovedPhotos(data);
      case 'getStoreList':
        return getStoreList(data);
      case 'addStore':
        return addStore(data);
      case 'removeStore':
        return removeStore(data);
      case 'getRoster':
        return getRoster(data);
      case 'addRoster':
        return addRoster(data);
      case 'removeRoster':
        return removeRoster(data);
      case 'updatePassword':
        return updatePassword(data);
      case 'getTrafficDataDate':
        return getTrafficDataDate();
      default:
        return respond(false, 'Unknown action: ' + action);
    }
  } catch (error) {
    return respond(false, 'Error: ' + error.toString());
  }
}

/**
 * Uploads a photo (Mobile Expert social media ticket)
 * NEW: Includes district parameter
 */
function uploadPhoto(data) {
  try {
    const district = data.district || 'West'; // NEW
    const storeName = data.storeName;
    const mobileExpertName = data.mobileExpertName;
    const photoData = data.photoData;
    const fileName = data.fileName;

    // Upload to Drive
    const blob = Utilities.newBlob(
      Utilities.base64Decode(photoData),
      'image/jpeg',
      fileName
    );
    const folder = DriveApp.getFolderById(DRIVE_FOLDER_ID);
    const file = folder.createFile(blob);
    const fileUrl = file.getUrl();
    const fileId = file.getId();

    // Log to Uploads sheet
    const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(UPLOADS_SHEET);
    const timestamp = new Date();
    const dateStr = Utilities.formatDate(timestamp, Session.getScriptTimeZone(), 'MM/dd/yyyy');
    const timeStr = Utilities.formatDate(timestamp, Session.getScriptTimeZone(), 'HH:mm:ss');

    // Photo Log structure (matches existing data after District column migration):
    // A: District, B: Store Name, C: Mobile Expert, D: Date, E: Time, 
    // F: File Name, G: File URL, H: File ID, I: deleted, J: featuredStatus, K: featuredBy, L: photoType
    sheet.appendRow([
      district,           // Column A - District
      storeName,          // Column B - Store Name
      mobileExpertName,   // Column C - Mobile Expert
      dateStr,            // Column D - Date
      timeStr,            // Column E - Time
      fileName,           // Column F - File Name
      fileUrl,            // Column G - File URL
      fileId,             // Column H - File ID
      'FALSE',            // Column I - deleted (boolean as string)
      '',                 // Column J - featuredStatus
      '',                 // Column K - featuredBy
      'mobile_expert'     // Column L - photoType
    ]);

    return respond(true, 'Photo uploaded successfully', { fileUrl, fileId });
  } catch (error) {
    return respond(false, 'Upload failed: ' + error.toString());
  }
}

/**
 * Uploads a team photo (RSM upload for DM approval)
 * NEW: Includes district parameter
 */
function uploadTeamPhoto(data) {
  try {
    const district = data.district || 'West'; // NEW
    const storeName = data.storeName;
    const uploadedBy = data.uploadedBy;
    const photoData = data.photoData;
    const fileName = data.fileName;

    // Upload to Drive
    const blob = Utilities.newBlob(
      Utilities.base64Decode(photoData),
      'image/jpeg',
      fileName
    );
    const folder = DriveApp.getFolderById(DRIVE_FOLDER_ID);
    const file = folder.createFile(blob);
    const fileUrl = file.getUrl();
    const fileId = file.getId();

    // Log to Uploads sheet
    const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(UPLOADS_SHEET);
    const timestamp = new Date();
    const dateStr = Utilities.formatDate(timestamp, Session.getScriptTimeZone(), 'MM/dd/yyyy');
    const timeStr = Utilities.formatDate(timestamp, Session.getScriptTimeZone(), 'HH:mm:ss');

    // Photo Log structure (matches existing data):
    // A: District, B: Store Name, C: Mobile Expert, D: Date, E: Time, 
    // F: File Name, G: File URL, H: File ID, I: deleted, J: featuredStatus, K: featuredBy, L: photoType
    sheet.appendRow([
      district,           // Column A - District
      storeName,          // Column B - Store Name
      uploadedBy,         // Column C - Uploaded By (RSM name)
      dateStr,            // Column D - Date
      timeStr,            // Column E - Time
      fileName,           // Column F - File Name
      fileUrl,            // Column G - File URL
      fileId,             // Column H - File ID
      'FALSE',            // Column J - deleted
      'pending',          // Column K - featuredStatus (pending DM approval)
      uploadedBy,         // Column L - featuredBy (RSM who uploaded)
      'team'              // Column M - photoType
    ]);

    return respond(true, 'Team photo uploaded, pending DM approval', { fileUrl, fileId });
  } catch (error) {
    return respond(false, 'Upload failed: ' + error.toString());
  }
}

/**
 * Uploads a DM photo (auto-approved for homepage)
 * NEW: Includes district parameter
 */
function uploadDMPhoto(data) {
  try {
    const district = data.district || 'West'; // NEW
    const uploadedBy = data.uploadedBy; // 'DM'
    const photoData = data.photoData;
    const fileName = data.fileName;

    // Upload to Drive
    const blob = Utilities.newBlob(
      Utilities.base64Decode(photoData),
      'image/jpeg',
      fileName
    );
    const folder = DriveApp.getFolderById(DRIVE_FOLDER_ID);
    const file = folder.createFile(blob);
    const fileUrl = file.getUrl();
    const fileId = file.getId();

    // Log to Uploads sheet
    const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(UPLOADS_SHEET);
    const timestamp = new Date();
    const dateStr = Utilities.formatDate(timestamp, Session.getScriptTimeZone(), 'MM/dd/yyyy');
    const timeStr = Utilities.formatDate(timestamp, Session.getScriptTimeZone(), 'HH:mm:ss');

    // Photo Log structure (matches existing data):
    // A: District, B: Store Name, C: Mobile Expert, D: Date, E: Time, 
    // F: File Name, G: File URL, H: File ID, I: deleted, J: featuredStatus, K: featuredBy, L: photoType
    sheet.appendRow([
      district,           // Column A - District
      'District',         // Column B - storeName (DM photos are district-wide)
      uploadedBy,         // Column C - Uploaded By (DM)
      dateStr,            // Column D - Date
      timeStr,            // Column E - Time
      fileName,           // Column F - File Name
      fileUrl,            // Column G - File URL
      fileId,             // Column H - File ID
      'FALSE',            // Column I - deleted
      'approved',         // Column K - featuredStatus (auto-approved)
      uploadedBy,         // Column L - featuredBy
      'dm'                // Column M - photoType
    ]);

    return respond(true, 'DM photo uploaded and approved', { fileUrl, fileId });
  } catch (error) {
    return respond(false, 'Upload failed: ' + error.toString());
  }
}

/**
 * Gets photos (optionally filtered by store)
 * Returns photos with district field
 */
function getPhotos(data) {
  try {
    const storeName = data.storeName || '';
    const includeDeleted = data.includeDeleted || false;
    const districtFilter = data.district || '';

    const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(UPLOADS_SHEET);
    const rows = sheet.getDataRange().getValues();
    const photos = [];

    // Skip header row
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (!row[0]) continue; // Skip empty rows
      
      // Detect format by checking if column B looks like a timestamp (Date object or contains time)
      // Format A (with timestamp): District, Timestamp, Store, ME, Date, Time, FileName, FileURL, FileID...
      // Format B (no timestamp): District, Store, ME, Date, Time, FileName, FileURL, FileID...
      const col1IsTimestamp = row[1] instanceof Date || 
        (typeof row[1] === 'string' && row[1].match(/^\d{1,2}\/\d{1,2}\/\d{4}\s+\d{1,2}:\d{2}/));
      
      let district, store, mobileExpert, date, time, fileName, fileUrl, fileId, deleted, featuredStatus, featuredBy, photoType;
      
      if (col1IsTimestamp) {
        // Format A: Has timestamp column
        district = row[0] || 'West';
        // row[1] is timestamp (skip it)
        store = row[2];
        mobileExpert = row[3];
        date = row[4];
        time = row[5];
        fileName = row[6];
        fileUrl = row[7];
        fileId = row[8];
        deleted = row[9];
        featuredStatus = row[10];
        featuredBy = row[11];
        photoType = row[12];
      } else {
        // Format B: No timestamp column
        district = row[0] || 'West';
        store = row[1];
        mobileExpert = row[2];
        date = row[3];
        time = row[4];
        fileName = row[5];
        fileUrl = row[6];
        fileId = row[7];
        deleted = row[8];
        featuredStatus = row[9];
        featuredBy = row[10];
        photoType = row[11];
      }

      // Filter by district if requested
      if (districtFilter && district !== districtFilter) continue;

      // Filter by store if requested
      if (storeName && store !== storeName) continue;

      // Filter deleted photos unless requested
      if (!includeDeleted && deleted === true) continue;

      photos.push({
        district: district,
        storeName: store,
        mobileExpert: mobileExpert,
        date: date,
        time: time,
        fileName: fileName,
        fileUrl: fileUrl,
        fileId: fileId,
        deleted: deleted === true,
        featuredStatus: featuredStatus || '',
        featuredBy: featuredBy || '',
        photoType: photoType || 'mobile_expert'
      });
    }

    return respond(true, 'Photos retrieved', { photos });
  } catch (error) {
    return respond(false, 'Error getting photos: ' + error.toString());
  }
}

// ==================== STORE LIST FUNCTIONS ====================

function getStoresSheet_() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sheet = ss.getSheetByName(STORES_SHEET);

  if (!sheet) {
    sheet = ss.insertSheet(STORES_SHEET);
    sheet.appendRow(['District', 'Store Name']);
  }

  const header = sheet.getRange(1, 1, 1, 2).getValues()[0];
  const headerDistrict = String(header[0]).toLowerCase();
  const headerStore = String(header[1]).toLowerCase();
  if (headerDistrict !== 'district' || headerStore !== 'store name') {
    sheet.getRange(1, 1, 1, 2).setValues([['District', 'Store Name']]);
  }

  if (sheet.getLastRow() < 2) {
    seedStoresSheet_(sheet, ss);
  }

  return sheet;
}

function seedStoresSheet_(sheet, ss) {
  const storeMap = {};
  const addStore = (district, storeName) => {
    const cleanDistrict = (district || 'West').toString().trim() || 'West';
    const cleanStore = (storeName || '').toString().trim();
    if (!cleanStore) return;
    const key = cleanDistrict + '::' + cleanStore;
    storeMap[key] = { district: cleanDistrict, storeName: cleanStore };
  };

  const passwordSheet = ss.getSheetByName(PASSWORDS_SHEET);
  if (passwordSheet) {
    const rows = passwordSheet.getDataRange().getValues();
    const header = rows[0] || [];
    const hasHeader = header.some(cell => String(cell).toLowerCase().includes('store'));
    const startIndex = hasHeader ? 1 : 0;
    const useDistrict = hasHeader
      ? String(header[0]).toLowerCase().includes('district')
      : (rows[startIndex] && rows[startIndex].length >= 3);

    for (let i = startIndex; i < rows.length; i++) {
      const row = rows[i];
      if (!row || row.length === 0) continue;
      const district = useDistrict ? row[0] : 'West';
      const store = useDistrict ? row[1] : row[0];
      addStore(district, store);
    }
  }

  const rosterSheet = ss.getSheetByName(ROSTER_SHEET);
  if (rosterSheet) {
    const rows = rosterSheet.getDataRange().getValues();
    const header = rows[0] || [];
    const hasHeader = header.some(cell => String(cell).toLowerCase().includes('store'));
    const startIndex = hasHeader ? 1 : 0;
    const useDistrict = hasHeader
      ? String(header[0]).toLowerCase().includes('district')
      : (rows[startIndex] && rows[startIndex].length >= 3);

    for (let i = startIndex; i < rows.length; i++) {
      const row = rows[i];
      if (!row || row.length === 0) continue;
      const district = useDistrict ? row[0] : 'West';
      const store = useDistrict ? row[1] : row[0];
      addStore(district, store);
    }
  }

  const entries = Object.keys(storeMap).map(key => storeMap[key]);
  if (entries.length > 0) {
    const values = entries.map(entry => [entry.district, entry.storeName]);
    sheet.getRange(2, 1, values.length, 2).setValues(values);
  }
}

function getDistrictForStore_(storeName) {
  try {
    const sheet = getStoresSheet_();
    const rows = sheet.getDataRange().getValues();
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      const store = row[1];
      if (store === storeName) {
        return row[0] || 'West';
      }
    }
  } catch (error) {
    Logger.log('Store list lookup failed: ' + error.toString());
  }

  return 'West';
}

function ensurePasswordRow_(district, storeName) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(PASSWORDS_SHEET);
  if (!sheet) return;

  const rows = sheet.getDataRange().getValues();
  const header = rows[0] || [];
  const hasHeader = header.some(cell => String(cell).toLowerCase().includes('store'));
  const startIndex = hasHeader ? 1 : 0;
  const useDistrict = hasHeader
    ? String(header[0]).toLowerCase().includes('district')
    : (rows[startIndex] && rows[startIndex].length >= 3);

  for (let i = startIndex; i < rows.length; i++) {
    const row = rows[i];
    const rowStore = useDistrict ? row[1] : row[0];
    const rowDistrict = useDistrict ? row[0] : 'West';
    if (rowStore === storeName && (!useDistrict || rowDistrict === district)) {
      return;
    }
  }

  if (useDistrict) {
    sheet.appendRow([district, storeName, DEFAULT_STORE_PASSWORD]);
  } else {
    sheet.appendRow([storeName, DEFAULT_STORE_PASSWORD]);
  }
}

/**
 * Gets store list entries (optionally filtered by district)
 */
function getStoreList(data) {
  try {
    const districtFilter = data && data.district ? data.district : '';
    const sheet = getStoresSheet_();
    const rows = sheet.getDataRange().getValues();
    const stores = [];

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      const district = row[0];
      const storeName = row[1];
      if (!storeName) continue;
      if (districtFilter && district !== districtFilter) continue;
      stores.push({
        district: district || 'West',
        storeName: storeName
      });
    }

    return respond(true, 'Store list retrieved', { stores: stores });
  } catch (error) {
    return respond(false, 'Error getting store list: ' + error.toString());
  }
}

/**
 * Adds a store to the Stores sheet and Passwords sheet
 */
function addStore(data) {
  try {
    const district = data.district || 'West';
    const storeName = (data.storeName || '').toString().trim();

    if (!storeName) {
      return respond(false, 'Store name is required');
    }

    const sheet = getStoresSheet_();
    const rows = sheet.getDataRange().getValues();

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (row[0] === district && row[1] === storeName) {
        return respond(false, 'Store already exists');
      }
    }

    sheet.appendRow([district, storeName]);
    ensurePasswordRow_(district, storeName);

    return respond(true, 'Store added');
  } catch (error) {
    return respond(false, 'Error adding store: ' + error.toString());
  }
}

/**
 * Removes a store from Stores, Roster, and Passwords
 */
function removeStore(data) {
  try {
    const district = data.district || 'West';
    const storeName = (data.storeName || '').toString().trim();

    if (!storeName) {
      return respond(false, 'Store name is required');
    }

    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const storesSheet = getStoresSheet_();
    const storesRows = storesSheet.getDataRange().getValues();

    for (let i = storesRows.length - 1; i >= 1; i--) {
      const row = storesRows[i];
      if (row[0] === district && row[1] === storeName) {
        storesSheet.deleteRow(i + 1);
      }
    }

    const rosterSheet = ss.getSheetByName(ROSTER_SHEET);
    if (rosterSheet) {
      const rows = rosterSheet.getDataRange().getValues();
      for (let i = rows.length - 1; i >= 1; i--) {
        const row = rows[i];
        const hasDistrict = row.length >= 3;
        const rowStore = hasDistrict ? row[1] : row[0];
        const rowDistrict = hasDistrict ? row[0] : 'West';
        if (rowStore === storeName && rowDistrict === district) {
          rosterSheet.deleteRow(i + 1);
        }
      }
    }

    const passwordSheet = ss.getSheetByName(PASSWORDS_SHEET);
    if (passwordSheet) {
      const rows = passwordSheet.getDataRange().getValues();
      for (let i = rows.length - 1; i >= 1; i--) {
        const row = rows[i];
        const hasDistrict = row.length >= 3;
        const rowStore = hasDistrict ? row[1] : row[0];
        const rowDistrict = hasDistrict ? row[0] : 'West';
        if (rowStore === storeName && rowDistrict === district) {
          passwordSheet.deleteRow(i + 1);
        }
      }
    }

    return respond(true, 'Store removed');
  } catch (error) {
    return respond(false, 'Error removing store: ' + error.toString());
  }
}

/**
 * Gets roster (optionally filtered by store)
 * Returns roster with district field
 */
function getRoster(data) {
  try {
    const storeName = data.storeName || '';
    
    const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(ROSTER_SHEET);
    const rows = sheet.getDataRange().getValues();
    const rosterMap = {};

    // Skip header row
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      
      // NEW: Check if we have district column (3 columns) or old format (2 columns)
      const hasDistrict = row.length >= 3;
      
      const district = hasDistrict ? row[0] : 'West';
      const store = hasDistrict ? row[1] : row[0];
      const meName = hasDistrict ? row[2] : row[1];

      if (!store || !meName) continue;

      // Filter by store if requested
      if (storeName && store !== storeName) continue;

      if (!rosterMap[store]) {
        rosterMap[store] = {
          storeName: store,
          district: district,
          mobileExperts: []
        };
      }

      if (rosterMap[store].mobileExperts.indexOf(meName) === -1) {
        rosterMap[store].mobileExperts.push(meName);
      }
    }

    const roster = Object.keys(rosterMap).map(key => rosterMap[key]);
    return respond(true, 'Roster retrieved', { roster });
  } catch (error) {
    return respond(false, 'Error getting roster: ' + error.toString());
  }
}

/**
 * Adds a mobile expert to roster
 * NEW: Gets district from existing store entry or defaults to West
 */
function addRoster(data) {
  try {
    const storeName = data.storeName;
    const mobileExpertName = data.mobileExpertName;

    const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(ROSTER_SHEET);
    const rows = sheet.getDataRange().getValues();
    
    const district = getDistrictForStore_(storeName);

    // NEW STRUCTURE: District | Store Name | Mobile Expert Name
    sheet.appendRow([district, storeName, mobileExpertName]);

    return respond(true, 'Mobile expert added to roster');
  } catch (error) {
    return respond(false, 'Error adding to roster: ' + error.toString());
  }
}

/**
 * Removes a mobile expert from roster
 */
function removeRoster(data) {
  try {
    const storeName = data.storeName;
    const mobileExpertName = data.mobileExpertName;

    const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(ROSTER_SHEET);
    const rows = sheet.getDataRange().getValues();

    // Find and delete the row
    for (let i = rows.length - 1; i >= 1; i--) {
      const row = rows[i];
      const hasDistrict = row.length >= 3;
      const rowStore = hasDistrict ? row[1] : row[0];
      const rowME = hasDistrict ? row[2] : row[1];

      if (rowStore === storeName && rowME === mobileExpertName) {
        sheet.deleteRow(i + 1);
        return respond(true, 'Mobile expert removed from roster');
      }
    }

    return respond(false, 'Mobile expert not found in roster');
  } catch (error) {
    return respond(false, 'Error removing from roster: ' + error.toString());
  }
}

/**
 * Updates a store password
 * NEW: Updates by both district and store name for accuracy
 */
function updatePassword(data) {
  try {
    const storeName = data.storeName;
    const newPassword = data.password;

    const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(PASSWORDS_SHEET);
    const rows = sheet.getDataRange().getValues();

    // Find and update the password
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      const hasDistrict = row.length >= 3;
      const rowStore = hasDistrict ? row[1] : row[0];

      if (rowStore === storeName) {
        const passwordCol = hasDistrict ? 3 : 2; // Column C or B
        sheet.getRange(i + 1, passwordCol).setValue(newPassword);
        return respond(true, 'Password updated');
      }
    }

    return respond(false, 'Store not found in passwords sheet');
  } catch (error) {
    return respond(false, 'Error updating password: ' + error.toString());
  }
}

/**
 * Gets the traffic data date from Traffic Log sheet
 */
function getTrafficDataDate() {
  try {
    const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName('Traffic Log');
    if (!sheet) {
      return respond(false, 'Traffic Log sheet not found');
    }

    // Get the date from cell B1 (or wherever your date is stored)
    const dataDate = sheet.getRange('B1').getValue();
    
    return respond(true, 'Traffic data date retrieved', { 
      dataDate: dataDate ? dataDate.toString() : null 
    });
  } catch (error) {
    return respond(false, 'Error getting traffic data date: ' + error.toString());
  }
}

/**
 * Soft-deletes a photo
 */
function deletePhoto(data) {
  try {
    const fileId = data.fileId;

    const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(UPLOADS_SHEET);
    const rows = sheet.getDataRange().getValues();

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (!row[0]) continue;
      
      // Detect format by checking if column B is a timestamp
      const col1IsTimestamp = row[1] instanceof Date || 
        (typeof row[1] === 'string' && row[1].match(/^\d{1,2}\/\d{1,2}\/\d{4}\s+\d{1,2}:\d{2}/));
      
      // FileID position: Format A (with timestamp): index 8, Format B (no timestamp): index 7
      const rowFileId = col1IsTimestamp ? row[8] : row[7];

      if (rowFileId === fileId) {
        // deleted column: Format A: index 9 (col J), Format B: index 8 (col I)
        const deletedCol = col1IsTimestamp ? 10 : 9; // 1-indexed
        sheet.getRange(i + 1, deletedCol).setValue(true);
        return respond(true, 'Photo deleted');
      }
    }

    return respond(false, 'Photo not found');
  } catch (error) {
    return respond(false, 'Error deleting photo: ' + error.toString());
  }
}

/**
 * Features a photo for DM approval
 */
function featurePhoto(data) {
  try {
    const fileId = data.fileId;
    const featuredBy = data.featuredBy;

    const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(UPLOADS_SHEET);
    const rows = sheet.getDataRange().getValues();

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (!row[0]) continue;
      
      // Detect format by checking if column B is a timestamp
      const col1IsTimestamp = row[1] instanceof Date || 
        (typeof row[1] === 'string' && row[1].match(/^\d{1,2}\/\d{1,2}\/\d{4}\s+\d{1,2}:\d{2}/));
      
      const rowFileId = col1IsTimestamp ? row[8] : row[7];

      if (rowFileId === fileId) {
        // featuredStatus: Format A: col 11 (K), Format B: col 10 (J)
        // featuredBy: Format A: col 12 (L), Format B: col 11 (K)
        const statusCol = col1IsTimestamp ? 11 : 10; // 1-indexed
        const byCol = col1IsTimestamp ? 12 : 11; // 1-indexed
        
        sheet.getRange(i + 1, statusCol).setValue('pending');
        sheet.getRange(i + 1, byCol).setValue(featuredBy);
        return respond(true, 'Photo featured for approval');
      }
    }

    return respond(false, 'Photo not found');
  } catch (error) {
    return respond(false, 'Error featuring photo: ' + error.toString());
  }
}

/**
 * Approves a photo for homepage
 */
function approvePhoto(data) {
  try {
    const fileId = data.fileId;

    const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(UPLOADS_SHEET);
    const rows = sheet.getDataRange().getValues();

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (!row[0]) continue;
      
      // Detect format by checking if column B is a timestamp
      const col1IsTimestamp = row[1] instanceof Date || 
        (typeof row[1] === 'string' && row[1].match(/^\d{1,2}\/\d{1,2}\/\d{4}\s+\d{1,2}:\d{2}/));
      
      const rowFileId = col1IsTimestamp ? row[8] : row[7];

      if (rowFileId === fileId) {
        const statusCol = col1IsTimestamp ? 11 : 10; // 1-indexed
        sheet.getRange(i + 1, statusCol).setValue('approved');
        return respond(true, 'Photo approved');
      }
    }

    return respond(false, 'Photo not found');
  } catch (error) {
    return respond(false, 'Error approving photo: ' + error.toString());
  }
}

/**
 * Rejects a photo
 */
function rejectPhoto(data) {
  try {
    const fileId = data.fileId;

    const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(UPLOADS_SHEET);
    const rows = sheet.getDataRange().getValues();

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (!row[0]) continue;
      
      // Detect format by checking if column B is a timestamp
      const col1IsTimestamp = row[1] instanceof Date || 
        (typeof row[1] === 'string' && row[1].match(/^\d{1,2}\/\d{1,2}\/\d{4}\s+\d{1,2}:\d{2}/));
      
      const rowFileId = col1IsTimestamp ? row[8] : row[7];

      if (rowFileId === fileId) {
        const statusCol = col1IsTimestamp ? 11 : 10; // 1-indexed
        sheet.getRange(i + 1, statusCol).setValue('rejected');
        return respond(true, 'Photo rejected');
      }
    }

    return respond(false, 'Photo not found');
  } catch (error) {
    return respond(false, 'Error rejecting photo: ' + error.toString());
  }
}

/**
 * Unapproves a photo (removes from homepage)
 */
function unapprovePhoto(data) {
  try {
    const fileId = data.fileId;

    const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(UPLOADS_SHEET);
    const rows = sheet.getDataRange().getValues();

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (!row[0]) continue;
      
      // Detect format by checking if column B is a timestamp
      const col1IsTimestamp = row[1] instanceof Date || 
        (typeof row[1] === 'string' && row[1].match(/^\d{1,2}\/\d{1,2}\/\d{4}\s+\d{1,2}:\d{2}/));
      
      const rowFileId = col1IsTimestamp ? row[8] : row[7];

      if (rowFileId === fileId) {
        const statusCol = col1IsTimestamp ? 11 : 10; // 1-indexed
        sheet.getRange(i + 1, statusCol).setValue('');
        return respond(true, 'Photo unapproved');
      }
    }

    return respond(false, 'Photo not found');
  } catch (error) {
    return respond(false, 'Error unapproving photo: ' + error.toString());
  }
}

/**
 * Gets pending photos for DM approval
 */
function getPendingPhotos(data) {
  try {
    const districtFilter = data && data.district ? data.district : '';
    const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(UPLOADS_SHEET);
    const rows = sheet.getDataRange().getValues();
    const photos = [];

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (!row[0]) continue;
      
      // Detect format by checking if column B is a timestamp
      const col1IsTimestamp = row[1] instanceof Date || 
        (typeof row[1] === 'string' && row[1].match(/^\d{1,2}\/\d{1,2}\/\d{4}\s+\d{1,2}:\d{2}/));
      
      let district, store, mobileExpert, date, time, fileName, fileUrl, fileId, deleted, featuredStatus, featuredBy, photoType;
      
      if (col1IsTimestamp) {
        // Format A: Has timestamp column
        district = row[0] || 'West';
        store = row[2];
        mobileExpert = row[3];
        date = row[4];
        time = row[5];
        fileName = row[6];
        fileUrl = row[7];
        fileId = row[8];
        deleted = row[9];
        featuredStatus = row[10];
        featuredBy = row[11];
        photoType = row[12];
      } else {
        // Format B: No timestamp column
        district = row[0] || 'West';
        store = row[1];
        mobileExpert = row[2];
        date = row[3];
        time = row[4];
        fileName = row[5];
        fileUrl = row[6];
        fileId = row[7];
        deleted = row[8];
        featuredStatus = row[9];
        featuredBy = row[10];
        photoType = row[11];
      }

      if (districtFilter && district !== districtFilter) continue;

      if (featuredStatus === 'pending' && deleted !== true) {
        photos.push({
          district: district,
          storeName: store,
          mobileExpert: mobileExpert,
          date: date,
          time: time,
          fileName: fileName,
          fileUrl: fileUrl,
          fileId: fileId,
          deleted: false,
          featuredStatus: featuredStatus,
          featuredBy: featuredBy || '',
          photoType: photoType || 'mobile_expert'
        });
      }
    }

    return respond(true, 'Pending photos retrieved', { photos });
  } catch (error) {
    return respond(false, 'Error getting pending photos: ' + error.toString());
  }
}

/**
 * Gets approved photos (on homepage)
 */
function getApprovedPhotos(data) {
  try {
    const districtFilter = data && data.district ? data.district : '';
    const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(UPLOADS_SHEET);
    const rows = sheet.getDataRange().getValues();
    const photos = [];

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (!row[0]) continue;
      
      // Detect format by checking if column B is a timestamp
      const col1IsTimestamp = row[1] instanceof Date || 
        (typeof row[1] === 'string' && row[1].match(/^\d{1,2}\/\d{1,2}\/\d{4}\s+\d{1,2}:\d{2}/));
      
      let district, store, mobileExpert, date, time, fileName, fileUrl, fileId, deleted, featuredStatus, featuredBy, photoType;
      
      if (col1IsTimestamp) {
        // Format A: Has timestamp column
        district = row[0] || 'West';
        store = row[2];
        mobileExpert = row[3];
        date = row[4];
        time = row[5];
        fileName = row[6];
        fileUrl = row[7];
        fileId = row[8];
        deleted = row[9];
        featuredStatus = row[10];
        featuredBy = row[11];
        photoType = row[12];
      } else {
        // Format B: No timestamp column
        district = row[0] || 'West';
        store = row[1];
        mobileExpert = row[2];
        date = row[3];
        time = row[4];
        fileName = row[5];
        fileUrl = row[6];
        fileId = row[7];
        deleted = row[8];
        featuredStatus = row[9];
        featuredBy = row[10];
        photoType = row[11];
      }

      if (districtFilter && district !== districtFilter) continue;

      if (featuredStatus === 'approved' && deleted !== true) {
        photos.push({
          district: district,
          storeName: store,
          mobileExpert: mobileExpert,
          date: date,
          time: time,
          fileName: fileName,
          fileUrl: fileUrl,
          fileId: fileId,
          deleted: false,
          featuredStatus: featuredStatus,
          featuredBy: featuredBy || '',
          photoType: photoType || 'mobile_expert'
        });
      }
    }

    return respond(true, 'Approved photos retrieved', { photos });
  } catch (error) {
    return respond(false, 'Error getting approved photos: ' + error.toString());
  }
}

/**
 * Helper function to format responses
 */
function respond(success, message, data) {
  const response = {
    success: success,
    message: message
  };

  if (data) {
    Object.keys(data).forEach(key => {
      response[key] = data[key];
    });
  }

  return ContentService.createTextOutput(JSON.stringify(response))
    .setMimeType(ContentService.MimeType.JSON);
}

// ============================================
// UTILITY FUNCTIONS - Row diagnostics and fixes
// ============================================

/**
 * Diagnose row 13 - run this from the dropdown
 */
function diagnoseRow13() {
  return diagnoseAndFixPhotoLogRow(13);
}

/**
 * Diagnose and optionally fix a specific row in Photo Log
 * Run from Apps Script editor to check row 13: diagnoseAndFixPhotoLogRow(13)
 */
function diagnoseAndFixPhotoLogRow(rowNumber) {
  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(UPLOADS_SHEET);

  if (!sheet) {
    Logger.log('ERROR: Sheet "' + UPLOADS_SHEET + '" not found!');
    return { error: 'Sheet not found' };
  }

  const lastCol = sheet.getLastColumn() || 12;
  const rowData = sheet.getRange(rowNumber, 1, 1, lastCol).getValues()[0];

  Logger.log('=== Row ' + rowNumber + ' Diagnosis ===');
  Logger.log('Total columns: ' + lastCol);

  // Log each column value
  for (let i = 0; i < rowData.length; i++) {
    const colLetter = String.fromCharCode(65 + i);
    Logger.log('Column ' + colLetter + ' (' + (i + 1) + '): ' + JSON.stringify(rowData[i]));
  }

  // Expected structure (Format B):
  // A: District, B: Store Name, C: Mobile Expert, D: Date, E: Time,
  // F: File Name, G: File URL, H: File ID, I: deleted, J: featuredStatus, K: featuredBy, L: photoType

  // Check if column B looks like a timestamp (Format A indicator)
  const col1IsTimestamp = rowData[1] instanceof Date ||
    (typeof rowData[1] === 'string' && rowData[1].toString().match(/^\d{1,2}\/\d{1,2}\/\d{4}\s+\d{1,2}:\d{2}/));

  Logger.log('');
  Logger.log('Column B is timestamp: ' + col1IsTimestamp);

  if (col1IsTimestamp) {
    Logger.log('Row appears to be in Format A (with timestamp column)');
  } else {
    Logger.log('Row appears to be in Format B (standard format)');
  }

  // Check for common issues
  const issues = [];

  // Check if District column is missing (first column should be a district name)
  const validDistricts = ['West', 'Central', 'East', 'North', 'South'];
  if (!validDistricts.includes(rowData[0]) && typeof rowData[0] === 'string' && !rowData[0].includes('/')) {
    issues.push('Column A may not be a district name: ' + rowData[0]);
  }

  // Check if there's a URL in the expected position
  const urlColIndex = col1IsTimestamp ? 7 : 6; // 0-indexed
  if (rowData[urlColIndex] && typeof rowData[urlColIndex] === 'string' && rowData[urlColIndex].includes('drive.google.com')) {
    Logger.log('File URL found in expected position (Column ' + String.fromCharCode(65 + urlColIndex) + ')');
  } else {
    // Search for URL in other columns
    for (let i = 0; i < rowData.length; i++) {
      if (typeof rowData[i] === 'string' && rowData[i].includes('drive.google.com')) {
        issues.push('File URL found in Column ' + String.fromCharCode(65 + i) + ' instead of expected Column ' + String.fromCharCode(65 + urlColIndex));
        break;
      }
    }
  }

  Logger.log('');
  if (issues.length > 0) {
    Logger.log('=== Issues Found ===');
    issues.forEach(issue => Logger.log('- ' + issue));
  } else {
    Logger.log('No obvious issues detected');
  }

  return {
    rowData: rowData,
    isFormatA: col1IsTimestamp,
    issues: issues
  };
}

/**
 * Fix row 13 - removes extra Timestamp column (B) to match Format B
 * Row 13 has Format A (13 cols with timestamp), others have Format B (12 cols)
 */
function fixPhotoLogRow13() {
  const rowNumber = 13;
  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(UPLOADS_SHEET);
  const lastCol = sheet.getLastColumn() || 13;
  const rowData = sheet.getRange(rowNumber, 1, 1, lastCol).getValues()[0];

  Logger.log('Current row 13 data (Format A with timestamp):');
  for (let i = 0; i < rowData.length; i++) {
    Logger.log('Col ' + String.fromCharCode(65 + i) + ': ' + JSON.stringify(rowData[i]));
  }

  // Row 13 Format A: District(A), Timestamp(B), Store(C), ME(D), Date(E), Time(F), FileName(G), FileURL(H), FileID(I), deleted(J), featuredStatus(K), featuredBy(L), photoType(M)
  // Target Format B: District(A), Store(B), ME(C), Date(D), Time(E), FileName(F), FileURL(G), FileID(H), deleted(I), featuredStatus(J), featuredBy(K), photoType(L)

  // Extract values, skipping the timestamp column (index 1)
  const district = rowData[0];      // A - keep
  // rowData[1] is timestamp - SKIP
  const store = rowData[2];         // C -> B
  const me = rowData[3];            // D -> C
  const date = rowData[4];          // E -> D (format as MM/dd/yyyy)
  const time = rowData[5];          // F -> E (format as HH:mm:ss)
  const fileName = rowData[6];      // G -> F
  const fileUrl = rowData[7];       // H -> G
  const fileId = rowData[8];        // I -> H
  const deleted = rowData[9];       // J -> I
  const featuredStatus = rowData[10]; // K -> J
  const featuredBy = rowData[11];   // L -> K
  const photoType = rowData[12];    // M -> L

  // Format date and time properly
  let dateStr = date;
  let timeStr = time;

  if (date instanceof Date) {
    dateStr = Utilities.formatDate(date, Session.getScriptTimeZone(), 'MM/dd/yyyy');
  }
  if (time instanceof Date) {
    timeStr = Utilities.formatDate(time, Session.getScriptTimeZone(), 'HH:mm:ss');
  }

  // Build corrected row (Format B - 12 columns)
  const correctedRow = [
    district,       // A
    store,          // B
    me,             // C
    dateStr,        // D
    timeStr,        // E
    fileName,       // F
    fileUrl,        // G
    fileId,         // H
    deleted,        // I
    featuredStatus, // J
    featuredBy,     // K
    photoType       // L
  ];

  Logger.log('');
  Logger.log('Corrected row (Format B, removing timestamp):');
  for (let i = 0; i < correctedRow.length; i++) {
    Logger.log('Col ' + String.fromCharCode(65 + i) + ': ' + JSON.stringify(correctedRow[i]));
  }

  // Clear the row first (to remove extra column M)
  sheet.getRange(rowNumber, 1, 1, lastCol).clearContent();

  // Write corrected data (12 columns)
  sheet.getRange(rowNumber, 1, 1, 12).setValues([correctedRow]);

  Logger.log('');
  Logger.log('Row 13 fixed! Removed timestamp column, now matches Format B.');

  return { success: true, message: 'Row 13 converted from Format A to Format B' };
}

/**
 * View all Photo Log rows to check for inconsistencies
 */
function auditPhotoLogStructure() {
  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(UPLOADS_SHEET);
  const data = sheet.getDataRange().getValues();
  const validDistricts = ['West', 'Central', 'East', 'North', 'South', 'District']; // District header

  Logger.log('=== Photo Log Structure Audit ===');
  Logger.log('Total rows: ' + data.length);
  Logger.log('');

  const issues = [];

  for (let i = 0; i < data.length; i++) {
    const row = data[i];
    const rowNum = i + 1;

    // Skip header
    if (i === 0) {
      Logger.log('Row 1 (Header): ' + row.slice(0, 5).join(' | '));
      continue;
    }

    // Check if first column is a valid district
    if (!validDistricts.includes(row[0]) && row[0] !== '') {
      issues.push({
        row: rowNum,
        issue: 'Column A is not a district: "' + row[0] + '"',
        firstCols: row.slice(0, 4).join(' | ')
      });
    }
  }

  Logger.log('');
  if (issues.length > 0) {
    Logger.log('=== Rows with potential issues ===');
    issues.forEach(item => {
      Logger.log('Row ' + item.row + ': ' + item.issue);
      Logger.log('  First columns: ' + item.firstCols);
    });
  } else {
    Logger.log('All rows have valid District column');
  }

  return issues;
}

// ============================================
// MIGRATION FUNCTION - Run once to add District column
// ============================================
/**
 * Adds District column to all sheets
 * Run this function ONCE from the Apps Script editor
 */
function addDistrictColumnToAllSheets() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheetsToUpdate = ['Traffic Log', 'Roster', 'Password', 'Photo Log'];
  
  sheetsToUpdate.forEach(sheetName => {
    try {
      const sheet = ss.getSheetByName(sheetName);
      if (!sheet) {
        Logger.log('Sheet not found: ' + sheetName);
        return;
      }
      
      // Check if District column already exists
      const firstCell = sheet.getRange(1, 1).getValue();
      if (firstCell === 'District' || firstCell === 'district') {
        Logger.log('District column already exists in: ' + sheetName);
        return;
      }
      
      // Insert new column A
      sheet.insertColumnBefore(1);
      
      // Add header
      sheet.getRange(1, 1).setValue('District');
      
      // Get data range to fill with "West"
      const lastRow = sheet.getLastRow();
      if (lastRow > 1) {
        const range = sheet.getRange(2, 1, lastRow - 1, 1);
        const values = [];
        for (let i = 0; i < lastRow - 1; i++) {
          values.push(['West']);
        }
        range.setValues(values);
      }
      
      Logger.log('Added District column to: ' + sheetName);
    } catch (error) {
      Logger.log('Error updating ' + sheetName + ': ' + error.message);
    }
  });
  
  Logger.log('Migration complete!');
}
