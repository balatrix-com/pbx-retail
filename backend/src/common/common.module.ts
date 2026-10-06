import { Module, MiddlewareConsumer, RequestMethod } from '@nestjs/common';
import { AuditService } from './audit/audit.service';
import { PrismaModule } from '../prisma/prisma.module';
import { ThrottlerModule } from '@nestjs/throttler';
import { TraceMiddleware } from './trace.middleware';

@Module({
  imports: [
    PrismaModule,
    ThrottlerModule.forRoot([{
      ttl: 60000,
      limit: 100, // 100 requests per minute
    }]),
  ],
  providers: [AuditService],
  exports: [AuditService, ThrottlerModule],
})
export class CommonModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(TraceMiddleware)
      .forRoutes({ path: '*', method: RequestMethod.ALL });
  }
}
