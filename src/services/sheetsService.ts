import { CSV_URL, ROSTER_CSV_URL, PASSWORDS_CSV_URL, APPS_SCRIPT_URL, STORE_LIST, DEFAULT_STORE_PASSWORD, DISTRICT_STORES, type District, getStoreList as getDistrictStores } from '../config';
import type { StoreMetrics, StoreRoster, StoreAuth, Photo, StoreEntry } from '../types';

// Header names to look for (case-insensitive matching)
// Supports multiple naming conventions
const HEADER_DISTRICT = 'District';
const HEADER_STORE_NAME_VARIANTS = ['Store Name', 'store', 'storeName'];
const HEADER_COUNT_VARIANTS = ['Count', 'count', 'submissions', 'Submissions'];
const HEADER_TRAFFIC_VARIANTS = ['Traffic', 'traffic', 'exitTraffic', 'exittraffic'];

// Cache to prevent repeated fetches
let metricsCache: { data: StoreMetrics[]; timestamp: number } | null = null;
let passwordsCache: { data: StoreAuth[]; timestamp: number } | null = null;
let storeCache: { data: StoreEntry[]; timestamp: number } | null = null;
const CACHE_DURATION = 30000; // 30 second cache for fresher data

/**
 * Fetches and parses the CSV from Google Sheets
 * Returns only current data (deduped by store name, keeping NEWEST entry)
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
 * Deduplicates by store name - keeps only the LAST/NEWEST occurrence of each store
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

  // Validate required headers exist (supports multiple naming conventions)
  const districtIndex = findHeaderIndex(headerMap, HEADER_DISTRICT);
  const storeNameIndex = findHeaderIndex(headerMap, HEADER_STORE_NAME_VARIANTS);
  const countIndex = findHeaderIndex(headerMap, HEADER_COUNT_VARIANTS);
  const trafficIndex = findHeaderIndex(headerMap, HEADER_TRAFFIC_VARIANTS);

  if (storeNameIndex === -1 || trafficIndex === -1) {
    console.error('Missing required headers. Found:', Object.keys(headerMap));
    throw new Error('CSV missing required headers: store/Store Name or traffic/exitTraffic');
  }

  // Use a Map to deduplicate - LAST occurrence wins (newest data)
  const storeMap = new Map<string, StoreMetrics>();

  // Parse data rows (skip header row)
  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);

    if (values.length === 0) continue;

    const district = (districtIndex !== -1 ? values[districtIndex]?.trim() : 'West') as District || 'West';
    const storeName = values[storeNameIndex]?.trim() || '';

    // Skip empty rows and "Total" row
    if (storeName.toLowerCase() === 'total' || storeName === '') {
      continue;
    }

    // Count column may not exist - default to 0 if missing
    const submissions = countIndex !== -1 ? parseNumber(values[countIndex]) : 0;
    const traffic = parseNumber(values[trafficIndex]);

    // Compute submissions per 100
    const submissionsPer100 = traffic > 0
      ? Math.round((submissions / traffic) * 100 * 100) / 100
      : 0;

    // Always overwrite - last/newest entry wins
    storeMap.set(storeName, {
      storeName,
      district,
      submissions,
      traffic,
      submissionsPer100,
    });
  }

  return Array.from(storeMap.values());
}

/**
 * Finds header index, case-insensitive, supports multiple name variants
 */
