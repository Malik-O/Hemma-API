/**
 * Seed data generator for Habit Categories.
 * Provides base categories (same for all users) and extra custom categories
 * that some users will get for variety.
 */

export interface SeedCategoryItem {
  id: string;
  label: string;
  type: 'boolean' | 'number';
}

export interface SeedCategory {
  categoryId: string;
  name: string;
  icon: string;
  items: SeedCategoryItem[];
  sortOrder: number;
}

/** Default categories every user gets */
export const BASE_CATEGORIES: SeedCategory[] = [
  {
    categoryId: 'prayers',
    name: 'الصلوات',
    icon: 'Moon',
    items: [
      { id: 'fajr', label: 'الفجر', type: 'boolean' },
      { id: 'dhuhr', label: 'الظهر', type: 'boolean' },
      { id: 'asr', label: 'العصر', type: 'boolean' },
      { id: 'maghrib', label: 'المغرب', type: 'boolean' },
      { id: 'isha', label: 'العشاء', type: 'boolean' },
    ],
    sortOrder: 1,
  },
  {
    categoryId: 'quran',
    name: 'القرآن',
    icon: 'BookOpen',
    items: [
      { id: 'pages_read', label: 'صفحات مقروءة', type: 'number' },
    ],
    sortOrder: 2,
  },
  {
    categoryId: 'sunan',
    name: 'السنن',
    icon: 'Star',
    items: [
      { id: 'duha', label: 'صلاة الضحى', type: 'boolean' },
      { id: 'witir', label: 'صلاة الوتر', type: 'boolean' },
    ],
    sortOrder: 3,
  },
];

/** Extra categories randomly assigned to some users for variety */
export const EXTRA_CATEGORIES: SeedCategory[] = [
  {
    categoryId: 'adhkar',
    name: 'الأذكار',
    icon: 'Heart',
    items: [
      { id: 'morning_adhkar', label: 'أذكار الصباح', type: 'boolean' },
      { id: 'evening_adhkar', label: 'أذكار المساء', type: 'boolean' },
      { id: 'sleep_adhkar', label: 'أذكار النوم', type: 'boolean' },
    ],
    sortOrder: 4,
  },
  {
    categoryId: 'charity',
    name: 'الصدقة',
    icon: 'Gift',
    items: [
      { id: 'daily_sadaqah', label: 'صدقة يومية', type: 'boolean' },
      { id: 'sadaqah_amount', label: 'مبلغ الصدقة', type: 'number' },
    ],
    sortOrder: 5,
  },
  {
    categoryId: 'dua',
    name: 'الدعاء',
    icon: 'CloudSun',
    items: [
      { id: 'iftar_dua', label: 'دعاء الإفطار', type: 'boolean' },
      { id: 'last_third_dua', label: 'دعاء الثلث الأخير', type: 'boolean' },
    ],
    sortOrder: 6,
  },
  {
    categoryId: 'knowledge',
    name: 'العلم',
    icon: 'GraduationCap',
    items: [
      { id: 'islamic_lecture', label: 'درس ديني', type: 'boolean' },
      { id: 'reading_minutes', label: 'دقائق القراءة', type: 'number' },
    ],
    sortOrder: 7,
  },
  {
    categoryId: 'taraweeh',
    name: 'التراويح',
    icon: 'Sparkles',
    items: [
      { id: 'taraweeh_prayer', label: 'صلاة التراويح', type: 'boolean' },
      { id: 'taraweeh_rakaat', label: 'عدد الركعات', type: 'number' },
    ],
    sortOrder: 8,
  },
  {
    categoryId: 'family',
    name: 'البر والصلة',
    icon: 'Users',
    items: [
      { id: 'parents_kindness', label: 'بر الوالدين', type: 'boolean' },
      { id: 'family_visit', label: 'صلة الرحم', type: 'boolean' },
    ],
    sortOrder: 9,
  },
];

/**
 * Returns the categories for a specific user.
 * All users get the 3 base categories; users whose index % 3 === 0 get 2 extra random categories.
 */
export const getCategoriesForUser = (userIndex: number): SeedCategory[] => {
  const categories = [...BASE_CATEGORIES];

  // ~33% of users get extra categories
  if (userIndex % 3 === 0) {
    const extraStart = userIndex % EXTRA_CATEGORIES.length;
    categories.push(EXTRA_CATEGORIES[extraStart]);
    categories.push(EXTRA_CATEGORIES[(extraStart + 1) % EXTRA_CATEGORIES.length]);
  }

  return categories;
};
