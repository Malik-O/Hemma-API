import { Request, Response } from 'express';
import crypto from 'crypto';
import Group, { IGroup, IGroupCategory, IGroupHabitItem } from '../models/Group';
import HabitEntry from '../models/HabitEntry';
import User from '../models/User';

// ─── Helpers ─────────────────────────────────────────────────────

/** Generate a unique 6-char invite code */
function generateInviteCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const bytes = crypto.randomBytes(6);
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars[bytes[i] % chars.length];
  }
  return code;
}

/** Ensure unique invite code across DB */
async function getUniqueInviteCode(): Promise<string> {
  let code = generateInviteCode();
  let exists = await Group.findOne({ inviteCode: code });
  let attempts = 0;
  while (exists && attempts < 10) {
    code = generateInviteCode();
    exists = await Group.findOne({ inviteCode: code });
    attempts++;
  }
  return code;
}

/** Flatten group categories into a set of habit IDs */
function getGroupHabitIds(categories: IGroupCategory[]): string[] {
  return categories.flatMap((cat) => cat.items.map((item) => item.id));
}

// ─── Public Group Info (no auth) ─────────────────────────────────

// @desc    Get basic group info by invite code (public, for join links)
// @route   GET /api/groups/info/:inviteCode
// @access  Public
export const getGroupInfoByCode = async (req: Request, res: Response): Promise<void> => {
  try {
    const code = req.params.inviteCode?.trim().toUpperCase();

    if (!code) {
      res.status(400).json({ message: 'رمز الدعوة مطلوب' });
      return;
    }

    const group = await Group.findOne({ inviteCode: code })
      .select('_id name memberUids inviteCode')
      .lean();

    if (!group) {
      res.status(404).json({ message: 'المجموعة غير موجودة' });
      return;
    }

    res.json({
      _id: group._id,
      name: group.name,
      memberCount: group.memberUids?.length || 0,
      inviteCode: group.inviteCode,
    });
  } catch (error) {
    console.error('[groupController] getGroupInfoByCode error:', error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// ─── Create Group ────────────────────────────────────────────────

// @desc    Create a new group
// @route   POST /api/groups
// @access  Private
export const createGroup = async (req: Request, res: Response): Promise<void> => {
  try {
    const uid = req.user!.uid;
    const { name } = req.body;

    if (!name || name.trim().length === 0) {
      res.status(400).json({ message: 'اسم المجموعة مطلوب' });
      return;
    }

    const inviteCode = await getUniqueInviteCode();

    const group = await Group.create({
      name: name.trim(),
      adminUid: uid,
      memberUids: [uid], // admin is also a member
      inviteCode,
      categories: [],
    });

    res.status(201).json(formatGroupResponse(group, uid));
  } catch (error) {
    console.error('[groupController] createGroup error:', error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// ─── Get My Groups ───────────────────────────────────────────────

// @desc    Get all groups the current user is a member of
// @route   GET /api/groups
// @access  Private
export const getMyGroups = async (req: Request, res: Response): Promise<void> => {
  try {
    const uid = req.user!.uid;
    const groups = await Group.find({ memberUids: uid }).lean();

    const result = groups.map((g) => formatGroupResponse(g as unknown as IGroup, uid));
    res.json(result);
  } catch (error) {
    console.error('[groupController] getMyGroups error:', error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// ─── Get Single Group ────────────────────────────────────────────

// @desc    Get single group details
// @route   GET /api/groups/:groupId
// @access  Private (member only)
export const getGroup = async (req: Request, res: Response): Promise<void> => {
  try {
    const uid = req.user!.uid;
    const group = await Group.findById(req.params.groupId);

    if (!group) {
      res.status(404).json({ message: 'المجموعة غير موجودة' });
      return;
    }

    if (!group.memberUids.includes(uid)) {
      res.status(403).json({ message: 'أنت لست عضواً في هذه المجموعة' });
      return;
    }

    res.json(formatGroupResponse(group, uid));
  } catch (error) {
    console.error('[groupController] getGroup error:', error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// ─── Join Group via Invite Code ──────────────────────────────────

// @desc    Join a group by invite code
// @route   POST /api/groups/join
// @access  Private
export const joinGroup = async (req: Request, res: Response): Promise<void> => {
  try {
    const uid = req.user!.uid;
    const { inviteCode } = req.body;

    if (!inviteCode) {
      res.status(400).json({ message: 'رمز الدعوة مطلوب' });
      return;
    }

    const normalizedCode = inviteCode.trim().toUpperCase();
    const group = await Group.findOne({ inviteCode: normalizedCode });

    if (!group) {
      res.status(404).json({ message: 'رمز الدعوة غير صالح' });
      return;
    }

    if (group.memberUids.includes(uid)) {
      res.status(400).json({ message: 'أنت عضو بالفعل في هذه المجموعة' });
      return;
    }

    group.memberUids.push(uid);
    await group.save();

    res.json(formatGroupResponse(group, uid));
  } catch (error) {
    console.error('[groupController] joinGroup error:', error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// ─── Leave Group ─────────────────────────────────────────────────

// @desc    Leave a group (admin cannot leave, must delete)
// @route   POST /api/groups/:groupId/leave
// @access  Private
export const leaveGroup = async (req: Request, res: Response): Promise<void> => {
  try {
    const uid = req.user!.uid;
    const group = await Group.findById(req.params.groupId);

    if (!group) {
      res.status(404).json({ message: 'المجموعة غير موجودة' });
      return;
    }

    if (group.adminUid === uid) {
      res.status(400).json({ message: 'لا يمكن للمسؤول مغادرة المجموعة. يمكنك حذفها بدلاً من ذلك' });
      return;
    }

    group.memberUids = group.memberUids.filter((m) => m !== uid);
    await group.save();

    res.json({ message: 'تمت المغادرة بنجاح' });
  } catch (error) {
    console.error('[groupController] leaveGroup error:', error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// ─── Delete Group ────────────────────────────────────────────────

// @desc    Delete a group (admin only)
// @route   DELETE /api/groups/:groupId
// @access  Private (admin only)
export const deleteGroup = async (req: Request, res: Response): Promise<void> => {
  try {
    const uid = req.user!.uid;
    const group = await Group.findById(req.params.groupId);

    if (!group) {
      res.status(404).json({ message: 'المجموعة غير موجودة' });
      return;
    }

    if (group.adminUid !== uid) {
      res.status(403).json({ message: 'فقط المسؤول يمكنه حذف المجموعة' });
      return;
    }

    await Group.findByIdAndDelete(group._id);
    res.json({ message: 'تم حذف المجموعة بنجاح' });
  } catch (error) {
    console.error('[groupController] deleteGroup error:', error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// ─── Update Group Habits (Admin Only) ────────────────────────────

// @desc    Update group habit categories (admin only)
// @route   PUT /api/groups/:groupId/habits
// @access  Private (admin only)
export const updateGroupHabits = async (req: Request, res: Response): Promise<void> => {
  try {
    const uid = req.user!.uid;
    const group = await Group.findById(req.params.groupId);

    if (!group) {
      res.status(404).json({ message: 'المجموعة غير موجودة' });
      return;
    }

    if (group.adminUid !== uid) {
      res.status(403).json({ message: 'فقط المسؤول يمكنه تعديل العادات' });
      return;
    }

    const { categories } = req.body;

    if (!Array.isArray(categories)) {
      res.status(400).json({ message: 'الأقسام مطلوبة' });
      return;
    }

    group.categories = categories;
    await group.save();

    res.json(formatGroupResponse(group, uid));
  } catch (error) {
    console.error('[groupController] updateGroupHabits error:', error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// ─── Update Group Info (Admin Only) ──────────────────────────────

// @desc    Update group name (admin only)
// @route   PATCH /api/groups/:groupId
// @access  Private (admin only)
export const updateGroup = async (req: Request, res: Response): Promise<void> => {
  try {
    const uid = req.user!.uid;
    const group = await Group.findById(req.params.groupId);

    if (!group) {
      res.status(404).json({ message: 'المجموعة غير موجودة' });
      return;
    }

    if (group.adminUid !== uid) {
      res.status(403).json({ message: 'فقط المسؤول يمكنه تعديل المجموعة' });
      return;
    }

    const { name } = req.body;
    if (name) group.name = name.trim();

    await group.save();
    res.json(formatGroupResponse(group, uid));
  } catch (error) {
    console.error('[groupController] updateGroup error:', error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// ─── Group Leaderboard ───────────────────────────────────────────

// @desc    Get group leaderboard (completion % of group habits)
// @route   GET /api/groups/:groupId/leaderboard
// @access  Private (member only)
export const getGroupLeaderboard = async (req: Request, res: Response): Promise<void> => {
  try {
    const uid = req.user!.uid;
    const group = await Group.findById(req.params.groupId);

    if (!group) {
      res.status(404).json({ message: 'المجموعة غير موجودة' });
      return;
    }

    if (!group.memberUids.includes(uid)) {
      res.status(403).json({ message: 'أنت لست عضواً في هذه المجموعة' });
      return;
    }

    const habitIds = getGroupHabitIds(group.categories);

    if (habitIds.length === 0) {
      // No habits defined yet
      const members = await User.find({ uid: { $in: group.memberUids } })
        .select('uid displayName photoURL')
        .lean();

      const entries = members.map((m, i) => ({
        rank: i + 1,
        uid: m.uid,
        displayName: m.displayName,
        photoURL: m.photoURL || null,
        completionRate: 0,
        completedCount: 0,
        totalPossible: 0,
      }));

      res.json({ entries, groupName: group.name });
      return;
    }

    // Aggregate habit entries for group members on group habit IDs
    const pipeline = [
      {
        $match: {
          uid: { $in: group.memberUids },
          habitId: { $in: habitIds },
        },
      },
      {
        $group: {
          _id: '$uid',
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
    ];

    const aggregated = await HabitEntry.aggregate(pipeline);

    // Build uid → user info lookup
    const members = await User.find({ uid: { $in: group.memberUids } })
      .select('uid displayName photoURL')
      .lean();
    const userLookup = new Map(
      members.map((m) => [m.uid, { displayName: m.displayName, photoURL: m.photoURL || null }])
    );

    // Build uid → stats lookup
    const statsLookup = new Map(
      aggregated.map((s: { _id: string; completed: number; total: number }) => [s._id, s])
    );

    // Build ranked entries
    const entries = group.memberUids
      .map((memberUid) => {
        const userInfo = userLookup.get(memberUid);
        const stats = statsLookup.get(memberUid);

        const completedCount = stats?.completed || 0;
        const totalPossible = stats?.total || 0;
        const completionRate =
          totalPossible > 0 ? Math.round((completedCount / totalPossible) * 100) : 0;

        return {
          rank: 0,
          uid: memberUid,
          displayName: userInfo?.displayName || 'مستخدم',
          photoURL: userInfo?.photoURL || null,
          completionRate,
          completedCount,
          totalPossible,
        };
      })
      .sort((a, b) => b.completionRate - a.completionRate);

    entries.forEach((entry, index) => {
      entry.rank = index + 1;
    });

    res.json({ entries, groupName: group.name });
  } catch (error) {
    console.error('[groupController] getGroupLeaderboard error:', error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// ─── Admin: Member Detail Progress ──────────────────────────────

// @desc    Get detailed habit progress for a specific member (admin only)
// @route   GET /api/groups/:groupId/members/:memberUid/progress
// @access  Private (admin only)
export const getMemberProgress = async (req: Request, res: Response): Promise<void> => {
  try {
    const uid = req.user!.uid;
    const { groupId, memberUid } = req.params;

    const group = await Group.findById(groupId);

    if (!group) {
      res.status(404).json({ message: 'المجموعة غير موجودة' });
      return;
    }

    if (group.adminUid !== uid) {
      res.status(403).json({ message: 'فقط المسؤول يمكنه عرض تفاصيل الأعضاء' });
      return;
    }

    if (!group.memberUids.includes(memberUid)) {
      res.status(404).json({ message: 'العضو غير موجود في هذه المجموعة' });
      return;
    }

    const habitIds = getGroupHabitIds(group.categories);

    // Get all entries for this member on group habits
    const entries = await HabitEntry.find({
      uid: memberUid,
      habitId: { $in: habitIds },
    })
      .select('dayIndex habitId value updatedAt')
      .lean();

    // Get member info
    const member = await User.findOne({ uid: memberUid })
      .select('uid displayName photoURL')
      .lean();

    // Organize by day
    const dayMap: Record<number, Record<string, boolean | number>> = {};
    for (const entry of entries) {
      if (!dayMap[entry.dayIndex]) {
        dayMap[entry.dayIndex] = {};
      }
      dayMap[entry.dayIndex][entry.habitId] = entry.value;
    }

    res.json({
      member: {
        uid: member?.uid || memberUid,
        displayName: member?.displayName || 'مستخدم',
        photoURL: member?.photoURL || null,
      },
      categories: group.categories,
      dayMap,
    });
  } catch (error) {
    console.error('[groupController] getMemberProgress error:', error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// ─── Response Formatter ──────────────────────────────────────────

function formatGroupResponse(group: IGroup | Record<string, unknown>, currentUid: string) {
  const g = group as IGroup;
  return {
    _id: g._id,
    name: g.name,
    adminUid: g.adminUid,
    isAdmin: g.adminUid === currentUid,
    memberCount: g.memberUids?.length || 0,
    inviteCode: g.inviteCode,
    categories: g.categories || [],
    createdAt: g.createdAt,
  };
}
