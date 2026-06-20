import {
  Controller,
  Post,
  Get,
  Param,
  UseGuards,
  Request,
  Body,
  ForbiddenException,
} from '@nestjs/common';
import { BackupsService } from './backups.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@Controller('backups')
export class BackupsController {
  constructor(private readonly backupsService: BackupsService) {}

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('Admin')
  async listBackups() {
    return this.backupsService.listBackups();
  }

  @Post('export')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('Admin')
  async exportBackup(@Request() req: any) {
    return this.backupsService.triggerBackup(req.user.id, req.user.username);
  }

  @Post('restore')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('Admin')
  async restoreBackup(@Request() req: any, @Body('filename') filename: string) {
    return this.backupsService.triggerRestore(req.user.id, req.user.username, filename);
  }

  @Get('job/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('Admin')
  async getJobStatus(@Param('id') jobId: string) {
    return this.backupsService.getBackupStatus(jobId);
  }
}
