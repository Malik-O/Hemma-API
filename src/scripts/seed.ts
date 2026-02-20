/**
 * Database Seed Script
 * ====================
 * Seeds the database with 120 users, 15 groups, categories, habit entries,
 * and sync data across all tables.
 *
 * Usage: npm run seed
 */
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

// Models
import User from '../models/User';
import HabitCategory from '../models/HabitCategory';
import HabitEntry from '../models/HabitEntry';
import Group from '../models/Group';
import SyncData from '../models/SyncData';

// Data generators
import { generateUsers } from './seed-data/users';
import { getCategoriesForUser, SeedCategory } from './seed-data/categories';
import { generateEntries } from './seed-data/entries';
import { generateGroups } from './seed-data/groups';
import { generateSyncData } from './seed-data/syncData';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

// ─── DB Connection ────────────────────────────────────────────────

const connectDB = async (): Promise<void> => {
  try {
    const uri = process.env.MONGO_URI || 'mongodb://localhost:27017/ramadan_habits';
    await mongoose.connect(uri);
    console.log(`✅ MongoDB Connected: ${uri}`);
  } catch (error) {
    console.error('❌ Database connection failed', error);
    process.exit(1);
  }
};

// ─── Cleanup ──────────────────────────────────────────────────────

const cleanupSeedData = async (userIds: string[]): Promise<void> => {
  console.log('🧹 Cleaning up existing seed data...');

  await Promise.all([
    User.deleteMany({ uid: { $in: userIds } }),
    HabitCategory.deleteMany({ uid: { $in: userIds } }),
    HabitEntry.deleteMany({ uid: { $in: userIds } }),
    SyncData.deleteMany({ uid: { $in: userIds } }),
    Group.deleteMany({ adminUid: { $in: userIds } }),
  ]);

  console.log('   ✔ Cleanup complete');
};

// ─── Seed Users ───────────────────────────────────────────────────

const seedUsers = async (users: ReturnType<typeof generateUsers>): Promise<void> => {
  console.log(`👤 Seeding ${users.length} users...`);

  await User.insertMany(
    users.map((u) => ({
      ...u,
      createdAt: new Date(),
      updatedAt: new Date(),
    })),
  );

  console.log(`   ✔ ${users.length} users inserted`);
};

// ─── Seed Categories ──────────────────────────────────────────────

const seedCategories = async (
  users: ReturnType<typeof generateUsers>,
): Promise<Map<string, SeedCategory[]>> => {
  console.log('📂 Seeding categories...');

  const userCategoriesMap = new Map<string, SeedCategory[]>();
  const allCategories: Array<{ uid: string } & SeedCategory> = [];

  for (let i = 0; i < users.length; i++) {
    const categories = getCategoriesForUser(i);
    userCategoriesMap.set(users[i].uid, categories);

    for (const cat of categories) {
      allCategories.push({ uid: users[i].uid, ...cat });
    }
  }

  await HabitCategory.insertMany(allCategories);
  console.log(`   ✔ ${allCategories.length} categories inserted`);

  return userCategoriesMap;
};

// ─── Seed Entries ─────────────────────────────────────────────────

const seedEntries = async (
  users: ReturnType<typeof generateUsers>,
  userCategories: Map<string, SeedCategory[]>,
): Promise<void> => {
  console.log('📝 Seeding habit entries (30 days)...');

  const entries = generateEntries(users, userCategories);

  // Batch insert in chunks of 5000 to avoid memory issues
  const BATCH_SIZE = 5000;
  for (let i = 0; i < entries.length; i += BATCH_SIZE) {
    const batch = entries.slice(i, i + BATCH_SIZE);
    await HabitEntry.insertMany(batch, { ordered: false });
    console.log(`   📊 Inserted batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(entries.length / BATCH_SIZE)}`);
  }

  console.log(`   ✔ ${entries.length} habit entries inserted`);
};

// ─── Seed Groups ──────────────────────────────────────────────────

const seedGroups = async (users: ReturnType<typeof generateUsers>): Promise<void> => {
  console.log('👥 Seeding groups...');

  const groups = generateGroups(users);

  await Group.insertMany(
    groups.map((g) => ({
      ...g,
      createdAt: new Date(),
      updatedAt: new Date(),
    })),
  );

  console.log(`   ✔ ${groups.length} groups inserted`);
};

// ─── Seed SyncData ────────────────────────────────────────────────

const seedSyncData = async (users: ReturnType<typeof generateUsers>): Promise<void> => {
  console.log('🔄 Seeding sync data...');

  const syncData = generateSyncData(users);
  await SyncData.insertMany(syncData);

  console.log(`   ✔ ${syncData.length} sync records inserted`);
};

// ─── Main ─────────────────────────────────────────────────────────

export const runSeed = async (isScript = false): Promise<void> => {
  if (isScript) {
    await connectDB();
  }


  const users = generateUsers(120);
  const userIds = users.map((u) => u.uid);

  await cleanupSeedData(userIds);
  await seedUsers(users);

  const userCategories = await seedCategories(users);

  await seedEntries(users, userCategories);
  await seedGroups(users);
  await seedSyncData(users);

  console.log('\n🎉 Seed completed successfully!');
  console.log('─────────────────────────────────');
  console.log(`   Users:       120`);
  console.log(`   Groups:      15`);
  console.log(`   Categories:  ${[...userCategories.values()].reduce((sum, cats) => sum + cats.length, 0)}`);
  console.log(`   Days seeded: 30`);
  console.log('─────────────────────────────────');

  if (isScript) {
    process.exit(0);
  }
};

// Check if run directly via ts-node or node
if (typeof require !== 'undefined' && require.main === module) {
  runSeed(true);
}
