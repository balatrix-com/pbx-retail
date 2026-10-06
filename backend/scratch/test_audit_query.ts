import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  log: ['query', 'info', 'warn', 'error']
});

async function main() {
  await prisma.$connect();
  const start = Date.now();
  try {
    console.log('Querying auditLogs with findMany take: 15...');
    const result = await prisma.auditLog.findMany({
        where: { 
            OR: [
                { category: 'Demo' },
                { action: { contains: 'Demo' } },
                { action: { contains: 'T0' } }
            ]
        },
        select: {
            id: true,
            action: true,
            actorEmail: true,
            metadata: true,
            createdAt: true
        },
        orderBy: { createdAt: 'desc' },
        take: 10
    });
    console.log(`Query succeeded in ${Date.now() - start}ms`);
    console.log(`Results:`, JSON.stringify(result));
  } catch (error) {
    console.error('Query failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
