import type { IHabitItem } from '../models/HabitCategory';

/**
 * Checks whether a habit should be active on a given date based on its repeat schedule.
 *
 * @param habit  - The habit item with repeat configuration
 * @param date   - The target date string (YYYY-MM-DD)
 * @param habitCreatedAt - Optional: when the habit was created (for biweekly cycle calculation)
 * @returns true if the habit should appear on that date
 */
export function isHabitActiveOnDate(
  habit: IHabitItem,
  dateStr: string,
  habitCreatedAt?: Date
): boolean {
  const repeat = habit.repeat || 'daily';
  const date = new Date(dateStr + 'T00:00:00');

  // ── Check end date ──
  if (habit.repeatEndDate) {
    const endDate = new Date(habit.repeatEndDate + 'T23:59:59');
    if (date > endDate) return false;
  }

  switch (repeat) {
    case 'daily':
      return true;

    case 'weekly': {
      if (!habit.repeatDays || habit.repeatDays.length === 0) return true;
      const dayOfWeek = date.getDay(); // 0=Sun..6=Sat
      return habit.repeatDays.includes(dayOfWeek);
    }

    case 'biweekly': {
      if (!habit.repeatDays || habit.repeatDays.length === 0) return true;
      const dayOfWeek = date.getDay();
      if (!habit.repeatDays.includes(dayOfWeek)) return false;

      // Check if this is the correct week in the 2-week cycle
      const referenceDate = habitCreatedAt || new Date('2026-02-18T00:00:00');
      const refTime = new Date(referenceDate);
      refTime.setHours(0, 0, 0, 0);
      const diffMs = date.getTime() - refTime.getTime();
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      const weekNumber = Math.floor(diffDays / 7);
      return weekNumber % 2 === 0; // Active on even weeks
    }

    case 'monthly': {
      const targetDay = habit.repeatMonthDay;
      if (!targetDay) return true;

      if (habit.repeatMonthHijri) {
        // Use Intl to get Hijri day
        try {
          const hijriDay = getHijriDayOfMonth(date);
          return hijriDay === targetDay;
        } catch {
          // Fallback to Gregorian if Hijri conversion fails
          return date.getDate() === targetDay;
        }
      } else {
        return date.getDate() === targetDay;
      }
    }

    case 'yearly': {
      if (!habit.repeatYearlyDate) return true;
      const [month, day] = habit.repeatYearlyDate.split('-').map(Number);
      
      if (habit.repeatYearlyHijri) {
        try {
          const hijriMonth = getHijriMonthOfYear(date);
          const hijriDay = getHijriDayOfMonth(date);
          return hijriMonth === month && hijriDay === day;
        } catch {
          return date.getMonth() + 1 === month && date.getDate() === day;
        }
      } else {
        return date.getMonth() + 1 === month && date.getDate() === day;
      }
    }

    default:
      return true;
  }
}

function getHijriDayOfMonth(date: Date): number {
  const formatter = new Intl.DateTimeFormat('en-u-ca-islamic-nu-latn', {
    day: 'numeric',
  });
  return Number(formatter.format(date));
}

/**
 * Gets the Hijri month of year using Intl.DateTimeFormat.
 */
function getHijriMonthOfYear(date: Date): number {
  const formatter = new Intl.DateTimeFormat('en-u-ca-islamic-nu-latn', {
    month: 'numeric',
  });
  return Number(formatter.format(date));
}

/**
 * Filters a list of habit items, keeping only those active on the given date.
 */
export function filterHabitsForDate(
  items: IHabitItem[],
  dateStr: string,
  categoryCreatedAt?: Date
): IHabitItem[] {
  return items.filter((item) => isHabitActiveOnDate(item, dateStr, categoryCreatedAt));
}
