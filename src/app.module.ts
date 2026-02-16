import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { SyncModule } from './sync/sync.module';
import { LeaderboardModule } from './leaderboard/leaderboard.module';
import { UsersModule } from './users/users.module';

@Module({
  imports: [AuthModule, UsersModule, SyncModule, LeaderboardModule],
})
export class AppModule {}
