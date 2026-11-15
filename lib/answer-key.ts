import { prisma } from "./prisma";

export type AnswerKey = Map<number, string | null>;

export async function applyAnswerKey(editionId: string, answers: AnswerKey) {
  let updated = 0;
  for (const [number, answer] of answers) {
    await prisma.answerKeyEntry.upsert({
      where: { editionId_originalNumber: { editionId, originalNumber: number } },
      update: { correctOption: answer, annulled: answer === null },
      create: { editionId, originalNumber: number, correctOption: answer, annulled: answer === null },
    });
    const question = await prisma.question.findUnique({ where: { editionId_originalNumber: { editionId, originalNumber: number } } });
    if (!question) continue;
    await prisma.question.update({
      where: { id: question.id },
      data: {
        correctOption: answer,
        annulled: answer === null,
        ...(question.status === "PENDING" ? { reviewedAt: null } : {}),
      },
    });
    updated++;
  }
  return { updated, provided: answers.size };
}
