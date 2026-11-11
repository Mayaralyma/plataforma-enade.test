import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import PgBoss from "pg-boss";
import { randomUUID } from "node:crypto";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { once } from "node:events";
import { spawn, type ChildProcess } from "node:child_process";
import pdfParse from "pdf-parse";
import { expect, test } from "@playwright/test";

const prisma = new PrismaClient();
test.afterAll(async () => prisma.$disconnect());

async function waitForJob(page: import("@playwright/test").Page, jobId: string) {
  let result: Record<string, unknown> | undefined;
  await expect.poll(async () => {
    const response = await page.request.get(`/api/admin/imports/${jobId}`);
    expect(response.ok()).toBeTruthy();
    result = await response.json();
    return (result as { status?: string } | undefined)?.status;
  }, { timeout: 30_000, intervals: [250, 500, 1000] }).toMatch(/^(COMPLETED|FAILED)$/);
  await expect.poll(async () => result?.status, { timeout: 30_000 }).toMatch(/^(COMPLETED|FAILED)$/);
  return result!;
}

test("admin importa PDF, aplica gabarito e worker reexecuta sem duplicar questoes", async ({ page }) => {
  test.setTimeout(120_000);
  const email = `e2e-admin-${randomUUID()}@example.test`;
  let worker: ChildProcess | undefined;
  let workerOutput = "";
  let editionId: string | undefined;
  let officialEditionId: string | undefined;
  let uploadPath: string | undefined;
  let answerKeyPath: string | undefined;
  let officialUploadPath: string | undefined;
  let officialAnswerKeyPath: string | undefined;

  try {
    await page.goto("/");
    await page.getByRole("button", { name: "Cadastre-se" }).click();
    await page.getByLabel("Seu nome").fill("Administrador de teste");
    await page.getByLabel("E-mail").fill(email);
    await page.getByLabel("Senha").fill("Enade-test-2026!");
    await page.getByRole("button", { name: "Criar minha conta" }).click();
    await expect(page.getByRole("heading", { name: /Aprender é uma jornada/ })).toBeVisible({ timeout: 20_000 });

    await prisma.user.update({ where: { email }, data: { role: "ADMIN" } });
    await page.reload();
    await expect(page.getByText("PAINEL ADMINISTRATIVO")).toBeVisible();
    expect((await page.request.get("/api/admin/imports")).status()).toBe(200);

    worker = spawn(process.execPath, ["--import", "./scripts/node-compat.mjs", "--import", "tsx", "worker/index.ts"], {
      cwd: process.cwd(),
      env: process.env,
      stdio: ["ignore", "pipe", "pipe"],
    });
    worker.stdout?.on("data", (data: Buffer) => { workerOutput += data.toString(); });
    worker.stderr?.on("data", (data: Buffer) => { workerOutput += data.toString(); });
    worker.on("error", (error) => { workerOutput += error.message; });
    try {
      await expect.poll(() => workerOutput.includes("Worker de"), { timeout: 20_000, intervals: [250, 500, 1000] }).toBeTruthy();
    } catch (error) {
      throw new Error(`Worker nao iniciou. Saida: ${workerOutput}\n${String(error)}`);
    }

    const year = 2004 + Math.floor(Math.random() * 90);
    const area = `E2E ${randomUUID()}`;
    const pdf = await readFile("knowledgeBase/EQUIPE_5_VFINAL.pdf");
    const upload = await page.request.post("/api/admin/imports", {
      multipart: {
        year: String(year),
        area,
        file: { name: "equipe5.pdf", mimeType: "application/pdf", buffer: pdf },
      },
    });
    const accepted = await upload.json() as { jobId: string; edition: { id: string; filePath: string } };
    expect(upload.status(), JSON.stringify(accepted)).toBe(202);
    editionId = accepted.edition.id;
    uploadPath = accepted.edition.filePath;

    const completed = await waitForJob(page, accepted.jobId);
    expect(completed.status, JSON.stringify(completed)).toBe("COMPLETED");
    expect(completed.totalFound).toBeGreaterThan(0);
    expect(completed.totalFailed).toBeGreaterThan(0);
    const firstQuestions = await prisma.question.findMany({ where: { editionId }, include: { options: true }, orderBy: { originalNumber: "asc" } });
    expect(firstQuestions.length).toBeGreaterThan(1);
    const questionCountBeforeRetry = firstQuestions.length;
    expect(await prisma.importIssue.count({ where: { jobId: accepted.jobId } })).toBeGreaterThan(0);

    const keyResponse = await page.request.post("/api/admin/answer-keys", {
      multipart: {
        editionId,
        file: { name: "answer-key.csv", mimeType: "text/csv", buffer: Buffer.from("1; C\n2; ANULADA\n") },
      },
    });
    const keyResult = await keyResponse.json();
    expect(keyResponse.status(), JSON.stringify(keyResult)).toBe(200);
    expect(keyResult).toEqual({ updated: 2, provided: 2 });
    answerKeyPath = (await prisma.edition.findUniqueOrThrow({ where: { id: editionId } })).answerKeyPath ?? undefined;
    const keyedQuestions = await prisma.question.findMany({ where: { editionId }, orderBy: { originalNumber: "asc" } });
    expect(keyedQuestions[0].correctOption).toBe("C");
    expect(keyedQuestions[1].annulled).toBe(true);

    const retryJob = await prisma.importJob.create({ data: { editionId } });
    const queue = new PgBoss({ connectionString: process.env.DATABASE_URL });
    await queue.start();
    await queue.send("extract-exam", { jobId: retryJob.id }, { singletonKey: retryJob.id });
    await queue.stop();
    const retried = await waitForJob(page, retryJob.id);
    expect(retried.status).toBe("COMPLETED");
    expect(retried.totalFound).toBe(completed.totalFound);
    expect(retried.totalFailed).toBe(0);
    expect(await prisma.question.count({ where: { editionId } })).toBe(questionCountBeforeRetry);

    const officialProofPath = ".local/official-enade/enade-2023-engenharia-computacao.pdf";
    const officialKeyPath = ".local/official-enade/gabarito-2023-engenharia-computacao.pdf";
    if (existsSync(officialProofPath) && existsSync(officialKeyPath)) {
      const [officialProof, officialKeyDocument] = await Promise.all([
        readFile(officialProofPath),
        readFile(officialKeyPath).then((buffer) => pdfParse(buffer)),
      ]);
      const officialKeyCsv = [...officialKeyDocument.text.matchAll(/QUEST[AÃ]O\s+(\d{1,2})\s+([A-E])/gi)]
        .map((match) => `${match[1]}; ${match[2]}`)
        .join("\n");
      expect(officialKeyCsv.split("\n")).toHaveLength(38);

      const officialUpload = await page.request.post("/api/admin/imports", {
        multipart: {
          year: "2023",
          area: `E2E Engenharia da Computação ${randomUUID()}`,
          file: { name: "enade-2023-engenharia-computacao.pdf", mimeType: "application/pdf", buffer: officialProof },
        },
      });
      const officialAccepted = await officialUpload.json() as { jobId: string; edition: { id: string; filePath: string } };
      expect(officialUpload.status(), JSON.stringify(officialAccepted)).toBe(202);
      officialEditionId = officialAccepted.edition.id;
      officialUploadPath = officialAccepted.edition.filePath;

      const officialCompleted = await waitForJob(page, officialAccepted.jobId);
      expect(officialCompleted.status).toBe("COMPLETED");
      expect(officialCompleted.totalFound).toBe(38);
      expect(officialCompleted.totalFailed).toBe(0);
      const processingMs = Date.parse(String(officialCompleted.finishedAt)) - Date.parse(String(officialCompleted.startedAt));
      expect(processingMs).toBeGreaterThanOrEqual(0);
      expect(processingMs).toBeLessThanOrEqual(180_000);
      console.info(`[ENADE oficial] worker processou 38 questões em ${processingMs} ms`);
      const officialQuestions = await prisma.question.findMany({ where: { editionId: officialEditionId }, include: { options: true } });
      expect(officialQuestions).toHaveLength(38);
      expect(officialQuestions.every((question) => question.options.length === 5)).toBe(true);

      const officialKeyUpload = await page.request.post("/api/admin/answer-keys", {
        multipart: {
          editionId: officialEditionId,
          file: { name: "gabarito-oficial.csv", mimeType: "text/csv", buffer: Buffer.from(officialKeyCsv) },
        },
      });
      const officialKeyResult = await officialKeyUpload.json();
      expect(officialKeyUpload.status(), JSON.stringify(officialKeyResult)).toBe(200);
      expect(officialKeyResult).toEqual({ updated: 38, provided: 38 });
      officialAnswerKeyPath = (await prisma.edition.findUniqueOrThrow({ where: { id: officialEditionId } })).answerKeyPath ?? undefined;
      const keyedOfficialQuestions = await prisma.question.findMany({ where: { editionId: officialEditionId } });
      expect(keyedOfficialQuestions.filter((question) => question.correctOption).length).toBe(38);
      expect(keyedOfficialQuestions.find((question) => question.originalNumber === 1)?.correctOption).toBe("D");
      expect(keyedOfficialQuestions.find((question) => question.originalNumber === 38)?.correctOption).toBe("A");
    }

    expect(workerOutput).not.toMatch(/Error:|Falha ao salvar/);
  } finally {
    if (worker && worker.exitCode === null) {
      worker.kill("SIGINT");
      await Promise.race([once(worker, "exit"), new Promise((resolve) => setTimeout(resolve, 5000))]);
      if (worker.exitCode === null) worker.kill();
    }
    if (editionId) await prisma.edition.deleteMany({ where: { id: editionId } });
    if (officialEditionId) await prisma.edition.deleteMany({ where: { id: officialEditionId } });
    if (uploadPath) await import("node:fs/promises").then(({ unlink }) => unlink(uploadPath!).catch(() => undefined));
    if (answerKeyPath) await import("node:fs/promises").then(({ unlink }) => unlink(answerKeyPath!).catch(() => undefined));
    if (officialUploadPath) await import("node:fs/promises").then(({ unlink }) => unlink(officialUploadPath!).catch(() => undefined));
    if (officialAnswerKeyPath) await import("node:fs/promises").then(({ unlink }) => unlink(officialAnswerKeyPath!).catch(() => undefined));
    await prisma.user.deleteMany({ where: { email } });
  }
});
