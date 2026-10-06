const { Client } = require('pg');

const client = new Client({
  connectionString: "postgresql://subadmin:OnidaMaruti1)@localhost:5432/subtest?schema=public"
});

async function run() {
  try {
    console.log("Connecting to PostgreSQL...");
    await client.connect();
    console.log("Connected successfully!");

    console.log("\n--- Checking Connection Counts by State ---");
    const countsRes = await client.query(`
      SELECT state, count(*) 
      FROM pg_stat_activity 
      GROUP BY state;
    `);
    console.table(countsRes.rows);

    console.log("\n--- Querying specific tenant e9118166-8ce2-41a6-b118-a5feb7c2b9dd ---");
    const rowRes = await client.query("SELECT * FROM tenants WHERE id = 'e9118166-8ce2-41a6-b118-a5feb7c2b9dd';");
    console.dir(rowRes.rows[0]);

    console.log("\n--- Checking pg_stat_activity ---");
    const activityRes = await client.query(`
      SELECT pid, state, query, age(clock_timestamp(), query_start) AS age, wait_event_type, wait_event
      FROM pg_stat_activity
      WHERE state IS NOT DISTINCT FROM 'active' OR state = 'idle in transaction'
      ORDER BY age DESC;
    `);
    console.table(activityRes.rows);

    console.log("\n--- Checking Locks & Tables ---");
    const locksRes = await client.query(`
      SELECT 
        l.pid,
        c.relname AS table_name,
        l.mode AS lock_mode,
        l.granted,
        a.query AS transaction_query
      FROM pg_locks l
      JOIN pg_class c ON l.relation = c.oid
      JOIN pg_stat_activity a ON l.pid = a.pid
      WHERE c.relname NOT LIKE 'pg_%' AND c.relname NOT LIKE 'sql_%';
    `);
    if (locksRes.rows.length === 0) {
      console.log("No table locks found.");
    } else {
      console.table(locksRes.rows);
    }
  } catch (err) {
    console.error("Error running diagnostic:", err);
  } finally {
    await client.end();
  }
}

run();
