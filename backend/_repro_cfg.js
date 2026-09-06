const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
(async () => {
  try {
    const rows = await prisma.$queryRawUnsafe('SELECT * FROM platform_configs LIMIT 5');
    console.log('platform_configs:', JSON.stringify(rows, null, 2));
  } catch (e) {
    console.error('session config error:', e.message);
  }
  try {
    const rows = await prisma.$queryRawUnsafe('SELECT * FROM "PlatformConfig" LIMIT 5');
    console.log('PlatformConfig (default table):', JSON.stringify(rows, null, 2));
  } catch (e) {
    console.error('default table error:', e.message);
  }
  await prisma.$disconnect();
})();
