const { createClient } = require('redis');

async function main() {
  const client = createClient({
    url: 'redis://localhost:6379',
    password: 'OnidaMaruti1)'
  });
  
  await client.connect();
  
  const keys = await client.keys('customer:1001:call:*');
  console.log(`Found ${keys.length} keys for customer 1001.`);
  
  for (const k of keys) {
    const data = await client.get(k);
    console.log(`Key: ${k}\nData: ${data}\n`);
  }
  
  await client.disconnect();
}

main().catch(console.error);
