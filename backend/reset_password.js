const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const prisma = new PrismaClient();

async function main() {
  const email = 'sahil@voipsutra.com';
  const newPassword = 'Welcome123!';
  const hashedPassword = await bcrypt.hash(newPassword, 10);

  const user = await prisma.user.update({
    where: { email },
    data: { password: hashedPassword }
  });

  console.log(`Password reset successfully for: ${user.email}`);
  console.log(`New password: ${newPassword}`);
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
