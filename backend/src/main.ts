import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { json, urlencoded, type Request, type Response } from 'express';
import { AppModule } from './app.module';
import { join } from 'path';

async function bootstrap() {
  // Disable Nest's built-in body parser so we can capture rawBody for Meta
  // webhook HMAC verification, then re-enable JSON/urlencoded ourselves.
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bodyParser: false,
  });
  app.enableCors({
    origin: true,
    credentials: true,
  });
  app.useStaticAssets(join(process.cwd(), 'uploads'), {
    prefix: '/uploads',
  });

  const rawBodySaver = {
    verify: (req: Request & { rawBody?: Buffer }, _res: Response, buf: Buffer) => {
      if (buf?.length) req.rawBody = buf;
    },
  };
  // Template/landing-page content (sections + config, often with embedded
  // thumbnail data) regularly exceeds Express's 100kb default body limit.
  app.use(json({ limit: '15mb', ...rawBodySaver }));
  app.use(urlencoded({ extended: true, limit: '15mb', ...rawBodySaver }));

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  const port = Number(process.env.PORT) || 3000;
  // Bind IPv4 explicitly. Default Node/Nest `listen(port)` often binds `::`
  // only; Next.js then proxies to 127.0.0.1 and every /api/* returns 500.
  await app.listen(port, '0.0.0.0');
}
void bootstrap();
