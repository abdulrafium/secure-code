import { Controller, Get, UseGuards, Request, UnauthorizedException } from '@nestjs/common';
import { LogsService } from './logs.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('logs')
@UseGuards(JwtAuthGuard)
export class LogsController {
  constructor(private readonly logsService: LogsService) {}

  @Get()
  async getLogs(@Request() req: any) {
    if (req.user?.role !== 'Admin') {
      throw new UnauthorizedException('Only admins can view security logs.');
    }
    return this.logsService.getLogs();
  }
}

