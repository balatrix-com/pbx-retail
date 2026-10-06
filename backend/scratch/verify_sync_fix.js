const { Client } = require('pg');
require('dotenv').config();

async function testSync() {
  const client = new Client({
    host: process.env.FS_DB_HOST,
    port: parseInt(process.env.FS_DB_PORT || '5432', 10),
    database: process.env.FS_DB_NAME,
    user: process.env.FS_DB_USER,
    password: process.env.FS_DB_PASSWORD,
  });

  const testDid = 'ext999_test';
  const testXml = '<?xml version="1.0"?><test_extension name="test_final"/>';

  try {
    await client.connect();
    console.log('✅ Connected to FreeSWITCH DB');

    // Attempt Upsert with ACTUAL schema found via inspection
    const query = `
      INSERT INTO dialplan_xml (dialplan_id, xml_content, updated_at)
      VALUES ($1, $2, NOW())
      ON CONFLICT (dialplan_id)
      DO UPDATE SET 
        xml_content = EXCLUDED.xml_content,
        updated_at = NOW()
      RETURNING *
    `;

    console.log(`🚀 Executing upsert for ${testDid}...`);
    const res = await client.query(query, [testDid, testXml]);
    console.log('✅ Upsert successful!');
    console.log(JSON.stringify(res.rows[0], null, 2));

    // Cleanup
    await client.query('DELETE FROM dialplan_xml WHERE dialplan_id = $1', [testDid]);
    console.log('🧹 Cleaned up test record');

  } catch (err) {
    console.error('❌ Sync test failed:');
    console.error(err.message);
    if (err.hint) console.error('Hint:', err.hint);
  } finally {
    await client.end();
  }
}

testSync();
