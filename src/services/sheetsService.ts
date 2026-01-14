import { CSV_URL, ROSTER_CSV_URL, PASSWORDS_CSV_URL, APPS_SCRIPT_URL, STORE_LIST, DEFAULT_STORE_PASSWORD } from '../config';
import type { StoreMetrics, StoreRoster, StoreAuth, Photo } from '../types';

// Header names to look for (case-insensitive matching)
const HEADER_STORE_NAME = 'Store Name';
const HEADER_COUNT = 'Count';
const HEADER_TRAFFIC = 'Traffic';

// Cache to prevent repeated fetches
let metricsCache: { data: StoreMetrics[]; timestamp: number } | null = null;
let passwordsCache: { data: StoreAuth[]; timestamp: number } | null = null;
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

  // Validate required headers exist
  const storeNameIndex = findHeaderIndex(headerMap, HEADER_STORE_NAME);
  const countIndex = findHeaderIndex(headerMap, HEADER_COUNT);
  const trafficIndex = findHeaderIndex(headerMap, HEADER_TRAFFIC);

  if (storeNameIndex === -1 || countIndex === -1 || trafficIndex === -1) {
    console.error('Missing required headers. Found:', Object.keys(headerMap));
    throw new Error('CSV missing required headers: Store Name, Count, or Traffic');
  }

  // Use a Map to deduplicate - LAST occurrence wins (newest data)
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

    const submissions = parseNumber(values[countIndex]);
    const traffic = parseNumber(values[trafficIndex]);

    // Compute submissions per 100
    const submissionsPer100 = traffic > 0
      ? Math.round((submissions / traffic) * 100 * 100) / 100
      : 0;

    // Always overwrite - last/newest entry wins
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
      return STORE_LIST.map(store => ({ storeName: store, mobileExperts: [] }));
    }

    const csvText = await response.text();
    return parseRosterCSV(csvText);
  } catch (error) {
    console.error('Error fetching roster:', error);
    return STORE_LIST.map(store => ({ storeName: store, mobileExperts: [] }));
  }
}

/**
 * Parses roster CSV into StoreRoster array (fallback only)
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
}

/**
 * Get list of all stores
 */
export function getStoreList(): string[] {
  return STORE_LIST;
}

// ==================== PHOTO FUNCTIONS ====================

/**
 * Uploads a photo to Google Drive via Apps Script
 */
export async function uploadPhoto(
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
export async function getPhotos(storeName?: string, includeDeleted: boolean = false): Promise<Photo[]> {
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
export async function getMobileExpertStats(storeName?: string, currentMonthOnly: boolean = true): Promise<MobileExpertStats[]> {
  // Include deleted photos so counts persist after deletion
  const photos = await getPhotos(storeName, true);

  // Filter to current month if requested
  const filteredPhotos = currentMonthOnly
    ? photos.filter((photo) => {
        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();
        
        const parsed = parseDateForFiltering(photo.date);
        if (!parsed) return false;
        
        return parsed.month === currentMonth && parsed.year === currentYear;
      })
    : photos;

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
