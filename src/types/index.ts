// User session types (Google Sheets based)
export type UserRole = 'mobile_expert' | 'store' | 'dm';

export interface UserSession {
  role: UserRole;
  storeName: string;
  mobileExpertName?: string;
}

// Store metrics from CSV
export interface StoreMetrics {
  storeName: string;
  submissions: number;
  traffic: number;
  submissionsPer100: number;
}

// Store roster (from Google Sheet)
export interface StoreRoster {
  storeName: string;
  mobileExperts: string[];
}

// Photo submission
export interface Submission {
  id: string;
  storeName: string;
  mobileExpertName: string;
  imageData: string;
  timestamp: Date;
}

// Store password (from Google Sheet)
export interface StoreAuth {
  storeName: string;
  password: string;
}
