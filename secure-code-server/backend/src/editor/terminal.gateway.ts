import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs';
import { EditorService } from './editor.service';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Project } from '../projects/entities/project.entity';
// We use require for node-pty as its types can sometimes be problematic in strict mode
const pty = require('node-pty');

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class TerminalGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  constructor(
    private readonly editorService: EditorService,
    private readonly jwtService: JwtService,
    @InjectRepository(Project)
    private readonly projectsRepository: Repository<Project>
  ) {}

  // Map socket IDs to their PTY instances
  private ptys = new Map<string, any>();
  // Map socket IDs to their input buffers
  private inputBuffers = new Map<string, string>();
  // Map socket IDs to their user object
  private users = new Map<string, any>();

  // Map<projectId, Map<userId, count>> for real-time online tracking
  public static projectSessions = new Map<string, Map<string, number>>();
  // Map<socketId, { projectId: string, userId: string }>
  private static socketSessions = new Map<string, { projectId: string; userId: string }>();

  async handleConnection(client: Socket) {
    console.log(`Terminal client connected: ${client.id}`);
    
    // Determine the shell based on the OS
    const shell = os.platform() === 'win32' ? 'powershell.exe' : 'bash';
    const projectId = client.handshake.query?.projectId as string;
    
    // Set cwd to the workspace directory
    let cwd = process.env.WORKSPACES_DIR || path.resolve(process.cwd(), '..', 'workspaces');
    
    const token = client.handshake.query?.token as string;
    let user: any = null;
    if (token) {
      try {
        user = this.jwtService.verify(token, { secret: process.env.JWT_SECRET || 'fallback_secret' });
        this.users.set(client.id, user);
      } catch (e) {
        console.error('Failed to verify token for terminal', e);
      }
    }

    if (projectId && user) {
      TerminalGateway.socketSessions.set(client.id, { projectId, userId: user.id });
      let projectMap = TerminalGateway.projectSessions.get(projectId);
      if (!projectMap) {
        projectMap = new Map<string, number>();
        TerminalGateway.projectSessions.set(projectId, projectMap);
      }
      projectMap.set(user.id, (projectMap.get(user.id) || 0) + 1);
    }

    if (projectId) {
      try {
        cwd = await this.editorService.getRootPath(projectId);
      } catch (e) {
        console.error('Failed to resolve workspace directory for terminal', e);
      }
    }

    // Prevent zombie terminals: Check if the client disconnected while we were awaiting the DB!
    if (client.disconnected) {
      console.log(`Client ${client.id} disconnected before terminal could be spawned.`);
      return;
    }

    // Ensure the directory exists before spawning terminal
    if (projectId && !fs.existsSync(cwd)) {
      try {
        fs.mkdirSync(cwd, { recursive: true });
      } catch (e) {
        console.error('Failed to create workspace directory for terminal', e);
      }
    }

    try {
      const ptyProcess = pty.spawn(shell, [], {
        name: 'xterm-color',
        cols: 80,
        rows: 24,
        cwd,
        env: process.env as any,
      });

      // Stream terminal output back to the specific client
      ptyProcess.onData((data: string) => {
        client.emit('terminal.output', data);
      });

      this.ptys.set(client.id, ptyProcess);
    } catch (err) {
      console.error('Failed to spawn terminal:', err);
    }
  }

  handleDisconnect(client: Socket) {
    console.log(`Terminal client disconnected: ${client.id}`);
    const session = TerminalGateway.socketSessions.get(client.id);
    if (session) {
      const { projectId, userId } = session;
      const projectMap = TerminalGateway.projectSessions.get(projectId);
      if (projectMap) {
        const count = projectMap.get(userId) || 0;
        if (count > 1) {
          projectMap.set(userId, count - 1);
        } else {
          projectMap.delete(userId);
          if (projectMap.size === 0) {
            TerminalGateway.projectSessions.delete(projectId);
          }
        }
      }
      TerminalGateway.socketSessions.delete(client.id);
    }

    const ptyProcess = this.ptys.get(client.id);
    if (ptyProcess) {
      ptyProcess.kill();
      this.ptys.delete(client.id);
      this.inputBuffers.delete(client.id);
      this.users.delete(client.id);
    }
  }

  @SubscribeMessage('terminal.input')
  async handleTerminalInput(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: string,
  ) {
    const ptyProcess = this.ptys.get(client.id);
    if (ptyProcess) {
      const user = this.users.get(client.id);
      if (user && user.role !== 'Admin') {
        const projectId = client.handshake.query?.projectId as string;
        if (projectId) {
          const project = await this.projectsRepository.findOne({ where: { id: projectId } });
          if (project && project.allowedCommands && project.allowedCommands.length > 0) {
            let buffer = this.inputBuffers.get(client.id) || '';
            
            if (data === '\r') {
              const cmd = buffer.trim();
              for (const restrictedCmd of project.allowedCommands) {
                if (cmd === restrictedCmd || cmd.startsWith(restrictedCmd + ' ')) {
                  client.emit('terminal.output', `\r\n\x1b[31mError: You are not allowed by admin to run this command: ${restrictedCmd}\x1b[0m\r\n`);
                  this.inputBuffers.set(client.id, '');
                  return; // Block execution
                }
              }
              this.inputBuffers.set(client.id, '');
            } else if (data === '\x7f' || data === '\b') {
              buffer = buffer.slice(0, -1);
              this.inputBuffers.set(client.id, buffer);
            } else if (data === '\x03') { // Ctrl+C
              this.inputBuffers.set(client.id, '');
            } else {
              buffer += data;
              this.inputBuffers.set(client.id, buffer);
            }
          }
        }
      }

      ptyProcess.write(data);
    }
  }
  @SubscribeMessage('terminal.resize')
  handleTerminalResize(
    @ConnectedSocket() client: Socket,
    @MessageBody() size: { cols: number; rows: number },
  ) {
    const ptyProcess = this.ptys.get(client.id);
    if (ptyProcess && size.cols && size.rows) {
      try {
        ptyProcess.resize(size.cols, size.rows);
      } catch (err) {
        console.error('Resize error:', err);
      }
    }
  }
}
