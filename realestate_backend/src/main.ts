import { NestFactory } from '@nestjs/core';
import { Logger, ValidationPipe } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  );
  app.use(cookieParser());

  // CORS_ORIGINS: comma-separated list of allowed origins.
  // Set to "*" to allow all (useful for Capacitor WebView / mobile).
  const rawOrigins = process.env.CORS_ORIGINS ?? '*';
  const corsOrigin =
    rawOrigins === '*'
      ? true
      : rawOrigins.split(',').map((o) => o.trim()).filter(Boolean);

  app.enableCors({
    origin: corsOrigin,
    credentials: true,
  });
  await app.listen(process.env.PORT ?? 3000);
  Logger.log(`GIT_SHA=${process.env.GIT_SHA ?? 'unknown'}`, 'Bootstrap');
}
bootstrap();
