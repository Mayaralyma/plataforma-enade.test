import { readFile } from "node:fs/promises";
import path from "node:path";
import pdfParse from "pdf-parse";
import { parseExamPdf } from "../lib/pdf-analysis";
import { extractQuestions, parseAnswerKey, type ExtractedQuestion } from "../lib/pdf-parser";

type FixtureCheck =
  | { type: "statementContains"; question: number; values: string[] }
  | { type: "questionTextContains"; question: number; values: string[] }
  | { type: "optionEquals"; question: number; option: string; value: string }
  | { type: "optionTextNotMatch"; question: number; option: string; pattern: string }
  | { type: "visualReview"; question: number; expected: boolean };

type Fixture = {
  id: string;
  year: number;
  area: string;
  proof: string;
  answerKey: string;
  expectedProofPages?: number;
  expectedAnswerKeyPages?: number;
  annulled?: number[];
  expectedVisualReview?: number[];
  checks?: FixtureCheck[];
};

type Manifest = { fixtures: Fixture[] };

const manifestPath = path.resolve("data/official-enade/manifest.json");
const footerPattern = /VALIDIN[3E]P|\*R\d{7,}|\*\d{1,2}\*\s*LOGO|LOGO\s*\d*\s*MAT.{0,4}RIA|ÁREA LIVRE/i;
const maximumDurationMs = 180_000;

function parseFilter() {
  const args = process.argv.slice(2);
  const index = args.indexOf("--fixture");
  if (index < 0) return undefined;
  const value = args[index + 1];
  if (!value) throw new Error("Informe o id da fixture após --fixture.");
  return value;
}

function questionText(question: ExtractedQuestion) {
  return [question.statement, ...question.options.map(({ text }) => text)].join(" ");
}

function optionText(question: ExtractedQuestion | undefined, label: string) {
  return question?.options.find((option) => option.label === label)?.text ?? "";
}

function pushFailure(failures: string[], condition: boolean, message: string) {
  if (condition) failures.push(message);
}

function validateCheck(question: ExtractedQuestion | undefined, check: FixtureCheck, failures: string[]) {
  if (!question) {
    failures.push(`questão ${check.question} não foi extraída para a checagem ${check.type}`);
    return;
  }

  if (check.type === "statementContains") {
    const missing = check.values.filter((value) => !question.statement.includes(value));
    pushFailure(failures, missing.length > 0, `questão ${check.question} não contém no enunciado: ${missing.join(", ")}`);
    return;
  }

  if (check.type === "questionTextContains") {
    const text = questionText(question);
    const missing = check.values.filter((value) => !text.includes(value));
    pushFailure(failures, missing.length > 0, `questão ${check.question} não contém no texto: ${missing.join(", ")}`);
    return;
  }

  if (check.type === "optionEquals") {
    const text = optionText(question, check.option);
    pushFailure(failures, text !== check.value, `questão ${check.question} alternativa ${check.option} deveria ser "${check.value}", recebeu "${text}"`);
    return;
  }

  if (check.type === "optionTextNotMatch") {
    const text = optionText(question, check.option);
    const matches = new RegExp(check.pattern, "iu").test(text);
    pushFailure(failures, matches, `questão ${check.question} alternativa ${check.option} contém texto indevido: "${text}"`);
    return;
  }

  pushFailure(failures, Boolean(question.needsReview) !== check.expected, `questão ${check.question} deveria${check.expected ? "" : " não"} ter sinalização de revisão`);
}

