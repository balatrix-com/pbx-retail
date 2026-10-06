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
    console.log('Querying tenant customerCodes with limit...');
    const result = await prisma.tenant.findMany({
      select: { customerCode: true },
      take: 5
    });
    console.log(`Query succeeded in ${Date.now() - start}ms`);
    console.log(`Tenants:`, JSON.stringify(result));
  } catch (error) {
    console.error('Query failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
