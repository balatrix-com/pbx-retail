import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const user = await prisma.user.findUnique({ where: { id: '0642ada2-79bf-4d26-a2fa-7d2b3313cb4f' } });
  console.log(user);
}
main();
