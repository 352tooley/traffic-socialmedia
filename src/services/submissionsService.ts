import {
  collection,
  addDoc,
  query,
  where,
  getDocs,
  orderBy,
  Timestamp,
} from 'firebase/firestore';
import type { DocumentData } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from './firebase';
import type { Submission, RepStats } from '../types';

const SUBMISSIONS_COLLECTION = 'submissions';

/**
 * Uploads an image to Firebase Storage and returns the download URL
 */
export async function uploadImage(
  file: File | Blob,
  storeName: string,
  repName: string
): Promise<string> {
  const timestamp = Date.now();
  const fileName = `${storeName}/${repName}_${timestamp}.jpg`;
  const storageRef = ref(storage, `submissions/${fileName}`);

  await uploadBytes(storageRef, file);
  const downloadUrl = await getDownloadURL(storageRef);

  return downloadUrl;
}

/**
 * Creates a new submission document in Firestore
 */
export async function createSubmission(
  storeName: string,
  repName: string,
  imageUrl: string
): Promise<string> {
  const docRef = await addDoc(collection(db, SUBMISSIONS_COLLECTION), {
    storeName,
    repName,
    imageUrl,
    timestamp: Timestamp.now(),
  });

  return docRef.id;
}

/**
 * Gets all submissions for a specific store
 */
export async function getSubmissionsByStore(storeName: string): Promise<Submission[]> {
  const q = query(
    collection(db, SUBMISSIONS_COLLECTION),
    where('storeName', '==', storeName),
    orderBy('timestamp', 'desc')
  );

  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => docToSubmission(doc.id, doc.data()));
}

/**
 * Gets all submissions (for DM view)
 */
export async function getAllSubmissions(): Promise<Submission[]> {
  const q = query(
    collection(db, SUBMISSIONS_COLLECTION),
    orderBy('timestamp', 'desc')
  );

  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => docToSubmission(doc.id, doc.data()));
}

/**
 * Gets submissions filtered by store, rep name, and date range
 */
export async function getFilteredSubmissions(
  storeName?: string,
  repName?: string,
  startDate?: Date,
  endDate?: Date
): Promise<Submission[]> {
  let q = query(collection(db, SUBMISSIONS_COLLECTION), orderBy('timestamp', 'desc'));

  const constraints: any[] = [];

  if (storeName) {
    constraints.push(where('storeName', '==', storeName));
  }

  if (startDate) {
    constraints.push(where('timestamp', '>=', Timestamp.fromDate(startDate)));
  }

  if (endDate) {
    // Set end date to end of day
    const endOfDay = new Date(endDate);
    endOfDay.setHours(23, 59, 59, 999);
    constraints.push(where('timestamp', '<=', Timestamp.fromDate(endOfDay)));
  }

  if (constraints.length > 0 || storeName) {
    q = query(
      collection(db, SUBMISSIONS_COLLECTION),
      ...constraints,
      orderBy('timestamp', 'desc')
    );
  }

  const snapshot = await getDocs(q);
  let submissions = snapshot.docs.map((doc) => docToSubmission(doc.id, doc.data()));

  // Filter by repName client-side (Firestore doesn't support partial string matching)
  if (repName) {
    const lowerRepName = repName.toLowerCase();
    submissions = submissions.filter((s) =>
      s.repName.toLowerCase().includes(lowerRepName)
    );
  }

  return submissions;
}

/**
 * Gets rep performance stats for a store
 */
export async function getRepStatsByStore(storeName: string): Promise<RepStats[]> {
  const submissions = await getSubmissionsByStore(storeName);

  // Group by rep
  const repCounts: Record<string, number> = {};
  submissions.forEach((s) => {
    repCounts[s.repName] = (repCounts[s.repName] || 0) + 1;
  });

  const totalSubmissions = submissions.length;

  // Convert to RepStats array
  const stats: RepStats[] = Object.entries(repCounts).map(([repName, count]) => ({
    repName,
    submissions: count,
    percentOfStore: totalSubmissions > 0
      ? Math.round((count / totalSubmissions) * 100 * 100) / 100
      : 0,
  }));

  // Sort by submissions high to low
  return stats.sort((a, b) => b.submissions - a.submissions);
}

/**
 * Gets total submission count from Firestore for a store
 */
export async function getFirestoreSubmissionCount(storeName: string): Promise<number> {
  const submissions = await getSubmissionsByStore(storeName);
  return submissions.length;
}

/**
 * Converts Firestore document to Submission type
 */
function docToSubmission(id: string, data: DocumentData): Submission {
  return {
    id,
    storeName: data.storeName,
    repName: data.repName,
    imageUrl: data.imageUrl,
    timestamp: data.timestamp?.toDate() || new Date(),
  };
}
