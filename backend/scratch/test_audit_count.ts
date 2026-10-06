import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  await prisma.$connect();
  const count = await prisma.auditLog.count({
    where: { 
        OR: [
            { category: 'Demo' },
            { action: { contains: 'Demo' } },
            { action: { contains: 'T0' } }
        ]
    }
  });
  console.log(`Matching audit logs count: ${count}`);
  
  // Let's retrieve one record to inspect metadata size
  const oneLog = await prisma.auditLog.findFirst({
    where: { 
        OR: [
            { category: 'Demo' },
            { action: { contains: 'Demo' } },
            { action: { contains: 'T0' } }
        ]
    },
    orderBy: { createdAt: 'desc' }
  });
  console.log('One log sample:', JSON.stringify(oneLog));
  await prisma.$disconnect();
}

main();
