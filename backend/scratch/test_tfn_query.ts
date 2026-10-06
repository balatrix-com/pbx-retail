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
    console.log('Querying TFN table using Prisma...');
    const result = await prisma.tFN.findMany({
      where: { 
          tenantId: null, 
          status: 'AVAILABLE',
          isDemo: true
      },
      select: { number: true },
      orderBy: { number: 'asc' }
    });
    console.log(`Query succeeded in ${Date.now() - start}ms`);
    console.log(`Available TFN count:`, result.length);
    console.log(`TFNs:`, result);
  } catch (error) {
    console.error('Query failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
