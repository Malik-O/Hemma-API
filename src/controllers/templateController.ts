import { Request, Response } from 'express';
import HabitTemplate from '../models/HabitTemplate';
import type { ITemplateCategory } from '../models/HabitTemplate';

// ─── Types ───────────────────────────────────────────────────────

interface CreateTemplateBody {
  name: string;
  description?: string;
  categories: ITemplateCategory[];
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

    const filter = search ? { $text: { $search: search } } : {};

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

// ─── Merge / use a template ─────────────────────────────────────

// @desc    Increment template usage count (client merges locally)
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
