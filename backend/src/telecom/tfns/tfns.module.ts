import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import { TFNsService } from './tfns.service';
import { TFNsController } from './tfns.controller';
import { PrismaModule } from '../../prisma/prisma.module';
import { FreeswitchModule } from '../../freeswitch/freeswitch.module';
import { LookupRedisModule } from '../../redis/lookup-redis.module';

@Module({
    imports: [PrismaModule, FreeswitchModule, LookupRedisModule, HttpModule, ConfigModule],
    controllers: [TFNsController],
    providers: [TFNsService],
    exports: [TFNsService],
})
export class TFNsModule { }
