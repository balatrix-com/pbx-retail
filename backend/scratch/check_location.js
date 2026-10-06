const { Pool } = require('pg');

const kamailioPool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'kamailio',
  user: 'subadmin',
  password: 'OnidaMaruti1)',
});

async function run() {
  try {
    console.log('=== Checking Kamailio active registrations (location table) with subadmin ===');
    const activeRes = await kamailioPool.query(
      "SELECT username, domain, contact, received, path, expires, user_agent FROM location"
    );
    console.log(`Found ${activeRes.rows.length} total active registrations in Kamailio:`);
    console.table(activeRes.rows);
  } catch (err) {
    console.log('Could not query location table with subadmin:', err.message);
  } finally {
    await kamailioPool.end();
  }
}

run();
