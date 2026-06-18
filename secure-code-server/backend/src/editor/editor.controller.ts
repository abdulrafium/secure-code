import { Controller, Get, Post, Delete, Body, Query, UseGuards, Req, BadRequestException } from '@nestjs/common';
import { EditorService } from './editor.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('editor')
export class EditorController {
  constructor(private readonly editorService: EditorService) {}

  @Get('tree')
  async getTree(@Query('path') path: string, @Query('projectId') projectId: string, @Query('recursive') recursive: string) {
    return this.editorService.getTree(path, projectId, recursive === 'true');
  }

  @Get('file')
  async getFile(@Query('path') path: string, @Query('projectId') projectId: string) {
    const content = await this.editorService.readFile(path, projectId);
    return { content };
  }

  @UseGuards(JwtAuthGuard)
  @Post('file')
  async saveFile(@Body() body: { path: string; content: string; projectId?: string }, @Req() req: any) {
    await this.editorService.checkFileAccess(body.projectId, body.path, req.user);
    await this.editorService.writeFile(body.path, body.content, body.projectId);
    return { success: true };
  }

  @UseGuards(JwtAuthGuard)
  @Post('folder')
  async createFolder(@Body() body: { path: string; projectId?: string }, @Req() req: any) {
    const folderName = body.path.split('/').pop() || body.path;
    if (await this.editorService.itemExists(body.path, body.projectId)) {
      throw new BadRequestException(`"${folderName}" folder already exists`);
    }
    await this.editorService.checkFileAccess(body.projectId, body.path, req.user);
    await this.editorService.createFolder(body.path, body.projectId);
    return { success: true };
  }

  @UseGuards(JwtAuthGuard)
  @Post('file/new')
  async createFile(@Body() body: { path: string; projectId?: string }, @Req() req: any) {
    const fileName = body.path.split('/').pop() || body.path;
    if (await this.editorService.itemExists(body.path, body.projectId)) {
      throw new BadRequestException(`"${fileName}" file already exists`);
    }
    await this.editorService.checkFileAccess(body.projectId, body.path, req.user);
    await this.editorService.createEmptyFile(body.path, body.projectId);
    return { success: true };
  }

  @UseGuards(JwtAuthGuard)
  @Delete('item')
  async deleteItem(@Query('path') path: string, @Query('projectId') projectId: string, @Req() req: any) {
    if (!path) return { success: false, error: 'Path is required' };
    await this.editorService.checkFileAccess(projectId, path, req.user);
    await this.editorService.deleteItem(path, projectId);
    return { success: true };
  }

  @UseGuards(JwtAuthGuard)
  @Post('rename')
  async renameItem(@Body() body: { oldPath: string; newPath: string; projectId?: string }, @Req() req: any) {
    const newName = body.newPath.split('/').pop() || body.newPath;
    const oldName = body.oldPath.split('/').pop() || body.oldPath;
    if (await this.editorService.itemExists(body.newPath, body.projectId)) {
      throw new BadRequestException(`"${newName}" already exists in this folder.`);
    }
    await this.editorService.checkFileAccess(body.projectId, body.oldPath, req.user);
    await this.editorService.checkFileAccess(body.projectId, body.newPath, req.user);
    await this.editorService.renameItem(body.oldPath, body.newPath, body.projectId);
    return { success: true };
  }

  @UseGuards(JwtAuthGuard)
  @Post('copy')
  async copyItem(@Body() body: { srcPath: string; destPath: string; projectId?: string }, @Req() req: any) {
    const srcName = body.srcPath.split('/').pop() || body.srcPath;
    if (await this.editorService.itemExists(body.destPath, body.projectId)) {
      throw new BadRequestException(`"${srcName}" already exists at the destination.`);
    }
    await this.editorService.checkFileAccess(body.projectId, body.srcPath, req.user);
    await this.editorService.checkFileAccess(body.projectId, body.destPath, req.user);
    await this.editorService.copyItem(body.srcPath, body.destPath, body.projectId);
    return { success: true };
  }
}
