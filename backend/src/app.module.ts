import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { APP_FILTER, APP_INTERCEPTOR, APP_GUARD } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { HealthModule } from './health/health.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { AuditInterceptor } from './audit/audit.interceptor';
import { AuthModule } from './auth/auth.module';
import { TenantMiddleware } from './common/middleware/tenant.middleware';
import { PlansModule } from './plans/plans.module';
import { WalletModule } from './wallet/wallet.module';
import { BillingModule } from './billing/billing.module';
import { UsageModule } from './usage/usage.module';
import { TelecomModule } from './telecom/telecom.module';
import { EnforcementModule } from './enforcement/enforcement.module';
import { CommonModule } from './common/common.module';
import { AdminModule } from './admin/admin.module';
import { TenantsModule } from './tenants/tenants.module';
import { UsersModule } from './users/users.module';
import { FreeswitchModule } from './freeswitch/freeswitch.module';
import { AuditModule } from './audit/audit.module';
import { OnboardingModule } from './onboarding/onboarding.module';
import { IdempotencyModule } from './common/idempotency/idempotency.module';
import { PaymentsModule } from './payments/payments.module';
import configuration from './config/configuration';
import { RedisModule } from './redis/redis.module';
import { MonitorModule } from './monitor/monitor.module';
import { MailModule } from './mail/mail.module';
import { NotificationsModule } from './notifications/notifications.module';
import { LookupRedisModule } from './redis/lookup-redis.module';
import { CarriersModule } from './carriers/carriers.module';
import { InboundWhitelistModule } from './inbound-whitelist/inbound-whitelist.module';
import { AddonsModule } from './addons/addons.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),
    LookupRedisModule,
    ThrottlerModule.forRoot([{
      ttl: 60000, // 1 minute
      limit: 300, // Increased limit to 300 requests per minute
    }]),
    PrismaModule,
    HealthModule,
    AuthModule,
    JwtModule.register({}),
    PlansModule,
    WalletModule,
    BillingModule,
    UsageModule,
    TelecomModule,
    EnforcementModule,
    CommonModule,
    AdminModule,
    UsersModule,
    TenantsModule, // Register JwtModule globally or locally for middleware
    FreeswitchModule,
    AuditModule,
    OnboardingModule,
    IdempotencyModule,
    PaymentsModule,
    RedisModule, // Global Redis module
    MonitorModule,
    MailModule,
    NotificationsModule,
    LookupRedisModule,
    CarriersModule,
    InboundWhitelistModule,
    AddonsModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_FILTER,
      useClass: HttpExceptionFilter,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: LoggingInterceptor,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: AuditInterceptor,
    },
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(TenantMiddleware)
      .forRoutes('*');
  }
}
