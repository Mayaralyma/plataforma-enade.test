import "dotenv/config";
import { access, copyFile, mkdir, readFile } from "node:fs/promises";
import path from "node:path";
import pdfParse from "pdf-parse";
import { applyAnswerKey } from "../lib/answer-key";
import { processImportJob } from "../lib/import-processor";
import { parseAnswerKey } from "../lib/pdf-parser";
import { prisma } from "../lib/prisma";

type Fixture = {
  id: string;
  year: number;
  area: string;
  proof: string;
  answerKey: string;
};

type Correction = {
  originalNumber: number;
  statement?: string;
  statementAppend?: string;
  options?: { label: string; text: string }[];
  correctOption?: string | null;
  annulled?: boolean;
  needsReview?: boolean;
  reviewNote?: string | null;
};

type Corrections = { questions: Correction[] };

const args = process.argv.slice(2);
const fixtureId = args.includes("--fixture") ? args[args.indexOf("--fixture") + 1] : undefined;
const shouldPublish = args.includes("--publish");

async function fileExists(filePath: string) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function main() {
  const fixtureRoot = path.resolve("data/official-enade");
  const manifest = JSON.parse(await readFile(path.join(fixtureRoot, "manifest.json"), "utf8")) as { fixtures: Fixture[] };
  const fixtures = fixtureId ? manifest.fixtures.filter((fixture) => fixture.id === fixtureId) : manifest.fixtures;
  if (!fixtures.length) {
    throw new Error(`Fixture não encontrada: ${fixtureId}`);
  }

  const storage = path.resolve(process.env.PDF_STORAGE_DIR || "./uploads");
  await mkdir(storage, { recursive: true });

  for (const fixture of fixtures) {
    const proofPath = path.join(fixtureRoot, fixture.proof);
    const answerKeyPath = path.join(fixtureRoot, fixture.answerKey);
    const storedProofPath = path.join(storage, `${fixture.id}-prova.pdf`);
    const storedAnswerKeyPath = path.join(storage, `${fixture.id}-gabarito.pdf`);
    await copyFile(proofPath, storedProofPath);
    await copyFile(answerKeyPath, storedAnswerKeyPath);

    const edition = await prisma.edition.upsert({
      where: { year_area: { year: fixture.year, area: fixture.area } },
      update: {
        originalFileName: path.basename(proofPath),
        filePath: storedProofPath,
        answerKeyPath: storedAnswerKeyPath,
      },
      create: {
        year: fixture.year,
        area: fixture.area,
        originalFileName: path.basename(proofPath),
        filePath: storedProofPath,
        answerKeyPath: storedAnswerKeyPath,
      },
    });

    const job = await prisma.importJob.create({ data: { editionId: edition.id } });
    const processed = await processImportJob(job.id);
    if (!processed || processed.status !== "COMPLETED") {
      throw new Error(`A extração da fixture ${fixture.id} não foi concluída.`);
    }

    const answerKeyDocument = await pdfParse(await readFile(answerKeyPath));
    const answers = parseAnswerKey(answerKeyDocument.text);
    if (!answers.size) throw new Error(`O gabarito da fixture ${fixture.id} não gerou respostas.`);
    const appliedAnswers = await applyAnswerKey(edition.id, answers);

    const correctionsPath = path.join(path.dirname(proofPath), "corrections.json");
    let corrections: Corrections | undefined;
    if (await fileExists(correctionsPath)) {
      corrections = JSON.parse(await readFile(correctionsPath, "utf8")) as Corrections;
      for (const correction of corrections.questions) {
        const question = await prisma.question.findUnique({
          where: { editionId_originalNumber: { editionId: edition.id, originalNumber: correction.originalNumber } },
        });
        if (!question) throw new Error(`Correção para questão inexistente: ${correction.originalNumber} (${fixture.id})`);
        await prisma.$transaction(async (tx) => {
          if (correction.options) {
            await tx.option.deleteMany({ where: { questionId: question.id } });
          }
          await tx.question.update({
            where: { id: question.id },
            data: {
              statement: correction.statement ?? (correction.statementAppend
                ? `${question.statement}\n\n${correction.statementAppend}`
                : question.statement),
              correctOption: "correctOption" in correction ? correction.correctOption : question.correctOption,
              annulled: correction.annulled ?? question.annulled,
              needsReview: correction.needsReview ?? false,
              reviewNote: correction.reviewNote ?? null,
              reviewedAt: null,
              ...(correction.options ? { options: { create: correction.options } } : {}),
            },
          });
        });
      }
    }

    if (shouldPublish) {
      const questions = await prisma.question.findMany({ where: { editionId: edition.id }, include: { options: true } });
      const invalid = questions.filter((question) => question.options.length !== 5 || (!question.correctOption && !question.annulled) || question.needsReview);
      if (invalid.length) {
        throw new Error(`Não foi possível publicar ${fixture.id}: questões inválidas ou ainda sinalizadas para revisão ${invalid.map((question) => question.originalNumber).join(", ")}`);
      }
      await prisma.question.updateMany({ where: { editionId: edition.id }, data: { status: "PUBLISHED", reviewedAt: new Date() } });
    }

    const questions = await prisma.question.findMany({ where: { editionId: edition.id }, include: { options: true } });
    const pending = questions.filter((question) => question.status === "PENDING").length;
    const published = questions.filter((question) => question.status === "PUBLISHED").length;
    console.info(
      `[${fixture.id}] ${questions.length} questões, ${questions.filter((question) => question.options.length === 5).length} com cinco alternativas, ` +
      `${appliedAnswers.updated} respostas aplicadas, ${corrections?.questions.length ?? 0} correções, ${pending} pendentes, ${published} publicadas.`,
    );
  }
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
