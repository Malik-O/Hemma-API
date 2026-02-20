/**
 * Seed data generator for Users.
 * Produces 120 realistic users with Arabic names, avatars, and varied providers.
 */

const FIRST_NAMES_MALE = [
  'أحمد', 'محمد', 'عمر', 'يوسف', 'خالد', 'علي', 'حسن', 'إبراهيم',
  'عبدالله', 'سعد', 'طارق', 'فهد', 'ماجد', 'ناصر', 'سلطان', 'بدر',
  'عادل', 'زياد', 'أنس', 'حمزة', 'ياسر', 'وليد', 'فيصل', 'مروان',
  'رامي', 'سامي', 'كريم', 'هشام', 'مصطفى', 'رضا',
];

const FIRST_NAMES_FEMALE = [
  'فاطمة', 'سارة', 'مريم', 'نور', 'ليلى', 'هدى', 'رنا', 'دانا',
  'ريم', 'لمى', 'عائشة', 'خديجة', 'أمل', 'رحاب', 'سلمى', 'شيماء',
  'ياسمين', 'لينا', 'حنين', 'جنى', 'روان', 'تالا', 'ملك', 'رغد',
  'إسراء', 'آية', 'وفاء', 'نادية', 'سماح', 'منال',
];

const LAST_NAMES = [
  'الحربي', 'العتيبي', 'القحطاني', 'الشمري', 'الزهراني', 'الغامدي',
  'الدوسري', 'المطيري', 'السبيعي', 'العنزي', 'البلوي', 'الجهني',
  'الرشيدي', 'الحازمي', 'العمري', 'الشهري', 'المالكي', 'الأحمدي',
  'الخالدي', 'السلمي', 'التميمي', 'الهاشمي', 'العلوي', 'المهدي',
  'الصالحي', 'النعيمي', 'الكواري', 'السيد', 'البكري', 'الأنصاري',
];

const DISPLAY_NAME_EN = [
  'Ahmed', 'Mohammed', 'Omar', 'Yousef', 'Khaled', 'Ali', 'Hassan', 'Ibrahim',
  'Abdullah', 'Saad', 'Tariq', 'Fahd', 'Majed', 'Nasser', 'Sultan', 'Badr',
  'Adel', 'Ziad', 'Anas', 'Hamza', 'Yasser', 'Waleed', 'Faisal', 'Marwan',
  'Rami', 'Sami', 'Kareem', 'Hisham', 'Mustafa', 'Reda',
  'Fatima', 'Sara', 'Mariam', 'Nour', 'Layla', 'Huda', 'Rana', 'Dana',
  'Reem', 'Lama', 'Aisha', 'Khadija', 'Amal', 'Rehab', 'Salma', 'Shaimaa',
  'Yasmine', 'Lina', 'Haneen', 'Jana', 'Rawan', 'Tala', 'Malak', 'Raghad',
  'Israa', 'Aya', 'Wafaa', 'Nadia', 'Samah', 'Manal',
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
