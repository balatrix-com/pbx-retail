
import { Module } from '@nestjs/common';
import { OnboardingController } from './onboarding.controller';
import { OnboardingService } from './onboarding.service';
import { PrismaModule } from '../prisma/prisma.module';
import { BillingModule } from '../billing/billing.module';
import { FreeswitchModule } from '../freeswitch/freeswitch.module';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule } from '@nestjs/config';
import { WalletModule } from '../wallet/wallet.module';
import { PaymentsModule } from '../payments/payments.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { LookupRedisModule } from '../redis/lookup-redis.module';
import { HttpModule } from '@nestjs/axios';
import { MailModule } from '../mail/mail.module';

@Module({
    imports: [
        PrismaModule,
        BillingModule,
        ConfigModule,
        HttpModule,
        JwtModule.register({}),
        FreeswitchModule,
        WalletModule,
        PaymentsModule,
        NotificationsModule,
        LookupRedisModule,
        MailModule
    ],
    controllers: [OnboardingController],
    providers: [OnboardingService],
})
export class OnboardingModule { }
