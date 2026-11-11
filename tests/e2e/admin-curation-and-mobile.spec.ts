import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { writeFile } from "node:fs/promises";
import { expect, test } from "@playwright/test";

const prisma = new PrismaClient();
test.afterAll(async () => prisma.$disconnect());

const options = ["Choice A", "Choice B", "Choice C", "Choice D", "Choice E"];

test("admin edita, publica, descarta e acessa PDF protegido", async ({ page }) => {
  test.setTimeout(120_000);
  const adminEmail = `e2e-curator-${randomUUID()}@example.test`;
  let editionId: string | undefined;

  try {
    await page.goto("/");
    await page.getByRole("button", { name: "Cadastre-se" }).click();
    await page.getByLabel("Seu nome").fill("Curador de teste");
    await page.getByLabel("E-mail").fill(adminEmail);
    await page.getByLabel("Senha").fill("Enade-test-2026!");
    await page.getByRole("button", { name: "Criar minha conta" }).click();
    await expect(page.getByRole("heading", { name: /Aprender é uma jornada/ })).toBeVisible({ timeout: 20_000 });
    await prisma.user.update({ where: { email: adminEmail }, data: { role: "ADMIN" } });
    await page.reload();
    await expect(page.getByText("PAINEL ADMINISTRATIVO")).toBeVisible();

    const edition = await prisma.edition.create({ data: {
      year: 2004 + Math.floor(Math.random() * 90),
      area: `Curadoria E2E ${randomUUID()}`,
      originalFileName: "EQUIPE_5_VFINAL.pdf",
      filePath: path.resolve("knowledgeBase/EQUIPE_5_VFINAL.pdf"),
    } });
    editionId = edition.id;
    const createPendingQuestion = (originalNumber: number, annulled = false) => prisma.question.create({ data: {
      editionId: edition.id,
      originalNumber,
      statement: `Question ${originalNumber} for curation verification`,
      annulled,
      options: { create: options.map((text, index) => ({ label: String.fromCharCode(65 + index), text })) },
    } });
    const questionToPublish = await createPendingQuestion(1);
    const annulledQuestion = await createPendingQuestion(2, true);
    const questionToDiscard = await createPendingQuestion(3);

    await page.getByRole("button", { name: "Revisar questões" }).click();
    await page.getByPlaceholder("Buscar questão, área ou ano").fill(questionToPublish.statement);
    await page.getByRole("button", { name: "Revisar", exact: true }).click();
    const sourcePdfLink = page.getByRole("link", { name: /Abrir PDF original para conferir/ });
    await expect(sourcePdfLink).toHaveAttribute("href", `/api/admin/files/${edition.id}`);
    await expect(sourcePdfLink).toHaveAttribute("target", "_blank");
    await page.locator(".modal-head").getByLabel("Fechar").click();

    const pdfResponse = await page.request.get(`/api/admin/files/${edition.id}`);
    expect(pdfResponse.status()).toBe(200);
    expect(pdfResponse.headers()["content-type"]).toContain("application/pdf");
    expect(pdfResponse.headers()["cache-control"]).toContain("private");
    expect((await pdfResponse.body()).subarray(0, 5).toString()).toBe("%PDF-");

    const prematurePublish = await page.request.post(`/api/admin/questions/${questionToPublish.id}`, { data: { action: "publish" } });
    expect(prematurePublish.status()).toBe(400);

    const edited = await page.request.patch(`/api/admin/questions/${questionToPublish.id}`, {
      data: {
        statement: "Edited statement for publication",
        options: options.map((text, index) => ({ label: String.fromCharCode(65 + index), text })),
        correctOption: "B",
        needsReview: false,
      },
    });
    expect(edited.status()).toBe(200);
    expect((await edited.json()).correctOption).toBe("B");

    const publish = await page.request.post(`/api/admin/questions/${questionToPublish.id}`, { data: { action: "publish" } });
    expect(publish.status()).toBe(200);
    expect((await publish.json()).status).toBe("PUBLISHED");
    const publishAnnulled = await page.request.post(`/api/admin/questions/${annulledQuestion.id}`, { data: { action: "publish" } });
    expect(publishAnnulled.status()).toBe(200);
    expect((await publishAnnulled.json()).status).toBe("PUBLISHED");
    const discard = await page.request.post(`/api/admin/questions/${questionToDiscard.id}`, { data: { action: "discard" } });
    expect(discard.status()).toBe(200);
    expect((await discard.json()).status).toBe("DISCARDED");
    expect((await page.request.patch(`/api/admin/questions/${questionToPublish.id}`, {
      data: { statement: "Late edit", options: options.map((text, index) => ({ label: String.fromCharCode(65 + index), text })), correctOption: "B" },
    })).status()).toBe(404);

    const createQuestionBatch = async (firstNumber: number, count: number, status: "PENDING" | "PUBLISHED") => {
      await prisma.question.createMany({ data: Array.from({ length: count }, (_, index) => ({
        editionId: edition.id,
        originalNumber: firstNumber + index,
        statement: "Question used to measure curation response time",
        status,
        correctOption: "A",
      })) });
      const created = await prisma.question.findMany({
        where: { editionId: edition.id, originalNumber: { gte: firstNumber, lt: firstNumber + count } },
        select: { id: true },
      });
      await prisma.option.createMany({ data: created.flatMap(({ id }) => options.map((text, index) => ({ questionId: id, label: String.fromCharCode(65 + index), text }))) });
      return created.map(({ id }) => id);
    };
    const measureCuration = async (ids: string[]) => {
      const samples: { action: string; milliseconds: number }[] = [];
      for (const [index, id] of ids.entries()) {
        const action = index < ids.length / 2 ? "publish" : "discard";
        const started = performance.now();
        const response = await page.request.post(`/api/admin/questions/${id}`, { data: { action } });
        expect(response.status(), `A acao ${action} retornou ${response.status()}`).toBe(200);
        samples.push({ action, milliseconds: performance.now() - started });
      }
      const percentile = (values: number[], p: number) => [...values].sort((a, b) => a - b)[Math.ceil(values.length * p) - 1];
      return Object.fromEntries(["publish", "discard"].map((action) => {
        const values = samples.filter((sample) => sample.action === action).map((sample) => sample.milliseconds);
        return [action, { p50: percentile(values, 0.5), p95: percentile(values, 0.95) }];
      }));
    };

    const lowVolumeIds = await createQuestionBatch(100, 30, "PENDING");
    const lowVolume = await measureCuration(lowVolumeIds);
    await createQuestionBatch(10_000, 1_000, "PUBLISHED");
    const highVolumeIds = await createQuestionBatch(200, 30, "PENDING");
    const highVolume = await measureCuration(highVolumeIds);
    console.info(`[RF-QLD-06] 3 reviewed: ${JSON.stringify(lowVolume)}; 1033 reviewed: ${JSON.stringify(highVolume)}`);
    await writeFile(".local/curation-benchmark.json", JSON.stringify({ measuredAt: new Date().toISOString(), lowVolume, highVolume }, null, 2));

  } finally {
    if (editionId) await prisma.edition.deleteMany({ where: { id: editionId } });
    await prisma.user.deleteMany({ where: { email: adminEmail } });
  }
});
