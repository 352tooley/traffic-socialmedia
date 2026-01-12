import { CSV_URL, ROSTER_CSV_URL, PASSWORDS_CSV_URL, APPS_SCRIPT_URL, STORE_LIST, DEFAULT_STORE_PASSWORD } from '../config';
import type { StoreMetrics, StoreRoster, StoreAuth } from '../types';

// Header names to look for (case-insensitive matching)
const HEADER_STORE_NAME = 'Store Name';
const HEADER_COUNT = 'Count';
const HEADER_TRAFFIC = 'Traffic';

// Cache to prevent repeated fetches
let metricsCache: { data: StoreMetrics[]; timestamp: number } | null = null;
let rosterCache: { data: StoreRoster[]; timestamp: number } | null = null;
let passwordsCache: { data: StoreAuth[]; timestamp: number } | null = null;
const CACHE_DURATION = 60000; // 1 minute cache

/**
 * Fetches and parses the CSV from Google Sheets
 * Returns only current data (deduped by store name, keeping latest/first entry)
 */
export async function fetchStoreMetrics(): Promise<StoreMetrics[]> {
  // Return cached data if still valid
  if (metricsCache && Date.now() - metricsCache.timestamp < CACHE_DURATION) {
    return metricsCache.data;
  }

  try {
    const response = await fetch(CSV_URL);
    if (!response.ok) {
      throw new Error(`Failed to fetch CSV: ${response.status}`);
    }

    const csvText = await response.text();
    const metrics = parseCSV(csvText);

    // Cache the results
    metricsCache = { data: metrics, timestamp: Date.now() };

    return metrics;
  } catch (error) {
    console.error('Error fetching store metrics:', error);
    throw error;
  }
}

/**
 * Parses CSV text into StoreMetrics array
 * Deduplicates by store name - keeps only the FIRST occurrence of each store
 */
function parseCSV(csvText: string): StoreMetrics[] {
  const lines = csvText.trim().split('\n');

  if (lines.length < 2) {
    return [];
  }

  // Parse headers (first row)
  const headers = parseCSVLine(lines[0]);

  // Find column indices by header name
  const headerMap: Record<string, number> = {};
  headers.forEach((header, index) => {
    headerMap[header.trim()] = index;
  });

  // Validate required headers exist
  const storeNameIndex = findHeaderIndex(headerMap, HEADER_STORE_NAME);
  const countIndex = findHeaderIndex(headerMap, HEADER_COUNT);
  const trafficIndex = findHeaderIndex(headerMap, HEADER_TRAFFIC);

  if (storeNameIndex === -1 || countIndex === -1 || trafficIndex === -1) {
    console.error('Missing required headers. Found:', Object.keys(headerMap));
    throw new Error('CSV missing required headers: Store Name, Count, or Traffic');
  }

  // Use a Map to deduplicate - first occurrence wins (current data)
  const storeMap = new Map<string, StoreMetrics>();

  // Parse data rows (skip header row)
  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);

    if (values.length === 0) continue;

    const storeName = values[storeNameIndex]?.trim() || '';

    // Skip empty rows and "Total" row
    if (storeName.toLowerCase() === 'total' || storeName === '') {
      continue;
    }

    // Skip if we already have this store (keeps first/current entry only)
    if (storeMap.has(storeName)) {
      continue;
    }

    const submissions = parseNumber(values[countIndex]);
    const traffic = parseNumber(values[trafficIndex]);

    // Compute submissions per 100
    const submissionsPer100 = traffic > 0
      ? Math.round((submissions / traffic) * 100 * 100) / 100
      : 0;

    storeMap.set(storeName, {
      storeName,
      submissions,
      traffic,
      submissionsPer100,
    });
  }

  return Array.from(storeMap.values());
}

/**
 * Finds header index, case-insensitive
 */
function findHeaderIndex(headerMap: Record<string, number>, headerName: string): number {
  if (headerMap[headerName] !== undefined) {
    return headerMap[headerName];
  }

  const lowerName = headerName.toLowerCase();
  for (const [key, value] of Object.entries(headerMap)) {
    if (key.toLowerCase() === lowerName) {
      return value;
    }
  }

  return -1;
}

/**
 * Parses a CSV line, handling quoted values with commas
 */
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }

  result.push(current);
  return result;
}

/**
 * Parses a number from string, handling blanks and invalid values
 */
function parseNumber(value: string | undefined): number {
  if (!value || value.trim() === '') {
    return 0;
  }

  const cleaned = value.replace(/,/g, '').trim();
  const num = parseFloat(cleaned);

  return isNaN(num) ? 0 : num;
}

/**
 * Gets metrics for a specific store by name
 */
