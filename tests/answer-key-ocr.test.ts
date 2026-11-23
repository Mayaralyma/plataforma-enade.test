import { readFile } from "node:fs/promises";
import path from "node:path";
import { afterAll, expect, it } from "vitest";
import { extractScannedPdfText, terminateOcrWorker } from "../lib/answer-key-ocr";
import { parseAnswerKey } from "../lib/pdf-parser";

const gabarito = path.join(process.cwd(), "data/official-enade/2025-licenciatura-computacao/2025_computacao_GB_4.pdf");

afterAll(async () => {
  await terminateOcrWorker();
});

it("reconhece o gabarito escaneado de 2025 sem camada de texto de respostas", async () => {
  const text = await extractScannedPdfText(await readFile(gabarito));
  const answers = parseAnswerKey(text);

  expect(answers.size).toBeGreaterThanOrEqual(79);
  expect(answers.get(1)).toBe("D");
  expect(answers.get(2)).toBe("B");
  expect(answers.get(34)).toBeNull();
  expect(answers.get(80)).toBe("A");
}, 120_000);
