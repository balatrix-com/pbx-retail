
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('Resetting TFNs...');
    const tfns = ['+18005550201', '+18005550202', '+18005550203'];

    await prisma.tFN.updateMany({
        where: { number: { in: tfns } },
        data: { status: 'AVAILABLE', heldBy: null, heldUntil: null }
    });

    console.log('TFNs reset to AVAILABLE');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
