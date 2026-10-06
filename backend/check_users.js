const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({
    select: { email: true }
  });
  console.log('Users in PBX:', users);
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
