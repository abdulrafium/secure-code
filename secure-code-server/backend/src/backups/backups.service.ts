import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { Cron, CronExpression } from '@nestjs/schedule';

@Injectable()
export class BackupsService {
  private readonly logger = new Logger(BackupsService.name);

  constructor(@InjectQueue('system-jobs') private systemJobsQueue: Queue) {}

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async handleDailyBackup() {
    this.logger.log('Triggering automated daily backup...');
    await this.systemJobsQueue.add('export-backup', {
      userId: 'system',
      username: 'System Automated',
      triggeredAt: new Date().toISOString(),
    });
  }

  async triggerBackup(userId: string, username: string) {
    this.logger.log(`Manual backup triggered by ${username}`);
    const job = await this.systemJobsQueue.add('export-backup', {
      userId,
      username,
      triggeredAt: new Date().toISOString(),
    });
    return {
      success: true,
      jobId: job.id,
      message: 'Backup job added to queue',
    };
  }

  async getBackupStatus(jobId: string) {
    const job = await this.systemJobsQueue.getJob(jobId);
    if (!job) return { status: 'NOT_FOUND' };

    const state = await job.getState();
    const progress = job.progress;
    return {
      status: state,
      progress,
      returnvalue: job.returnvalue,
      failedReason: job.failedReason,
    };
  }
}
