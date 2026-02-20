import { Request, Response } from 'express';
import HabitEntry from '../models/HabitEntry';
import User from '../models/User';

const XP_PER_HABIT = 10;

interface LeaderboardEntry {
  rank: number;
  uid: string;
  displayName: string;
  photoURL: string | null;
  totalXp: number;
  streak: number;
  completionRate: number;
}

// ─── Helpers ─────────────────────────────────────────────────────

/** Check if a habit value counts as "completed" */
function isCompleted(value: unknown): boolean {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value > 0;
  return false;
}

/** Calculate stats from a flat list of HabitEntry documents */
function calculateStats(
  entries: { dayIndex: number; habitId: string; value: unknown }[]
): { totalXp: number; streak: number; completionRate: number } {
  if (entries.length === 0) {
    return { totalXp: 0, streak: 0, completionRate: 0 };
  }

  // Group by day
  const dayMap = new Map<number, { completed: number; total: number }>();

  for (const entry of entries) {
    const day = entry.dayIndex;
    if (!dayMap.has(day)) {
      dayMap.set(day, { completed: 0, total: 0 });
    }
    const stat = dayMap.get(day)!;
    stat.total++;
    if (isCompleted(entry.value)) {
      stat.completed++;
    }
  }

  let totalCompleted = 0;
  let totalHabits = 0;

  for (const stat of dayMap.values()) {
    totalCompleted += stat.completed;
    totalHabits += stat.total;
  }

  // Streak: consecutive days (descending) with at least one completed habit
  const sortedDays = [...dayMap.keys()].sort((a, b) => b - a);
  let streak = 0;

  for (const day of sortedDays) {
    const stat = dayMap.get(day)!;
    if (stat.completed > 0) {
      streak++;
    } else {
      break;
    }
  }

  const totalXp = totalCompleted * XP_PER_HABIT;
  const completionRate =
    totalHabits > 0 ? Math.round((totalCompleted / totalHabits) * 100) / 100 : 0;

  return { totalXp, streak, completionRate };
}

// ─── Controller ──────────────────────────────────────────────────

// @desc    Get leaderboard
// @route   GET /api/leaderboard
// @access  Public
export const getLeaderboard = async (req: Request, res: Response): Promise<void> => {
  try {
    // Get all entries grouped by user
    const allEntries = await HabitEntry.find({}).lean();

    // Group by uid
    const userEntriesMap = new Map<string, typeof allEntries>();
    for (const entry of allEntries) {
      const uid = entry.uid;
      if (!userEntriesMap.has(uid)) {
        userEntriesMap.set(uid, []);
      }
      userEntriesMap.get(uid)!.push(entry);
    }

    const entries: LeaderboardEntry[] = await Promise.all(
      [...userEntriesMap.entries()].map(async ([uid, userEntries]) => {
        const { totalXp, streak, completionRate } = calculateStats(userEntries);
        const user = await User.findOne({ uid }).select('displayName photoURL');

        return {
          rank: 0,
          uid,
          displayName: user ? user.displayName : 'Unknown User',
          photoURL: user ? user.photoURL || null : null,
          totalXp,
          streak,
          completionRate,
        };
      })
    );

    // Sort by XP descending, then by streak descending
    entries.sort((a, b) => b.totalXp - a.totalXp || b.streak - a.streak);

    // Assign ranks
    entries.forEach((entry, index) => {
      entry.rank = index + 1;
    });

    res.json(entries.slice(0, 50)); // Return top 50
  } catch (error: any) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
};
