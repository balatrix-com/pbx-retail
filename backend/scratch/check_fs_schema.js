

async function checkSchema() {
  const client = new Client({
    host: process.env.FS_DB_HOST,
    port: parseInt(process.env.FS_DB_PORT || '5432', 10),
    database: process.env.FS_DB_NAME,
    user: process.env.FS_DB_USER,
    password: process.env.FS_DB_PASSWORD,
  });

  try {
    await client.connect();
    console.log('--- dialplan_xml columns ---');
    const resXml = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'dialplan_xml'
    `);
    console.log(JSON.stringify(resXml.rows, null, 2));

    console.log('--- did_routes columns ---');
    const resRoutes = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'did_routes'
    `);
    console.log(JSON.stringify(resRoutes.rows, null, 2));

  } catch (err) {
    console.error(err);
  } finally {
    await client.end();
  }
}

checkSchema();
