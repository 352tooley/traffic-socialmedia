// Configuration file for Traffic Social Media App
// All data is stored in Google Sheets

// Main metrics CSV (Traffic data tab)
export const CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vR_pY1v7j5gUo6f6zQIuX9ubJdeKuyRTxjrp1LvQGvb-WXtY_Ly9aEJsShO_Rhw6InCVRewWbwormjf/pub?gid=147391931&single=true&output=csv';

// Roster CSV (Roster tab)
// Format: Store Name, Mobile Expert Name (one row per mobile expert)
export const ROSTER_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vR_pY1v7j5gUo6f6zQIuX9ubJdeKuyRTxjrp1LvQGvb-WXtY_Ly9aEJsShO_Rhw6InCVRewWbwormjf/pub?gid=0&single=true&output=csv';

// Passwords CSV (Passwords tab)
// Format: Store Name, Password
export const PASSWORDS_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vR_pY1v7j5gUo6f6zQIuX9ubJdeKuyRTxjrp1LvQGvb-WXtY_Ly9aEJsShO_Rhw6InCVRewWbwormjf/pub?gid=PASSWORDS_GID&single=true&output=csv';

// Google Apps Script Web App URL for writing to sheets
// Deploy the Apps Script and paste the URL here
export const APPS_SCRIPT_URL = '';

// Store list (used for dropdowns)
export const STORE_LIST = [
  'Chisholm Trail',
  'Weatherford',
  'Clifford',
  'Cleburne',
  'Stephenville',
  'Granbury',
  'Golden Triangle',
  'Rufe Snow',
  '28th Street',
];

// Default store password (used when no password set in sheet)
export const DEFAULT_STORE_PASSWORD = 'password';

// DM password
export const DM_PASSWORD = 'dm2024';

// App configuration
export const APP_CONFIG = {
  appName: 'Traffic Social Media Manager',
  version: '2.0.0',
};
