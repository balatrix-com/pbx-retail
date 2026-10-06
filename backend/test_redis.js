const { createClient } = require('redis');

async function checkRedis() {
  const client = createClient({
    url: 'redis://localhost:6379',
    password: 'OnidaMaruti1)'
  });
  
  await client.connect();
  const keys = await client.keys('customer:1b31dc17-d92a-45c1-9ad9-42934fbbb6af:call:*');
  console.log(`Found ${keys.length} keys for this tenant.`);
  
  if (keys.length > 0) {
    for (const key of keys) {
      const data = await client.hGetAll(key);
      console.log('Data for', key, data);
    }
  }

  // search for specific call structure
  const allKeys = await client.keys('customer:*:call:*');
  const validKeys = allKeys.filter(k => !k.includes('test_cust'));
  console.log(`Found ${validKeys.length} non-test keys`);
  for (const k of validKeys.slice(0, 5)) {
    const data = await client.hGetAll(k);
    console.log('Sample Data:', data);
  }
  
  await client.disconnect();
}

checkRedis().catch(console.error);
