import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import { FreeSwitchDBService } from './freeswitch-db.service';
import { KamailioDBService } from './kamailio-db.service';
import { DialplanGeneratorService } from './dialplan-generator.service';
import { AudioUploadService } from './audio-upload.service';
import { RecordingStorageService } from './recording-storage.service';
import { FreeSwitchSyncService } from './freeswitch-sync.service';
import { CacheFlushService } from './cache-flush.service';
import { PrismaModule } from '../prisma/prisma.module';

/**
 * FreeSWITCH Module
 * 
 * Provides services for:
 * - Connecting to FreeSWITCH and Kamailio databases
 * - Generating dialplan XML
 * - Syncing routing configuration
 * - Flushing external XML service cache
 */
@Module({
    imports: [PrismaModule, HttpModule, ConfigModule],
    providers: [
        FreeSwitchDBService,
        KamailioDBService,
        DialplanGeneratorService,
        AudioUploadService,
        RecordingStorageService,
        FreeSwitchSyncService,
        CacheFlushService,
    ],
    exports: [
        FreeSwitchDBService,
        KamailioDBService,
        DialplanGeneratorService,
        AudioUploadService,
        RecordingStorageService,
        FreeSwitchSyncService,
        CacheFlushService,
    ],
})
export class FreeswitchModule { }
