import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import { DIDsController } from './dids.controller';
import { DIDsService } from './dids.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { FreeswitchModule } from '../../freeswitch/freeswitch.module';
import { LookupRedisModule } from '../../redis/lookup-redis.module';

@Module({
    imports: [PrismaModule, FreeswitchModule, LookupRedisModule, HttpModule, ConfigModule],
    controllers: [DIDsController],
    providers: [DIDsService],
    exports: [DIDsService],
})
export class DIDsModule { }
