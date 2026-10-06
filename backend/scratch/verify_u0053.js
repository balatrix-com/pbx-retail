const { Pool } = require('pg');

const subtestPool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'subtest',
  user: 'subadmin',
  password: 'OnidaMaruti1)',
});

const kamailioPool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'kamailio',
  user: 'freeswitch',
  password: 'OnidaMaruti1)',
});

const fsPool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'freeswitch',
  user: 'freeswitch',
  password: 'OnidaMaruti1)',
});

async function run() {
  try {
    console.log('=== 1. Checking subtest database for tenant U0053 ===');
    const tenantRes = await subtestPool.query("SELECT id, name, \"customerCode\", \"serviceBlocked\" FROM tenants WHERE \"customerCode\" = 'U0053'");
    if (tenantRes.rows.length === 0) {
      console.log('Tenant U0053 not found!');
      process.exit(1);
    }
    const tenant = tenantRes.rows[0];
    console.log('Tenant:', tenant);

    console.log('\n=== 2. Checking subtest database for extensions of tenant U0053 ===');
    const extRes = await subtestPool.query(
      "SELECT id, \"extensionNumber\", name, \"sipPassword\", \"recordingEnabled\" FROM extensions WHERE \"tenantId\" = $1",
      [tenant.id]
    );
    console.log(`Found ${extRes.rows.length} extensions:`);
    console.table(extRes.rows);

    console.log('\n=== 3. Checking Kamailio database for subscribers matching U0053 ===');
    const kamailioRes = await kamailioPool.query(
      "SELECT id, username, domain, password, ha1, ha1b FROM subscriber WHERE username LIKE 'U0053%'"
    );
    console.log(`Found ${kamailioRes.rows.length} subscribers in Kamailio subscriber table:`);
    console.table(kamailioRes.rows);

    console.log('\n=== 4. Checking Kamailio active registrations (location table) ===');
    // Kamailio uses location table for active registrations
    try {
      const activeRes = await kamailioPool.query(
        "SELECT username, domain, contact, received, path, expires, user_agent FROM location WHERE username LIKE 'U0053%'"
      );
      console.log(`Found ${activeRes.rows.length} active registrations in Kamailio location table:`);
      console.table(activeRes.rows);
    } catch (err) {
      console.log('Could not query location table:', err.message);
    }

    console.log('\n=== 5. Checking FreeSWITCH dialplan_xml database for U0053 ===');
    const fsRes = await fsPool.query(
      "SELECT dialplan_id, xml_content FROM dialplan_xml WHERE dialplan_id LIKE '%U0053%'"
    );
    console.log(`Found ${fsRes.rows.length} dialplan entries in FreeSWITCH:`);
    for (const row of fsRes.rows) {
      console.log(`- dialplan_id: ${row.dialplan_id}`);
      console.log('XML Content:\n', row.xml_content);
      console.log('--------------------------------------------------');
    }

  } catch (error) {
    console.error('Error during verification:', error);
  } finally {
    await subtestPool.end();
    await kamailioPool.end();
    await fsPool.end();
  }
}

run();
