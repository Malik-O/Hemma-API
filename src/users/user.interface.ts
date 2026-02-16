/** Shape of a user stored in the system */
export interface StoredUser {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string | null;
  passwordHash: string | null; // null for Google OAuth users
  provider: 'google' | 'local';
  createdAt: string;
  updatedAt: string;
}

/** Shape of the sync data associated with a user */
export interface UserSyncData {
  trackerState: Record<string, unknown>;
  customHabits: unknown[];
  currentDay: number;
  theme: string;
  lastSynced: string;
}
