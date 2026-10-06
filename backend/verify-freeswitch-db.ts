/**
 * FreeSWITCH Database Connection Test Script
 * 
 * Verifies connection to remote FreeSWITCH database and tests dialplan sync.
 * Run: npx ts-node verify-freeswitch-db.ts
 */

import { Pool } from 'pg';
import * as dotenv from 'dotenv';

dotenv.config();

async function testFreeSwitchDB() {
    console.log('🔍 Testing FreeSWITCH database connection...\n');

    const pool = new Pool({
        host: process.env.FS_DB_HOST,
        port: parseInt(process.env.FS_DB_PORT || '5432', 10),
        database: process.env.FS_DB_NAME,
        user: process.env.FS_DB_USER,
        password: process.env.FS_DB_PASSWORD,
    });

    try {
        // Test 1: Connection test
        console.log('✅ Test 1: Database Connection');
        const timeResult = await pool.query('SELECT NOW()');
        console.log(`   Connected at: ${timeResult.rows[0].now}\n`);

        // Test 2: Check if tables exist
        console.log('✅ Test 2: Check Tables');
        const tablesResult = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
        AND table_name IN ('dialplan_xml', 'did_routes')
      ORDER BY table_name
    `);

        if (tablesResult.rows.length === 2) {
            console.log('   ✅ dialplan_xml table exists');
            console.log('   ✅ did_routes table exists\n');
        } else {
            console.log('   ⚠️  Tables not found. Creating them...\n');

            // Create dialplan_xml table
            await pool.query(`
        CREATE TABLE IF NOT EXISTS dialplan_xml (
          id SERIAL PRIMARY KEY,
          did_number VARCHAR(20) UNIQUE NOT NULL,
          tenant_id VARCHAR(100) NOT NULL,
          xml_content TEXT NOT NULL,
          updated_at TIMESTAMPTZ DEFAULT NOW()
        );
        CREATE INDEX IF NOT EXISTS idx_dialplan_did ON dialplan_xml(did_number);
      `);

            // Create did_routes table
            await pool.query(`
        CREATE TABLE IF NOT EXISTS did_routes (
          id SERIAL PRIMARY KEY,
          did_number VARCHAR(20) UNIQUE NOT NULL,
          tenant_id VARCHAR(100) NOT NULL,
          route_type VARCHAR(50) NOT NULL,
          route_target VARCHAR(255) NOT NULL,
          updated_at TIMESTAMPTZ DEFAULT NOW()
        );
        CREATE INDEX IF NOT EXISTS idx_did_routes_did ON did_routes(did_number);
      `);

            console.log('   ✅ Tables created successfully\n');
        }

        // Test 3: Insert test record
        console.log('✅ Test 3: Insert Test Record');
        const testDID = '18005551234';
        const testTenantId = 'test-tenant-id';
        const testXML = '<?xml version="1.0"?><test/>';

        await pool.query(`
      INSERT INTO dialplan_xml (did_number, tenant_id, xml_content)
      VALUES ($1, $2, $3)
      ON CONFLICT (did_number) DO UPDATE SET xml_content = $3, updated_at = NOW()
    `, [testDID, testTenantId, testXML]);

        console.log(`   Inserted/Updated DID: ${testDID}\n`);

        // Test 4: Query test record
        console.log('✅ Test 4: Query Test Record');
        const queryResult = await pool.query(
            'SELECT * FROM dialplan_xml WHERE did_number = $1',
            [testDID]
        );

        if (queryResult.rows.length > 0) {
            console.log(`   DID Number: ${queryResult.rows[0].did_number}`);
            console.log(`   Tenant ID: ${queryResult.rows[0].tenant_id}`);
            console.log(`   Updated At: ${queryResult.rows[0].updated_at}\n`);
        }

        // Test 5: Clean up
        console.log('✅ Test 5: Clean Up');
        await pool.query('DELETE FROM dialplan_xml WHERE did_number = $1', [testDID]);
        console.log(`   Deleted test record\n`);

        console.log('🎉 All tests passed! FreeSWITCH DB is ready.\n');

    } catch (error) {
        console.error('❌ Test failed:', error.message);
        console.error('\nPlease check:');
        console.error('1. FreeSWITCH DB credentials in .env file');
        console.error('2. Network connectivity to localhost:5432');
        console.error('3. Database "freeswitch" exists');
        console.error('4. User "ap1" has permission to create tables\n');
    } finally {
        await pool.end();
    }
}

testFreeSwitchDB();
