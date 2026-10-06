import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  await prisma.$connect();
  const totalTenants = await prisma.tenant.count();
  const tTenants = await prisma.tenant.count({
    where: { customerCode: { startsWith: 'T' } }
  });
  console.log(`Total tenants: ${totalTenants}, Tenants starting with T: ${tTenants}`);
  await prisma.$disconnect();
}

main();
