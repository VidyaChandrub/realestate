import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Ensuring identity.media_files table exists...');
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS identity.media_files (
      id TEXT PRIMARY KEY,
      org_id TEXT REFERENCES identity.organisations(id) ON DELETE CASCADE,
      uploaded_by_id TEXT REFERENCES identity.users(id) ON DELETE SET NULL,
      name TEXT NOT NULL,
      filename TEXT NOT NULL,
      stored_key TEXT NOT NULL,
      public_url TEXT NOT NULL,
      mime_type TEXT NOT NULL,
      size INTEGER NOT NULL,
      category TEXT NOT NULL DEFAULT 'image',
      folder TEXT NOT NULL DEFAULT 'general',
      tags TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
      metadata JSONB,
      created_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS idx_media_files_org_id ON identity.media_files(org_id);
  `);
  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS idx_media_files_category ON identity.media_files(category);
  `);
  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS idx_media_files_folder ON identity.media_files(folder);
  `);
  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS idx_media_files_created_at ON identity.media_files(created_at);
  `);

  console.log('identity.media_files table verified successfully.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