async function validateFixture(fixture: Fixture, baseDir: string) {
  const proofPath = path.resolve(baseDir, fixture.proof);
  const answerKeyPath = path.resolve(baseDir, fixture.answerKey);
  const [proofBuffer, answerKeyBuffer] = await Promise.all([readFile(proofPath), readFile(answerKeyPath)]);
  const startedAt = Date.now();
  const proof = await parseExamPdf(proofBuffer);
  const questions = extractQuestions(proof.text, { visualPages: proof.visualPages });
  const durationMs = Date.now() - startedAt;
  const answerKey = await pdfParse(answerKeyBuffer);
  const answers = parseAnswerKey(answerKey.text);
  const expectedNumbers = [...answers.keys()].sort((a, b) => a - b);
  const extractedNumbers = questions.map(({ number }) => number);
  const missingQuestions = expectedNumbers.filter((number) => !extractedNumbers.includes(number));
  const extraQuestions = [...new Set(extractedNumbers.filter((number) => !answers.has(number)))].sort((a, b) => a - b);
  const duplicateQuestions = [...new Set(extractedNumbers.filter((number, index) => extractedNumbers.indexOf(number) !== index))].sort((a, b) => a - b);
  const malformedQuestions = questions.filter((question) => {
    const labels = question.options.map(({ label }) => label.toUpperCase()).join("");
    return !question.statement.trim() || question.options.length !== 5 || labels !== "ABCDE" || question.options.some(({ text }) => !text.trim());
  });
  const questionsWithFooterResidue = questions
    .filter((question) => [question.statement, ...question.options.map(({ text }) => text)].some((value) => footerPattern.test(value)))
    .map(({ number }) => number);
  const visualReviewQuestions = questions.filter(({ needsReview }) => needsReview).map(({ number }) => number).sort((a, b) => a - b);
  const failures: string[] = [];

  if (!answers.size) failures.push("gabarito não contém questões objetivas reconhecíveis");
  if (missingQuestions.length) failures.push(`questões ausentes: ${missingQuestions.join(", ")}`);
  if (extraQuestions.length) failures.push(`questões fora do gabarito: ${extraQuestions.join(", ")}`);
  if (duplicateQuestions.length) failures.push(`questões duplicadas: ${duplicateQuestions.join(", ")}`);
  if (malformedQuestions.length) failures.push(`questões malformadas: ${malformedQuestions.map(({ number }) => number).join(", ")}`);
  if (questionsWithFooterResidue.length) failures.push(`resíduo de rodapé nas questões: ${questionsWithFooterResidue.join(", ")}`);
  if (fixture.expectedProofPages !== undefined && proof.numpages !== fixture.expectedProofPages) failures.push(`a prova deveria ter ${fixture.expectedProofPages} páginas, recebeu ${proof.numpages}`);
  if (fixture.expectedAnswerKeyPages !== undefined && answerKey.numpages !== fixture.expectedAnswerKeyPages) failures.push(`o gabarito deveria ter ${fixture.expectedAnswerKeyPages} página(s), recebeu ${answerKey.numpages}`);
  if (durationMs > maximumDurationMs) failures.push(`extração levou ${durationMs} ms, acima do limite de ${maximumDurationMs} ms`);
  if (fixture.expectedVisualReview) {
    const expected = [...fixture.expectedVisualReview].sort((a, b) => a - b);
    if (visualReviewQuestions.join(",") !== expected.join(",")) {
      failures.push(`sinalizações de revisão deveriam ser ${expected.join(", ")}, recebeu ${visualReviewQuestions.join(", ")}`);
    }
  }
  for (const number of fixture.annulled ?? []) {
    if (answers.get(number) !== null) failures.push(`questão ${number} deveria estar anulada no gabarito`);
  }
  for (const check of fixture.checks ?? []) {
    validateCheck(questions.find(({ number }) => number === check.question), check, failures);
  }

  return {
    id: fixture.id,
    year: fixture.year,
    area: fixture.area,
    proofPages: proof.numpages,
    answerKeyPages: answerKey.numpages,
    expectedQuestions: answers.size,
    extractedQuestions: questions.length,
    questionsWithFiveOptions: questions.length - malformedQuestions.length,
    missingQuestions,
    extraQuestions,
    duplicateQuestions,
    malformedQuestions: malformedQuestions.map(({ number, options }) => ({ number, optionCount: options.length })),
    footerResidueQuestions: questionsWithFooterResidue,
    visualReviewQuestions,
    durationMs,
    failures,
  };
}

async function main() {
  const filter = parseFilter();
  const manifest = JSON.parse(await readFile(manifestPath, "utf8")) as Manifest;
  const baseDir = path.dirname(manifestPath);
  const fixtures = manifest.fixtures.filter((fixture) => !filter || fixture.id === filter);
  if (!fixtures.length) throw new Error(`Nenhuma fixture encontrada${filter ? ` para "${filter}"` : ""}.`);

  const results = [];
  for (const fixture of fixtures) {
    const result = await validateFixture(fixture, baseDir);
    results.push(result);
    console.log(JSON.stringify(result, null, 2));
  }

  const failures = results.flatMap((result) => result.failures.map((failure) => `${result.id}: ${failure}`));
  const totalQuestions = results.reduce((sum, result) => sum + result.extractedQuestions, 0);
  const totalExpected = results.reduce((sum, result) => sum + result.expectedQuestions, 0);
  const maximumObservedDuration = Math.max(...results.map((result) => result.durationMs));

  console.log(JSON.stringify({
    fixtures: results.length,
    expectedQuestions: totalExpected,
    extractedQuestions: totalQuestions,
    maximumObservedDurationMs: maximumObservedDuration,
    failures,
  }, null, 2));

  if (failures.length) process.exitCode = 1;
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
