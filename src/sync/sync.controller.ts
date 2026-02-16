import { Controller, Post, Get, Body, UseGuards } from '@nestjs/common';
import { SyncService } from './sync.service';
import { SyncUploadDto } from './dto/sync.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@UseGuards(JwtAuthGuard)
@Controller('sync')
export class SyncController {
  constructor(private readonly syncService: SyncService) {}

  @Post('upload')
  upload(
    @CurrentUser() user: { uid: string },
    @Body() dto: SyncUploadDto,
  ) {
    return this.syncService.upload(user.uid, dto);
  }

  @Get('download')
  download(@CurrentUser() user: { uid: string }) {
    return this.syncService.download(user.uid);
  }
}
