import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import User from '../models/User';
import HabitCategory from '../models/HabitCategory';
import HabitEntry from '../models/HabitEntry';

// Load .env relative to this file
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const connectDB = async () => {
    try {
        const uri = process.env.MONGO_URI || 'mongodb://localhost:27017/ramadan_habits';
        await mongoose.connect(uri);
        console.log(`MongoDB Connected: ${uri}`);
    } catch (error) {
        console.error('Database connection failed', error);
        process.exit(1);
    }
};

const users = [
    {
        uid: 'user_1_ahmed',
        email: 'ahmed@test.com',
        displayName: 'Ahmed Ali',
        photoURL: 'https://ui-avatars.com/api/?name=Ahmed+Ali&background=random',
        provider: 'local',
        showOnLeaderboard: true,
    },
    {
        uid: 'user_2_fatima',
        email: 'fatima@test.com',
        displayName: 'Fatima Zohra',
        photoURL: 'https://ui-avatars.com/api/?name=Fatima+Zohra&background=random',
        provider: 'local',
        showOnLeaderboard: true,
    },
    {
        uid: 'user_3_omar',
        email: 'omar@test.com',
        displayName: 'Omar Khaled',
        photoURL: 'https://ui-avatars.com/api/?name=Omar+Khaled&background=random',
        provider: 'local',
        showOnLeaderboard: true,
    },
     {
        uid: 'user_4_sara',
        email: 'sara@test.com',
        displayName: 'Sara Hassan',
        photoURL: 'https://ui-avatars.com/api/?name=Sara+Hassan&background=random',
        provider: 'local',
        showOnLeaderboard: true,
    },
     {
        uid: 'user_5_yousef',
        email: 'yousef@test.com',
        displayName: 'Yousef Salem',
        photoURL: 'https://ui-avatars.com/api/?name=Yousef+Salem&background=random',
        provider: 'local',
        showOnLeaderboard: true,
    },
];

const categoriesData = [
    {
        categoryId: 'prayers',
        name: 'الصلوات',
        icon: 'Moon',
        items: [
            { id: 'fajr', label: 'الفجر', type: 'boolean' as const },
            { id: 'dhuhr', label: 'الظهر', type: 'boolean' as const },
            { id: 'asr', label: 'العصر', type: 'boolean' as const },
            { id: 'maghrib', label: 'المغرب', type: 'boolean' as const },
            { id: 'isha', label: 'العشاء', type: 'boolean' as const },
        ],
        sortOrder: 1,
    },
    {
        categoryId: 'quran',
        name: 'القرآن',
        icon: 'BookOpen',
        items: [
            { id: 'pages_read', label: 'صفحات مقروءة', type: 'number' as const },
        ],
        sortOrder: 2,
    },
    {
        categoryId: 'sunan',
        name: 'السنن',
        icon: 'Star',
        items: [
            { id: 'duha', label: 'صلاة الضحى', type: 'boolean' as const },
            { id: 'witir', label: 'صلاة الوتر', type: 'boolean' as const },
        ],
        sortOrder: 3,
    },
];

const seed = async () => {
    await connectDB();

    console.log('Cleaning up existing test data...');
    // We only remove data for our test users to preserve real data (if any)
    const userIds = users.map(u => u.uid);
    
    await User.deleteMany({ uid: { $in: userIds } });
    await HabitCategory.deleteMany({ uid: { $in: userIds } });
    await HabitEntry.deleteMany({ uid: { $in: userIds } });

    console.log('Seeding Users...');
    // Using simple loop to allow validation if needed, but insertMany is faster
    await User.insertMany(users.map(u => ({
        ...u,
        createdAt: new Date(),
        updatedAt: new Date(),
    })));

    console.log('Seeding Categories...');
    const allCategories = [];
    for (const user of users) {
        for (const cat of categoriesData) {
            allCategories.push({
                uid: user.uid,
                ...cat,
            });
        }
    }
    await HabitCategory.insertMany(allCategories);

    console.log('Seeding Habit Entries...');
    const entries = [];
    const DAYS_TO_SEED = 15; // Seed 15 days of data

    for (const user of users) {
        // Random "consistency" factor for each user (0.4 to 0.95)
        // Some users are more consistent than others
        const consistency = 0.4 + Math.random() * 0.55; 

        for (let day = 0; day < DAYS_TO_SEED; day++) {
             // Each category
             for (const cat of categoriesData) {
                 for (const item of cat.items) {
                     let value: boolean | number;
                     
                     // Add some randomness to "miss" a habit even if consistent
                     const performed = Math.random() < consistency;

                     if (item.type === 'boolean') {
                         value = performed;
                     } else {
                         // Number (like quran pages)
                         // If performed, read between 5 and 20 pages
                         value = performed ? Math.floor(Math.random() * 15) + 5 : 0;
                     }

                     entries.push({
                         uid: user.uid,
                         dayIndex: day,
                         habitId: item.id,
                         value: value,
                         updatedAt: new Date(),
                     });
                 }
             }
        }
    }
    
    // Batch insert entries
    if (entries.length > 0) {
        await HabitEntry.insertMany(entries);
        console.log(`Inserted ${entries.length} habit entries.`);
    }

    console.log('Seed completed successfully!');
    process.exit(0);
};

seed();
