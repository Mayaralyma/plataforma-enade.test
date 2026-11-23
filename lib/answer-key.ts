import { prisma } from "./prisma";

export type AnswerKey = Map<number, string | null>;
export type AnswerKeySource = "TEXT" | "PDF_TEXT" | "PDF_OCR";

const OCR_REVIEW_NOTE = "Resposta importada por OCR; confira com o gabarito original antes de publicar.";

export async function applyAnswerKey(editionId: string, answers: AnswerKey, options: { source?: AnswerKeySource } = {}) {
  const fromOcr = options.source === "PDF_OCR";
  let updated = 0;
  await prisma.$transaction(async (tx) => {
    for (const [number, answer] of answers) {
      await tx.answerKeyEntry.upsert({
        where: { editionId_originalNumber: { editionId, originalNumber: number } },
        update: { correctOption: answer, annulled: answer === null },
        create: { editionId, originalNumber: number, correctOption: answer, annulled: answer === null },
      });
      const question = await tx.question.findUnique({ where: { editionId_originalNumber: { editionId, originalNumber: number } } });
      if (!question || (fromOcr && question.status === "DISCARDED")) continue;
      const mustReview = fromOcr || question.status === "PENDING";
      await tx.question.update({
        where: { id: question.id },
        data: {
          correctOption: answer,
          annulled: answer === null,
          status: fromOcr && question.status === "PUBLISHED" ? "PENDING" : undefined,
          needsReview: fromOcr ? true : undefined,
          reviewNote: fromOcr ? OCR_REVIEW_NOTE : undefined,
          reviewedAt: mustReview ? null : undefined,
        },
      });
      updated++;
    }
  });
  return { updated, provided: answers.size };
}
