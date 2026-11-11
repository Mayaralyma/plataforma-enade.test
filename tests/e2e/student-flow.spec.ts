import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { expect, test } from "@playwright/test";
import { randomUUID } from "node:crypto";
import path from "node:path";

const prisma = new PrismaClient();
const testUserEmails: string[] = [];
test.afterAll(async () => {
  await prisma.edition.deleteMany({ where: { area: { startsWith: "E2E protected PDF " } } });
  await prisma.user.deleteMany({ where: { email: { in: testUserEmails } } });
  await prisma.$disconnect();
});

test("estudante se cadastra, tem acesso restrito e conclui um simulado", async ({ page }) => {
  const pdfEdition = await prisma.edition.create({ data: {
    year: 2100,
    area: `E2E protected PDF ${randomUUID()}`,
    originalFileName: "EQUIPE_5_VFINAL.pdf",
    filePath: path.resolve("knowledgeBase/EQUIPE_5_VFINAL.pdf"),
  } });
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Boas-vindas de volta" })).toBeVisible();
  await page.getByRole("button", { name: "Cadastre-se" }).click();
  await page.getByLabel("Seu nome").fill("Estudante de teste");
  const studentEmail = `e2e-${randomUUID()}@example.test`;
  testUserEmails.push(studentEmail);
  await page.getByLabel("E-mail").fill(studentEmail);
  await page.getByLabel("Senha").fill("Enade-test-2026!");
  await page.getByRole("button", { name: "Criar minha conta" }).click();
  await expect(page.getByRole("heading", { name: /Aprender é uma jornada/ })).toBeVisible({ timeout: 20_000 });

  const protectedResponse = await page.request.get("/api/admin/imports");
  expect(protectedResponse.status()).toBe(403);
  const protectedPdfResponse = await page.request.get(`/api/admin/files/${pdfEdition.id}`);
  expect(protectedPdfResponse.status()).toBe(403);

  await page.setViewportSize({ width: 375, height: 812 });
  await expect(page.locator(".sidebar")).not.toHaveClass(/sidebar-open/);
  await expect(page.locator(".mobile-backdrop")).toHaveCount(0);
  await page.screenshot({ path: ".local/student-dashboard-mobile-375.png", animations: "disabled" });
  const mobileDocumentWidth = await page.evaluate(() => document.documentElement.scrollWidth);
  expect(mobileDocumentWidth).toBeLessThanOrEqual(375);
  await page.setViewportSize({ width: 768, height: 1024 });
  await page.screenshot({ path: ".local/student-dashboard-tablet-768.png", animations: "disabled" });
  const tabletDocumentWidth = await page.evaluate(() => document.documentElement.scrollWidth);
  expect(tabletDocumentWidth).toBeLessThanOrEqual(768);
  await page.setViewportSize({ width: 1280, height: 900 });

  await expect(page.getByRole("heading", { name: "Escolha seu próximo simulado" })).toBeVisible();
  const simulationCreated = page.waitForResponse((response) => response.url().endsWith("/api/simulations") && response.request().method() === "POST" && response.status() === 201);
  await page.getByRole("button", { name: "Começar simulado" }).first().click();
  const simulationId = (await (await simulationCreated).json()).id as string;
  await expect(page.getByRole("heading", { name: /Qual prática ajuda/ })).toBeVisible();

  const chooseAndWait = async (index: number) => {
    const saved = page.waitForResponse((response) => response.url().includes("/api/simulations/") && response.request().method() === "PATCH" && response.status() === 200);
    await page.locator(".sim-option").nth(index).click();
    await saved;
  };

  await chooseAndWait(0);
  await page.getByRole("button", { name: "Próxima questão" }).click();
  await expect(page.getByRole("heading", { name: /qual camada deve validar permissões/i })).toBeVisible();
  await chooseAndWait(2);
  await page.getByRole("button", { name: "Próxima questão" }).click();
  await expect(page.getByRole("heading", { name: /vantagem de processar tarefas demoradas/i })).toBeVisible();
  await chooseAndWait(0);

  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Finalizar simulado" }).click();
  await expect(page.getByRole("heading", { name: "Mais um passo na sua preparação." })).toBeVisible();
  await expect(page.getByText("100%", { exact: true })).toBeVisible();

  const ownHistory = await page.request.get("/api/simulations");
  expect(ownHistory.status()).toBe(200);
  expect((await ownHistory.json()).some((simulation: { id: string }) => simulation.id === simulationId)).toBe(true);
  const ownSimulation = await page.request.get(`/api/simulations/${simulationId}`);
  expect(ownSimulation.status()).toBe(200);
  const finalized = await ownSimulation.json();
  expect(finalized.status).toBe("FINISHED");
  const answer = finalized.answers[0];
  const lateChange = await page.request.patch(`/api/simulations/${simulationId}`, {
    data: { answerId: answer.id, selected: answer.selected === "A" ? "B" : "A" },
  });
  expect(lateChange.status()).toBe(409);

  const otherStudent = await page.context().browser()!.newPage();
  try {
    await otherStudent.goto("/");
    await otherStudent.getByRole("button", { name: "Cadastre-se" }).click();
    await otherStudent.getByLabel("Seu nome").fill("Outro estudante de teste");
    const otherStudentEmail = `e2e-other-${randomUUID()}@example.test`;
    testUserEmails.push(otherStudentEmail);
    await otherStudent.getByLabel("E-mail").fill(otherStudentEmail);
    await otherStudent.getByLabel("Senha").fill("Enade-test-2026!");
    await otherStudent.getByRole("button", { name: "Criar minha conta" }).click();
    await expect(otherStudent.getByRole("heading", { name: /Aprender é uma jornada/ })).toBeVisible({ timeout: 20_000 });

    const otherHistory = await otherStudent.request.get("/api/simulations");
    expect(otherHistory.status()).toBe(200);
    expect((await otherHistory.json()).some((simulation: { id: string }) => simulation.id === simulationId)).toBe(false);
    const foreignSimulation = await otherStudent.request.get(`/api/simulations/${simulationId}`);
    expect(foreignSimulation.status()).toBe(404);
  } finally {
    await otherStudent.close();
  }
});
