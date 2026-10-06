require('dotenv').config();
const { Client } = require('pg');

async function dropTables() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL
  });
  await client.connect();
  await client.query('DROP TABLE IF EXISTS outbound_endpoints CASCADE');
  await client.query('DROP TABLE IF EXISTS outbound_carriers CASCADE');
  await client.end();
  console.log('Tables dropped');
}

dropTables().catch(console.error);
