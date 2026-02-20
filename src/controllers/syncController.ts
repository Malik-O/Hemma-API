import { Request, Response } from 'express';
import HabitEntry from '../models/HabitEntry';
import HabitCategory from '../models/HabitCategory';

// ─── Types ───────────────────────────────────────────────────────

interface EntryPayload {
  dayIndex: number;
  habitId: string;
  value: boolean | number;
  updatedAt: string; // ISO string from client
}

interface CategoryPayload {
  categoryId: string;
  name: string;
  icon: string;
  items: { id: string; label: string; type: 'boolean' | 'number' }[];
  sortOrder: number;
  updatedAt: string; // ISO string from client
}

// ─── Upload: Smart-merge entries + categories ────────────────────

// @desc    Upload & smart-merge habit data
// @route   POST /api/sync/upload
// @access  Private
export const uploadSyncData = async (req: Request, res: Response): Promise<void> => {
  if (!req.user) {
    res.status(401).json({ message: 'User not authenticated' });
    return;
  }

  const uid = req.user.uid;
  const { entries, categories } = req.body as {
    entries: EntryPayload[];
    categories: CategoryPayload[];
  };

  try {
    // ── Merge entries (per-record: latest updatedAt wins) ──
    if (entries?.length) {
      const bulkOps = entries.map((entry) => ({
        updateOne: {
          filter: { uid, dayIndex: entry.dayIndex, habitId: entry.habitId },
          update: {
            $set: {
              value: entry.value,
              updatedAt: new Date(entry.updatedAt),
            },
            $setOnInsert: {
              uid,
              dayIndex: entry.dayIndex,
              habitId: entry.habitId,
              createdAt: new Date(),
            },
          },
          upsert: true,
        },
      }));

      // For smart merge: only update if client's updatedAt >= server's
      // We do this by fetching existing, comparing, then bulk writing only newer ones
      const existingEntries = await HabitEntry.find({ uid }).lean();
      const existingMap = new Map(
        existingEntries.map((e) => [`${e.dayIndex}:${e.habitId}`, e])
      );

      const filteredOps = entries
        .filter((entry) => {
          const key = `${entry.dayIndex}:${entry.habitId}`;
          const existing = existingMap.get(key);
          if (!existing) return true; // New entry — always insert
          const clientTime = new Date(entry.updatedAt).getTime();
          const serverTime = new Date(existing.updatedAt).getTime();
          return clientTime >= serverTime; // Client is newer or equal
        })
        .map((entry) => ({
          updateOne: {
            filter: { uid, dayIndex: entry.dayIndex, habitId: entry.habitId },
            update: {
              $set: {
                value: entry.value,
                updatedAt: new Date(entry.updatedAt),
              },
              $setOnInsert: {
                uid,
                dayIndex: entry.dayIndex,
                habitId: entry.habitId,
                createdAt: new Date(),
              },
            },
            upsert: true,
          },
        }));

      if (filteredOps.length > 0) {
        await HabitEntry.bulkWrite(filteredOps);
      }
    }

    // ── Merge categories (latest updatedAt wins per category) ──
    if (categories?.length) {
      const existingCategories = await HabitCategory.find({ uid }).lean();
      const existingCatMap = new Map(
        existingCategories.map((c) => [c.categoryId, c])
      );

      const catOps = categories
        .filter((cat) => {
          const existing = existingCatMap.get(cat.categoryId);
          if (!existing) return true;
          const clientTime = new Date(cat.updatedAt).getTime();
          const serverTime = new Date(existing.updatedAt).getTime();
          return clientTime >= serverTime;
        })
        .map((cat) => ({
          updateOne: {
            filter: { uid, categoryId: cat.categoryId },
            update: {
              $set: {
                name: cat.name,
                icon: cat.icon,
                items: cat.items,
                sortOrder: cat.sortOrder,
                updatedAt: new Date(cat.updatedAt),
              },
              $setOnInsert: {
                uid,
                categoryId: cat.categoryId,
                createdAt: new Date(),
              },
            },
            upsert: true,
          },
        }));

      if (catOps.length > 0) {
        await HabitCategory.bulkWrite(catOps);
      }

      // Remove categories that the client deleted (those on server but not in client payload)
      const clientCategoryIds = new Set(categories.map((c) => c.categoryId));
      const deletedIds = existingCategories
        .filter((c) => !clientCategoryIds.has(c.categoryId))
        .map((c) => c.categoryId);

      if (deletedIds.length > 0) {
        await HabitCategory.deleteMany({ uid, categoryId: { $in: deletedIds } });
      }
    }

    // ── Return merged state ─────────────────────────────────────
    const [mergedEntries, mergedCategories] = await Promise.all([
      HabitEntry.find({ uid }).lean(),
      HabitCategory.find({ uid }).sort({ sortOrder: 1 }).lean(),
    ]);

    res.json({
      entries: mergedEntries.map((e) => ({
        dayIndex: e.dayIndex,
        habitId: e.habitId,
        value: e.value,
        updatedAt: e.updatedAt.toISOString(),
      })),
      categories: mergedCategories.map((c) => ({
        categoryId: c.categoryId,
        name: c.name,
        icon: c.icon,
        items: c.items,
        sortOrder: c.sortOrder,
        updatedAt: c.updatedAt.toISOString(),
      })),
    });
  } catch (error: any) {
    console.error('[syncController] Upload error:', error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// ─── Download: return all entries + categories ───────────────────

// @desc    Download all habit data
// @route   GET /api/sync/download
// @access  Private
export const downloadSyncData = async (req: Request, res: Response): Promise<void> => {
  if (!req.user) {
    res.status(401).json({ message: 'User not authenticated' });
    return;
  }

  const uid = req.user.uid;

  try {
    const [entries, categories] = await Promise.all([
      HabitEntry.find({ uid }).lean(),
      HabitCategory.find({ uid }).sort({ sortOrder: 1 }).lean(),
    ]);

    res.json({
      entries: entries.map((e) => ({
        dayIndex: e.dayIndex,
        habitId: e.habitId,
        value: e.value,
        updatedAt: e.updatedAt.toISOString(),
      })),
      categories: categories.map((c) => ({
        categoryId: c.categoryId,
        name: c.name,
        icon: c.icon,
        items: c.items,
        sortOrder: c.sortOrder,
        updatedAt: c.updatedAt.toISOString(),
      })),
    });
  } catch (error: any) {
    console.error('[syncController] Download error:', error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// ─── Reset: delete all user data ─────────────────────────────────

// @desc    Delete all habit entries and categories for the user
// @route   DELETE /api/sync/reset
// @access  Private
export const resetSyncData = async (req: Request, res: Response): Promise<void> => {
  if (!req.user) {
    res.status(401).json({ message: 'User not authenticated' });
    return;
  }

  const uid = req.user.uid;

  try {
    await Promise.all([
      HabitEntry.deleteMany({ uid }),
      HabitCategory.deleteMany({ uid }),
    ]);

    res.json({ message: 'All data has been reset' });
  } catch (error: any) {
    console.error('[syncController] Reset error:', error);
    res.status(500).json({ message: 'Server Error' });
  }
};

