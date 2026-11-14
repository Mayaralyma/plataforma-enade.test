import { readFile } from "node:fs/promises";
import path from "node:path";
import { parseExamPdf } from "./pdf-analysis";
import { prisma } from "./prisma";
import { extractQuestions } from "./pdf-parser";

export async function processImportJob(jobId: string) {
  const job = await prisma.importJob.findUnique({ where: { id: jobId }, include: { edition: true } });
  if (!job) return null;
  if (job.status === "COMPLETED") return job;
  if (!job.edition.filePath) throw new Error("O arquivo da prova não está disponível.");

  await prisma.importJob.update({
    where: { id: jobId },
    data: { status: "PROCESSING", attempts: { increment: 1 }, startedAt: new Date(), error: null },
  });

  const filePath = path.resolve(job.edition.filePath);
  try {
    const document = await parseExamPdf(await readFile(filePath));
    const extracted = extractQuestions(document.text, { visualPages: document.visualPages });
    let failed = 0;

    for (const question of extracted) {
      const existing = await prisma.question.findUnique({
        where: { editionId_originalNumber: { editionId: job.editionId, originalNumber: question.number } },
        select: { id: true, status: true, correctOption: true, annulled: true },
      });

      const answerKey = await prisma.answerKeyEntry.findUnique({
        where: { editionId_originalNumber: { editionId: job.editionId, originalNumber: question.number } },
      });

      if (existing && existing.status !== "PENDING") continue;

      if (!question.statement || question.options.length !== 5) {
        failed++;
        await prisma.importIssue.upsert({
          where: { jobId_originalNumber: { jobId, originalNumber: question.number } },
          update: { details: question.reviewNote || "Extração incompleta; revisar enunciado e alternativas." },
          create: { jobId, originalNumber: question.number, details: question.reviewNote || "Extração incompleta; revisar enunciado e alternativas." },
        });
      }

      const questionData = {
        statement: question.statement || "Revisar enunciado extraído do PDF.",
        correctOption: answerKey ? answerKey.correctOption : existing?.correctOption ?? null,
        annulled: answerKey ? answerKey.annulled : existing?.annulled ?? false,
        needsReview: question.needsReview,
        reviewNote: question.reviewNote,
      };

      try {
        if (existing) {
          await prisma.$transaction(async (tx) => {
            await tx.option.deleteMany({ where: { questionId: existing.id } });
            await tx.question.update({
              where: { id: existing.id },
              data: { ...questionData, reviewedAt: null, options: { create: question.options } },
            });
          });
        } else {
          await prisma.question.create({
            data: {
              editionId: job.editionId,
              originalNumber: question.number,
              ...questionData,
              options: { create: question.options },
            },
          });
        }
      } catch (error) {
        failed++;
        await prisma.importIssue.upsert({
          where: { jobId_originalNumber: { jobId, originalNumber: question.number } },
          update: { details: error instanceof Error ? error.message : "Falha ao persistir questão extraída." },
          create: { jobId, originalNumber: question.number, details: error instanceof Error ? error.message : "Falha ao persistir questão extraída." },
        });
        console.error(`Falha ao salvar questão ${question.number}:`, error);
      }
    }

    return await prisma.importJob.update({
      where: { id: jobId },
      data: {
        status: "COMPLETED",
        totalFound: extracted.length,
        totalFailed: failed,
        finishedAt: new Date(),
        error: extracted.length ? null : "Nenhuma questão reconhecida. Revise o padrão do PDF e tente novamente.",
      },
    });
  } catch (error) {
    await prisma.importJob.update({
      where: { id: jobId },
      data: { status: "FAILED", error: error instanceof Error ? error.message : "Falha na extração.", finishedAt: new Date() },
    });
    throw error;
  }
}
