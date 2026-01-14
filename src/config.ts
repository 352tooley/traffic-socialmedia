// Configuration file for Traffic Social Media App
// All data is stored in Google Sheets

// Main metrics CSV (Traffic data tab)
// Now includes District column: District, Store Name, Traffic, Submissions, ...
export const CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vR_pY1v7j5gUo6f6zQIuX9ubJdeKuyRTxjrp1LvQGvb-WXtY_Ly9aEJsShO_Rhw6InCVRewWbwormjf/pub?gid=147391931&single=true&output=csv';

// Roster CSV (Roster tab)
// Format: District, Store Name, Mobile Expert Name (one row per mobile expert)
export const ROSTER_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vR_pY1v7j5gUo6f6zQIuX9ubJdeKuyRTxjrp1LvQGvb-WXtY_Ly9aEJsShO_Rhw6InCVRewWbwormjf/pub?gid=1331432233&single=true&output=csv';

// Passwords CSV (Passwords tab)
// Format: District, Store Name, Password
export const PASSWORDS_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vR_pY1v7j5gUo6f6zQIuX9ubJdeKuyRTxjrp1LvQGvb-WXtY_Ly9aEJsShO_Rhw6InCVRewWbwormjf/pub?gid=1351038140&single=true&output=csv';

// Google Apps Script Web App URL for writing to sheets
// Deploy the Apps Script and paste the URL here
export const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxbgwHZMPp1tXFN7iModSmok9pCSeZZ9TbeZKlGvU3t_FuxosehUr37s2h6Ec8AXAmZAQ/exec';

// District configuration
export const DISTRICTS = ['West', 'South', 'North'] as const;
export type District = typeof DISTRICTS[number];

// Store lists per district
export const DISTRICT_STORES: Record<District, string[]> = {
  West: [
    'Chisholm Trail',
    'Weatherford',
    'Clifford',
    'Cleburne',
    'Stephenville',
    'Granbury',
    'Golden Triangle',
    'Rufe Snow',
    '28th Street',
  ],
  South: [
    // TODO: Add South district stores here
  ],
  North: [
    // TODO: Add North district stores here
  ],
};

// Legacy: Get all stores across all districts
export const STORE_LIST = Object.values(DISTRICT_STORES).flat();

// Get stores for a specific district
export function getStoreList(district?: District): string[] {
  if (!district) return STORE_LIST;
  return DISTRICT_STORES[district] || [];
}

// Default store password (used when no password set in sheet)
export const DEFAULT_STORE_PASSWORD = 'password';

// DM password
export const DM_PASSWORD = 'dm2024';

// App configuration
export const APP_CONFIG = {
  appName: 'Traffic Social Media Manager',
  version: '2.0.0',
};