export async function getStoreMetricsByName(storeName: string): Promise<StoreMetrics | null> {
  const allMetrics = await fetchStoreMetrics();
  return allMetrics.find(m => m.storeName === storeName) || null;
}

/**
 * Gets all metrics sorted by submissionsPer100 (high to low)
 */
export async function getMetricsSortedByPerformance(): Promise<StoreMetrics[]> {
  const metrics = await fetchStoreMetrics();
  return metrics.sort((a, b) => b.submissionsPer100 - a.submissionsPer100);
}

/**
 * Gets the district totals from the "Total" row
 */
export async function getDistrictTotals(): Promise<StoreMetrics | null> {
  try {
    const response = await fetch(CSV_URL);
    if (!response.ok) {
      throw new Error(`Failed to fetch CSV: ${response.status}`);
    }

    const csvText = await response.text();
    const lines = csvText.trim().split('\n');

    if (lines.length < 2) {
      return null;
    }

    const headers = parseCSVLine(lines[0]);
    const headerMap: Record<string, number> = {};
    headers.forEach((header, index) => {
      headerMap[header.trim()] = index;
    });

    const storeNameIndex = findHeaderIndex(headerMap, HEADER_STORE_NAME);
    const countIndex = findHeaderIndex(headerMap, HEADER_COUNT);
    const trafficIndex = findHeaderIndex(headerMap, HEADER_TRAFFIC);

    // Find the Total row
    for (let i = 1; i < lines.length; i++) {
      const values = parseCSVLine(lines[i]);
      const storeName = values[storeNameIndex]?.trim() || '';

      if (storeName.toLowerCase() === 'total') {
        const submissions = parseNumber(values[countIndex]);
        const traffic = parseNumber(values[trafficIndex]);
        const submissionsPer100 = traffic > 0
          ? Math.round((submissions / traffic) * 100 * 100) / 100
          : 0;

        return {
          storeName: 'District Total',
          submissions,
          traffic,
          submissionsPer100,
        };
      }
    }

    return null;
  } catch (error) {
    console.error('Error fetching district totals:', error);
    return null;
  }
}

// ==================== ROSTER FUNCTIONS ====================

/**
 * Fetches roster data from the Roster tab
 * Format expected: Store Name, Mobile Expert Name (one row per mobile expert)
 */
export async function fetchRoster(): Promise<StoreRoster[]> {
  // Return cached data if still valid
  if (rosterCache && Date.now() - rosterCache.timestamp < CACHE_DURATION) {
    return rosterCache.data;
  }

  try {
    const response = await fetch(ROSTER_CSV_URL);
    if (!response.ok) {
      // If roster sheet doesn't exist yet, return empty rosters for all stores
      return STORE_LIST.map(storeName => ({ storeName, mobileExperts: [] }));
    }

    const csvText = await response.text();
    const roster = parseRosterCSV(csvText);

    // Cache the results
    rosterCache = { data: roster, timestamp: Date.now() };

    return roster;
  } catch (error) {
    console.error('Error fetching roster:', error);
    // Return empty rosters on error
    return STORE_LIST.map(storeName => ({ storeName, mobileExperts: [] }));
  }
}

/**
 * Parses roster CSV into StoreRoster array
 */
function parseRosterCSV(csvText: string): StoreRoster[] {
  const lines = csvText.trim().split('\n');
  const rosterMap = new Map<string, string[]>();

  // Initialize all stores with empty arrays
  STORE_LIST.forEach(store => rosterMap.set(store, []));

  // Skip header row if present
  const startIndex = lines[0]?.toLowerCase().includes('store') ? 1 : 0;

  for (let i = startIndex; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    if (values.length < 2) continue;

    const storeName = values[0]?.trim();
    const mobileExpertName = values[1]?.trim();

    if (storeName && mobileExpertName && rosterMap.has(storeName)) {
      const experts = rosterMap.get(storeName)!;
      if (!experts.includes(mobileExpertName)) {
        experts.push(mobileExpertName);
      }
    }
  }

  return Array.from(rosterMap.entries()).map(([storeName, mobileExperts]) => ({
    storeName,
    mobileExperts: mobileExperts.sort(),
  }));
}

/**
 * Gets roster for a specific store
 */
export async function getStoreRoster(storeName: string): Promise<string[]> {
  const allRosters = await fetchRoster();
  const storeRoster = allRosters.find(r => r.storeName === storeName);
  return storeRoster?.mobileExperts || [];
}

/**
 * Adds a mobile expert to a store's roster via Apps Script
 */
