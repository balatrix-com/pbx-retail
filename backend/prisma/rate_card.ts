import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface RecRateCardSeedData {
  id: number;
  name: string;
  currency: string;
  ratePerMin: number;
  retentionPeriod: 7 | 15 | 30;
}

export async function seedRateCards() {
  console.log('--- Starting Recording Rate Cards Seeding (Prisma) ---');

  const recordingCards: RecRateCardSeedData[] = [
    {
      id: 1,
      name: '7_Days_Standard',
      currency: 'USD',
      ratePerMin: 0.0020,
      retentionPeriod: 7,
    },
    {
      id: 2,
      name: '15_Days_Standard',
      currency: 'USD',
      ratePerMin: 0.0050,
      retentionPeriod: 15,
    },
    {
      id: 3,
      name: '30_Days_Standard',
      currency: 'USD',
      ratePerMin: 0.0080,
      retentionPeriod: 30,
    }
  ];

  try {
    // Seed Recording Rate Cards
    for (const recCard of recordingCards) {
      await prisma.recRateCard.upsert({
        where: { id: recCard.id },
        update: {
          name: recCard.name,
          currency: recCard.currency,
          ratePerMin: recCard.ratePerMin,
          retentionPeriod: recCard.retentionPeriod,
        },
        create: {
          id: recCard.id,
          name: recCard.name,
          currency: recCard.currency,
          ratePerMin: recCard.ratePerMin,
          retentionPeriod: recCard.retentionPeriod,
        }
      });
      console.log(`✓ Seeded Recording Rate Card: ${recCard.name} (${recCard.retentionPeriod} Days)`);
    }

    // Adjust ID sequence safely
    await prisma.$executeRawUnsafe(`SELECT setval(pg_get_serial_sequence('rec_rate_card', 'id'), COALESCE((SELECT MAX(id) FROM rec_rate_card), 1));`).catch(() => {});

    console.log('--- Recording Rate Cards Seeding Completed Successfully ---');
  } catch (err: any) {
    console.error(`Database Seeding error: ${err.message}`);
    throw err;
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  seedRateCards()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('Recording Rate Card Seeding Failed:', err);
      process.exit(1);
    });
}
