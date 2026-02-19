
import { Request, Response } from 'express';
import SyncData from '../models/SyncData';
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

// @desc    Get leaderboard
// @route   GET /api/leaderboard
// @access  Public
export const getLeaderboard = async (req: Request, res: Response): Promise<void> => {
  try {
    const allSyncData = await SyncData.find({});

    const entries: LeaderboardEntry[] = await Promise.all(
      allSyncData.map(async (data) => {
        const { totalXp, streak, completionRate } = calculateStats(data);
        const user = await User.findOne({ uid: data.uid }).select('displayName photoURL');

        return {
          rank: 0,
          uid: data.uid,
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

const calculateStats = (data: any) => {
  const { trackerState } = data;
  if (!trackerState || Object.keys(trackerState).length === 0) {
    return { totalXp: 0, streak: 0, completionRate: 0 };
  }

  let totalCompleted = 0;
  let totalHabits = 0;
  let currentStreak = 0;
  let streakBroken = false;

  // Process days in reverse order for streak calculation
  const dayKeys = Object.keys(trackerState)
    .filter((k) => k.startsWith('day-'))
    .sort((a, b) => {
      const numA = parseInt(a.replace('day-', ''), 10);
      const numB = parseInt(b.replace('day-', ''), 10);
      return numB - numA;
    });

  for (const dayKey of dayKeys) {
    const dayData = trackerState[dayKey];
    if (!dayData) continue;

    const habitValues = Object.values(dayData);
    const completedCount = habitValues.filter((v) =>
      typeof v === 'boolean' ? v : typeof v === 'number' && v > 0
    ).length;

    totalCompleted += completedCount;
    totalHabits += habitValues.length;

    // Streak: count consecutive days with at least one completed habit
    if (!streakBroken) {
      if (completedCount > 0) {
        currentStreak++;
      } else {
        streakBroken = true;
      }
    }
  }

  const totalXp = totalCompleted * XP_PER_HABIT;
  const completionRate =
    totalHabits > 0 ? Math.round((totalCompleted / totalHabits) * 100) / 100 : 0;

  return { totalXp, streak: currentStreak, completionRate };
};
