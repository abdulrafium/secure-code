import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SecurityLog } from './entities/security-log.entity';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class LogsService {
  constructor(
    @InjectRepository(SecurityLog)
    private logsRepository: Repository<SecurityLog>,
  ) {}

  async logThreat(data: {
    userId?: string;
    username?: string;
    action: string;
    details: string;
    ipAddress?: string;
  }) {
    const log = this.logsRepository.create(data);
    return await this.logsRepository.save(log);
  }

  // General system-wide audit trailing
  async logEvent(data: {
    userId?: string;
    username?: string;
    action: string;
    details: string;
    ipAddress?: string;
  }) {
    const log = this.logsRepository.create(data);
    return await this.logsRepository.save(log);
  }

  async getLogs() {
    return await this.logsRepository.find({
      order: { createdAt: 'DESC' },
      take: 100,
    });
  }

  async deleteLog(id: string) {
    return await this.logsRepository.delete(id);
  }

  async saveSessionEvents(
    userId: string,
    username: string,
    projectId: string,
    sessionId: string,
    events: any[],
  ) {
    try {
      const sessionDir = path.join(process.cwd(), '..', 'sessions');
      if (!fs.existsSync(sessionDir)) {
        fs.mkdirSync(sessionDir, { recursive: true });
      }

      const fileName = `session_${projectId}_${userId}_${sessionId}.json`;
      const filePath = path.join(sessionDir, fileName);

      let existingEvents: any[] = [];
      if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, 'utf-8');
        try {
          existingEvents = JSON.parse(content);
        } catch (e) {}
      }

      existingEvents.push(...events);
      fs.writeFileSync(filePath, JSON.stringify(existingEvents));
      return { success: true };
    } catch (error) {
      console.error('Failed to save session events', error);
      return { success: false };
    }
  }

  async getSessionsList() {
    try {
      const sessionDir = path.join(process.cwd(), '..', 'sessions');
      if (!fs.existsSync(sessionDir)) return [];
      
      const files = fs.readdirSync(sessionDir).filter(f => f.endsWith('.json'));
      const sessions = files.map(file => {
        const stats = fs.statSync(path.join(sessionDir, file));
        // Parse filename: session_projectId_userId_sessionId.json (or legacy session_projectId_userId.json)
        const parts = file.replace('.json', '').split('_');
        return {
          filename: file,
          projectId: parts[1] || 'Unknown',
          userId: parts[2] || 'Unknown',
          sessionId: parts[3] || 'Legacy',
          size: stats.size,
          updatedAt: stats.mtime
        };
      });
      return sessions.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
    } catch (error) {
      console.error('Failed to list sessions', error);
      return [];
    }
  }

  async getSessionData(filename: string) {
    try {
      // Basic sanitization
      const safeFilename = path.basename(filename);
      const filePath = path.join(process.cwd(), '..', 'sessions', safeFilename);
      
      if (!fs.existsSync(filePath)) {
        return [];
      }
      
      const content = fs.readFileSync(filePath, 'utf-8');
      return JSON.parse(content);
    } catch (error) {
      console.error('Failed to read session data', error);
      return [];
    }
  }

  async deleteSession(filename: string) {
    try {
      const safeFilename = path.basename(filename);
      const filePath = path.join(process.cwd(), '..', 'sessions', safeFilename);
      
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        return { success: true, message: 'Session deleted successfully' };
      }
      return { success: false, message: 'Session not found' };
    } catch (error) {
      console.error('Failed to delete session', error);
      return { success: false, message: 'Failed to delete session' };
    }
  }
}
