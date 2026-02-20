/**
 * Seed data generator for Users.
 * Produces 120 realistic users with Arabic names, avatars, and varied providers.
 */

const FIRST_NAMES_MALE = [
  'أحمد', 'محمد', 'مصطفى', 'محمود', 'عمر', 'إبراهيم', 'حسن', 'حسين',
  'علي', 'خالد', 'طارق', 'عمرو', 'كريم', 'هشام', 'شريف', 'رامي',
  'تامر', 'أشرف', 'أيمن', 'وائل', 'أسامة', 'ياسر', 'حازم', 'عصام',
  'ممدوح', 'سامح', 'ماجد', 'وليد', 'إسلام', 'يوسف',
];

const FIRST_NAMES_FEMALE = [
  'فاطمة', 'عائشة', 'ياسمين', 'نور', 'منى', 'رانيا', 'دعاء', 'هبة',
  'شيماء', 'أمل', 'إيمان', 'أميرة', 'سماح', 'سحر', 'نجلاء', 'مروة',
  'رحاب', 'شرين', 'منة', 'ندى', 'نورهان', 'سلمى', 'هند', 'رضوى',
  'ماهيتاب', 'نهال', 'دينا', 'غادة', 'ريم', 'روان',
];

const LAST_NAMES = [
  'السيد', 'محمود', 'علي', 'حسن', 'عبدالله', 'إبراهيم', 'عثمان', 'مصطفى',
  'فاروق', 'زكي', 'سعد', 'رشاد', 'فهمي', 'يونس', 'عبدالرحمن', 'فوزي',
  'سليمان', 'خليفة', 'صلاح', 'عمر', 'علام', 'شوقي', 'جمعة', 'عاشور',
  'رمضان', 'عمار', 'الشريف', 'منصور', 'صادق', 'جاد',
];

const DISPLAY_NAME_EN = [
  'Ahmed', 'Mohamed', 'Mostafa', 'Mahmoud', 'Omar', 'Ibrahim', 'Hassan', 'Hussein',
  'Ali', 'Khaled', 'Tarek', 'Amr', 'Karim', 'Hesham', 'Sherif', 'Ramy',
  'Tamer', 'Ashraf', 'Ayman', 'Wael', 'Osama', 'Yasser', 'Hazem', 'Essam',
  'Mamdouh', 'Sameh', 'Maged', 'Waleed', 'Eslam', 'Youssef',
  'Fatma', 'Aisha', 'Yasmine', 'Nour', 'Mona', 'Rania', 'Doaa', 'Heba',
  'Shaimaa', 'Amal', 'Eman', 'Amira', 'Samah', 'Sahar', 'Naglaa', 'Marwa',
  'Rehab', 'Sherine', 'Menna', 'Nada', 'Nourhan', 'Salma', 'Hend', 'Radwa',
  'Mahitab', 'Nihal', 'Dina', 'Ghada', 'Reem', 'Rawan',
];

export interface SeedUser {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string;
  provider: 'google' | 'local';
  showOnLeaderboard: boolean;
}

/**
 * Generates an array of 120 seed users.
 * @returns Array of user objects ready for DB insertion.
 */
export const generateUsers = (count = 120): SeedUser[] => {
  const users: SeedUser[] = [];
  const allFirstNames = [...FIRST_NAMES_MALE, ...FIRST_NAMES_FEMALE];

  for (let i = 0; i < count; i++) {
    const firstName = allFirstNames[i % allFirstNames.length];
    const lastName = LAST_NAMES[i % LAST_NAMES.length];
    const englishName = DISPLAY_NAME_EN[i % DISPLAY_NAME_EN.length];
    const suffix = i >= allFirstNames.length ? `_${Math.floor(i / allFirstNames.length)}` : '';

    const uid = `seed_user_${i + 1}`;
    const email = `${englishName.toLowerCase()}${suffix || (i + 1)}@test.com`;
    const displayName = `${firstName} ${lastName}`;

    users.push({
      uid,
      email,
      displayName,
      photoURL: `https://ui-avatars.com/api/?name=${encodeURIComponent(englishName)}&background=random&size=128`,
      provider: i % 5 === 0 ? 'google' : 'local', // ~20% Google users
      showOnLeaderboard: i % 8 !== 0, // ~87.5% on leaderboard
    });
  }

  return users;
};
