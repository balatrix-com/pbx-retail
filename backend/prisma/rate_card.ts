import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface RateCardSeedData {
  name: string;
  currency: string;
  inRatePerMin: number;
  inInitialIncrementSec: number;
  inIncrementSec: number;
  obRatePerMin: number;
  obInitialIncrementSec: number;
  obIncrementSec: number;
}

interface RecRateCardSeedData {
  id: number;
  name: string;
  currency: string;
  ratePerMin: number;
  retentionPeriod: 7 | 15 | 30;
}

export async function seedRateCards() {
  console.log('--- Starting Rate Cards Seeding (Prisma) ---');

  const standardCards: RateCardSeedData[] = [
    {
      name: 'Standard_Global',
      currency: 'USD',
      inRatePerMin: 0.0020,
      inInitialIncrementSec: 60,
      inIncrementSec: 60,
      obRatePerMin: 0.0080,
      obInitialIncrementSec: 60,
      obIncrementSec: 60,
    },
    {
      name: 'Premium_US_CA',
      currency: 'USD',
      inRatePerMin: 0.0015,
      inInitialIncrementSec: 60,
      inIncrementSec: 60,
      obRatePerMin: 0.0050,
      obInitialIncrementSec: 60,
      obIncrementSec: 60,
    }
  ];

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
    // 1. Seed Standard Rate Cards
    for (const card of standardCards) {
      const existing = await prisma.rateCard.findFirst({
        where: { name: card.name }
      });
      if (!existing) {
        await prisma.rateCard.create({
          data: card
        });
        console.log(`✓ Seeded Standard Rate Card: ${card.name}`);
      } else {
        console.log(`✓ Standard Rate Card already exists: ${card.name}`);
      }
    }

    // 2. Seed Recording Rate Cards
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

    console.log('--- Rate Cards Seeding Completed Successfully ---');
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
      console.error('Rate Card Seeding Failed:', err);
      process.exit(1);
    });
}
