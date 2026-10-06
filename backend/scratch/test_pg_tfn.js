const { Client } = require('pg');

const client = new Client({
  connectionString: "postgresql://subadmin:OnidaMaruti1)@localhost:5432/subtest?schema=public"
});

async function run() {
  try {
    console.log("Connecting to PostgreSQL...");
    await client.connect();
    console.log("Connected successfully!");

    console.log("Querying TFN table with raw pg...");
    const start = Date.now();
    const result = await client.query('SELECT number FROM tfns WHERE "tenantId" IS NULL AND status = \'AVAILABLE\' AND "isDemo" = true ORDER BY number ASC;');
    console.log(`Query succeeded in ${Date.now() - start}ms`);
    console.log(`Found ${result.rows.length} rows.`);
    console.dir(result.rows);
  } catch (err) {
    console.error("Error:", err);
  } finally {
    await client.end();
  }
}

run();
