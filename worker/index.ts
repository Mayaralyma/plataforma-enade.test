import "dotenv/config";
import PgBoss from "pg-boss";
import { processImportJob } from "../lib/import-processor";
import { prisma } from "../lib/prisma";

const boss = new PgBoss({ connectionString: process.env.DATABASE_URL });
boss.on("error", (error) => console.error("pg-boss:", error));

async function start() {
  await boss.start();
  await boss.createQueue("extract-exam");
  await boss.work("extract-exam", async (jobs) => {
    for (const message of jobs) {
      const { jobId } = message.data as { jobId: string };
      await processImportJob(jobId);
    }
  });
  console.info("Worker de extração iniciado.");
}

start().catch((error) => { console.error(error); process.exit(1); });

async function shutdown() { await boss.stop(); await prisma.$disconnect(); process.exit(0); }
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
