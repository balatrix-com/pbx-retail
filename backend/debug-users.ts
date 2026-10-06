import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log("Fetching all users...");
    const users = await prisma.user.findMany({
        select: {
            id: true,
            email: true,
            role: true,
            tenantId: true,
            status: true
        }
    });
    console.table(users);
}

main()
    .catch(e => console.error(e))
    .finally(() => prisma.$disconnect());
