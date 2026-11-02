import { Module } from '@nestjs/common';
import { PhoneNumbersController } from './phone-numbers.controller';
import { PhoneNumbersService } from './phone-numbers.service';
import { DIDsModule } from '../dids/dids.module';
import { TFNsModule } from '../tfns/tfns.module';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
    imports: [DIDsModule, TFNsModule, PrismaModule],
    controllers: [PhoneNumbersController],
    providers: [PhoneNumbersService],
})
export class PhoneNumbersModule { }
