import { Request, Response } from 'express';
import HabitTemplate from '../models/HabitTemplate';
import HabitCategory from '../models/HabitCategory';
import HabitEntry from '../models/HabitEntry';
import type { ITemplateCategory, ITemplateHabitItem } from '../models/HabitTemplate';
import type { IHabitItem } from '../models/HabitCategory';

// ─── Types ───────────────────────────────────────────────────────

interface CreateTemplateBody {
  name: string;
  description?: string;
  categories: ITemplateCategory[];
}

/** Selection map: categoryId → array of selected item ids */
interface ApplyTemplateBody {
  mode: 'merge' | 'replace';
  selectedItems: Record<string, string[]>;
}

// ─── Helpers ─────────────────────────────────────────────────────

/** Generate a unique ID for new category/habit */
function generateId(): string {
  return `custom-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

/** Convert a template habit item to a user habit item */
function toUserHabitItem(tItem: ITemplateHabitItem): IHabitItem {
  return {
    id: generateId(),
    label: tItem.label,
    type: tItem.type,
    goal: tItem.goal,
    repeat: tItem.repeat || 'daily',
    repeatDays: tItem.repeatDays,
    repeatMonthDay: tItem.repeatMonthDay,
    repeatMonthHijri: tItem.repeatMonthHijri,
    repeatYearlyDate: tItem.repeatYearlyDate,
    repeatYearlyHijri: tItem.repeatYearlyHijri,
    repeatEndDate: tItem.repeatEndDate,
  };
}

/** Filter template categories by selection map */
function filterBySelection(
  categories: ITemplateCategory[],
  selectedItems: Record<string, string[]>
): ITemplateCategory[] {
  return categories
    .filter((cat) => {
      const selected = selectedItems[cat.categoryId];
      return selected && selected.length > 0;
    })
    .map((cat) => {
      const selectedIds = new Set(selectedItems[cat.categoryId]);
      return {
        ...cat,
        items: cat.items.filter((item) => selectedIds.has(item.id)),
      };
    });
}

// ─── List all templates ──────────────────────────────────────────

// @desc    Get all public templates (paginated)
// @route   GET /api/templates
// @access  Public
export const listTemplates = async (req: Request, res: Response): Promise<void> => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const pageSize = Math.min(50, Math.max(1, Number(req.query.pageSize) || 20));
    const search = (req.query.search as string) || '';
    const filter: any = search ? { $text: { $search: search } } : {};
    
    if (req.query.authorUid) {
      filter.authorUid = req.query.authorUid;
    }

    const [templates, totalCount] = await Promise.all([
      HabitTemplate.find(filter)
        .sort({ usageCount: -1, createdAt: -1 })
        .skip((page - 1) * pageSize)
        .limit(pageSize)
        .lean(),
      HabitTemplate.countDocuments(filter),
    ]);

    res.json({
      templates: templates.map((t) => ({
        _id: t._id,
        name: t.name,
        description: t.description,
        authorName: t.authorName,
        authorUid: t.authorUid,
        categories: t.categories,
        usageCount: t.usageCount,
        createdAt: t.createdAt.toISOString(),
      })),
      page,
      pageSize,
      totalCount,
      totalPages: Math.ceil(totalCount / pageSize),
    });
  } catch (error: any) {
    console.error('[templateController] List error:', error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// ─── Create a template ──────────────────────────────────────────

// @desc    Create a new template from user's habits
// @route   POST /api/templates
// @access  Private
export const createTemplate = async (req: Request, res: Response): Promise<void> => {
  if (!req.user) {
    res.status(401).json({ message: 'User not authenticated' });
    return;
  }

  const { name, description, categories } = req.body as CreateTemplateBody;

  if (!name?.trim()) {
    res.status(400).json({ message: 'Template name is required' });
    return;
  }

  if (!categories?.length) {
    res.status(400).json({ message: 'At least one category is required' });
    return;
  }

  try {
    const template = await HabitTemplate.create({
      name: name.trim(),
      description: description?.trim() || '',
      authorUid: req.user.uid,
      authorName: req.user.displayName || 'مستخدم',
      categories,
    });

    res.status(201).json({
      _id: template._id,
      name: template.name,
      description: template.description,
      authorName: template.authorName,
      authorUid: template.authorUid,
      categories: template.categories,
      usageCount: template.usageCount,
      createdAt: template.createdAt.toISOString(),
    });
  } catch (error: any) {
    console.error('[templateController] Create error:', error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// ─── Apply template (merge or replace) ──────────────────────────

// @desc    Apply a template — merge into or replace user's habits
// @route   POST /api/templates/:id/apply
// @access  Private
export const applyTemplate = async (req: Request, res: Response): Promise<void> => {
  if (!req.user) {
    res.status(401).json({ message: 'User not authenticated' });
    return;
  }

  const { mode, selectedItems } = req.body as ApplyTemplateBody;

  if (!mode || !['merge', 'replace'].includes(mode)) {
    res.status(400).json({ message: 'mode must be "merge" or "replace"' });
    return;
  }

  if (!selectedItems || typeof selectedItems !== 'object') {
    res.status(400).json({ message: 'selectedItems is required' });
    return;
  }

  const uid = req.user.uid;

  try {
    // Fetch the template
    const template = await HabitTemplate.findById(req.params.id).lean();
    if (!template) {
      res.status(404).json({ message: 'Template not found' });
      return;
    }

    // Filter template categories/items by selection
    const selectedCategories = filterBySelection(template.categories, selectedItems);

    if (selectedCategories.length === 0) {
      res.status(400).json({ message: 'No items selected' });
      return;
    }

    // Increment usage count
    await HabitTemplate.findByIdAndUpdate(req.params.id, { $inc: { usageCount: 1 } });

    const now = new Date();

    if (mode === 'replace') {
      await handleReplace(uid, selectedCategories, now);
    } else {
      await handleMerge(uid, selectedCategories, now);
    }

    // Return the updated user categories
    const updatedCategories = await HabitCategory.find({ uid })
      .sort({ sortOrder: 1 })
      .lean();

    res.json({
      categories: updatedCategories.map((c) => ({
        categoryId: c.categoryId,
        name: c.name,
        icon: c.icon,
        items: c.items,
        sortOrder: c.sortOrder,
        updatedAt: c.updatedAt.toISOString(),
      })),
    });
  } catch (error: any) {
    console.error('[templateController] Apply error:', error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// ─── Replace handler ─────────────────────────────────────────────

/**
 * Replace: Delete all user categories + entries, then create fresh
 * categories from the selected template items.
 */
async function handleReplace(
  uid: string,
  selectedCategories: ITemplateCategory[],
  now: Date
): Promise<void> {
  // Wipe all existing user data
  await Promise.all([
    HabitCategory.deleteMany({ uid }),
    HabitEntry.deleteMany({ uid }),
  ]);

  // Create new categories from selection
  const newCategoryDocs = selectedCategories.map((tCat, index) => ({
    uid,
    categoryId: generateId(),
    name: tCat.name,
    icon: tCat.icon,
    items: tCat.items.map(toUserHabitItem),
    sortOrder: index,
    createdAt: now,
    updatedAt: now,
  }));

  if (newCategoryDocs.length > 0) {
    await HabitCategory.insertMany(newCategoryDocs);
  }
}

// ─── Merge handler ───────────────────────────────────────────────

/**
 * Smart merge:
 * - If a template category name matches an existing user category,
 *   merge habits into that category (skip habits with duplicate labels).
 * - If no match, create a new category.
 */
async function handleMerge(
  uid: string,
  selectedCategories: ITemplateCategory[],
  now: Date
): Promise<void> {
  const existingCategories = await HabitCategory.find({ uid }).lean();

  // Build a map: normalized category name → existing category doc
  const existingByName = new Map(
    existingCategories.map((c) => [normalizeName(c.name), c])
  );

  // Track the next sortOrder for new categories
  const maxSortOrder = existingCategories.reduce(
    (max, c) => Math.max(max, c.sortOrder ?? 0),
    -1
  );
  let nextSortOrder = maxSortOrder + 1;

  const bulkOps: any[] = [];
  const newCategoryDocs: any[] = [];

  for (const tCat of selectedCategories) {
    const normalizedName = normalizeName(tCat.name);
    const existingCat = existingByName.get(normalizedName);

    if (existingCat) {
      // Category exists — merge habits, skipping duplicates by label
      const existingLabels = new Set(
        existingCat.items.map((item) => normalizeName(item.label))
      );

      const newItems = tCat.items
        .filter((tItem) => !existingLabels.has(normalizeName(tItem.label)))
        .map(toUserHabitItem);

      if (newItems.length > 0) {
        bulkOps.push({
          updateOne: {
            filter: { uid, categoryId: existingCat.categoryId },
            update: {
              $push: { items: { $each: newItems } },
              $set: { updatedAt: now },
            },
          },
        });
      }
    } else {
      // New category — create it
      newCategoryDocs.push({
        uid,
        categoryId: generateId(),
        name: tCat.name,
        icon: tCat.icon,
        items: tCat.items.map(toUserHabitItem),
        sortOrder: nextSortOrder++,
        createdAt: now,
        updatedAt: now,
      });
    }
  }

  // Execute batch operations
  if (bulkOps.length > 0) {
    await HabitCategory.bulkWrite(bulkOps);
  }
  if (newCategoryDocs.length > 0) {
    await HabitCategory.insertMany(newCategoryDocs);
  }
}

/** Normalize a name for comparison (trim + lowercase) */
function normalizeName(name: string): string {
  return name.trim().toLowerCase();
}

// ─── Legacy: use template (increment only) ──────────────────────

// @desc    Increment template usage count (kept for backward compat)
// @route   POST /api/templates/:id/use
// @access  Private
export const useTemplate = async (req: Request, res: Response): Promise<void> => {
  if (!req.user) {
    res.status(401).json({ message: 'User not authenticated' });
    return;
  }

  try {
    const template = await HabitTemplate.findByIdAndUpdate(
      req.params.id,
      { $inc: { usageCount: 1 } },
      { new: true }
    ).lean();

    if (!template) {
      res.status(404).json({ message: 'Template not found' });
      return;
    }

    res.json({
      _id: template._id,
      name: template.name,
      description: template.description,
      authorName: template.authorName,
      authorUid: template.authorUid,
      categories: template.categories,
      usageCount: template.usageCount,
      createdAt: template.createdAt.toISOString(),
    });
  } catch (error: any) {
    console.error('[templateController] Use error:', error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// ─── Delete a template ──────────────────────────────────────────

// @desc    Delete a template (only author can delete)
// @route   DELETE /api/templates/:id
// @access  Private
export const deleteTemplate = async (req: Request, res: Response): Promise<void> => {
  if (!req.user) {
    res.status(401).json({ message: 'User not authenticated' });
    return;
  }

  try {
    const template = await HabitTemplate.findById(req.params.id);

    if (!template) {
      res.status(404).json({ message: 'Template not found' });
      return;
    }

    if (template.authorUid !== req.user.uid) {
      res.status(403).json({ message: 'Only the author can delete this template' });
      return;
    }

    await template.deleteOne();
    res.json({ message: 'Template deleted successfully' });
  } catch (error: any) {
    console.error('[templateController] Delete error:', error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// ─── Update a template ──────────────────────────────────────────

// @desc    Update a template (name, description, categories)
// @route   PUT /api/templates/:id
// @access  Private
export const updateTemplate = async (req: Request, res: Response): Promise<void> => {
  if (!req.user) {
    res.status(401).json({ message: 'User not authenticated' });
    return;
  }

  const { name, description, categories } = req.body as CreateTemplateBody;

  if (!name?.trim()) {
    res.status(400).json({ message: 'Template name is required' });
    return;
  }

  if (!categories?.length) {
    res.status(400).json({ message: 'At least one category is required' });
    return;
  }

  try {
    const template = await HabitTemplate.findById(req.params.id);

    if (!template) {
      res.status(404).json({ message: 'Template not found' });
      return;
    }

    if (template.authorUid !== req.user.uid) {
      res.status(403).json({ message: 'Only the author can update this template' });
      return;
    }

    template.name = name.trim();
    if (description !== undefined) {
      template.description = description.trim();
    }
    template.categories = categories;

    await template.save();

    res.json({
      _id: template._id,
      name: template.name,
      description: template.description,
      authorName: template.authorName,
      authorUid: template.authorUid,
      categories: template.categories,
      usageCount: template.usageCount,
      createdAt: template.createdAt.toISOString(),
    });
  } catch (error: any) {
    console.error('[templateController] Update error:', error);
    res.status(500).json({ message: 'Server Error' });
  }
};
