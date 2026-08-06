// Run with: npm run db:seed
// Creates your Super Admin login (phone + PIN) so you can access /admin
// to approve bKash/Nagad payments and manage customers.
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  const phone = process.env.SUPERADMIN_PHONE || '01700000000';
  const pin = process.env.SUPERADMIN_PIN || '123456';

  const existing = await prisma.user.findUnique({ where: { phone } });
  if (existing) {
    console.log('SuperAdmin already exists for', phone);
    return;
  }

  const pinHash = await bcrypt.hash(pin, 10);
  await prisma.user.create({
    data: {
      name: 'Super Admin',
      phone,
      pinHash,
      role: 'SuperAdmin',
      orgId: null,
    },
  });

  console.log('SuperAdmin created —', phone, '/ PIN:', pin);
  console.log('⚠️  Login at /login then you will be redirected to /admin. Change the PIN in production!');
}

main().finally(() => prisma.$disconnect());
