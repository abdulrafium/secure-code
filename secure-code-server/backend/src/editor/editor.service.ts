import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Project } from '../projects/entities/project.entity';
import * as fs from 'fs';
import * as path from 'path';

export interface FileNode {
  name: string;
  path: string;
  isDirectory: boolean;
  children?: FileNode[];
}

@Injectable()
export class EditorService {
  constructor(
    @InjectRepository(Project)
    private projectsRepository: Repository<Project>,
  ) {}

  private sanitizeProjectName(name: string): string {
    return name.replace(/[^a-zA-Z0-9-_\.]/g, '_');
  }

  async checkFileAccess(projectId: string | undefined, targetPath: string, user: any): Promise<void> {
    if (!projectId || !user || !targetPath) return;
    if (user.role === 'Admin') return; // Admins bypass restrictions

    const project = await this.projectsRepository.findOne({ where: { id: projectId } });
    if (!project) return;

    if (project.allowedFiles && project.allowedFiles.length > 0) {
      // It's a blacklist
      for (const restrictedPath of project.allowedFiles) {
        if (targetPath === restrictedPath || targetPath.startsWith(restrictedPath + '/')) {
          throw new BadRequestException('Not Allowed: This file or folder is restricted by the admin.');
        }
      }
    }
  }

  async getRootPath(projectId?: string): Promise<string> {
    if (projectId) {
      const project = await this.projectsRepository.findOne({ where: { id: projectId } });
      if (!project) {
        throw new BadRequestException('Project not found');
      }
      const safeName = this.sanitizeProjectName(project.name);
      const workspacesDir = path.resolve(process.cwd(), '..', 'workspaces');
      const newPath = path.join(workspacesDir, safeName);
      const oldPath = path.join(workspacesDir, projectId);

      if (fs.existsSync(oldPath) && !fs.existsSync(newPath)) {
        try {
          await fs.promises.rename(oldPath, newPath);
        } catch (e) {
          console.error(`Failed to migrate workspace from ${oldPath} to ${newPath}`, e);
        }
      }

      return newPath;
    }
    return path.resolve(process.cwd(), '..');
  }

  async getTree(dirPath: string = '', projectId?: string, recursive: boolean = false): Promise<any[]> {
    const rootPath = await this.getRootPath(projectId);
    const targetPath = path.join(rootPath, dirPath);
    
    if (!targetPath.startsWith(rootPath)) {
      throw new BadRequestException('Invalid path');
    }

    try {
      if (!fs.existsSync(targetPath)) return [];

      const readDirRecursive = async (currentPath: string, relativeDir: string) => {
        const items = await fs.promises.readdir(currentPath, { withFileTypes: true });
        const nodes: any[] = [];
        
        for (const item of items) {
          if (item.name === '.git' || item.name === 'node_modules') continue;

          const nodePath = path.join(relativeDir, item.name);
          const fullItemPath = path.join(currentPath, item.name);
          
          const node: any = {
            name: item.name,
            path: nodePath.replace(/\\/g, '/'),
            isDirectory: item.isDirectory(),
          };

          if (item.isDirectory() && recursive) {
            node.children = await readDirRecursive(fullItemPath, nodePath);
          }
          nodes.push(node);
        }

        nodes.sort((a, b) => {
          if (a.isDirectory === b.isDirectory) {
            return a.name.localeCompare(b.name);
          }
          return a.isDirectory ? -1 : 1;
        });

        return nodes;
      };

      return await readDirRecursive(targetPath, dirPath);
    } catch (err) {
      if (err.code === 'ENOENT') return [];
      throw new BadRequestException(`Failed to read directory: ${err.message}`);
    }
  }

  async readFile(filePath: string, projectId?: string): Promise<string> {
    const rootPath = await this.getRootPath(projectId);
    const targetPath = path.join(rootPath, filePath);
    
    if (!targetPath.startsWith(rootPath)) {
      throw new BadRequestException('Invalid path');
    }

    try {
      return await fs.promises.readFile(targetPath, 'utf8');
    } catch (err) {
      if (err.code === 'ENOENT') {
        throw new NotFoundException('File not found');
      }
      throw new BadRequestException(`Failed to read file: ${err.message}`);
    }
  }

  async writeFile(filePath: string, content: string, projectId?: string): Promise<void> {
    const rootPath = await this.getRootPath(projectId);
    const targetPath = path.join(rootPath, filePath);
    
    if (!targetPath.startsWith(rootPath)) {
      throw new BadRequestException('Invalid path');
    }

    try {
      await fs.promises.mkdir(path.dirname(targetPath), { recursive: true });
      await fs.promises.writeFile(targetPath, content, 'utf8');
    } catch (err) {
      throw new BadRequestException(`Failed to write file: ${err.message}`);
    }
  }

  async createFolder(folderPath: string, projectId?: string): Promise<void> {
    const rootPath = await this.getRootPath(projectId);
    const targetPath = path.join(rootPath, folderPath);
    
    if (!targetPath.startsWith(rootPath)) {
      throw new BadRequestException('Invalid path');
    }

    try {
      await fs.promises.mkdir(targetPath, { recursive: true });
    } catch (err) {
      throw new BadRequestException(`Failed to create folder: ${err.message}`);
    }
  }

  async createEmptyFile(filePath: string, projectId?: string): Promise<void> {
    const rootPath = await this.getRootPath(projectId);
    const targetPath = path.join(rootPath, filePath);
    
    if (!targetPath.startsWith(rootPath)) {
      throw new BadRequestException('Invalid path');
    }

    try {
      await fs.promises.mkdir(path.dirname(targetPath), { recursive: true });
      await fs.promises.writeFile(targetPath, '', { flag: 'wx' });
    } catch (err) {
      if (err.code === 'EEXIST') {
        throw new BadRequestException('File already exists');
      }
      throw new BadRequestException(`Failed to create file: ${err.message}`);
    }
  }

  async deleteItem(itemPath: string, projectId?: string): Promise<void> {
    const rootPath = await this.getRootPath(projectId);
    const targetPath = path.join(rootPath, itemPath);
    
    if (!targetPath.startsWith(rootPath)) {
      throw new BadRequestException('Invalid path');
    }
    if (targetPath === rootPath) {
      throw new BadRequestException('Cannot delete root project directory');
    }

    try {
      await fs.promises.rm(targetPath, { recursive: true, force: true });
    } catch (err) {
      if (err.code !== 'ENOENT') {
        throw new BadRequestException(`Failed to delete item: ${err.message}`);
      }
    }
  }
}
