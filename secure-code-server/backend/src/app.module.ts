import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import Redis from 'ioredis';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { EditorModule } from './editor/editor.module';
import { ProjectsModule } from './projects/projects.module';

import { LogsModule } from './logs/logs.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    TypeOrmModule.forRoot({
      type: 'postgres',
      url: process.env.DATABASE_URL,
      autoLoadEntities: true,
      synchronize: true, // Force synchronization for prototype stage
    }),
    UsersModule,
    AuthModule,
    EditorModule,
    ProjectsModule,
    LogsModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    /* --- COMMENTED OUT FOR TESTING ---
    {
      provide: 'REDIS_CLIENT',
      useFactory: () => {
        return new Redis({
          host: process.env.REDIS_HOST,
          port: parseInt(process.env.REDIS_PORT || '6379', 10),
        });
      },
    },
    --------------------------------- */
  ],
})
export class AppModule {}
