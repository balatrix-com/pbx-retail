import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';
import { ValidationPipe, ForbiddenException, Logger } from '@nestjs/common';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { TraceMiddleware } from './common/trace.middleware';
import compression from 'compression';
import helmet from 'helmet';
import * as fs from 'fs';
import * as path from 'path';
import { installBillingHttpAuth } from './auth/billing-http-auth';

async function bootstrap() {
  // Ensure uploads directory exists
  const uploadsDir = path.join(process.cwd(), 'uploads');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }

  const app = await NestFactory.create(AppModule, {
    bodyParser: false, // Disable default body parser
  });
  installBillingHttpAuth();

  app.setGlobalPrefix('api');
  app.getHttpAdapter().getInstance().set('trust proxy', 'loopback');

  // Hardening
  app.use(helmet({
    contentSecurityPolicy: false, // Disable CSP to allow custom logos/favicons from other sources if needed
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  }));
  app.use(compression());

  // Configure body parsers with raw body for webhook
  const express = require('express');
  app.use('/api/uploads', express.static(uploadsDir, {
    setHeaders: (res: any) => {
      res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
      res.setHeader('Access-Control-Allow-Origin', '*');
    }
  }));
  app.use(express.json({
    verify: (req: any, res: any, buf: any, encoding: any) => {
      if (req.url === '/api/billing/webhook' || req.url === '/billing/webhook' ||
          req.url === '/api/telecom/extensions/sync-from-billing' ||
          req.url.startsWith('/api/internal/')) {
        req.rawBody = buf;
      }
    }
  }));
  app.use(express.urlencoded({ extended: true }));

  const allowedOrigins = (app.get(ConfigService).get<string>('ALLOWED_ORIGINS') || '')
    .split(',').map(origin => origin.trim()).filter(Boolean);
  if (!allowedOrigins.length) Logger.warn('ALLOWED_ORIGINS is empty; cross-origin browser requests are blocked', 'Bootstrap');
  app.enableCors({
    origin: (origin: string | undefined, callback: (error: Error | null, allow?: boolean) => void) => {
      if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
      return callback(new ForbiddenException('CORS origin is not allowed'));
    },
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });
  app.useGlobalPipes(new ValidationPipe({ transform: true }));
  app.useGlobalFilters(new HttpExceptionFilter());

  app.enableShutdownHooks();

  await app.listen(3000);
}
bootstrap();
