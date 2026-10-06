const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'freeswitch',
  user: 'freeswitch',
  password: 'OnidaMaruti1)',
});

async function check() {
    console.log('\n--- Checking Dialplan XML in freeswitch database ---');
    try {
        const res = await pool.query("SELECT dialplan_id, xml_content FROM dialplan_xml WHERE xml_content LIKE '%record_session%' LIMIT 1");
        if (res.rows.length > 0) {
            console.log(`\nFound dialplan with recording enabled! ID: ${res.rows[0].dialplan_id}`);
            console.log("--------------------------------------------------");
            console.log(res.rows[0].xml_content);
            console.log("--------------------------------------------------");
        } else {
            console.log('No dialplans found with recording enabled yet.');
        }
    } catch (e) {
        console.error(e);
    }
    
    process.exit(0);
}
check();
