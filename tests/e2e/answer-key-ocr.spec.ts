import "dotenv/config";
import { unlink } from "node:fs/promises";
import { readFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import { expect, test } from "@playwright/test";

const prisma = new PrismaClient();

test("admin importa gabarito escaneado por OCR e precisa conferir antes de publicar", async ({ page }) => {
  test.setTimeout(180_000);
  const email = `e2e-ocr-${randomUUID()}@example.test`;
  let editionId: string | undefined;
  let answerKeyPath: string | undefined;

  try {
    await page.goto("/");
    await page.getByRole("button", { name: "Cadastre-se" }).click();
    await page.getByLabel("Seu nome").fill("Administrador OCR");
    await page.getByLabel("E-mail").fill(email);
    await page.getByLabel("Senha").fill("Enade-test-2026!");
    await page.getByRole("button", { name: "Criar minha conta" }).click();
    await expect(page.getByRole("heading", { name: /Aprender é uma jornada/ })).toBeVisible({ timeout: 20_000 });

    await prisma.user.update({ where: { email }, data: { role: "ADMIN" } });
    await page.reload();
    await expect(page.getByText("PAINEL ADMINISTRATIVO")).toBeVisible();

    const edition = await prisma.edition.create({ data: {
      year: 2025,
      area: `OCR E2E ${randomUUID()}`,
      questions: { create: Array.from({ length: 80 }, (_, index) => ({
        originalNumber: index + 1,
        statement: `Questão ${index + 1}`,
        options: { create: ["A", "B", "C", "D", "E"].map((label) => ({ label, text: label })) },
      })) },
    } });
    editionId = edition.id;

    const pdf = await readFile("data/official-enade/2025-licenciatura-computacao/2025_computacao_GB_4.pdf");
    const response = await page.request.post("/api/admin/answer-keys", {
      multipart: { editionId: edition.id, file: { name: "gabarito.pdf", mimeType: "application/pdf", buffer: pdf } },
    });
    const result = await response.json() as { updated?: number; provided?: number; source?: string; warning?: string; error?: string };
    expect(response.status(), JSON.stringify(result)).toBe(200);
    expect(result.source).toBe("PDF_OCR");
    expect(result.warning).toBeTruthy();
    expect(result.updated).toBeGreaterThanOrEqual(79);

    const first = await prisma.question.findUniqueOrThrow({
      where: { editionId_originalNumber: { editionId: edition.id, originalNumber: 1 } },
    });
    expect(first.correctOption).toBe("D");
    expect(first.needsReview).toBe(true);
    expect(first.reviewedAt).toBeNull();
    const annulled = await prisma.question.findUniqueOrThrow({
      where: { editionId_originalNumber: { editionId: edition.id, originalNumber: 34 } },
    });
    expect(annulled.annulled).toBe(true);
    expect(annulled.needsReview).toBe(true);

    const blocked = await page.request.post(`/api/admin/questions/${first.id}`, { data: { action: "publish" } });
    expect(blocked.status()).toBe(400);

    const options = await prisma.option.findMany({ where: { questionId: first.id } });
    const review = await page.request.patch(`/api/admin/questions/${first.id}`, { data: {
      statement: first.statement,
      options: options.map((option) => ({ label: option.label, text: option.text })),
      correctOption: first.correctOption,
      needsReview: false,
    } });
    expect(review.status()).toBe(200);
    const published = await page.request.post(`/api/admin/questions/${first.id}`, { data: { action: "publish" } });
    expect(published.status()).toBe(200);

    const stored = await prisma.edition.findUniqueOrThrow({ where: { id: edition.id } });
    answerKeyPath = stored.answerKeyPath ?? undefined;
    expect(answerKeyPath).toBeTruthy();
  } finally {
    if (editionId) await prisma.edition.delete({ where: { id: editionId } }).catch(() => undefined);
    await prisma.user.deleteMany({ where: { email } }).catch(() => undefined);
    if (answerKeyPath) await unlink(answerKeyPath).catch(() => undefined);
    await prisma.$disconnect();
  }
});
