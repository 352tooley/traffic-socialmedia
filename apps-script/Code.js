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
        return getPendingPhotos();
      case 'getApprovedPhotos':
        return getApprovedPhotos();
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
    
    // Find district for this store from existing entries
    let district = 'West'; // default
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      const hasDistrict = row.length >= 3;
      const rowStore = hasDistrict ? row[1] : row[0];
      const rowDistrict = hasDistrict ? row[0] : 'West';
      
      if (rowStore === storeName) {
        district = rowDistrict;
        break;
      }
    }

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
function getPendingPhotos() {
  try {
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
function getApprovedPhotos() {
  try {
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
