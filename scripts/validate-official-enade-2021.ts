import { readFile } from "node:fs/promises";
import path from "node:path";
import pdfParse from "pdf-parse";
import { extractQuestions, parseAnswerKey } from "../lib/pdf-parser";

const base = path.resolve(".local/official-enade/2021-sistemas-informacao");
const proofPath = path.join(base, "prova-2021-sistemas-informacao.pdf");
const keyPath = path.join(base, "gabarito-2021-sistemas-informacao.pdf");

async function main() {
  const [proofBuffer, keyBuffer] = await Promise.all([readFile(proofPath), readFile(keyPath)]);
  const [proof, key] = await Promise.all([pdfParse(proofBuffer), pdfParse(keyBuffer)]);
  const questions = extractQuestions(proof.text);
  const answers = parseAnswerKey(key.text);
  const expected = Array.from({ length: 35 }, (_, index) => index + 1);
  const missingQuestions = expected.filter((number) => !questions.some((question) => question.number === number));
  const missingAnswers = expected.filter((number) => !answers.has(number));
  const malformedQuestions = questions.filter((question) => question.options.length !== 5 || !question.statement).map(({ number }) => number);
  const visualReviewQuestions = questions.filter((question) => question.needsReview).map(({ number }) => number);
  const question8E = questions.find(({ number }) => number === 8)?.options.find(({ label }) => label === "E")?.text;
  const question1Statement = questions.find(({ number }) => number === 1)?.statement ?? "";
  const question2Text = [questions.find(({ number }) => number === 2)?.statement ?? "", ...(questions.find(({ number }) => number === 2)?.options.map(({ text }) => text) ?? [])].join(" ");
  const question4Text = [questions.find(({ number }) => number === 4)?.statement ?? "", ...(questions.find(({ number }) => number === 4)?.options.map(({ text }) => text) ?? [])].join(" ");
  const question6Text = [questions.find(({ number }) => number === 6)?.statement ?? "", ...(questions.find(({ number }) => number === 6)?.options.map(({ text }) => text) ?? [])].join(" ");
  const question7Text = [questions.find(({ number }) => number === 7)?.statement ?? "", ...(questions.find(({ number }) => number === 7)?.options.map(({ text }) => text) ?? [])].join(" ");
  const question9E = questions.find(({ number }) => number === 9)?.options.find(({ label }) => label === "E")?.text;
  const question10E = questions.find(({ number }) => number === 10)?.options.find(({ label }) => label === "E")?.text;
  const question21Statement = questions.find(({ number }) => number === 21)?.statement ?? "";
  const question31 = questions.find(({ number }) => number === 31);
  const footerPattern = /VALIDIN[3E]P|\*R\d{7,}\*|ÁREA LIVRE/i;
  const questionsWithFooterResidue = questions
    .filter((question) => [question.statement, ...question.options.map(({ text }) => text)].some((value) => footerPattern.test(value)))
    .map(({ number }) => number);
  const failures = [
    proof.numpages !== 40 ? "proof should contain 40 pages" : undefined,
    key.numpages !== 1 ? "answer key should contain 1 page" : undefined,
    questions.length !== 35 ? "expected 35 objective questions" : undefined,
    missingQuestions.length ? "missing questions: " + missingQuestions.join(", ") : undefined,
    missingAnswers.length ? "missing answer-key rows: " + missingAnswers.join(", ") : undefined,
    malformedQuestions.length ? "malformed questions: " + malformedQuestions.join(", ") : undefined,
    question8E !== "II, III e IV." ? "question 8 option E contains text from the discursive section" : undefined,
    !question1Statement.includes("atingissem") || !question1Statement.includes("estimativa") ? "question 1 contains unrepaired split words" : undefined,
    !question2Text.includes("estético") || !question2Text.includes("alternativas") ? "question 2 contains unrepaired split words" : undefined,
    !question4Text.includes("tipo de trabalho") || !question4Text.includes("Garantia") || !question4Text.includes("ficam") ? "question 4 contains unrepaired split words" : undefined,
    !question6Text.includes("latinos") || !question6Text.includes("intensificando") || !question6Text.includes("verificou") ? "question 6 contains unrepaired split words" : undefined,
    ["Estima-se", "decodificada", "última", "profilaxias"].some((word) => !question7Text.includes(word)) ? "question 7 contains unrepaired split words: " + ["Estima-se", "decodificada", "última", "profilaxias"].filter((word) => !question7Text.includes(word)).join(", ") : undefined,
    question9E !== "I, III e IV." ? "question 9 option E contains diagram labels" : undefined,
    question10E !== "I, II e IV." ? "question 10 option E contains chart labels" : undefined,
    !question21Statement.includes("E.QuantidadeEmbarque > 100") ? "question 21 lost an SQL line mistaken for option E" : undefined,
    !question31 || question31.options.length !== 5 || !question31.statement.includes("Uma das finalidades da Governança") ? "question 31 is incomplete" : undefined,
    answers.get(33) !== null ? "question 33 must be annulled in the definitive answer key" : undefined,
    visualReviewQuestions.join(",") !== "3,5,9,10,28,29,32,33" ? "unexpected visual-review flags: " + visualReviewQuestions.join(", ") : undefined,
    questionsWithFooterResidue.length ? "footer residue in questions: " + questionsWithFooterResidue.join(", ") : undefined,
  ].filter((failure): failure is string => Boolean(failure));

  console.log(JSON.stringify({
    proofPages: proof.numpages,
    answerKeyPages: key.numpages,
    extractedQuestions: questions.length,
    questionsWithFiveOptions: questions.length - malformedQuestions.length,
    answerKeyRows: answers.size,
    annulledQuestion33: answers.get(33) === null,
    visualReviewQuestions,
    missingQuestions,
    missingAnswers,
    malformedQuestions,
    questionsWithFooterResidue,
    failures,
  }, null, 2));

  if (failures.length) process.exitCode = 1;
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
