import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap(): Promise<void> {
  // rawBody: true preserves the raw request buffer on req.rawBody, needed to
  // verify the Paystack webhook HMAC signature (see PaymentsController.handleWebhook).
  const app = await NestFactory.create(AppModule, { rawBody: true });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Browsers never call this API directly — the Next.js BFF forwards every
  // request server-side, and JWTs never reach client-side JS (see
  // apps/web/.env.local.example) — so CORS isn't the primary defense here.
  // Still locked to a configured origin rather than the previous unrestricted
  // default, since any future direct-from-browser client (the planned mobile
  // apps, or a stray fetch from client-side JS) would otherwise be trusted
  // from anywhere.
  app.enableCors({ origin: process.env.CORS_ORIGIN ?? 'http://localhost:3001' });
  await app.listen(process.env.PORT ?? 3000);
}

bootstrap();
