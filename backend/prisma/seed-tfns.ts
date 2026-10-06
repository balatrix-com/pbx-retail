import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('--- Starting TFN Seeding ---');
    
    const prefixes = ['800', '888', '877', '866', '855', '844', '833'];
    const targetCount = 50;
    let seededCount = 0;
    let attempts = 0;
    const maxAttempts = 200; // Prevention against infinite loop if something goes wrong

    while (seededCount < targetCount && attempts < maxAttempts) {
        attempts++;
        const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
        // Generate a random 7-digit number
        const suffix = Math.floor(1000000 + Math.random() * 9000000).toString();
        const tfnNumber = `+1${prefix}${suffix}`;

        try {
            // Check if it already exists
            const existing = await prisma.tFN.findUnique({
                where: { number: tfnNumber }
            });

            if (!existing) {
                await prisma.tFN.create({
                    data: {
                        number: tfnNumber,
                        status: 'AVAILABLE',
                        price: 2.00,
                    }
                });
                seededCount++;
                console.log(`[${seededCount}/${targetCount}] Seeded TFN: ${tfnNumber}`);
            }
        } catch (error) {
            console.error(`Failed to seed ${tfnNumber}:`, error.message);
        }
    }

    console.log(`--- Seeding Complete: ${seededCount} TFNs seeded in ${attempts} attempts ---`);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
