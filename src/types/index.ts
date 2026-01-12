// User types
export type UserRole = 'store' | 'dm';

export interface UserProfile {
  uid: string;
  role: UserRole;
  storeName: string;
  email?: string;
}

// Store metrics from CSV
export interface StoreMetrics {
  storeName: string;
  submissions: number;
  traffic: number;
  submissionsPer100: number;
}

// Submission from Firestore
export interface Submission {
  id?: string;
  storeName: string;
  repName: string;
  imageUrl: string;
  timestamp: Date;
}

// Rep performance stats
export interface RepStats {
  repName: string;
  submissions: number;
  percentOfStore: number;
}

// CSV row parsed
export interface CSVRow {
  [key: string]: string;
}
