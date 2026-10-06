const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({
    take: 5,
    select: {
      email: true,
      role: true,
      status: true,
      tenantId: true
    }
  });
  console.log(JSON.stringify(users, null, 2));
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
