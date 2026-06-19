import { Controller, Post, Body, UnauthorizedException, UseGuards, Request } from '@nestjs/common';
import { AuthService } from './auth.service';
import { Role } from '../users/enums/role.enum';
import { JwtAuthGuard } from './jwt-auth.guard';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  async register(@Body() body: any) {
    // In production, use DTOs with class-validator
    const { username, password, role } = body;
    return this.authService.register(username, password, role || Role.Viewer);
  }

  @Post('login')
  async login(@Body() body: any) {
    const { username, password } = body;
    const user = await this.authService.validateUser(username, password);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (user.status === 'Suspended') {
      throw new UnauthorizedException('Sorry, you are temporarily suspended by the Admin. Contact admin to activate the account.');
    }
    if (user.status === 'Blocked') {
      throw new UnauthorizedException('Sorry, you are permanently blocked by the Admin.');
    }
    return this.authService.login(user);
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout')
  async logout(@Request() req: any) {
    if (req.user && req.user.id) {
      await this.authService.logout(req.user.id);
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
      throw new UnauthorizedException('Reset token and new password are required');
    }
    return this.authService.resetPassword(resetToken, newPassword);
  }
}
