
import { PrismaClient, TFNStatus } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('Seeding additional TFNs...');

    const newTfns = [];
    // Generate 20 new TFNs: +18005550200 to +18005550219
    for (let i = 0; i < 20; i++) {
        const suffix = i.toString().padStart(3, '0');
        newTfns.push({
            number: `+18005553${suffix}`, // using 3xxx to avoid conflicts with 1xxx and 2xxx
            price: 2.00,
            status: TFNStatus.AVAILABLE
        });
    }

    // Add a few premium ones
    newTfns.push({ number: '+18884440000', price: 50.00, status: TFNStatus.AVAILABLE });
    newTfns.push({ number: '+18884447777', price: 100.00, status: TFNStatus.AVAILABLE });

    let added = 0;
    for (const tfn of newTfns) {
        const exists = await prisma.tFN.findUnique({
            where: { number: tfn.number }
        });

        if (!exists) {
            await prisma.tFN.create({ data: tfn });
            added++;
        }
    }

    console.log(`Seeding complete. Added ${added} new TFNs.`);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
