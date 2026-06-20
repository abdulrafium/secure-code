import {
  Controller,
  Get,
  Patch,
  Body,
  UseGuards,
  Request,
  UnauthorizedException,
} from '@nestjs/common';
import { SettingsService } from './settings.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { LogsService } from '../logs/logs.service';
import { Role } from '../users/enums/role.enum';

@Controller('settings')
export class SettingsController {
  constructor(
    private readonly settingsService: SettingsService,
    private readonly logsService: LogsService,
  ) {}

  @Get('public')
  async getPublicSettings() {
    const maintenanceMode = await this.settingsService.getSetting(
      'maintenanceMode',
      false,
    );
    const systemMessage = await this.settingsService.getSetting(
      'systemMessage',
      '',
    );
    const showSystemMessage = await this.settingsService.getSetting(
      'showSystemMessage',
      false,
    );
    return { maintenanceMode, systemMessage, showSystemMessage };
  }

  @UseGuards(JwtAuthGuard)
  @Get()
  async getSettings(@Request() req: any) {
    // Only Admin can view settings
    if (req.user.role !== Role.Admin) {
      throw new UnauthorizedException('Only Admins can view settings');
    }
    return this.settingsService.getAllSettings();
  }

  @UseGuards(JwtAuthGuard)
  @Patch()
  async updateSettings(@Request() req: any, @Body() body: any) {
    if (req.user.role !== Role.Admin) {
      throw new UnauthorizedException('Only Admins can modify settings');
    }

    const updated = await this.settingsService.updateMultiple(body);

    this.logsService
      .logEvent({
        userId: req.user.id,
        username: req.user.username,
        action: 'UPDATE_SETTINGS',
        details: `Updated system settings: ${Object.keys(body).join(', ')}`,
        ipAddress:
          req.headers['x-forwarded-for'] ||
          req.connection?.remoteAddress ||
          req.socket?.remoteAddress,
      })
      .catch((e) => console.error(e));

    return updated;
  }
}
