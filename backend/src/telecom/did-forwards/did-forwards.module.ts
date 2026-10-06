import { Module } from '@nestjs/common';
import { DIDForwardsService } from './did-forwards.service';
import { DIDForwardsController } from './did-forwards.controller';
import { PrismaService } from '../../prisma/prisma.service';
import { FreeswitchModule } from '../../freeswitch/freeswitch.module';
import { ConfigModule } from '@nestjs/config';

@Module({
    imports: [FreeswitchModule, ConfigModule],
    controllers: [DIDForwardsController],
    providers: [DIDForwardsService, PrismaService],
    exports: [DIDForwardsService],
})
export class DIDForwardsModule { }
