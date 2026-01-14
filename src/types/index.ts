import type { District } from '../config';

// User session types (Google Sheets based)
export type UserRole = 'mobile_expert' | 'store' | 'dm';

export interface UserSession {
  role: UserRole;
  district: District;
  storeName: string;
  mobileExpertName?: string;
}

// Store metrics from CSV
export interface StoreMetrics {
  storeName: string;
  district: District;
  submissions: number;
  traffic: number;
  submissionsPer100: number;
}

// Store roster (from Google Sheet)
export interface StoreRoster {
  storeName: string;
  district: District;
  mobileExperts: string[];
}

// Photo from Google Drive/Sheet
export interface Photo {
  storeName: string;
  district: District;
  mobileExpert: string;
  date: string;
  time: string;
  fileName: string;
  fileUrl: string;
  fileId: string;
  deleted?: boolean;
  featuredStatus?: string; // '', 'pending', 'approved', 'rejected'
  featuredBy?: string;
  photoType?: string; // 'mobile_expert', 'team', 'dm'
}

// Store password (from Google Sheet)
export interface StoreAuth {
  storeName: string;
  district: District;
  password: string;
}

export interface StoreEntry {
  storeName: string;
  district: District;
}
