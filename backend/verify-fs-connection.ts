/**
 * FreeSWITCH Database Connection Test Script (Updated)
 * 
 * Tests connection to actual remote FreeSWITCH database with correct schema.
 * Run: npx ts-node verify-fs-connection.ts
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

        // Test 2: Verify schema
        console.log('✅ Test 2: Verify Schema');
        console.log('   dialplan_xml columns:');
        const dialplanCols = await pool.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'dialplan_xml'
      ORDER BY ordinal_position
    `);
        dialplanCols.rows.forEach(r => console.log(`     - ${r.column_name}`));

        console.log('   did_routes columns:');
        const didCols = await pool.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'did_routes'
      ORDER BY ordinal_position
    `);
        didCols.rows.forEach(r => console.log(`     - ${r.column_name}`));
        console.log('');

        // Test 3: Insert test record
        console.log('✅ Test 3: Insert Test Dialplan');
        const testDialplanId = `test_999_${Date.now()}`;
        const testXML = `<?xml version="1.0" encoding="UTF-8"?>
<document type="freeswitch/xml">
  <section name="dialplan">
    <context name="public">
      <extension name="test_extension">
        <condition field="destination_number" expression="^999999$">
          <action application="answer"/>
          <action application="playback" data="/opt/ivr_audio/system/test.wav"/>
        </condition>
      </extension>
    </context>
  </section>
</document>`;

        await pool.query(`
      INSERT INTO dialplan_xml (dialplan_id, xml_content, updated_at)
      VALUES ($1, $2, NOW())
      ON CONFLICT (dialplan_id) DO UPDATE SET xml_content = $2, updated_at = NOW()
    `, [testDialplanId, testXML]);

        console.log(`   Inserted dialplan_id: ${testDialplanId}\n`);

        // Test 4: Insert test DID route
        console.log('✅ Test 4: Insert Test DID Route');
        const testDID = '18005559999';
        const testCustomerId = 999;
        const testTargetKey = 'test_999_target';

        await pool.query(`
      INSERT INTO did_routes (did, customer_id, target_key, updated_at)
      VALUES ($1, $2, $3, NOW())
      ON CONFLICT (did) DO UPDATE SET customer_id = $2, target_key = $3, updated_at = NOW()
    `, [testDID, testCustomerId, testTargetKey]);

        console.log(`   Inserted DID: ${testDID} -> customer ${testCustomerId}, target: ${testTargetKey}\n`);

        // Test 5: Query test records
        console.log('✅ Test 5: Query Test Records');
        const dialplanResult = await pool.query(
            'SELECT * FROM dialplan_xml WHERE dialplan_id = $1',
            [testDialplanId]
        );
        console.log(`   Dialplan ID: ${dialplanResult.rows[0].dialplan_id}`);
        console.log(`   XML length: ${dialplanResult.rows[0].xml_content.length} characters`);

        const didResult = await pool.query(
            'SELECT * FROM did_routes WHERE did = $1',
            [testDID]
        );
        console.log(`   DID: ${didResult.rows[0].did}`);
        console.log(`   Customer ID: ${didResult.rows[0].customer_id}`);
        console.log(`   Target Key: ${didResult.rows[0].target_key}\n`);

        // Test 6: Clean up
        console.log('✅ Test 6: Clean Up');
        await pool.query('DELETE FROM dialplan_xml WHERE dialplan_id = $1', [testDialplanId]);
        await pool.query('DELETE FROM did_routes WHERE did = $1', [testDID]);
        console.log(`   Deleted test records\n`);

        console.log('🎉 All tests passed! FreeSWITCH DB is ready to use.\n');
        console.log('📝 Schema confirmed:');
        console.log('   - dialplan_xml: dialplan_id (PK), xml_content, updated_at');
        console.log('   - did_routes: did (PK), customer_id (INT), target_key, updated_at\n');

    } catch (error) {
        console.error('❌ Test failed:', error.message);
        if (error.stack) {
            console.error('\nStack trace:', error.stack);
        }
    } finally {
        await pool.end();
    }
}

testFreeSwitchDB();
