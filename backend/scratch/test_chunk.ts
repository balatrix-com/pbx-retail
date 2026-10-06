import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  log: ['query', 'info', 'warn', 'error']
});

async function main() {
  await prisma.$connect();
  const start = Date.now();
  
  // Try retrieving in chunks of 10
  const chunkSize = 10;
  let allTenants: any[] = [];
  
  for (let i = 0; i < 5; i++) {
    console.log(`Querying chunk ${i}...`);
    const chunk = await prisma.tenant.findMany({
      where: { customerCode: { startsWith: 'T' } },
      select: {
        id: true,
        customerCode: true,
        serviceBlocked: true
      },
      orderBy: { customerCode: 'asc' },
      take: chunkSize,
      skip: i * chunkSize
    });
    console.log(`Chunk ${i} returned ${chunk.length} tenants.`);
    allTenants = allTenants.concat(chunk);
    if (chunk.length < chunkSize) break;
  }
  
  console.log(`Total retrieved in chunks: ${allTenants.length} in ${Date.now() - start}ms`);
  await prisma.$disconnect();
}

main();
