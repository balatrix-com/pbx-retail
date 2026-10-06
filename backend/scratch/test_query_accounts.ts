import { PrismaClient, TFNStatus, SubscriptionStatus, Role } from '@prisma/client';

const prisma = new PrismaClient({
  log: ['query', 'info', 'warn', 'error']
});

async function main() {
  await prisma.$connect();
  const start = Date.now();
  try {
    console.log('Querying chunk of 10 with relations...');
    const result = await prisma.tenant.findMany({
        where: { customerCode: { startsWith: 'T' } },
        select: {
            customerCode: true,
            serviceBlocked: true,
            tfns: {
                where: { status: TFNStatus.ASSIGNED },
                select: { number: true }
            },
            subscriptions: {
                where: { status: SubscriptionStatus.ACTIVE },
                select: { id: true }
            },
            users: {
                where: { role: Role.ADMIN },
                select: { name: true, email: true }
            }
        },
        orderBy: { customerCode: 'asc' },
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
