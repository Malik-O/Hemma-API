import { Request, Response } from 'express';
import HabitEntry from '../models/HabitEntry';
import User from '../models/User';

const XP_PER_HABIT = 10;
const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 50;

// ─── Types ───────────────────────────────────────────────────────

interface AggregatedUserStats {
  _id: string; // uid
  totalCompleted: number;
  totalHabits: number;
  dayMap: { dayIndex: number; completed: number }[];
}

interface LeaderboardEntry {
  rank: number;
  uid: string;
  displayName: string;
  photoURL: string | null;
  totalXp: number;
  streak: number;
  completionRate: number;
}

interface LeaderboardResponse {
  entries: LeaderboardEntry[];
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
  currentUserRank: number | null;
}

// ─── Helpers ─────────────────────────────────────────────────────

/** Calculate streak from per-day completion data (sorted desc by dayIndex) */
function calculateStreak(dayMap: { dayIndex: number; completed: number }[]): number {
  const sorted = [...dayMap].sort((a, b) => b.dayIndex - a.dayIndex);
  let streak = 0;

  for (const day of sorted) {
    if (day.completed > 0) {
      streak++;
    } else {
      break;
    }
  }

  return streak;
}

// ─── Controller ──────────────────────────────────────────────────

// @desc    Get paginated leaderboard (ranked by XP descending)
// @route   GET /api/leaderboard?page=1&pageSize=20
// @access  Private
export const getLeaderboard = async (req: Request, res: Response): Promise<void> => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const pageSize = Math.min(
      MAX_PAGE_SIZE,
      Math.max(1, parseInt(req.query.pageSize as string) || DEFAULT_PAGE_SIZE)
    );

    // Get UIDs who opted-in to the leaderboard
    const visibleUsers = await User.find({ showOnLeaderboard: true })
      .select('uid displayName photoURL')
      .lean();

    const visibleUids = visibleUsers.map((u) => u.uid);

    if (visibleUids.length === 0) {
      res.json({
        entries: [],
        page,
        pageSize,
        totalCount: 0,
        totalPages: 0,
        currentUserRank: null,
      } satisfies LeaderboardResponse);
      return;
    }

    // Build a uid → user info lookup
    const userLookup = new Map(
      visibleUsers.map((u) => [u.uid, { displayName: u.displayName, photoURL: u.photoURL || null }])
    );

    // Aggregate stats per user via MongoDB pipeline for high performance
    const pipeline = [
      { $match: { uid: { $in: visibleUids } } },
      {
        $group: {
          _id: { uid: '$uid', dayIndex: '$dayIndex' },
          completed: {
            $sum: {
              $cond: [
                {
                  $or: [
                    { $eq: ['$value', true] },
                    { $and: [{ $isNumber: '$value' }, { $gt: ['$value', 0] }] },
                  ],
                },
                1,
                0,
              ],
            },
          },
          total: { $sum: 1 },
        },
      },
      {
        $group: {
          _id: '$_id.uid',
          totalCompleted: { $sum: '$completed' },
          totalHabits: { $sum: '$total' },
          dayMap: {
            $push: {
              dayIndex: '$_id.dayIndex',
              completed: '$completed',
            },
          },
        },
      },
    ];

    const aggregated: AggregatedUserStats[] = await HabitEntry.aggregate(pipeline);

    // Build full ranked list
    const rankedEntries: LeaderboardEntry[] = aggregated
      .map((stat) => {
        const userInfo = userLookup.get(stat._id);
        const streak = calculateStreak(stat.dayMap);
        const totalXp = stat.totalCompleted * XP_PER_HABIT;
        const completionRate =
          stat.totalHabits > 0
            ? Math.round((stat.totalCompleted / stat.totalHabits) * 100) / 100
            : 0;

        return {
          rank: 0,
          uid: stat._id,
          displayName: userInfo?.displayName || 'مستخدم',
          photoURL: userInfo?.photoURL || null,
          totalXp,
          streak,
          completionRate,
        };
      })
      .sort((a, b) => b.totalXp - a.totalXp || b.streak - a.streak);

    // Assign ranks
    rankedEntries.forEach((entry, index) => {
      entry.rank = index + 1;
    });

    // Find current user's rank (if authenticated)
    const currentUid = req.user?.uid || null;
    const currentUserRank =
      currentUid ? rankedEntries.find((e) => e.uid === currentUid)?.rank ?? null : null;

    // Paginate
    const totalCount = rankedEntries.length;
    const totalPages = Math.ceil(totalCount / pageSize);
    const start = (page - 1) * pageSize;
    const entries = rankedEntries.slice(start, start + pageSize);

    const response: LeaderboardResponse = {
      entries,
      page,
      pageSize,
      totalCount,
      totalPages,
      currentUserRank,
    };

    res.json(response);
  } catch (error: unknown) {
    console.error('[leaderboardController] Error:', error);
    res.status(500).json({ message: 'Server Error' });
  }
};
