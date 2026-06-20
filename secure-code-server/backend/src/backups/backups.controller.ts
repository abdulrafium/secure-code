import {
  Controller,
  Post,
  Get,
  Param,
  UseGuards,
  Request,
  ForbiddenException,
} from '@nestjs/common';
import { BackupsService } from './backups.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('backups')
export class BackupsController {
  constructor(private readonly backupsService: BackupsService) {}

  @UseGuards(JwtAuthGuard)
  @Post('export')
  async triggerExport(@Request() req: any) {
    if (req.user.role !== 'Admin') {
      throw new ForbiddenException('Only Admins can trigger backups');
    }
    return this.backupsService.triggerBackup(req.user.id, req.user.username);
  }

  @UseGuards(JwtAuthGuard)
  @Get('status/:jobId')
  async getStatus(@Param('jobId') jobId: string, @Request() req: any) {
    if (req.user.role !== 'Admin') {
      throw new ForbiddenException('Only Admins can view backup status');
    }
    return this.backupsService.getBackupStatus(jobId);
  }
}
