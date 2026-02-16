import { Injectable } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { UserSyncData } from '../users/user.interface';

@Injectable()
export class SyncService {
  constructor(private readonly usersService: UsersService) {}

  upload(
    uid: string,
    data: {
      trackerState: Record<string, unknown>;
      customHabits: unknown[];
      currentDay: number;
      theme: string;
    },
  ): UserSyncData {
    const syncData: UserSyncData = {
      ...data,
      lastSynced: new Date().toISOString(),
    };
    return this.usersService.setSyncData(uid, syncData);
  }

  download(uid: string): UserSyncData {
    const existing = this.usersService.getSyncData(uid);

    if (!existing) {
      return {
        trackerState: {},
        customHabits: [],
        currentDay: 0,
        theme: 'dark',
        lastSynced: new Date().toISOString(),
      };
    }

    return existing;
  }
}
