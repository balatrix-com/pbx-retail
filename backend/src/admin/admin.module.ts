import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { PrismaModule } from '../prisma/prisma.module';
import { FreeswitchModule } from '../freeswitch/freeswitch.module';
import { LookupSyncController } from './lookup-sync.controller';

@Module({
    imports: [PrismaModule, HttpModule, ConfigModule, FreeswitchModule],
    controllers: [AdminController, LookupSyncController],
    providers: [AdminService],
    exports: [AdminService],
})
export class AdminModule { }
