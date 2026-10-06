import { Module, Global } from '@nestjs/common';
import { IdempotencyService } from './idempotency.service';
import { IdempotencyInterceptor } from './idempotency.interceptor';
import { PrismaService } from '../../prisma/prisma.service';

@Global()
@Module({
    providers: [IdempotencyService, IdempotencyInterceptor, PrismaService],
    exports: [IdempotencyService, IdempotencyInterceptor],
})
export class IdempotencyModule { }
