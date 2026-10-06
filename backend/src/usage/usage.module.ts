import { Module } from '@nestjs/common';
import { UsageService } from './usage.service';
import { UsageController } from './usage.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { WalletModule } from '../wallet/wallet.module';
import { HttpModule } from '@nestjs/axios';
import { EnforcementModule } from '../enforcement/enforcement.module';

@Module({
  imports: [PrismaModule, WalletModule, EnforcementModule, HttpModule],
  controllers: [UsageController],
  providers: [UsageService],
})
export class UsageModule { }
