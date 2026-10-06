const { createClient } = require('redis');

async function checkRedis() {
  const client = createClient({
    url: 'redis://localhost:6379',
    password: 'OnidaMaruti1)'
  });
  
  await client.connect();
  
  const allKeys = await client.keys('customer:*:call:*');
  const validKeys = allKeys.filter(k => !k.includes('test_cust'));
  console.log(`Found ${validKeys.length} non-test keys in Redis.`);
  
  for (const k of validKeys) {
    const data = await client.hGetAll(k);
    console.log(`Call UUID: ${data.uuid}, Customer ID: ${data.customer_id}`);
  }
  
  await client.disconnect();
}

checkRedis().catch(console.error);
