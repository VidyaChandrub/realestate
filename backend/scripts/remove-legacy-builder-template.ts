import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const matches = await prisma.template.findMany({
    where: {
      OR: [
        { slug: 'skyline-heights-builder' },
        { name: { contains: 'Project launch', mode: 'insensitive' } },
        { designId: 'tpl-estatepro' },
      ],
    },
    select: { id: true, name: true, slug: true, kind: true, designId: true },
  });

  if (!matches.length) {
    console.log('No matching Project launch / tpl-estatepro templates');
    return;
  }

  for (const legacy of matches) {
    await prisma.organisationTemplate.deleteMany({ where: { templateId: legacy.id } });
    await prisma.landingPage.updateMany({
      where: { sourceTemplateId: legacy.id },
      data: { sourceTemplateId: null },
    });
    await prisma.template.delete({ where: { id: legacy.id } });
    console.log('Deleted:', legacy.name, legacy.slug, legacy.designId);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
