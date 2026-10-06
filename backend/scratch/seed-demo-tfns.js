const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function seedNumbers() {
  console.log('Seeding 50 demo numbers into PBX...');
  
  const numbers = [];
  for (let i = 1; i <= 50; i++) {
    const num = `+1800600${i.toString().padStart(4, '0')}`;
    numbers.push({
      number: num,
      status: 'AVAILABLE',
      price: 0,
      isDemo: true
    });
  }

  try {
    for (const data of numbers) {
      await prisma.tFN.upsert({
        where: { number: data.number },
        update: { status: 'AVAILABLE', isDemo: true },
        create: data
      });
    }
    console.log('Successfully seeded 50 demo numbers into PBX inventory.');
  } catch (err) {
    console.error('Error seeding numbers:', err);
  } finally {
    await prisma.$disconnect();
  }
}

seedNumbers();
