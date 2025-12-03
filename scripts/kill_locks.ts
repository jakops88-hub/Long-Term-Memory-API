import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';

dotenv.config();

const url = process.env.DIRECT_URL || process.env.SUPABASE_URL;

if (!url) {
    console.error("Ingen databas-URL hittades.");
    process.exit(1);
}

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: url
    }
  }
});

async function main() {
  console.log("Letar efter processer som håller migrations-låset (72707369)...");
  try {
    // Hitta PID för processer som håller advisory lock med ID 72707369
    // Vi måste casta resultatet eftersom $queryRaw returnerar unknown
    const locks = await prisma.$queryRaw<any[]>`
      SELECT a.pid, a.state, a.query_start, a.query
      FROM pg_locks l
      JOIN pg_stat_activity a ON l.pid = a.pid
      WHERE l.locktype = 'advisory'
      AND l.objid = 72707369;
    `;

    console.log(`Hittade ${locks.length} processer.`);

    for (const lock of locks) {
      console.log(`Dödar PID ${lock.pid} (Status: ${lock.state}, Startad: ${lock.query_start})`);
      // Terminera processen
      await prisma.$queryRaw`SELECT pg_terminate_backend(${lock.pid})`;
      console.log(`PID ${lock.pid} terminerad.`);
    }

    if (locks.length === 0) {
        console.log("Inga aktiva lås hittades. Om du fortfarande får fel kan det vara en 'pending' migration i _prisma_migrations tabellen som spökar.");
    }

  } catch (e) {
    console.error("Ett fel uppstod:", e);
  } finally {
    await prisma.$disconnect();
  }
}

main();
