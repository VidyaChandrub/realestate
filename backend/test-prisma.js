const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    const templates = await prisma.template.findMany({
      where: { pageType: 'landing' },
      include: { templateCategory: true },
      orderBy: { updatedAt: 'desc' },
    });
    console.log("Templates fetched:", templates.length);
    for (const t of templates) {
      if (!t.createdAt || !t.createdAt.toISOString) {
        console.log("Bad createdAt:", t.id, t.createdAt);
      }
      if (!t.updatedAt || !t.updatedAt.toISOString) {
        console.log("Bad updatedAt:", t.id, t.updatedAt);
      }
    }
    console.log("Done checking templates.");
  } catch (err) {
    console.error("Prisma error:", err);
  } finally {
    await prisma.$disconnect();
  }
}
main();
