const { Client } = require('pg');

const client = new Client({
  connectionString: "postgresql://subadmin:OnidaMaruti1)@localhost:5432/subtest?schema=public"
});

async function run() {
  try {
    await client.connect();
    console.log("Connected to PostgreSQL.");

    const pid = 1320707;
    console.log(`Attempting to terminate process with PID ${pid}...`);
    const terminateRes = await client.query('SELECT pg_terminate_backend($1);', [pid]);
    console.log("Termination result:", terminateRes.rows[0]);

    // Check if there are other idle in transaction processes
    console.log("\nChecking for other idle in transaction processes:");
    const activityRes = await client.query(`
      SELECT pid, state, query, age(clock_timestamp(), query_start) AS age
      FROM pg_stat_activity
      WHERE state = 'idle in transaction';
    `);
    console.table(activityRes.rows);
  } catch (err) {
    console.error("Error:", err);
  } finally {
    await client.end();
  }
}

run();
