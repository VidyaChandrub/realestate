const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
p.$queryRaw`
  SELECT column_name
  FROM information_schema.columns
  WHERE table_schema = 'projects'
    AND table_name = 'projects'
    AND column_name = 'unit_field_template'
`
  .then((r) => {
    console.log(JSON.stringify(r));
    return p.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await p.$disconnect();
    process.exit(1);
  });
