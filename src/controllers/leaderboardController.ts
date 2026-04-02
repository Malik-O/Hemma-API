import { Request, Response } from 'express';
import HabitEntry from '../models/HabitEntry';
import User from '../models/User';

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 50;

// ─── Cache ───────────────────────────────────────────────────────
let cachedLeaderboard: LeaderboardEntry[] | null = null;
let lastCacheTime: number = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes in milliseconds

// ─── Types ───────────────────────────────────────────────────────

interface AggregatedUserStats {
  _id: string; // uid
  totalCompleted: number;
  totalHabits: number;
  dayMap: { date: string; completed: number }[];
}

interface LeaderboardEntry {
  rank: number;
  uid: string;
  displayName: string;
  photoURL: string | null;
  totalCompleted: number;
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

/** Calculate streak from per-day completion data (sorted desc by date) */
function calculateStreak(dayMap: { date: string; completed: number }[]): number {
  const sorted = [...dayMap]
    .map((d) => ({ date: new Date(d.date), completed: d.completed }))
    .sort((a, b) => b.date.getTime() - a.date.getTime());
    
  let streak = 0;
  let currentDate = sorted[0]?.date ? new Date(sorted[0].date) : null;
  
  if (!currentDate) return 0;

  for (const day of sorted) {
    if (day.completed > 0) {
      if (day.date.getTime() === currentDate.getTime()) {
        streak++;
        currentDate.setDate(currentDate.getDate() - 1);
      } else if (day.date.getTime() < currentDate.getTime()) {
        break;
      }
    } else {
      break;
    }
  }

  return streak;
}

// ─── Controller ──────────────────────────────────────────────────

// @desc    Get paginated leaderboard (ranked by completions descending)
// @route   GET /api/leaderboard?page=1&pageSize=20
// @access  Private
export const getLeaderboard = async (req: Request, res: Response): Promise<void> => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const pageSize = Math.min(
      MAX_PAGE_SIZE,
      Math.max(1, parseInt(req.query.pageSize as string) || DEFAULT_PAGE_SIZE)
    );

    const now = Date.now();
    let rankedEntries: LeaderboardEntry[] = [];

    // Serve from cache if valid
    if (cachedLeaderboard && now - lastCacheTime < CACHE_TTL) {
      rankedEntries = cachedLeaderboard;
    } else {
      // Get UIDs who opted-in to the leaderboard
      const visibleUsers = await User.find({ showOnLeaderboard: true })
        .select('uid displayName photoURL')
        .lean();

      const visibleUids = visibleUsers.map((u) => u.uid);

      if (visibleUids.length > 0) {
        // Build a uid → user info lookup
        const userLookup = new Map(
          visibleUsers.map((u) => [u.uid, { displayName: u.displayName, photoURL: u.photoURL || null }])
        );

        // Aggregate stats per user via MongoDB pipeline for high performance
        const pipeline = [
      { $match: { uid: { $in: visibleUids } } },
      {
        $group: {
          _id: { uid: '$uid', date: '$date' },
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
              date: '$_id.date',
              completed: '$completed',
            },
          },
        },
      },
    ];

        const aggregated: AggregatedUserStats[] = await HabitEntry.aggregate(pipeline);

        // Build full ranked list
        rankedEntries = aggregated
          .map((stat) => {
            const userInfo = userLookup.get(stat._id);
            const streak = calculateStreak(stat.dayMap);
            const completionRate =
              stat.totalHabits > 0
                ? Math.round((stat.totalCompleted / stat.totalHabits) * 100) / 100
                : 0;

            return {
              rank: 0,
              uid: stat._id,
              displayName: userInfo?.displayName || 'مستخدم',
              photoURL: userInfo?.photoURL || null,
              totalCompleted: stat.totalCompleted,
              streak,
              completionRate,
            };
          })
          .sort((a, b) => b.totalCompleted - a.totalCompleted || b.streak - a.streak);

        // Assign ranks
        rankedEntries.forEach((entry, index) => {
          entry.rank = index + 1;
        });
      }

      // Update cache
      cachedLeaderboard = rankedEntries;
      lastCacheTime = now;
    }

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
