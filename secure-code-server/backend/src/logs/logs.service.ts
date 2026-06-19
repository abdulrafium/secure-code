import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SecurityLog } from './entities/security-log.entity';

@Injectable()
export class LogsService {
  constructor(
    @InjectRepository(SecurityLog)
    private logsRepository: Repository<SecurityLog>,
  ) {}

  async logThreat(data: { userId?: string; username?: string; action: string; details: string; ipAddress?: string }) {
    const log = this.logsRepository.create(data);
    return await this.logsRepository.save(log);
  }

  async getLogs() {
    return await this.logsRepository.find({ order: { createdAt: 'DESC' }, take: 100 });
  }
}
