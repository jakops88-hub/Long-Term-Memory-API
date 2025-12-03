import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';

dotenv.config();

console.log("Testar anslutning mot DIRECT_URL:", process.env.DIRECT_URL);

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DIRECT_URL
    }
  }
});

async function main() {
  try {
    console.log("Försöker köra en enkel query...");
    const result = await prisma.$queryRaw`SELECT 1 as connected`;
    console.log("Anslutning lyckades!", result);
  } catch (error) {
    console.error("Anslutning misslyckades:", error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
