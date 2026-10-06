const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const tenants = await prisma.tenant.findMany({
    where: { partnerId: { not: null } },
    select: { id: true, name: true, partnerId: true }
  });
  const users = await prisma.user.findMany({
    where: { partnerId: { not: null } },
    select: { id: true, email: true, partnerId: true }
  });
  console.log('Tenants with partnerId:', tenants);
  console.log('Users with partnerId:', users);
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
