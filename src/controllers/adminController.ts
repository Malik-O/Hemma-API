import { Request, Response } from 'express';
import User from '../models/User';
import HabitEntry from '../models/HabitEntry';
import HabitCategory from '../models/HabitCategory';
import HabitTemplate from '../models/HabitTemplate';
import Group from '../models/Group';

// ─── Dashboard Stats ─────────────────────────────────────────────

// @desc    Get overview statistics for admin dashboard
// @route   GET /api/admin/stats
// @access  Admin
export const getDashboardStats = async (_req: Request, res: Response): Promise<void> => {
  try {
    const [
      totalUsers,
      totalEntries,
      totalCategories,
      totalTemplates,
      totalGroups,
      recentUsers,
      providerBreakdown,
      topTemplates,
      groupSizeStats,
    ] = await Promise.all([
      User.countDocuments({ uid: { $not: /^seed_user_/ } }),
      HabitEntry.countDocuments({ uid: { $not: /^seed_user_/ } }),
      HabitCategory.countDocuments({ uid: { $not: /^seed_user_/ } }),
      HabitTemplate.countDocuments({ authorUid: { $not: /^seed_user_/ } }),
      Group.countDocuments({ adminUid: { $not: /^seed_user_/ } }),

      // Users created in the last 7 days
      User.countDocuments({
        uid: { $not: /^seed_user_/ },
        createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
      }),

      // Provider breakdown
      User.aggregate([
        { $match: { uid: { $not: /^seed_user_/ } } },
        { $group: { _id: '$provider', count: { $sum: 1 } } },
      ]),

      // Top 5 templates by usage
      HabitTemplate.find({ authorUid: { $not: /^seed_user_/ } })
        .sort({ usageCount: -1 })
        .limit(5)
        .select('name authorName usageCount createdAt')
        .lean(),

      // Average group size
      Group.aggregate([
        { $match: { adminUid: { $not: /^seed_user_/ } } },
        {
          $project: {
            memberCount: { $size: '$memberUids' },
          },
        },
        {
          $group: {
            _id: null,
            avgSize: { $avg: '$memberCount' },
            maxSize: { $max: '$memberCount' },
            totalMembers: { $sum: '$memberCount' },
          },
        },
      ]),
    ]);

    const providerMap: Record<string, number> = {};
    for (const p of providerBreakdown) {
      providerMap[p._id] = p.count;
    }

    const groupStats = groupSizeStats[0] || { avgSize: 0, maxSize: 0, totalMembers: 0 };

    res.json({
      users: {
        total: totalUsers,
        newThisWeek: recentUsers,
        byProvider: providerMap,
      },
      habits: {
        totalEntries,
        totalCategories,
      },
      templates: {
        total: totalTemplates,
        topTemplates,
      },
      groups: {
        total: totalGroups,
        avgSize: Math.round((groupStats.avgSize || 0) * 10) / 10,
        maxSize: groupStats.maxSize || 0,
        totalMembers: groupStats.totalMembers || 0,
      },
    });
  } catch (error: any) {
    console.error('[adminController] getDashboardStats error:', error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// ─── User List ───────────────────────────────────────────────────

// @desc    List all users (paginated)
// @route   GET /api/admin/users
// @access  Admin
export const listUsers = async (req: Request, res: Response): Promise<void> => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const pageSize = Math.min(50, Math.max(1, Number(req.query.pageSize) || 20));
    const search = (req.query.search as string) || '';

    const filter: any = { uid: { $not: /^seed_user_/ } };
    if (search) {
      filter.$or = [
        { displayName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
      ];
    }

    const [users, totalCount] = await Promise.all([
      User.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * pageSize)
        .limit(pageSize)
        .select('-passwordHash')
        .lean(),
      User.countDocuments(filter),
    ]);

    res.json({
      users: users.map((u) => ({
        _id: u._id,
        uid: u.uid,
        displayName: u.displayName,
        email: u.email,
        photoURL: u.photoURL || '',
        provider: u.provider,
        showOnLeaderboard: u.showOnLeaderboard,
        createdAt: u.createdAt?.toISOString() ?? '',
      })),
      page,
      pageSize,
      totalCount,
      totalPages: Math.ceil(totalCount / pageSize),
    });
  } catch (error: any) {
    console.error('[adminController] listUsers error:', error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// ─── Template Management ─────────────────────────────────────────

// @desc    List all templates (admin, paginated)
// @route   GET /api/admin/templates
// @access  Admin
export const listAllTemplates = async (req: Request, res: Response): Promise<void> => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const pageSize = Math.min(50, Math.max(1, Number(req.query.pageSize) || 20));
    const search = (req.query.search as string) || '';

    const filter: any = { authorUid: { $not: /^seed_user_/ } };
    if (search) {
      filter.$text = { $search: search };
    }

    const [templates, totalCount] = await Promise.all([
      HabitTemplate.find(filter)
        .sort({ createdAt: -1 })
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
        createdAt: t.createdAt?.toISOString() ?? '',
      })),
      page,
      pageSize,
      totalCount,
      totalPages: Math.ceil(totalCount / pageSize),
    });
  } catch (error: any) {
    console.error('[adminController] listAllTemplates error:', error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    Admin-delete any template (no ownership check)
// @route   DELETE /api/admin/templates/:id
// @access  Admin
export const adminDeleteTemplate = async (req: Request, res: Response): Promise<void> => {
  try {
    const template = await HabitTemplate.findByIdAndDelete(req.params.id);
    if (!template) {
      res.status(404).json({ message: 'Template not found' });
      return;
    }
    res.json({ message: 'Template deleted successfully' });
  } catch (error: any) {
    console.error('[adminController] adminDeleteTemplate error:', error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// ─── Group Management ────────────────────────────────────────────

// @desc    List all groups (admin, paginated)
// @route   GET /api/admin/groups
// @access  Admin
export const listAllGroups = async (req: Request, res: Response): Promise<void> => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const pageSize = Math.min(50, Math.max(1, Number(req.query.pageSize) || 20));

    const [groups, totalCount] = await Promise.all([
      Group.find({ adminUid: { $not: /^seed_user_/ } })
        .sort({ createdAt: -1 })
        .skip((page - 1) * pageSize)
        .limit(pageSize)
        .lean(),
      Group.countDocuments({ adminUid: { $not: /^seed_user_/ } }),
    ]);

    res.json({
      groups: groups.map((g) => ({
        _id: g._id,
        name: g.name,
        adminUid: g.adminUid,
        memberCount: g.memberUids?.length ?? 0,
        inviteCode: g.inviteCode,
        categoryCount: g.categories?.length ?? 0,
        createdAt: g.createdAt?.toISOString() ?? '',
      })),
      page,
      pageSize,
      totalCount,
      totalPages: Math.ceil(totalCount / pageSize),
    });
  } catch (error: any) {
    console.error('[adminController] listAllGroups error:', error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    Admin-delete any group
// @route   DELETE /api/admin/groups/:id
// @access  Admin
export const adminDeleteGroup = async (req: Request, res: Response): Promise<void> => {
  try {
    const group = await Group.findByIdAndDelete(req.params.id);
    if (!group) {
      res.status(404).json({ message: 'Group not found' });
      return;
    }
    res.json({ message: 'Group deleted successfully' });
  } catch (error: any) {
    console.error('[adminController] adminDeleteGroup error:', error);
    res.status(500).json({ message: 'Server Error' });
  }
};
