import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { ExtensionsService } from '../src/telecom/extensions/extensions.service';
import { FreeSwitchSyncService } from '../src/freeswitch/freeswitch-sync.service';
import { PrismaService } from '../src/prisma/prisma.service';
import { Logger } from '@nestjs/common';

async function verifySync() {
    const logger = new Logger('VerificationScript');
    const app = await NestFactory.createApplicationContext(AppModule);

    try {
        const extService = app.get(ExtensionsService);
        const syncService = app.get(FreeSwitchSyncService);
        const prisma = app.get(PrismaService);

        logger.log('Services resolved successfully');

        // 1. Find the last created extension to test sync on
        const lastExt = await prisma.extension.findFirst({
            orderBy: { createdAt: 'desc' },
            include: { tenant: true }
        });

        if (lastExt) {
            logger.log(`Testing sync for Extension ID: ${lastExt.id} (Ext: ${lastExt.extensionNumber}, Sequence: ${lastExt.sequenceId})`);

            // Manual triggers
            await syncService.syncExtension(lastExt.id);

            logger.log('Sync executed without error. Check FreeSwitch DB.');
        } else {
            logger.warn('No extensions found to test.');
        }

    } catch (error) {
        logger.error('Verification Failed:', error);
    } finally {
        await app.close();
    }
}

verifySync();
