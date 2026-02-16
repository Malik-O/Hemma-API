import { Controller, Get, UseGuards } from '@nestjs/common';
import { LeaderboardService } from './leaderboard.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('leaderboard')
export class LeaderboardController {
  constructor(private readonly leaderboardService: LeaderboardService) {}

  @UseGuards(JwtAuthGuard)
  @Get()
  getLeaderboard() {
    return this.leaderboardService.getLeaderboard();
  }
}
