import { Injectable, OnModuleInit } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { StoredUser, UserSyncData } from './user.interface';

const DATA_DIR = path.resolve(__dirname, '..', '..', 'data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const SYNC_FILE = path.join(DATA_DIR, 'sync.json');

@Injectable()
export class UsersService implements OnModuleInit {
  private users: Map<string, StoredUser> = new Map();
  private syncData: Map<string, UserSyncData> = new Map();

  onModuleInit(): void {
    this.ensureDataDir();
    this.loadFromDisk();
  }

  /* ──────────── User CRUD ──────────── */

  findById(uid: string): StoredUser | undefined {
    return this.users.get(uid);
  }

  findByEmail(email: string): StoredUser | undefined {
    return [...this.users.values()].find((u) => u.email === email);
  }

  create(user: StoredUser): StoredUser {
    this.users.set(user.uid, user);
    this.persistUsers();
    return user;
  }

  update(uid: string, partial: Partial<StoredUser>): StoredUser | undefined {
    const existing = this.users.get(uid);
    if (!existing) return undefined;

    const updated: StoredUser = {
      ...existing,
      ...partial,
      updatedAt: new Date().toISOString(),
    };
    this.users.set(uid, updated);
    this.persistUsers();
    return updated;
  }

  getAllUsers(): StoredUser[] {
    return [...this.users.values()];
  }

  /* ──────────── Sync Data ──────────── */

  getSyncData(uid: string): UserSyncData | undefined {
    return this.syncData.get(uid);
  }

  setSyncData(uid: string, data: UserSyncData): UserSyncData {
    this.syncData.set(uid, data);
    this.persistSync();
    return data;
  }

  /* ──────────── Persistence helpers ──────────── */

  private ensureDataDir(): void {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
  }

  private loadFromDisk(): void {
    this.users = this.readJsonMap<StoredUser>(USERS_FILE);
    this.syncData = this.readJsonMap<UserSyncData>(SYNC_FILE);
  }

  private persistUsers(): void {
    this.writeJsonMap(USERS_FILE, this.users);
  }

  private persistSync(): void {
    this.writeJsonMap(SYNC_FILE, this.syncData);
  }

  private readJsonMap<T>(filePath: string): Map<string, T> {
    try {
      if (!fs.existsSync(filePath)) return new Map();
      const raw = fs.readFileSync(filePath, 'utf-8');
      const obj = JSON.parse(raw) as Record<string, T>;
      return new Map(Object.entries(obj));
    } catch {
      return new Map();
    }
  }

  private writeJsonMap<T>(filePath: string, map: Map<string, T>): void {
    const obj = Object.fromEntries(map);
    fs.writeFileSync(filePath, JSON.stringify(obj, null, 2), 'utf-8');
  }
}
