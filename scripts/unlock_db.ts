import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';

dotenv.config();

// Använd DIRECT_URL om den finns, annars SUPABASE_URL (men DIRECT_URL krävs oftast för detta)
const url = process.env.DIRECT_URL || process.env.SUPABASE_URL;

if (!url) {
    console.error("Ingen databas-URL hittades i .env (DIRECT_URL eller SUPABASE_URL)");
    process.exit(1);
}

console.log("Ansluter till databasen för att släppa lås...");

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: url
    }
  }
});

async function main() {
  try {
    // 72707369 är det specifika ID som Prisma Migrate använder för advisory locks
    const result = await prisma.$queryRaw`SELECT pg_advisory_unlock(72707369)`;
    console.log('Lås släppt. Resultat:', result);
  } catch (error) {
    console.error('Fel vid upplåsning:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
