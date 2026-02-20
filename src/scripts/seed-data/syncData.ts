/**
 * Seed data generator for SyncData.
 * Generates a SyncData record for each user with varied themes and current days.
 */
import { SeedUser } from './users';

export interface SeedSyncData {
  uid: string;
  trackerState: Record<string, any>;
  dayUpdatedAt: Record<string, string>;
  customHabits: any[];
  customHabitsUpdatedAt: string;
  currentDay: number;
  theme: string;
  lastSynced: Date;
}

const THEMES = ['dark', 'light', 'dark', 'dark']; // 75% dark preference

/**
 * Generates SyncData for every user.
 * Varies the currentDay and theme for realism.
 */
export const generateSyncData = (users: SeedUser[]): SeedSyncData[] => {
  return users.map((user, index) => {
    const currentDay = Math.min(29, Math.max(0, index % 30));
    const theme = THEMES[index % THEMES.length];

    // Build dayUpdatedAt with sequential ISO timestamps
    const dayUpdatedAt: Record<string, string> = {};
    for (let d = 0; d <= currentDay; d++) {
      const date = new Date();
      date.setDate(date.getDate() - (currentDay - d));
      dayUpdatedAt[String(d)] = date.toISOString();
    }

    return {
      uid: user.uid,
      trackerState: {},
      dayUpdatedAt,
      customHabits: [],
      customHabitsUpdatedAt: new Date().toISOString(),
      currentDay,
      theme,
      lastSynced: new Date(),
    };
  });
};
