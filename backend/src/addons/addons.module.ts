import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import { AddonsController } from './addons.controller';
import { AddonsService } from './addons.service';
import { PrismaModule } from '../prisma/prisma.module';
import { WalletModule } from '../wallet/wallet.module';

@Module({
    imports: [PrismaModule, WalletModule, HttpModule, ConfigModule],
    controllers: [AddonsController],
    providers: [AddonsService],
    exports: [AddonsService]
})
export class AddonsModule {}
