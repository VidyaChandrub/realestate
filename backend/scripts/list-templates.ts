import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const rows = await prisma.template.findMany({
    where: { pageType: 'landing' },
    select: { id: true, name: true, slug: true, kind: true, designId: true },
    orderBy: { name: 'asc' },
  });
  for (const r of rows) {
    console.log(`${r.kind.padEnd(8)} ${r.designId.padEnd(24)} ${r.slug.padEnd(32)} ${r.name}`);
  }
  console.log('total', rows.length);
}

main()
  .finally(async () => {
    await prisma.$disconnect();
  });
