import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.enableCors({
    origin: true,
    credentials: true,
  });
  // Template/landing-page content (sections + config, often with embedded
  // thumbnail data) regularly exceeds Express's 100kb default body limit.
  app.useBodyParser('json', { limit: '15mb' });
  app.useBodyParser('urlencoded', { extended: true, limit: '15mb' });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  const port = Number(process.env.PORT) || 4000;
  // Bind IPv4 explicitly. Default Node/Nest `listen(port)` often binds `::`
  // only; Next.js then proxies to 127.0.0.1 and every /api/* returns 500.
  await app.listen(port, '0.0.0.0');
}
void bootstrap();
