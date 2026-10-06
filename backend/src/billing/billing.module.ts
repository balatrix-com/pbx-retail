import { Module } from '@nestjs/common';
import { BillingService } from './billing.service';
import { BillingController } from './billing.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { ConfigModule } from '@nestjs/config';
import { InvoiceService } from './invoice.service';
import { InvoiceController } from './invoice.controller';

@Module({
  imports: [PrismaModule, ConfigModule],
  controllers: [BillingController, InvoiceController],
  providers: [BillingService, InvoiceService],
  exports: [BillingService, InvoiceService],
})
export class BillingModule { }