export async function addToRoster(storeName: string, mobileExpertName: string): Promise<boolean> {
  if (!APPS_SCRIPT_URL) {
    console.error('Apps Script URL not configured');
    return false;
  }

  try {
    const response = await fetch(APPS_SCRIPT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'addRoster',
        storeName,
        mobileExpertName,
      }),
    });

    if (response.ok) {
      // Clear cache to refresh data
      rosterCache = null;
      return true;
    }
    return false;
  } catch (error) {
    console.error('Error adding to roster:', error);
    return false;
  }
}

/**
 * Removes a mobile expert from a store's roster via Apps Script
 */
export async function removeFromRoster(storeName: string, mobileExpertName: string): Promise<boolean> {
  if (!APPS_SCRIPT_URL) {
    console.error('Apps Script URL not configured');
    return false;
  }

  try {
    const response = await fetch(APPS_SCRIPT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'removeRoster',
        storeName,
        mobileExpertName,
      }),
    });

    if (response.ok) {
      // Clear cache to refresh data
      rosterCache = null;
      return true;
    }
    return false;
  } catch (error) {
    console.error('Error removing from roster:', error);
    return false;
  }
}

// ==================== PASSWORD FUNCTIONS ====================

/**
 * Fetches passwords from the Passwords tab
 * Format expected: Store Name, Password
 */
export async function fetchPasswords(): Promise<StoreAuth[]> {
  // Return cached data if still valid
  if (passwordsCache && Date.now() - passwordsCache.timestamp < CACHE_DURATION) {
    return passwordsCache.data;
  }

  try {
    const response = await fetch(PASSWORDS_CSV_URL);
    if (!response.ok) {
      // If passwords sheet doesn't exist, return defaults
      return STORE_LIST.map(storeName => ({ storeName, password: DEFAULT_STORE_PASSWORD }));
    }

    const csvText = await response.text();
    const passwords = parsePasswordsCSV(csvText);

    // Cache the results
    passwordsCache = { data: passwords, timestamp: Date.now() };

    return passwords;
  } catch (error) {
    console.error('Error fetching passwords:', error);
    // Return defaults on error
    return STORE_LIST.map(storeName => ({ storeName, password: DEFAULT_STORE_PASSWORD }));
  }
}

/**
 * Parses passwords CSV into StoreAuth array
 */
function parsePasswordsCSV(csvText: string): StoreAuth[] {
  const lines = csvText.trim().split('\n');
  const passwordMap = new Map<string, string>();

  // Initialize all stores with default password
  STORE_LIST.forEach(store => passwordMap.set(store, DEFAULT_STORE_PASSWORD));

  // Skip header row if present
  const startIndex = lines[0]?.toLowerCase().includes('store') ? 1 : 0;

  for (let i = startIndex; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    if (values.length < 2) continue;

    const storeName = values[0]?.trim();
    const password = values[1]?.trim();

    if (storeName && password && passwordMap.has(storeName)) {
      passwordMap.set(storeName, password);
    }
  }

  return Array.from(passwordMap.entries()).map(([storeName, password]) => ({
    storeName,
    password,
  }));
}

/**
 * Gets password for a specific store
 */
export async function getStorePassword(storeName: string): Promise<string> {
  const allPasswords = await fetchPasswords();
  const storeAuth = allPasswords.find(p => p.storeName === storeName);
  return storeAuth?.password || DEFAULT_STORE_PASSWORD;
}

/**
 * Verifies a store password
 */
export async function verifyStorePassword(storeName: string, password: string): Promise<boolean> {
  const correctPassword = await getStorePassword(storeName);
  return password === correctPassword;
}

/**
 * Updates a store password via Apps Script
 */
export async function updateStorePassword(storeName: string, newPassword: string): Promise<boolean> {
  if (!APPS_SCRIPT_URL) {
    console.error('Apps Script URL not configured');
    return false;
  }

  try {
    const response = await fetch(APPS_SCRIPT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'updatePassword',
        storeName,
        password: newPassword,
      }),
    });

    if (response.ok) {
      // Clear cache to refresh data
      passwordsCache = null;
      return true;
    }
    return false;
  } catch (error) {
    console.error('Error updating password:', error);
    return false;
  }
}

/**
 * Resets a store password to default via Apps Script
 */
export async function resetStorePassword(storeName: string): Promise<boolean> {
  return updateStorePassword(storeName, DEFAULT_STORE_PASSWORD);
}

// ==================== UTILITY FUNCTIONS ====================

/**
 * Clears all caches (call after updates)
 */
export function clearCache() {
  metricsCache = null;
  rosterCache = null;
  passwordsCache = null;
}

/**
 * Get list of all stores
 */
export function getStoreList(): string[] {
  return STORE_LIST;
}
