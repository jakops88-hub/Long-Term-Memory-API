
import { PrismaClient } from '@prisma/client';
import { env } from './src/config/env';

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: env.databaseUrl
    }
  }
});

async function main() {
  console.log('Checking database vector dimensions...');
  console.log(`Connecting to: ${env.databaseUrl.replace(/:[^:]*@/, ':****@')}`);

  try {
    // 1. Check current dimensions
    const result = await prisma.$queryRaw`
      SELECT atttypmod 
      FROM pg_attribute 
      WHERE attrelid = 'public."Memory"'::regclass 
      AND attname = 'embedding';
    `;
    console.log('Current column info:', result);
    
    // 2. Force update to 768
    console.log('Forcing update to vector(768)...');
    
    // Drop index first
    try {
      await prisma.$executeRaw`DROP INDEX IF EXISTS "Memory_embedding_idx"`;
      console.log('Index dropped.');
    } catch (e) {
      console.log('Index drop failed (might not exist):', e);
    }

    // Clear existing embeddings (safety first)
    await prisma.$executeRaw`UPDATE "Memory" SET "embedding" = NULL`;
    console.log('Existing embeddings cleared (set to NULL).');

    // Alter column
    await prisma.$executeRaw`ALTER TABLE "Memory" ALTER COLUMN "embedding" TYPE vector(768)`;
    console.log('Column successfully altered to vector(768).');

    // Recreate index
    await prisma.$executeRaw`CREATE INDEX "Memory_embedding_idx" ON "Memory" USING HNSW (embedding vector_cosine_ops)`;
    console.log('Index recreated.');

    console.log('✅ DATABASE FIX COMPLETE.');

  } catch (error) {
    console.error('❌ Error fixing database:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
