// Configuration file for Traffic Social Media App
// All data is stored in Google Sheets

// Main metrics CSV (Traffic data tab)
// BACKUP SHEET: 1xuPzxV40q-i3CZbr6ghnVNJyjfYYHL1ZC4OzFVXHEdA
export const CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vT9pG5C2v4XhDWhXkvGqlWjHeyzOKcFzc5tQbp2GuwfiOLGOegdDIYVfE7g8UVNLCu6-tgKc5vVO5uI/pub?output=csv';

// Roster CSV (Roster tab)
// Format: Store Name, Mobile Expert Name (one row per mobile expert)
export const ROSTER_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vT9pG5C2v4XhDWhXkvGqlWjHeyzOKcFzc5tQbp2GuwfiOLGOegdDIYVfE7g8UVNLCu6-tgKc5vVO5uI/pub?gid=1331432233&single=true&output=csv';

// Passwords CSV (Passwords tab)
// Format: Store Name, Password
export const PASSWORDS_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vT9pG5C2v4XhDWhXkvGqlWjHeyzOKcFzc5tQbp2GuwfiOLGOegdDIYVfE7g8UVNLCu6-tgKc5vVO5uI/pub?gid=1351038140&single=true&output=csv';

// Google Apps Script Web App URL for writing to sheets
// Deploy the Apps Script and paste the URL here
export const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzoDGzKV92U6edop-32Apdlof5R-VW--TM47LeuUsMP_Gaa7tKwtwcI39hZvuYe3mUc2g/exec';

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
    'South Store 1',
    'South Store 2',
    'South Store 3',
    'South Store 4',
    'South Store 5',
    'South Store 6',
    'South Store 7',
    'South Store 8',
  ],
  North: [
    'North Store 1',
    'North Store 2',
    'North Store 3',
    'North Store 4',
    'North Store 5',
    'North Store 6',
    'North Store 7',
    'North Store 8',
    'North Store 9',
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
