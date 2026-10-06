import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsService } from './analytics.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { WalletModule } from '../../wallet/wallet.module';

@Module({
    imports: [
        PrismaModule,
        HttpModule,
        WalletModule,
    ],
    controllers: [AnalyticsController],
    providers: [AnalyticsService],
    exports: [AnalyticsService],
})
export class AnalyticsModule { }
