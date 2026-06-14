import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EditorController } from './editor.controller';
import { EditorService } from './editor.service';
import { TerminalGateway } from './terminal.gateway';
import { Project } from '../projects/entities/project.entity';
import { JwtModule } from '@nestjs/jwt';

@Module({
  imports: [TypeOrmModule.forFeature([Project]), JwtModule.register({})],
  controllers: [EditorController],
  providers: [EditorService, TerminalGateway],
  exports: [EditorService],
})
export class EditorModule {}
