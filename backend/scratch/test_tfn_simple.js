const { Client } = require('pg');

const client = new Client({
  connectionString: "postgresql://subadmin:OnidaMaruti1)@localhost:5432/subtest?schema=public"
});

async function run() {
  try {
    await client.connect();
    console.log("Connected successfully!");

    const sql = 'SELECT number FROM tfns WHERE "tenantId" IS NULL AND status = \'AVAILABLE\' AND "isDemo" = true ORDER BY number ASC LIMIT 15;';
    console.log("Running query with limit 15...");
    const start = Date.now();
    const result = await client.query(sql);
    console.log(`Query succeeded in ${Date.now() - start}ms:`, result.rows);
  } catch (err) {
    console.error("Error:", err);
  } finally {
    await client.end();
  }
}

run();
