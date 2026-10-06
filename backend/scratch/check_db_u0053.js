const { Pool } = require('pg');
const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'freeswitch',
  user: 'freeswitch',
  password: 'OnidaMaruti1)',
});

async function check() {
    try {
        const res = await pool.query("SELECT dialplan_id, xml_content FROM dialplan_xml WHERE dialplan_id LIKE '%U0053%' LIMIT 1");
        if (res.rows.length > 0) {
            console.log(`\nFound dialplan! ID: ${res.rows[0].dialplan_id}`);
            console.log(res.rows[0].xml_content);
        } else {
            console.log('No dialplans found for U0053.');
        }
    } catch (e) {
        console.error(e);
    }
    process.exit(0);
}
check();
