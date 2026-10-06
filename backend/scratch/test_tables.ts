import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  log: ['query', 'info', 'warn', 'error']
});

async function main() {
  console.log('Connecting to database...');
  await prisma.$connect();
  console.log('Connected!');

  try {
    console.log('1. Querying users...');
    const users = await prisma.user.findMany({
      select: { id: true, email: true },
      take: 5
    });
    console.log('Users:', JSON.stringify(users));

    console.log('2. Querying subscriptions...');
    const subs = await prisma.subscription.findMany({
      select: { id: true, planId: true },
      take: 5
    });
    console.log('Subscriptions:', JSON.stringify(subs));

    console.log('3. Querying TFNs...');
    const tfns = await prisma.tFN.findMany({
      select: { id: true, number: true },
      take: 5
    });
    console.log('TFNs:', JSON.stringify(tfns));

  } catch (error) {
    console.error('Query failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
