import { Injectable } from '@nestjs/common';
import { UsersService } from '../users/users.service';

export interface LeaderboardEntry {
  rank: number;
  uid: string;
  displayName: string;
  photoURL: string | null;
  totalXp: number;
  streak: number;
  completionRate: number;
}

/** XP awarded per completed habit */
const XP_PER_HABIT = 10;

@Injectable()
export class LeaderboardService {
  constructor(private readonly usersService: UsersService) {}

  getLeaderboard(): LeaderboardEntry[] {
    const allUsers = this.usersService.getAllUsers();

    const entries: LeaderboardEntry[] = allUsers.map((user) => {
      const syncData = this.usersService.getSyncData(user.uid);
      const { totalXp, streak, completionRate } =
        this.calculateStats(syncData?.trackerState);

      return {
        rank: 0,
        uid: user.uid,
        displayName: user.displayName,
        photoURL: user.photoURL,
        totalXp,
        streak,
        completionRate,
      };
    });

    // Sort by XP descending, then by streak descending
    entries.sort((a, b) => b.totalXp - a.totalXp || b.streak - a.streak);

    // Assign ranks
    entries.forEach((entry, index) => {
      entry.rank = index + 1;
    });

    return entries;
  }

  /**
   * Calculate XP, streak and completion rate from the tracker state.
   * TrackerState shape: { "day-1": { "habit-id": true/false/number, ... }, ... }
   */
  private calculateStats(trackerState?: Record<string, unknown>): {
    totalXp: number;
    streak: number;
    completionRate: number;
  } {
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
      const dayData = trackerState[dayKey] as Record<string, unknown> | null;
      if (!dayData) continue;

      const habitValues = Object.values(dayData);
      const completedCount = habitValues.filter((v) =>
        typeof v === 'boolean' ? v : typeof v === 'number' && v > 0,
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
  }
}
