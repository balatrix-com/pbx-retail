const { Client } = require('pg');

async function main() {
  const client = new Client({
    connectionString: "postgresql://subadmin:OnidaMaruti1)@10.30.0.61:5432/subtest?schema=public"
  });
  await client.connect();
  const res = await client.query('SELECT * FROM extensions LIMIT 10;');
  console.log(res.rows);
  await client.end();
}

main();
