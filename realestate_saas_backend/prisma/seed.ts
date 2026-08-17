import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

// Place this at: prisma/seed.ts
// Run with: npx prisma db seed

const prisma = new PrismaClient();

async function main() {
  // --- 1. Roles catalogue (§6 of the Module 1 doc) -------------------------
  const roles = [
    { key: 'super_admin', name: 'Super Admin', scope: 'platform' as const, sortOrder: 0 },
    { key: 'admin', name: 'Admin', scope: 'organisation' as const, sortOrder: 1 },
    { key: 'manager', name: 'Manager', scope: 'team' as const, sortOrder: 2 },
    { key: 'sales', name: 'Sales', scope: 'team' as const, sortOrder: 3 },
  ];

  for (const role of roles) {
    await prisma.role.upsert({
      where: { key: role.key },
      update: {},
      create: role,
    });
  }
  console.log(`Seeded ${roles.length} roles.`);

  // --- 2. Super Admin account (§2 of the Module 1 doc) ----------------------
  // Pull from env so the password never lives in source control.
  const superAdminEmail = process.env.SUPER_ADMIN_EMAIL ?? 'admin@realestate.com';
  const superAdminPassword = process.env.SUPER_ADMIN_PASSWORD;

  if (!superAdminPassword) {
    console.warn(
      'SUPER_ADMIN_PASSWORD not set in env — skipping Super Admin creation. ' +
      'Set it and re-run: SUPER_ADMIN_PASSWORD=yourpassword npx prisma db seed',
    );
  } else {
    const passwordHash = await bcrypt.hash(superAdminPassword, 12);

    const superAdminRole = await prisma.role.findUniqueOrThrow({
      where: { key: 'super_admin' },
    });

    const existing = await prisma.user.findUnique({ where: { email: superAdminEmail } });

    if (!existing) {
      const user = await prisma.user.create({
        data: {
          orgId: null, // platform-level, no organisation
          email: superAdminEmail,
          passwordHash,
          status: 'active',
          mustChangePassword: true, // forced change on first login
        },
      });

      await prisma.userRole.create({
        data: { userId: user.id, roleId: superAdminRole.id },
      });

      console.log(`Super Admin created: ${superAdminEmail}`);
    } else {
      console.log(`Super Admin already exists: ${superAdminEmail} — skipped.`);
    }
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