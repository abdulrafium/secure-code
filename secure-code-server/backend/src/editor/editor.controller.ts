import { Controller, Get, Post, Delete, Body, Query, UseGuards, Req } from '@nestjs/common';
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
    await this.editorService.checkFileAccess(body.projectId, body.path, req.user);
    await this.editorService.createFolder(body.path, body.projectId);
    return { success: true };
  }

  @UseGuards(JwtAuthGuard)
  @Post('file/new')
  async createFile(@Body() body: { path: string; projectId?: string }, @Req() req: any) {
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
}
