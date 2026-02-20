/**
 * Seed data generator for Habit Entries.
 * Creates 30 days of realistic habit tracking data per user
 * with varied consistency levels.
 */
import { SeedUser } from './users';
import { SeedCategory, SeedCategoryItem } from './categories';

export interface SeedEntry {
  uid: string;
  dayIndex: number;
  habitId: string;
  value: boolean | number;
  updatedAt: Date;
}

/** Simple seeded pseudo-random number generator for deterministic but varied data */
const seededRandom = (seed: number): number => {
  const x = Math.sin(seed * 9301 + 49297) * 49297;
  return x - Math.floor(x);
};

/**
 * Generates all habit entries for all users across 30 days.
 * Each user is assigned a consistency factor (0.3–0.95) to simulate
 * realistic tracking behavior.
 */
export const generateEntries = (
  users: SeedUser[],
  userCategories: Map<string, SeedCategory[]>,
): SeedEntry[] => {
  const entries: SeedEntry[] = [];
  const DAYS_TO_SEED = 30;

  for (let userIdx = 0; userIdx < users.length; userIdx++) {
    const user = users[userIdx];
    const categories = userCategories.get(user.uid) || [];

    // Deterministic consistency per user (0.3 to 0.95)
    const consistency = 0.3 + seededRandom(userIdx + 1000) * 0.65;

    // Some users gradually improve, some start strong and decline
    const trend = seededRandom(userIdx + 2000) > 0.5 ? 'improving' : 'declining';

    for (let day = 0; day < DAYS_TO_SEED; day++) {
      const dayFactor = trend === 'improving'
        ? consistency + (day / DAYS_TO_SEED) * 0.15
        : consistency - (day / DAYS_TO_SEED) * 0.1;

      const effectiveConsistency = Math.max(0.1, Math.min(0.98, dayFactor));

      for (const cat of categories) {
        for (const item of cat.items) {
          const entry = generateSingleEntry(
            user.uid, day, item, effectiveConsistency, userIdx, day,
          );
          entries.push(entry);
        }
      }
    }
  }

  return entries;
};

/** Generates a single habit entry with realistic value */
const generateSingleEntry = (
  uid: string,
  dayIndex: number,
  item: SeedCategoryItem,
  consistency: number,
  userSeed: number,
  daySeed: number,
): SeedEntry => {
  const rng = seededRandom(userSeed * 1000 + daySeed * 100 + item.id.charCodeAt(0));
  const performed = rng < consistency;

  let value: boolean | number;
  if (item.type === 'boolean') {
    value = performed;
  } else {
    // Number values: pages read (1–25), minutes (5–60), amounts, rakaat, etc.
    value = performed
      ? Math.floor(seededRandom(userSeed + daySeed + 500) * 20) + 1
      : 0;
  }

  return {
    uid,
    dayIndex,
    habitId: item.id,
    value,
    updatedAt: new Date(),
  };
};
