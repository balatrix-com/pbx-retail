const { Pool } = require('pg');

const subtestPool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'subtest',
  user: 'subadmin',
  password: 'OnidaMaruti1)',
});

const freeswitchPool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'freeswitch',
  user: 'freeswitch',
  password: 'OnidaMaruti1)',
});

async function run() {
  try {
    console.log('=== 1. Checking Outbound Endpoints in subtest DB ===');
    const endpointsRes = await subtestPool.query(
      'SELECT id, name, "sipHost", "sipPort", "isSystemDefault", "carrierId" FROM outbound_endpoints'
    );
    console.log(`Found ${endpointsRes.rows.length} endpoints:`);
    console.table(endpointsRes.rows);

    const defaultEndpoints = endpointsRes.rows.filter(e => e.isSystemDefault);
    if (defaultEndpoints.length > 1) {
      console.log('❌ ERROR: More than one endpoint is marked as system default!');
    } else if (defaultEndpoints.length === 1) {
      console.log(`✅ Success: Single system default gateway is set: ${defaultEndpoints[0].name} (${defaultEndpoints[0].sipHost}:${defaultEndpoints[0].sipPort})`);
    } else {
      console.log('⚠️ Warning: No outbound endpoint is marked as system default. Falls back to process.env.OUTBOUND_GATEWAY or localhost:5060.');
    }

    console.log('\n=== 2. Checking Tenants and their Outbound Endpoints ===');
    const tenantsRes = await subtestPool.query(
      'SELECT id, name, "customerCode", "outboundEndpointId" FROM tenants WHERE "outboundEndpointId" IS NOT NULL'
    );
    console.log(`Found ${tenantsRes.rows.length} tenants with custom outbound carriers:`);
    console.table(tenantsRes.rows);

    console.log('\n=== 2b. Checking All DIDs and TFNs in Database ===');
    const didsRes = await subtestPool.query(
      'SELECT id, number, "routeType", "forwardNumber", "tenantId" FROM dids'
    );
    console.log(`Found ${didsRes.rows.length} DIDs:`);
    console.table(didsRes.rows);

    const tfnsRes = await subtestPool.query(
      'SELECT id, number, "routeType", "forwardNumber", "tenantId" FROM tfns'
    );
    console.log(`Found ${tfnsRes.rows.length} TFNs:`);
    console.table(tfnsRes.rows);

    console.log('\n=== 3. Inspecting dialplan_xml in FreeSWITCH DB (Forwarding Dialplans) ===');
    const dialplansRes = await freeswitchPool.query(
      "SELECT dialplan_id, xml_content FROM dialplan_xml WHERE dialplan_id LIKE 'fwd_%'"
    );
    console.log(`Found ${dialplansRes.rows.length} forwarding dialplans in database:`);
    
    for (const dp of dialplansRes.rows) {
      console.log(`\nDialplan ID: ${dp.dialplan_id}`);
      const lines = dp.xml_content.split('\n');
      const relevantLines = lines.filter(l => l.includes('bridge') || l.includes('gateway') || l.includes('sofia'));
      relevantLines.forEach(l => console.log('  ', l.trim()));
    }

  } catch (error) {
    console.error('Error during verification:', error);
  } finally {
    await subtestPool.end();
    await freeswitchPool.end();
  }
}

run();
