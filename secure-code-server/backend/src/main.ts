import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { json, urlencoded } from 'express';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors(); // Allow frontend to communicate with backend
  
  // Increase payload limit to allow saving large files up to 50MB
  app.use(json({ limit: '50mb' }));
  app.use(urlencoded({ extended: true, limit: '50mb' }));
  await app.listen(process.env.PORT ?? 3001); // NestJS runs on 3001, Next.js on 3000
}
bootstrap();
