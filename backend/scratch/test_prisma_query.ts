import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  log: ['query', 'info', 'warn', 'error']
});

async function main() {
  console.log('Connecting to database...');
  await prisma.$connect();
  console.log('Connected!');

  const start = Date.now();
  try {
    console.log('Querying raw tenants startsWith T...');
    const result = await prisma.$queryRaw`SELECT * FROM tenants WHERE "customerCode" LIKE 'T%'`;
    console.log(`Query succeeded in ${Date.now() - start}ms`);
    console.log(`Tenants count:`, (result as any).length);
  } catch (error) {
    console.error('Query failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
