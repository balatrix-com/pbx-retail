const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const partners = await prisma.partner.findMany();
  console.log('All partners in database:', partners);
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
