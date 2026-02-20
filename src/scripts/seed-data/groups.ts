/**
 * Seed data generator for Groups.
 * Creates 15 groups with varied sizes, emojis, and category subsets.
 */
import { SeedUser } from './users';
import { BASE_CATEGORIES, EXTRA_CATEGORIES, SeedCategory } from './categories';

const GROUP_EMOJIS = ['🕌', '🌙', '📖', '⭐', '🤲', '💎', '🏆', '🔥', '🌟', '💪', '👥', '🌿', '🎯', '✨', '🕋'];

const GROUP_NAMES = [
  'فريق الفجر', 'مجموعة القرآن', 'أصدقاء الخير', 'سباق الحسنات',
  'نادي التراويح', 'فريق الأذكار', 'مجموعة التحدي', 'أهل الهمة',
  'رفقاء الطاعة', 'نجوم رمضان', 'فريق الصدقة', 'مجموعة البركة',
  'أصحاب العزيمة', 'دائرة الخير', 'مجموعة الإيمان',
];

const INVITE_CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

/** Deterministic invite code based on index */
const generateInviteCode = (index: number): string => {
  let code = '';
  let seed = index * 7919 + 1234; // prime-based, deterministic
  for (let i = 0; i < 6; i++) {
    code += INVITE_CODE_CHARS[seed % INVITE_CODE_CHARS.length];
    seed = Math.floor(seed / INVITE_CODE_CHARS.length) + (index + i) * 31;
  }
  return code;
};

/** Pick which group-level categories the group tracks */
const getGroupCategories = (groupIndex: number): SeedCategory[] => {
  // All groups have prayers. Then we rotate through other categories.
  const categories = [BASE_CATEGORIES[0]]; // prayers
  if (groupIndex % 2 === 0) categories.push(BASE_CATEGORIES[1]); // quran
  if (groupIndex % 3 === 0) categories.push(BASE_CATEGORIES[2]); // sunan
  if (groupIndex % 4 === 0) categories.push(EXTRA_CATEGORIES[groupIndex % EXTRA_CATEGORIES.length]);
  return categories;
};

export interface SeedGroup {
  name: string;
  emoji: string;
  adminUid: string;
  memberUids: string[];
  inviteCode: string;
  categories: SeedCategory[];
}

/**
 * Generates 15 groups with realistic membership distribution.
 * Each group has 5-20 members drawn from the user pool.
 */
export const generateGroups = (users: SeedUser[], count = 15): SeedGroup[] => {
  const groups: SeedGroup[] = [];

  for (let i = 0; i < count; i++) {
    // Pick admin from the user pool
    const adminIndex = (i * 7) % users.length;
    const admin = users[adminIndex];

    // Determine group size (5 to 20 members, excluding admin)
    const memberCount = 5 + (i * 3) % 16;
    const memberUids: string[] = [];

    for (let m = 0; m < memberCount; m++) {
      const memberIndex = (adminIndex + m + 1) % users.length;
      const member = users[memberIndex];
      // Avoid duplicate with admin
      if (member.uid !== admin.uid) {
        memberUids.push(member.uid);
      }
    }

    groups.push({
      name: GROUP_NAMES[i % GROUP_NAMES.length],
      emoji: GROUP_EMOJIS[i % GROUP_EMOJIS.length],
      adminUid: admin.uid,
      memberUids,
      inviteCode: generateInviteCode(i),
      categories: getGroupCategories(i),
    });
  }

  return groups;
};
