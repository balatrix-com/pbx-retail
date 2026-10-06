import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { TraceMiddleware } from './common/trace.middleware';
import compression from 'compression';
import helmet from 'helmet';
import * as fs from 'fs';
import * as path from 'path';

async function bootstrap() {
  // Ensure uploads directory exists
  const uploadsDir = path.join(process.cwd(), 'uploads');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }

  const app = await NestFactory.create(AppModule, {
    bodyParser: false, // Disable default body parser
  });

  app.setGlobalPrefix('api');

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
      if (req.url === '/billing/webhook') {
        req.rawBody = buf;
      }
    }
  }));
  app.use(express.urlencoded({ extended: true }));

  app.enableCors();
  app.useGlobalPipes(new ValidationPipe({ transform: true }));
  app.useGlobalFilters(new HttpExceptionFilter());

  app.enableShutdownHooks();

  await app.listen(3000);
}
bootstrap();
