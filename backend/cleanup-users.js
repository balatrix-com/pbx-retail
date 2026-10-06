
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const EMAILS_TO_DELETE = [
    'sahilghewari@gmail.com',
    'sahilghewari6@gmail.com'
];

async function main() {
    console.log('Starting cleanup...');

    for (const email of EMAILS_TO_DELETE) {
        const user = await prisma.user.findUnique({
            where: { email }
        });

        if (!user) {
            console.log(`User not found: ${email}`);
            continue;
        }

        console.log(`Deleting user: ${email} (${user.id})`);

        await prisma.$transaction(async (tx) => {
            // 1. Delete Support Profile
            const deletedProfile = await tx.supportProfile.deleteMany({
                where: { supportUserId: user.id }
            });
            console.log(`  - Deleted ${deletedProfile.count} support profiles`);

            // 2. Delete Audit Logs
            const deletedLogs = await tx.userAuditLog.deleteMany({
                where: {
                    OR: [
                        { actorId: user.id },
                        { targetId: user.id }
                    ]
                }
            });
            console.log(`  - Deleted ${deletedLogs.count} audit logs`);

            // 3. Delete User
            await tx.user.delete({
                where: { id: user.id }
            });
            console.log(`  - User deleted successfully`);
        });
    }
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
