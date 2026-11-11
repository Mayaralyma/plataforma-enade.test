import "dotenv/config";
import { readFile } from "node:fs/promises";
import path from "node:path";
import pdfParse from "pdf-parse";
import PgBoss from "pg-boss";
import { prisma } from "../lib/prisma";
import { extractQuestions } from "../lib/pdf-parser";

const boss = new PgBoss({ connectionString: process.env.DATABASE_URL });
boss.on("error", (error) => console.error("pg-boss:", error));

async function start() {
  await boss.start();
  await boss.createQueue("extract-exam");
  await boss.work("extract-exam", async (jobs) => {
    for (const message of jobs) {
      const { jobId } = message.data as { jobId: string };
      const job = await prisma.importJob.findUnique({ where: { id: jobId }, include: { edition: true } });
      if (!job || job.status === "COMPLETED") continue;
      if (!job.edition.filePath) throw new Error("O arquivo da prova não está disponível.");
      await prisma.importJob.update({ where: { id: jobId }, data: { status: "PROCESSING", attempts: { increment: 1 }, startedAt: new Date(), error: null } });
      const filePath = path.resolve(job.edition.filePath);
      try {
        const document = await pdfParse(await readFile(filePath));
        const extracted = extractQuestions(document.text);
        let failed = 0;
        for (const question of extracted) {
          const exists = await prisma.question.findUnique({ where: { editionId_originalNumber: { editionId: job.editionId, originalNumber: question.number } }, select: { id: true } });
          if (exists) continue;
          const answerKey = await prisma.answerKeyEntry.findUnique({ where: { editionId_originalNumber: { editionId: job.editionId, originalNumber: question.number } } });
          if (!question.statement || question.options.length !== 5) {
            failed++;
            await prisma.importIssue.upsert({ where: { jobId_originalNumber: { jobId, originalNumber: question.number } }, update: { details: question.reviewNote || "Extração incompleta; revisar enunciado e alternativas." }, create: { jobId, originalNumber: question.number, details: question.reviewNote || "Extração incompleta; revisar enunciado e alternativas." } });
          }
          try {
            await prisma.question.create({ data: { editionId: job.editionId, originalNumber: question.number, statement: question.statement || "Revisar enunciado extraído do PDF.", correctOption: answerKey?.correctOption, annulled: answerKey?.annulled ?? false, needsReview: question.needsReview, reviewNote: question.reviewNote, options: { create: question.options } } });
          } catch (error) {
            failed++;
            await prisma.importIssue.upsert({ where: { jobId_originalNumber: { jobId, originalNumber: question.number } }, update: { details: error instanceof Error ? error.message : "Falha ao persistir questão extraída." }, create: { jobId, originalNumber: question.number, details: error instanceof Error ? error.message : "Falha ao persistir questão extraída." } });
            console.error(`Falha ao salvar questão ${question.number}:`, error);
          }
        }
        await prisma.importJob.update({ where: { id: jobId }, data: { status: "COMPLETED", totalFound: extracted.length, totalFailed: failed, finishedAt: new Date(), error: extracted.length ? null : "Nenhuma questão reconhecida. Revise o padrão do PDF e tente novamente." } });
      } catch (error) {
        await prisma.importJob.update({ where: { id: jobId }, data: { status: "FAILED", error: error instanceof Error ? error.message : "Falha na extração.", finishedAt: new Date() } });
        throw error;
      }
    }
  });
  console.info("Worker de extração iniciado.");
}

start().catch((error) => { console.error(error); process.exit(1); });

async function shutdown() { await boss.stop(); await prisma.$disconnect(); process.exit(0); }
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
