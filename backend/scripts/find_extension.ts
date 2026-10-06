import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import { FreeSwitchDBService } from '../src/freeswitch/freeswitch-db.service';
import { Logger } from '@nestjs/common';
import { Pool } from 'pg';

async function findExtension() {
    const logger = new Logger('FindExtensionScript');
    const app = await NestFactory.createApplicationContext(AppModule);

    try {
        const fsDB = app.get(FreeSwitchDBService);
        // Access the private pool or use a new connection? 
        // FreeSwitchDBService has a private pool. Let's make a direct connection using env vars
        // or just assume we can use the service if it had a query method.
        // Since `pool` is private, I can't access it easily.
        // I will use a raw pg client here.

        const pool = new Pool({
            host: process.env.FS_DB_HOST,
            port: parseInt(process.env.FS_DB_PORT || '5432', 10),
            database: process.env.FS_DB_NAME,
            user: process.env.FS_DB_USER,
            password: process.env.FS_DB_PASSWORD,
        });

        logger.log('Searching for extension "100301" in dialplan_xml...');

        // Search for XML containing the number
        const res = await pool.query(`
        SELECT dialplan_id, updated_at 
        FROM dialplan_xml 
        WHERE xml_content LIKE '%100301%'
    `);

        if (res.rows.length > 0) {
            logger.log('✅ FOUND! The extension is stored with the following keys:');
            res.rows.forEach(r => {
                logger.log(`Key: ${r.dialplan_id} (Updated: ${r.updated_at})`);
            });
        } else {
            logger.error('❌ NOT FOUND. The extension "100301" is not present in any XML blob.');

            // List recent entries to see what IS there
            const recent = await pool.query(`SELECT dialplan_id FROM dialplan_xml ORDER BY updated_at DESC LIMIT 5`);
            logger.log('Recent entries in DB:', recent.rows.map(r => r.dialplan_id));
        }

        await pool.end();

    } catch (error) {
        logger.error('Search Failed:', error);
    } finally {
        await app.close();
    }
}

findExtension();
