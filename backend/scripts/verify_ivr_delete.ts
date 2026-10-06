import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { IVRsService } from '../src/telecom/ivrs/ivrs.service';
import { PrismaService } from '../src/prisma/prisma.service';
import { FreeSwitchDBService } from '../src/freeswitch/freeswitch-db.service';
import { Logger } from '@nestjs/common';
import { Pool } from 'pg';

async function verifyDelete() {
    const logger = new Logger('VerifyIVRDelete');
    const app = await NestFactory.createApplicationContext(AppModule);

    try {
        const ivrsService = app.get(IVRsService);
        const prisma = app.get(PrismaService);

        // 1. Create a dummy IVR
        const tenant = await prisma.tenant.findFirst();
        if (!tenant) throw new Error('No tenant found');

        const ivrData = {
            name: 'Auto-Delete Test IVR',
            timeout: 10,
            maxRetries: 3,
            description: 'Temporary IVR',
            menu: {
                "1": { type: "extension", target: "ext_dummy" }
            }
        };

        console.log('Creating Test IVR...');
        // We mock create because IVRsService.create relies on DTOs and validation
        // But validation might fail on "ext_dummy".
        // Let's create an extension first or bypass validation logic by direct DB insert + syncIVR manual call?
        // Actually, let's use a try/catch or just create a valid extension

        const ext = await prisma.extension.findFirst();
        const validTarget = ext ? ext.id : "ext_dummy"; // If no ext, it will fail validation likely.

        if (!ext) {
            console.warn("No extensions found, validation might fail if checking targets.");
        }

        const ivr = await ivrsService.create(tenant.id, {
            ...ivrData,
            menu: {
                "1": { type: "extension", target: validTarget }
            },
            greetingFile: 'system/greeting.wav'
        } as any);

        console.log(`Created IVR: ${ivr.name} (ID: ${ivr.id})`);

        // Verify it exists in FreeSWITCH DB
        const pool = new Pool({
            host: process.env.FS_DB_HOST,
            port: parseInt(process.env.FS_DB_PORT || '5432', 10),
            database: process.env.FS_DB_NAME,
            user: process.env.FS_DB_USER,
            password: process.env.FS_DB_PASSWORD,
        });

        const baseKey = `ivr${ivr.sequenceId}_${tenant.customerCode || '1001'}`;
        const check1 = await pool.query('SELECT * FROM dialplan_xml WHERE dialplan_id = $1', [baseKey]);

        if (check1.rows.length > 0) {
            console.log(`✅ IVR XML found in FreeSwitch DB: ${baseKey}`);
        } else {
            console.error('❌ IVR XML NOT found after creation!');
        }

        // 2. Delete the IVR
        console.log(`Deleting IVR ${ivr.id}...`);
        await ivrsService.remove(tenant.id, ivr.id);

        // 3. Verify it is GONE from FreeSWITCH DB
        const check2 = await pool.query('SELECT * FROM dialplan_xml WHERE dialplan_id = $1', [baseKey]);

        if (check2.rows.length === 0) {
            console.log(`✅ IVR XML successfully deleted from FreeSwitch DB: ${baseKey}`);
        } else {
            console.error('❌ IVR XML STILL EXISTS in FreeSwitch DB!');
        }

        await pool.end();

    } catch (error) {
        logger.error('Verification Failed:', error);
    } finally {
        await app.close();
    }
}

verifyDelete();