function findHeaderIndex(headerMap: Record<string, number>, headerNames: string | string[]): number {
  const names = Array.isArray(headerNames) ? headerNames : [headerNames];
  
  for (const headerName of names) {
    if (headerMap[headerName] !== undefined) {
      return headerMap[headerName];
    }

    const lowerName = headerName.toLowerCase();
    for (const [key, value] of Object.entries(headerMap)) {
      if (key.toLowerCase() === lowerName) {
        return value;
      }
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

    const storeNameIndex = findHeaderIndex(headerMap, HEADER_STORE_NAME_VARIANTS);
    const countIndex = findHeaderIndex(headerMap, HEADER_COUNT_VARIANTS);
    const trafficIndex = findHeaderIndex(headerMap, HEADER_TRAFFIC_VARIANTS);

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
          district: 'West' as District,
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

/**
 * Gets the traffic data date from the Traffic Log sheet
 * This is the "through" date extracted from the traffic PDF by n8n
 */
export async function getTrafficDataDate(): Promise<string | null> {
  if (!APPS_SCRIPT_URL) {
    console.warn('Apps Script URL not configured');
    return null;
  }

  try {
    const response = await fetch(APPS_SCRIPT_URL, {
      method: 'POST',
      redirect: 'follow',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action: 'getTrafficDataDate' }),
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch traffic data date: ${response.status}`);
    }

    const result = await response.json();
    if (result.success && result.dataDate) {
      return result.dataDate;
    }
    return null;
  } catch (error) {
    console.error('Error fetching traffic data date:', error);
    return null;
  }
}

/**
 * Calculates the monthly goal for a store based on traffic trend
 * Formula: (traffic / daysElapsed) * totalDaysInMonth * 0.03
 * Goal is 3 submissions per 100 traffic
 */
export function calculateMonthlyGoal(traffic: number, dataDate: string | null): number {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();

  // Get total days in current month
  const totalDaysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

  // Parse the data date to get days elapsed
  let daysElapsed = now.getDate(); // Default to current day

  if (dataDate) {
    // Parse "January 10, 2026" format
    const match = dataDate.match(/([A-Za-z]+)\s+(\d+),\s+(\d+)/);
    if (match) {
      const months = ['january', 'february', 'march', 'april', 'may', 'june',
                      'july', 'august', 'september', 'october', 'november', 'december'];
      const monthIndex = months.indexOf(match[1].toLowerCase());
      const day = parseInt(match[2]);
      const year = parseInt(match[3]);

      // Only use this date if it's in the current month
      if (year === currentYear && monthIndex === currentMonth) {
        daysElapsed = day;
      }
    }
  }

  // Avoid division by zero
  if (daysElapsed === 0) daysElapsed = 1;

  // Calculate traffic trend for the month
  const trafficTrend = (traffic / daysElapsed) * totalDaysInMonth;

  // Goal is 3 submissions per 100 traffic
  const goal = Math.round(trafficTrend * 0.03);

  return goal;
}

// ==================== STORE LIST FUNCTIONS ====================

function buildFallbackStoreEntries(): StoreEntry[] {
  return Object.entries(DISTRICT_STORES).flatMap(([district, stores]) =>
    stores.map((storeName) => ({
      district: district as District,
      storeName,
    }))
  );
}

/**
 * Fetches store list entries (district + store name) from Apps Script
 */
export async function fetchStoreEntries(): Promise<StoreEntry[]> {
  if (storeCache && Date.now() - storeCache.timestamp < CACHE_DURATION) {
    return storeCache.data;
  }

  if (!APPS_SCRIPT_URL) {
    const fallback = buildFallbackStoreEntries();
    storeCache = { data: fallback, timestamp: Date.now() };
    return fallback;
  }

  try {
    const response = await fetch(APPS_SCRIPT_URL, {
      method: 'POST',
      redirect: 'follow',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify({ action: 'getStoreList' }),
    });

    const result = await response.json();
    if (result.success && Array.isArray(result.stores)) {
      const stores = result.stores
        .map((store: any) => ({
          district: (store.district || 'West') as District,
          storeName: store.storeName || store.name || '',
        }))
        .filter((store: StoreEntry) => store.storeName);

      storeCache = { data: stores, timestamp: Date.now() };
      return stores;
    }
  } catch (error) {
    console.error('Error fetching store list:', error);
  }

  const fallback = buildFallbackStoreEntries();
  storeCache = { data: fallback, timestamp: Date.now() };
  return fallback;
}

/**
 * Fetches store names, optionally filtered by district
 */
export async function fetchStoreList(district?: District): Promise<string[]> {
  const stores = await fetchStoreEntries();
  const filtered = district ? stores.filter((store) => store.district === district) : stores;
  const unique = new Set<string>();
  filtered.forEach((store) => unique.add(store.storeName));
  return Array.from(unique).sort();
}

/**
 * Adds a store to a district via Apps Script
 */
export async function addStore(district: District, storeName: string): Promise<boolean> {
  if (!APPS_SCRIPT_URL) {
    console.error('Apps Script URL not configured');
    return false;
  }

  try {
    const response = await fetch(APPS_SCRIPT_URL, {
      method: 'POST',
      redirect: 'follow',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify({
        action: 'addStore',
        district,
        storeName,
      }),
    });

    const result = await response.json();
    if (result.success) {
      storeCache = null;
      passwordsCache = null;
      return true;
    }
    console.error('Apps Script error:', result.error);
    return false;
  } catch (error) {
    console.error('Error adding store:', error);
    return false;
  }
}

/**
 * Removes a store from a district via Apps Script
 */
export async function removeStore(district: District, storeName: string): Promise<boolean> {
  if (!APPS_SCRIPT_URL) {
    console.error('Apps Script URL not configured');
    return false;
  }

  try {
    const response = await fetch(APPS_SCRIPT_URL, {
      method: 'POST',
      redirect: 'follow',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify({
        action: 'removeStore',
        district,
        storeName,
      }),
    });

    const result = await response.json();
    if (result.success) {
      storeCache = null;
      passwordsCache = null;
      return true;
    }
    console.error('Apps Script error:', result.error);
    return false;
  } catch (error) {
    console.error('Error removing store:', error);
    return false;
  }
}

// ==================== ROSTER FUNCTIONS ====================

/**
 * Fetches roster data directly from Apps Script (no caching delays)
 * Falls back to CSV if Apps Script not configured
 */
export async function fetchRoster(storeName?: string): Promise<StoreRoster[]> {
  // Try Apps Script first for real-time data
  if (APPS_SCRIPT_URL) {
    try {
      const response = await fetch(APPS_SCRIPT_URL, {
        method: 'POST',
        redirect: 'follow',
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify({
          action: 'getRoster',
          storeName: storeName || '',
        }),
      });

      const result = await response.json();
      if (result.success) {
        return result.roster;
      }
    } catch (error) {
      console.error('Error fetching roster from Apps Script:', error);
    }
  }

  // Fallback to CSV (may have caching delays)
  try {
    const response = await fetch(ROSTER_CSV_URL);
    if (!response.ok) {
      return STORE_LIST.map(store => ({ storeName: store, district: 'West' as District, mobileExperts: [] }));
    }

    const csvText = await response.text();
    return parseRosterCSV(csvText);
  } catch (error) {
    console.error('Error fetching roster:', error);
    return STORE_LIST.map(store => ({ storeName: store, district: 'West' as District, mobileExperts: [] }));
  }
}

/**
 * Parses roster CSV into StoreRoster array (fallback only)
 */
function parseRosterCSV(csvText: string): StoreRoster[] {
  const lines = csvText.trim().split('\n');
  const rosterMap = new Map<string, { district: District; mobileExperts: string[] }>();

  // Initialize all stores with empty arrays
  STORE_LIST.forEach(store => rosterMap.set(store, { 
    district: 'West' as District, 
    mobileExperts: [] 
  }));

  if (lines.length < 1) return Array.from(rosterMap.entries()).map(([storeName, data]) => ({
    storeName,
    district: data.district,
    mobileExperts: data.mobileExperts,
  }));

  // Parse headers to determine column indices
  const headers = parseCSVLine(lines[0]);
  const headerMap: Record<string, number> = {};
  headers.forEach((header, index) => {
    headerMap[header.trim().toLowerCase()] = index;
  });

  // Find column indices (case-insensitive)
  const districtIndex = headerMap['district'] ?? -1;
  const storeIndex = headerMap['store name'] ?? headerMap['store'] ?? headerMap['storename'] ?? -1;
  const meIndex = headerMap['mobile expert name'] ?? headerMap['mobile expert'] ?? headerMap['name'] ?? headerMap['mobileexpertname'] ?? -1;

  // If we can't find headers, try position-based parsing
  const useHeaders = storeIndex !== -1 && meIndex !== -1;
  const startIndex = useHeaders || lines[0]?.toLowerCase().includes('store') ? 1 : 0;

  for (let i = startIndex; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    if (values.length < 2) continue;

    let district: District;
    let storeName: string;
    let mobileExpertName: string;

    if (useHeaders) {
      // Use header-based indices
      district = (districtIndex !== -1 ? values[districtIndex]?.trim() : 'West') as District || 'West';
      storeName = values[storeIndex]?.trim() || '';
      mobileExpertName = values[meIndex]?.trim() || '';
    } else {
      // Fall back to position-based (check if district column exists)
      const hasDistrict = values.length >= 3 && values[0]?.trim().toLowerCase() !== '';
      district = (hasDistrict ? values[0]?.trim() : 'West') as District || 'West';
      storeName = hasDistrict ? values[1]?.trim() : values[0]?.trim();
      mobileExpertName = hasDistrict ? values[2]?.trim() : values[1]?.trim();
    }

    if (storeName && mobileExpertName) {
      if (!rosterMap.has(storeName)) {
        rosterMap.set(storeName, { district, mobileExperts: [] });
      }
      const storeData = rosterMap.get(storeName)!;
      if (!storeData.mobileExperts.includes(mobileExpertName)) {
        storeData.mobileExperts.push(mobileExpertName);
      }
    }
  }

  return Array.from(rosterMap.entries()).map(([storeName, data]) => ({
    storeName,
    district: data.district,
    mobileExperts: data.mobileExperts.sort(),
  }));
}

/**
 * Gets roster for a specific store (real-time from Apps Script)
 */
export async function getStoreRoster(storeName: string): Promise<string[]> {
  const allRosters = await fetchRoster(storeName);
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
      redirect: 'follow',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify({
        action: 'addRoster',
        storeName,
        mobileExpertName,
      }),
    });

    const result = await response.json();
    if (result.success) {
      return true;
    }
    console.error('Apps Script error:', result.error);
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
      redirect: 'follow',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify({
        action: 'removeRoster',
        storeName,
        mobileExpertName,
      }),
    });

    const result = await response.json();
    if (result.success) {
      return true;
    }
    console.error('Apps Script error:', result.error);
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
      return STORE_LIST.map(storeName => ({ storeName, district: 'West' as District, password: DEFAULT_STORE_PASSWORD }));
    }

    const csvText = await response.text();
    const passwords = parsePasswordsCSV(csvText);

    // Cache the results
    passwordsCache = { data: passwords, timestamp: Date.now() };

    return passwords;
  } catch (error) {
    console.error('Error fetching passwords:', error);
    // Return defaults on error
    return STORE_LIST.map(storeName => ({ storeName, district: 'West' as District, password: DEFAULT_STORE_PASSWORD }));
  }
}

/**
 * Parses passwords CSV into StoreAuth array
 */
function parsePasswordsCSV(csvText: string): StoreAuth[] {
  const lines = csvText.trim().split('\n');
  const passwordMap = new Map<string, StoreAuth>();

  // Initialize all stores with default password
  STORE_LIST.forEach(store => passwordMap.set(store, { 
    storeName: store, 
    district: 'West' as District,
    password: DEFAULT_STORE_PASSWORD 
  }));

  // Skip header row if present
  const startIndex = lines[0]?.toLowerCase().includes('store') ? 1 : 0;

  for (let i = startIndex; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    if (values.length < 2) continue;

    // Check if we have district column (3 values) or old format (2 values)
    const hasDistrict = values.length >= 3;
    const district = (hasDistrict ? values[0]?.trim() : 'West') as District;
    const storeName = hasDistrict ? values[1]?.trim() : values[0]?.trim();
    const password = hasDistrict ? values[2]?.trim() : values[1]?.trim();

    if (storeName && password) {
      passwordMap.set(storeName, { storeName, district, password });
    }
  }

  return Array.from(passwordMap.values());
}

/**
 * Gets password for a specific store
 */
export async function getStorePassword(district: District, storeName: string): Promise<string> {
  const allPasswords = await fetchPasswords();
  const storeAuth = allPasswords.find(p => p.storeName === storeName && p.district === district);
  return storeAuth?.password || DEFAULT_STORE_PASSWORD;
}

/**
 * Verifies a store password
 */
export async function verifyStorePassword(district: District, storeName: string, password: string): Promise<boolean> {
  const correctPassword = await getStorePassword(district, storeName);
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
      redirect: 'follow',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify({
        action: 'updatePassword',
        storeName,
        password: newPassword,
      }),
    });

    const result = await response.json();
    if (result.success) {
      passwordsCache = null;
      return true;
    }
    console.error('Apps Script error:', result.error);
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

// ==================== NOTIFICATION FUNCTIONS ====================

/**
 * Gets the notification email for a store
 */
export async function getNotificationEmail(storeName: string): Promise<string> {
  if (!APPS_SCRIPT_URL) {
    return '';
  }

  try {
    const response = await fetch(APPS_SCRIPT_URL, {
      method: 'POST',
      redirect: 'follow',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify({
        action: 'getNotificationEmail',
        storeName,
      }),
    });

    const result = await response.json();
    return result.success ? result.email : '';
  } catch (error) {
    console.error('Error getting notification email:', error);
    return '';
  }
}

/**
 * Sets the notification email for a store
 */
export async function setNotificationEmail(storeName: string, email: string): Promise<boolean> {
  if (!APPS_SCRIPT_URL) {
    return false;
  }

  try {
    const response = await fetch(APPS_SCRIPT_URL, {
      method: 'POST',
      redirect: 'follow',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify({
        action: 'setNotificationEmail',
        storeName,
        email,
      }),
    });

    const result = await response.json();
    return result.success;
  } catch (error) {
    console.error('Error setting notification email:', error);
    return false;
  }
}

// ==================== UTILITY FUNCTIONS ====================

/**
 * Clears all caches (call after updates)
 */
export function clearCache() {
  metricsCache = null;
  passwordsCache = null;
  storeCache = null;
}

/**
 * Get list of all stores (optionally filtered by district)
 */
export function getStoreList(district?: District): string[] {
  if (!district) return STORE_LIST;
  return getDistrictStores(district);
}

// ==================== PHOTO FUNCTIONS ====================

/**
 * Uploads a photo to Google Drive via Apps Script
 */
export async function uploadPhoto(
  district: District,
  storeName: string,
  mobileExpertName: string,
  photoData: string,
  fileName: string
): Promise<{ success: boolean; fileUrl?: string; error?: string }> {
  if (!APPS_SCRIPT_URL) {
    return { success: false, error: 'Apps Script URL not configured' };
  }

  try {
    const response = await fetch(APPS_SCRIPT_URL, {
      method: 'POST',
      redirect: 'follow',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify({
        action: 'uploadPhoto',
        district,
        storeName,
        mobileExpertName,
        photoData,
        fileName,
      }),
    });

    const result = await response.json();
    return result;
  } catch (error) {
    console.error('Error uploading photo:', error);
    return { success: false, error: 'Upload failed' };
  }
}

/**
 * Gets photos for a store (or all photos if storeName is empty)
 * @param storeName - Filter by store name (empty for all)
 * @param includeDeleted - If true, includes soft-deleted photos (for counting uploads)
 */
export async function getPhotos(storeName?: string, includeDeleted: boolean = false, district?: District): Promise<Photo[]> {
  if (!APPS_SCRIPT_URL) {
    return [];
  }

  try {
    const response = await fetch(APPS_SCRIPT_URL, {
      method: 'POST',
      redirect: 'follow',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify({
        action: 'getPhotos',
        storeName: storeName || '',
        includeDeleted,
        district: district || '',
      }),
    });

    const result = await response.json();
    if (result.success) {
      return result.photos;
    }
    return [];
  } catch (error) {
    console.error('Error fetching photos:', error);
    return [];
  }
}

/**
 * Mobile expert upload statistics
 */
export interface MobileExpertStats {
  mobileExpert: string;
  storeName: string;
  uploadCount: number;
}

/**
 * Parses a date string in various formats and returns month (0-indexed) and year
 */
function parseDateForFiltering(dateStr: string): { month: number; year: number } | null {
  if (!dateStr) return null;
  
  // Try MM/dd/yyyy format first
  if (dateStr.includes('/')) {
    const parts = dateStr.split('/');
    if (parts.length >= 3) {
      const month = parseInt(parts[0], 10) - 1; // Convert to 0-indexed
      const year = parseInt(parts[2], 10);
      if (!isNaN(month) && !isNaN(year)) {
        return { month, year };
      }
    }
  }
  
  // Try ISO format (2026-01-14 or 2026-01-14T00:00:00.000Z)
  if (dateStr.includes('-')) {
    const date = new Date(dateStr);
    if (!isNaN(date.getTime())) {
      return { month: date.getMonth(), year: date.getFullYear() };
    }
  }
  
  // Try parsing as a Date object string
  const date = new Date(dateStr);
  if (!isNaN(date.getTime())) {
    return { month: date.getMonth(), year: date.getFullYear() };
  }
  
  return null;
}

/**
 * Gets upload stats for mobile experts, optionally filtered by store and current month
 * Always includes deleted photos to maintain accurate upload counts
 */
export async function getMobileExpertStats(storeName?: string, currentMonthOnly: boolean = true, district?: District): Promise<MobileExpertStats[]> {
  // Include deleted photos so counts persist after deletion
  const photos = await getPhotos(storeName, true, district);

  // Filter to ONLY mobile_expert photos (exclude team and DM photos for homepage)
  // Only count actual social media ticket uploads in reporting
  const socialMediaPhotos = photos.filter((photo) => {
    const photoType = photo.photoType || 'mobile_expert'; // backwards compatibility
    return photoType === 'mobile_expert';
  });

  // Filter to current month if requested
  const filteredPhotos = currentMonthOnly
    ? socialMediaPhotos.filter((photo) => {
        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();
        
        const parsed = parseDateForFiltering(photo.date);
        if (!parsed) return false;
        
        return parsed.month === currentMonth && parsed.year === currentYear;
      })
    : socialMediaPhotos;

  // Count uploads per mobile expert
  const statsMap = new Map<string, MobileExpertStats>();

  for (const photo of filteredPhotos) {
    const key = `${photo.storeName}-${photo.mobileExpert}`;
    const existing = statsMap.get(key);
    if (existing) {
      existing.uploadCount++;
    } else {
      statsMap.set(key, {
        mobileExpert: photo.mobileExpert,
        storeName: photo.storeName,
        uploadCount: 1,
      });
    }
  }

  // Convert to array and sort by upload count descending
  return Array.from(statsMap.values()).sort((a, b) => b.uploadCount - a.uploadCount);
}

/**
 * Deletes a photo from Google Drive
 */
export async function deletePhoto(fileId: string, storeName: string): Promise<boolean> {
  if (!APPS_SCRIPT_URL) {
    return false;
  }

  try {
    const response = await fetch(APPS_SCRIPT_URL, {
      method: 'POST',
      redirect: 'follow',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify({
        action: 'deletePhoto',
        fileId,
        storeName,
      }),
    });

    const result = await response.json();
    return result.success;
  } catch (error) {
    console.error('Error deleting photo:', error);
    return false;
  }
}

/**
 * Features a photo for DM approval (RSM recommends for homepage)
 */
export async function featurePhoto(fileId: string, featuredBy: string): Promise<boolean> {
  if (!APPS_SCRIPT_URL) {
    return false;
  }

  try {
    const response = await fetch(APPS_SCRIPT_URL, {
      method: 'POST',
      redirect: 'follow',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify({
        action: 'featurePhoto',
        fileId,
        featuredBy,
      }),
    });

    const result = await response.json();
    return result.success;
  } catch (error) {
    console.error('Error featuring photo:', error);
    return false;
  }
}

/**
 * Approves a photo for homepage display (DM only)
 */
export async function approvePhoto(fileId: string): Promise<boolean> {
  if (!APPS_SCRIPT_URL) {
    return false;
  }

  try {
    const response = await fetch(APPS_SCRIPT_URL, {
      method: 'POST',
      redirect: 'follow',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify({
        action: 'approvePhoto',
        fileId,
      }),
    });

    const result = await response.json();
    return result.success;
  } catch (error) {
    console.error('Error approving photo:', error);
    return false;
  }
}

/**
 * Rejects a photo from homepage (DM only)
 */
export async function rejectPhoto(fileId: string): Promise<boolean> {
  if (!APPS_SCRIPT_URL) {
    return false;
  }

  try {
    const response = await fetch(APPS_SCRIPT_URL, {
      method: 'POST',
      redirect: 'follow',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify({
        action: 'rejectPhoto',
        fileId,
      }),
    });

    const result = await response.json();
    return result.success;
  } catch (error) {
    console.error('Error rejecting photo:', error);
    return false;
  }
}

/**
 * Gets all pending photos for DM approval
 */
export async function getPendingPhotos(district?: District): Promise<Photo[]> {
  if (!APPS_SCRIPT_URL) {
    return [];
  }

  try {
    const response = await fetch(APPS_SCRIPT_URL, {
      method: 'POST',
      redirect: 'follow',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify({
        action: 'getPendingPhotos',
        district: district || '',
      }),
    });

    const result = await response.json();
    return result.success ? result.photos : [];
  } catch (error) {
    console.error('Error getting pending photos:', error);
    return [];
  }
}

/**
 * Gets all approved photos (currently on homepage)
 */
export async function getApprovedPhotos(district?: District): Promise<Photo[]> {
  if (!APPS_SCRIPT_URL) {
    return [];
  }

  try {
    const response = await fetch(APPS_SCRIPT_URL, {
      method: 'POST',
      redirect: 'follow',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify({
        action: 'getApprovedPhotos',
        district: district || '',
      }),
    });

    const result = await response.json();
    return result.success ? result.photos : [];
  } catch (error) {
    console.error('Error getting approved photos:', error);
    return [];
  }
}

/**
 * Unapproves a photo (removes from homepage rotation)
 */
export async function unapprovePhoto(fileId: string): Promise<boolean> {
  if (!APPS_SCRIPT_URL) {
    return false;
  }

  try {
    const response = await fetch(APPS_SCRIPT_URL, {
      method: 'POST',
      redirect: 'follow',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify({
        action: 'unapprovePhoto',
        fileId,
      }),
    });

    const result = await response.json();
    return result.success;
  } catch (error) {
    console.error('Error unapproving photo:', error);
    return false;
  }
}

/**
 * Uploads a team photo (RSM) - goes to DM approval
 */
export async function uploadTeamPhoto(
  district: District,
  storeName: string,
  uploadedBy: string,
  photoData: string,
  fileName: string
): Promise<{ success: boolean; fileUrl?: string; error?: string }> {
  if (!APPS_SCRIPT_URL) {
    return { success: false, error: 'Apps Script URL not configured' };
  }

  try {
    const response = await fetch(APPS_SCRIPT_URL, {
      method: 'POST',
      redirect: 'follow',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify({
        action: 'uploadTeamPhoto',
        district,
        storeName,
        uploadedBy,
        photoData,
        fileName,
      }),
    });

    const result = await response.json();
    return result;
  } catch (error) {
    console.error('Error uploading team photo:', error);
    return { success: false, error: 'Upload failed' };
  }
}

/**
 * Uploads a DM photo (auto-approved for homepage)
 */
export async function uploadDMPhoto(
  district: District,
  uploadedBy: string,
  photoData: string,
  fileName: string
): Promise<{ success: boolean; fileUrl?: string; error?: string }> {
  if (!APPS_SCRIPT_URL) {
    return { success: false, error: 'Apps Script URL not configured' };
  }

  try {
    const response = await fetch(APPS_SCRIPT_URL, {
      method: 'POST',
      redirect: 'follow',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify({
        action: 'uploadDMPhoto',
        district,
        uploadedBy,
        photoData,
        fileName,
      }),
    });

    const result = await response.json();
    return result;
  } catch (error) {
    console.error('Error uploading DM photo:', error);
    return { success: false, error: 'Upload failed' };
  }
}
