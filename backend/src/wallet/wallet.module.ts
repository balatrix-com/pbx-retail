import { Module, forwardRef } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { WalletController } from './wallet.controller';
import { WalletService } from './wallet.service';
import { PrismaModule } from '../prisma/prisma.module';
import { BillingModule } from '../billing/billing.module';
import { FreeswitchModule } from '../freeswitch/freeswitch.module';
import { LookupRedisModule } from '../redis/lookup-redis.module';

@Module({
  imports: [
    HttpModule,
    PrismaModule,
    forwardRef(() => BillingModule),
    FreeswitchModule,
    LookupRedisModule,
  ],
  controllers: [WalletController],
  providers: [WalletService],
  exports: [WalletService],
})
export class WalletModule { }
