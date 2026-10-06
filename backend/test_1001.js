const { createClient } = require('redis');

async function checkRedis() {
  const client = createClient({
    url: 'redis://localhost:6379',
    password: 'OnidaMaruti1)'
  });
  
  await client.connect();
  
  const keys = await client.keys('customer:1001:call:*');
  console.log(`Found ${keys.length} keys for 1001.`);
  
  for (const k of keys) {
    const data = await client.hGetAll(k);
    console.log(data);
  }
  
  await client.disconnect();
}

checkRedis().catch(console.error);
