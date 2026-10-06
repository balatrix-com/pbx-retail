
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    try {
        const users = await prisma.user.findMany({
            include: {
                tenant: true,
            },
        });

        console.log('--- Current Users System ---');
        if (users.length === 0) {
            console.log('No users found.');
        } else {
            users.forEach((user) => {
                console.log(`
ID: ${user.id}
Email: ${user.email}
Name: ${user.name}
Role: ${user.role}
Tenant: ${user.tenant ? user.tenant.name : 'N/A'}
Status: ${user.status}
---------------------------`);
            });
        }
    } catch (e) {
        console.error('Error fetching users:', e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
