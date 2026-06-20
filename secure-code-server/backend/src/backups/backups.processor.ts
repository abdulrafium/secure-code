import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger } from '@nestjs/common';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';
import { LogsService } from '../logs/logs.service';

const execAsync = promisify(exec);

@Processor('system-jobs')
export class BackupsProcessor extends WorkerHost {
  private readonly logger = new Logger(BackupsProcessor.name);

  constructor(private readonly logsService: LogsService) {
    super();
  }

  async process(job: Job<any, any, string>, token?: string): Promise<any> {
    if (job.name === 'export-backup') {
      return this.handleExportBackup(job);
    }
    return { success: false, message: 'Unknown job name' };
  }

  private async handleExportBackup(job: Job): Promise<any> {
    this.logger.log(`Starting backup export job ${job.id}`);

    try {
      const backupDir = path.join(process.cwd(), '..', 'backups');
      if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir, { recursive: true });
      }

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `backup-${timestamp}.sql.gz`;
      const filePath = path.join(backupDir, filename);

      // We extract DB info from DATABASE_URL
      // format: postgresql://USER:PASSWORD@HOST:PORT/DATABASE
      const dbUrl = process.env.DATABASE_URL;
      if (!dbUrl) throw new Error('DATABASE_URL is not set');

      // Use pg_dump via child_process
      // Ensure the Docker container running this has pg_dump installed, or we connect remotely if we use a raw host
      // Since we are inside a node container, we might need to rely on standard pg_dump.
      // If pg_dump isn't installed in the node image, we'll install it in the Dockerfile.

      const command = `pg_dump "${dbUrl}" | gzip > "${filePath}"`;

      await job.updateProgress(20);

      const { stdout, stderr } = await execAsync(command);

      if (stderr) {
        this.logger.warn(`pg_dump stderr: ${stderr}`);
      }

      await job.updateProgress(100);

      // Log to security logs
      if (job.data.userId) {
        await this.logsService.logEvent({
          userId: job.data.userId,
          username: job.data.username || 'System',
          action: 'BACKUP_EXPORT',
          details: `Exported backup to ${filename}`,
          ipAddress: 'Server',
        });
      }

      this.logger.log(`Backup completed: ${filename}`);
      return { success: true, file: filename };
    } catch (error: any) {
      this.logger.error(`Backup failed: ${error.message}`);
      throw error;
    }
  }

  @OnWorkerEvent('completed')
  onCompleted(job: Job) {
    this.logger.log(`Job ${job.id} has completed!`);
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job, error: Error) {
    this.logger.error(`Job ${job.id} has failed: ${error.message}`);
  }
}
