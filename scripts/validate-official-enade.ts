import { readFile } from "node:fs/promises";
import path from "node:path";
import pdfParse from "pdf-parse";
import { extractQuestions, parseAnswerKey } from "../lib/pdf-parser";

const base = path.resolve(".local/official-enade");
const proofPath = path.join(base, "enade-2023-engenharia-computacao.pdf");
const keyPath = path.join(base, "gabarito-2023-engenharia-computacao.pdf");

async function main() {
  const [proofBuffer, keyBuffer] = await Promise.all([readFile(proofPath), readFile(keyPath)]);
  const [proof, key] = await Promise.all([pdfParse(proofBuffer), pdfParse(keyBuffer)]);
  const questions = extractQuestions(proof.text);
  const answerRows = [...key.text.matchAll(/QUEST[AÃ]O\s+(\d{1,2})\s+([A-E])/gi)];
  const answers = parseAnswerKey(answerRows.map((match) => `${match[1]}; ${match[2]}`).join("\n"));
  const expected = Array.from({ length: 38 }, (_, index) => index + 1);
  const questionNumbers = questions.map(({ number }) => number);
  const missingQuestions = expected.filter((number) => !questionNumbers.includes(number));
  const missingAnswers = expected.filter((number) => !answers.has(number));
  const malformedQuestions = questions.filter((question) => question.options.length !== 5 || !question.statement);
  const needsReview = questions.filter((question) => question.needsReview).map(({ number, reviewNote }) => ({ number, reviewNote }));
  const question16 = questions.find(({ number }) => number === 16);
  const question38 = questions.find(({ number }) => number === 38);
  const question38E = question38?.options.find(({ label }) => label === "E")?.text ?? "";
  const footerPattern = /VALIDIN[3E]P|\*R\d{7,}\*|\*\d{1,2}\*\s*LOGO|LOGO\s*\d*\s*MAT.{0,4}RIA/i;
  const questionsWithFooterResidue = questions
    .filter((question) => [question.statement, ...question.options.map(({ text }) => text)].some((value) => footerPattern.test(value)))
    .map(({ number }) => number);
  const parserRegressionFailures = [
    question16?.options.find(({ label }) => label === "E")?.text !== "15 13 0" ? "question 16 option E did not preserve 15 13 0" : undefined,
    !question38E || /AVALIA.{0,8}GLOBAL DA PROVA|QUESTION.{0,8}PERCEP/i.test(question38E) ? "question 38 option E contains perception questionnaire text" : undefined,
    questionsWithFooterResidue.length ? "footer residue in questions " + questionsWithFooterResidue.join(", ") : undefined,
  ].filter((failure): failure is string => Boolean(failure));

  const summary = {
    proofPages: proof.numpages,
    answerKeyPages: key.numpages,
    extractedQuestions: questions.length,
    questionsWithFiveOptions: questions.length - malformedQuestions.length,
    answerKeyRows: answers.size,
    missingQuestions,
    missingAnswers,
    malformedQuestions: malformedQuestions.map(({ number, options }) => ({ number, optionCount: options.length })),
    needsReview,
    questionsWithFooterResidue,
    parserRegressionFailures,
  };
  console.log(JSON.stringify(summary, null, 2));

  if (proof.numpages !== 40 || key.numpages !== 1 || questions.length !== 38 || missingQuestions.length || missingAnswers.length || malformedQuestions.length || parserRegressionFailures.length) {
    process.exitCode = 1;
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
