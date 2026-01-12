// User session types (localStorage based)
export type UserRole = 'rep' | 'store' | 'dm';

export interface UserSession {
  role: UserRole;
  storeName: string;
  repName?: string;
}

// Store metrics from CSV
export interface StoreMetrics {
  storeName: string;
  submissions: number;
  traffic: number;
  submissionsPer100: number;
}

// Store roster
export interface StoreRoster {
  storeName: string;
  reps: string[];
}

// Photo submission (local tracking)
export interface Submission {
  id: string;
  storeName: string;
  repName: string;
  imageData: string; // base64 or blob URL
  timestamp: Date;
}

// Store password management
export interface StoreAuth {
  storeName: string;
  password: string;
}

// Rep performance stats
export interface RepStats {
  repName: string;
  submissions: number;
  percentOfStore: number;
}
