import { CSV_URL } from '../config';
import type { StoreMetrics } from '../types';

// Header names to look for (case-insensitive matching)
const HEADER_STORE_NAME = 'Store Name';
const HEADER_COUNT = 'Count';
const HEADER_TRAFFIC = 'Traffic';

/**
 * Fetches and parses the CSV from Google Sheets
 * Maps columns by header name, not index
 */
export async function fetchStoreMetrics(): Promise<StoreMetrics[]> {
  try {
    const response = await fetch(CSV_URL);
    if (!response.ok) {
      throw new Error(`Failed to fetch CSV: ${response.status}`);
    }

    const csvText = await response.text();
    return parseCSV(csvText);
  } catch (error) {
    console.error('Error fetching store metrics:', error);
    throw error;
  }
}

/**
 * Parses CSV text into StoreMetrics array
 * Handles header mapping and excludes the "Total" row
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

  // Parse data rows (skip header row)
  const metrics: StoreMetrics[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);

    if (values.length === 0) continue;

    const storeName = values[storeNameIndex]?.trim() || '';

    // Skip the "Total" row
    if (storeName.toLowerCase() === 'total' || storeName === '') {
      continue;
    }

    const submissions = parseNumber(values[countIndex]);
    const traffic = parseNumber(values[trafficIndex]);

    // Compute submissions per 100 (do not trust the Per 100 column)
    const submissionsPer100 = traffic > 0
      ? Math.round((submissions / traffic) * 100 * 100) / 100
      : 0;

    metrics.push({
      storeName,
      submissions,
      traffic,
      submissionsPer100,
    });
  }

  return metrics;
}

/**
 * Finds header index, case-insensitive
 */
function findHeaderIndex(headerMap: Record<string, number>, headerName: string): number {
  // Try exact match first
  if (headerMap[headerName] !== undefined) {
    return headerMap[headerName];
  }

  // Try case-insensitive match
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

  // Remove commas and other formatting
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
