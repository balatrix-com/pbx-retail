import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { FreeSwitchSyncService } from '../src/freeswitch/freeswitch-sync.service';
import { PrismaService } from '../src/prisma/prisma.service';
import { Logger } from '@nestjs/common';

async function updateExtensionXML() {
    const logger = new Logger('UpdateExtensionXML');
    const app = await NestFactory.createApplicationContext(AppModule);

    try {
        const syncService = app.get(FreeSwitchSyncService);
        const prisma = app.get(PrismaService);

        // Find the extension 100301 (which we found earlier was ext0_1001 or similar)
        // Actually, let's just find by number to be sure
        const ext = await prisma.extension.findFirst({
            where: { extensionNumber: '100301' }
        });

        if (ext) {
            logger.log(`Found extension 100301 (ID: ${ext.id}). Triggering sync...`);
            await syncService.syncExtension(ext.id);
            logger.log('Sync complete. The XML in FreeSwitch DB should now contain localhost');
        } else {
            logger.error('Extension 100301 not found in local DB!');
        }

    } catch (error) {
        logger.error('Update Failed:', error);
    } finally {
        await app.close();
    }
}

updateExtensionXML();
