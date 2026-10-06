/**
 * Inspect FreeSWITCH Database Schema
 * Shows actual column names in existing tables
 */

import { Pool } from 'pg';
import * as dotenv from 'dotenv';

dotenv.config();

async function inspectSchema() {
    console.log('🔍 Inspecting FreeSWITCH database schema...\n');

    const pool = new Pool({
        host: process.env.FS_DB_HOST,
        port: parseInt(process.env.FS_DB_PORT || '5432', 10),
        database: process.env.FS_DB_NAME,
        user: process.env.FS_DB_USER,
        password: process.env.FS_DB_PASSWORD,
    });

    try {
        // Check dialplan_xml columns
        console.log('📋 Table: dialplan_xml');
        const dialplanColumns = await pool.query(`
      SELECT column_name, data_type, character_maximum_length
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'dialplan_xml'
      ORDER BY ordinal_position
    `);

        if (dialplanColumns.rows.length > 0) {
            dialplanColumns.rows.forEach(row => {
                console.log(`   - ${row.column_name} (${row.data_type}${row.character_maximum_length ? `(${row.character_maximum_length})` : ''})`);
            });
        } else {
            console.log('   Table not found\n');
        }

        console.log('');

        // Check did_routes columns
        console.log('📋 Table: did_routes');
        const didRoutesColumns = await pool.query(`
      SELECT column_name, data_type, character_maximum_length
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'did_routes'
      ORDER BY ordinal_position
    `);

        if (didRoutesColumns.rows.length > 0) {
            didRoutesColumns.rows.forEach(row => {
                console.log(`   - ${row.column_name} (${row.data_type}${row.character_maximum_length ? `(${row.character_maximum_length})` : ''})`);
            });
        } else {
            console.log('   Table not found\n');
        }

        console.log('');

        // Sample some data
        console.log('📊 Sample data from dialplan_xml (first 3 rows):');
        const sampleData = await pool.query('SELECT * FROM dialplan_xml LIMIT 3');
        if (sampleData.rows.length > 0) {
            console.log(JSON.stringify(sampleData.rows, null, 2));
        } else {
            console.log('   No data found\n');
        }

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        await pool.end();
    }
}

inspectSchema();
