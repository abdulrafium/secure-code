import {
  Controller,
  Post,
  Body,
  UnauthorizedException,
  UseGuards,
  Request,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { LogsService } from '../logs/logs.service';
import { SettingsService } from '../settings/settings.service';
import { Role } from '../users/enums/role.enum';
import { JwtAuthGuard } from './jwt-auth.guard';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly logsService: LogsService,
    private readonly settingsService: SettingsService,
  ) {}

  @Post('login')
  async login(@Body() body: any, @Request() req: any) {
    const { username, password } = body;
    const user = await this.authService.validateUser(username, password);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (user.status === 'Suspended') {
      throw new UnauthorizedException(
        'Sorry, you are temporarily suspended by the Admin. Contact admin to activate the account.',
      );
    }
    if (user.status === 'Blocked') {
      throw new UnauthorizedException(
        'Sorry, you are permanently blocked by the Admin.',
      );
    }

    const maintenanceMode = await this.settingsService.getSetting(
      'maintenanceMode',
      false,
    );
    if (maintenanceMode && user.role !== Role.Admin) {
      this.logsService
        .logEvent({
          userId: user.id,
          username: user.username,
          action: 'BLOCKED_LOGIN_MAINTENANCE',
          details: 'Attempted to log in during maintenance mode.',
          ipAddress:
            req.headers['x-forwarded-for'] ||
            req.connection?.remoteAddress ||
            req.socket?.remoteAddress ||
            'unknown',
        })
        .catch((e) => console.error('Failed to log event:', e));
      throw new UnauthorizedException(
        'System is currently in maintenance mode. Only Admins can log in.',
      );
    }

    // IP Whitelisting Enforcement
    let clientIp =
      req.headers['x-forwarded-for'] ||
      req.connection?.remoteAddress ||
      req.socket?.remoteAddress ||
      'unknown';
    if (typeof clientIp === 'string') {
      clientIp = clientIp.split(',')[0].trim();
    }

    // IP Whitelisting Enforcement
    if (user.allowIp && user.allowIp.trim() !== '') {
      // Simple string match for MVP. In production, CIDR matching might be needed.
      if (clientIp !== user.allowIp.trim()) {
        this.logsService
          .logThreat({
            userId: user.id,
            username: user.username,
            action: 'BLOCKED_IP_LOGIN',
            details: `Attempted to log in from unauthorized IP address: ${clientIp} (Expected: ${user.allowIp.trim()})`,
            ipAddress: clientIp,
          })
          .catch((e) => console.error('Failed to log threat:', e));

        throw new UnauthorizedException('Access denied from this IP address.');
      }
    }

    this.logsService
      .logEvent({
        userId: user.id,
        username: user.username,
        action: 'LOGIN',
        details: 'User logged in successfully.',
        ipAddress: clientIp,
      })
      .catch((e) => console.error('Failed to log event:', e));

    return this.authService.login(user);
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout')
  async logout(@Request() req: any) {
    if (req.user && req.user.id) {
      await this.authService.logout(req.user.id);
      
      let clientIp =
        req.headers['x-forwarded-for'] ||
        req.connection?.remoteAddress ||
        req.socket?.remoteAddress ||
        'unknown';
      if (typeof clientIp === 'string') {
        clientIp = clientIp.split(',')[0].trim();
      }

      this.logsService
        .logEvent({
          userId: req.user.id,
          username: req.user.username,
          action: 'LOGOUT',
          details: 'User logged out successfully.',
          ipAddress: clientIp,
        })
        .catch((e) => console.error('Failed to log event:', e));
    }
    return { message: 'Logged out successfully' };
  }

  @Post('verify-backup-code')
  async verifyBackupCode(@Body() body: any) {
    const { username, backupCode } = body;
    if (!username || !backupCode) {
      throw new UnauthorizedException('Username and backup code are required');
    }
    return this.authService.verifyBackupCode(username, backupCode);
  }

  @Post('reset-password')
  async resetPassword(@Body() body: any) {
    const { resetToken, newPassword } = body;
    if (!resetToken || !newPassword) {
      throw new UnauthorizedException(
        'Reset token and new password are required',
      );
    }
    return this.authService.resetPassword(resetToken, newPassword);
  }
}
