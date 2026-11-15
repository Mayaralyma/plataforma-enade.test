import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { expect, test } from "@playwright/test";
import { randomUUID } from "node:crypto";
import path from "node:path";

const prisma = new PrismaClient();
const testUserEmails: string[] = [];
test.afterAll(async () => {
  await prisma.user.deleteMany({ where: { email: { in: testUserEmails } } });
  await prisma.edition.deleteMany({ where: { area: { startsWith: "E2E protected PDF " } } });
  await prisma.$disconnect();
});

test("estudante se cadastra, tem acesso restrito e conclui um simulado", async ({ page }) => {
  test.setTimeout(120_000);
  const expectNoHorizontalOverflow = async (label: string) => {
    const overflow = await page.evaluate(() => {
      const root = document.documentElement;
      const body = document.body;
      return Math.max(root.scrollWidth - root.clientWidth, body.scrollWidth - body.clientWidth);
    });
    expect(overflow, `${label} não deve ter overflow horizontal`).toBeLessThanOrEqual(1);
  };
  const expectElementFits = async (selector: string, label: string) => {
    const metrics = await page.locator(selector).first().evaluate((element) => ({
      scrollWidth: element.scrollWidth,
      clientWidth: element.clientWidth,
    }));
    expect(metrics.scrollWidth, `${label} não deve ter conteúdo cortado`).toBeLessThanOrEqual(metrics.clientWidth + 1);
  };
  const screenshot = async (name: string) => page.screenshot({ path: `.local/${name}.png`, animations: "disabled" });
  const expectControlInViewport = async (name: string | RegExp) => {
    const control = page.getByRole("button", { name });
    await expect(control).toBeInViewport();
    const box = await control.boundingBox();
    const viewportWidth = page.viewportSize()?.width ?? 0;
    if (!box) throw new Error(`Controle não encontrado: ${String(name)}`);
    expect(box.x).toBeGreaterThanOrEqual(-1);
    expect(box.x + box.width).toBeLessThanOrEqual(viewportWidth + 1);
  };

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

  const student = await prisma.user.findUniqueOrThrow({ where: { email: studentEmail }, include: { accounts: true } });
  const credentialAccount = student.accounts.find((account) => account.providerId === "credential");
  expect(credentialAccount).toBeTruthy();
  const storedPassword = credentialAccount?.password ?? "";
  expect(storedPassword).not.toBe("Enade-test-2026!");
  expect(storedPassword).toMatch(/^[0-9a-f]{32}:[0-9a-f]{128}$/);

  const protectedResponse = await page.request.get("/api/admin/imports");
  expect(protectedResponse.status()).toBe(403);
  const protectedPdfResponse = await page.request.get(`/api/admin/files/${pdfEdition.id}`);
  expect(protectedPdfResponse.status()).toBe(403);

  const optionTexts = ["Choice A", "Choice B", "Choice C", "Choice D", "Choice E"];
  const createQuestion = (editionId: string, originalNumber: number, status: "PENDING" | "PUBLISHED" | "DISCARDED", correctOption: string | null) => prisma.question.create({ data: {
    editionId,
    originalNumber,
    statement: `Published filter question ${originalNumber}`,
    status,
    correctOption,
    options: { create: optionTexts.map((text, index) => ({ label: String.fromCharCode(65 + index), text })) },
  } });
  const mixedEdition = await prisma.edition.create({ data: { year: 2000, area: `E2E protected PDF mixed ${randomUUID()}` } });
  const pendingOnlyEdition = await prisma.edition.create({ data: { year: 1999, area: `E2E protected PDF pending ${randomUUID()}` } });
  await createQuestion(mixedEdition.id, 1, "PUBLISHED", "A");
  await createQuestion(mixedEdition.id, 2, "PENDING", null);
  await createQuestion(mixedEdition.id, 3, "DISCARDED", null);
  await createQuestion(pendingOnlyEdition.id, 1, "PENDING", null);

  const listedEditionsResponse = await page.request.get("/api/editions");
  expect(listedEditionsResponse.status()).toBe(200);
  const listedEditions = await listedEditionsResponse.json() as { id: string; _count?: { questions: number } }[];
  expect(listedEditions.find((edition) => edition.id === mixedEdition.id)?._count?.questions).toBe(1);
  expect(listedEditions.some((edition) => edition.id === pendingOnlyEdition.id)).toBe(false);

  const pendingSimulation = await page.request.post("/api/simulations", { data: { editionId: pendingOnlyEdition.id } });
  expect(pendingSimulation.status()).toBe(400);
  const mixedSimulation = await page.request.post("/api/simulations", { data: { editionId: mixedEdition.id } });
  expect(mixedSimulation.status()).toBe(201);
  const mixedSimulationCreated = await mixedSimulation.json() as { id: string };
  const mixedSimulationDetail = await page.request.get(`/api/simulations/${mixedSimulationCreated.id}`);
  const mixedSimulationBody = await mixedSimulationDetail.json() as { answers: { snapshot: { originalNumber: number; correctOption?: string } }[] };
  expect(mixedSimulationBody.answers).toHaveLength(1);
  expect(mixedSimulationBody.answers[0].snapshot.originalNumber).toBe(1);
  expect(mixedSimulationBody.answers.every((answer) => !("correctOption" in answer.snapshot))).toBe(true);

  await page.setViewportSize({ width: 375, height: 812 });
  await expect(page.locator(".sidebar")).not.toHaveClass(/sidebar-open/);
  await expect(page.locator(".mobile-backdrop")).toHaveCount(0);
  await expectNoHorizontalOverflow("prática mobile");
  await screenshot("student-dashboard-mobile-375");
  await page.getByRole("button", { name: "Abrir menu" }).click();
  await expect(page.locator(".sidebar")).toHaveClass(/sidebar-open/);
  await expect(page.locator(".mobile-backdrop")).toBeVisible();
  await expectNoHorizontalOverflow("menu mobile");
  await expectElementFits(".sidebar", "menu lateral mobile");
  await screenshot("student-menu-mobile-375");
  await page.locator(".mobile-backdrop").click({ position: { x: 360, y: 400 } });
  await expect(page.locator(".sidebar")).not.toHaveClass(/sidebar-open/);
  await expect(page.locator(".mobile-backdrop")).toHaveCount(0);
  await page.setViewportSize({ width: 768, height: 1024 });
  await expectNoHorizontalOverflow("prática tablet");
  await screenshot("student-dashboard-tablet-768");

  await expect(page.getByRole("heading", { name: "Escolha seu próximo simulado" })).toBeVisible();
  await page.setViewportSize({ width: 375, height: 812 });
  await expectNoHorizontalOverflow("prática mobile antes do simulado");
  await screenshot("student-practice-mobile-375");
  const simulationCreated = page.waitForResponse((response) => response.url().endsWith("/api/simulations") && response.request().method() === "POST" && response.status() === 201);
  const seedEditionCard = page.locator(".edition-card").filter({ hasText: "Sistemas de Informação" }).first();
  await seedEditionCard.getByRole("button", { name: "Começar simulado" }).click();
  const simulationId = (await (await simulationCreated).json()).id as string;
  const inProgressResponse = await page.request.get(`/api/simulations/${simulationId}`);
  expect(inProgressResponse.status()).toBe(200);
  const inProgress = await inProgressResponse.json() as { status: string; answers: { snapshot: { correctOption?: string } }[] };
  expect(inProgress.status).toBe("IN_PROGRESS");
  expect(inProgress.answers.every((answer) => !("correctOption" in answer.snapshot))).toBe(true);
  await expect(page.getByRole("heading", { name: /Qual prática ajuda/ })).toBeVisible({ timeout: 20_000 });
  await expectNoHorizontalOverflow("simulado mobile");
  await expectElementFits(".topbar", "cabeçalho do simulado mobile");
  await expectElementFits(".sim-question", "questão mobile");
  await expectElementFits(".sim-navigator", "navegador mobile");
  await expectElementFits(".sim-controls", "controles do simulado mobile");
  await screenshot("student-simulation-mobile-375");
  await expectControlInViewport("Anterior");
  await expectControlInViewport("Próxima questão");

  const chooseAndWait = async (index: number) => {
    const saved = page.waitForResponse((response) => response.url().includes("/api/simulations/") && response.request().method() === "PATCH" && response.status() === 200);
    await page.locator(".sim-option").nth(index).click();
    await saved;
  };

  await chooseAndWait(0);
  await expectControlInViewport("Próxima questão");
  await page.getByRole("button", { name: "Próxima questão" }).click();
  await expect(page.getByRole("heading", { name: /qual camada deve validar permissões/i })).toBeVisible();
  await page.setViewportSize({ width: 768, height: 1024 });
  await expectNoHorizontalOverflow("simulado tablet");
  await expectElementFits(".sim-question", "questão tablet");
  await expectElementFits(".sim-navigator", "navegador tablet");
  await expectElementFits(".sim-controls", "controles do simulado tablet");
  await screenshot("student-simulation-tablet-768");
  await chooseAndWait(2);
  await page.getByRole("button", { name: "Próxima questão" }).click();
  await expect(page.getByRole("heading", { name: /vantagem de processar tarefas demoradas/i })).toBeVisible();
  await page.setViewportSize({ width: 1280, height: 900 });
  await chooseAndWait(0);

  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Finalizar simulado" }).click();
  await expect(page.getByRole("heading", { name: "Mais um passo na sua preparação." })).toBeVisible();
  await expect(page.getByText("100%", { exact: true })).toBeVisible();
  await page.setViewportSize({ width: 375, height: 812 });
  await expectNoHorizontalOverflow("resultado mobile");
  await expectElementFits(".result-hero", "destaque do resultado mobile");
  await expectElementFits(".result-summary", "resumo do resultado mobile");
  await expectControlInViewport(/Voltar ao histórico/);
  await screenshot("student-result-mobile-375");
  await page.setViewportSize({ width: 768, height: 1024 });
  await expectNoHorizontalOverflow("resultado tablet");
  await expectElementFits(".result-hero", "destaque do resultado tablet");
  await expectElementFits(".result-summary", "resumo do resultado tablet");
  await screenshot("student-result-tablet-768");

  await page.setViewportSize({ width: 375, height: 812 });
  await page.getByRole("button", { name: /Voltar ao histórico/ }).click();
  await expect(page.getByRole("heading", { name: "Meu histórico" })).toBeVisible();
  await expectNoHorizontalOverflow("histórico mobile");
  await expectElementFits(".history-card", "cartão do histórico mobile");
  await expectControlInViewport(/Ver resultado/);
  await screenshot("student-history-mobile-375");
  await page.setViewportSize({ width: 768, height: 1024 });
  await expectNoHorizontalOverflow("histórico tablet");
  await expectElementFits(".history-card", "cartão do histórico tablet");
  await screenshot("student-history-tablet-768");

  await page.setViewportSize({ width: 375, height: 812 });
  await page.getByRole("button", { name: /Ver resultado/ }).first().click();
  await expect(page.getByRole("heading", { name: "Mais um passo na sua preparação." })).toBeVisible();
  await expectNoHorizontalOverflow("resultado do histórico mobile");
  await expectElementFits(".result-hero", "destaque do histórico mobile");
  await expectElementFits(".result-summary", "resumo do histórico mobile");
  await expectControlInViewport(/Voltar ao histórico/);
  await screenshot("student-history-result-mobile-375");
  await page.setViewportSize({ width: 1280, height: 900 });

  const ownHistory = await page.request.get("/api/simulations");
  expect(ownHistory.status()).toBe(200);
  expect((await ownHistory.json()).some((simulation: { id: string }) => simulation.id === simulationId)).toBe(true);
  const ownSimulation = await page.request.get(`/api/simulations/${simulationId}`);
  expect(ownSimulation.status()).toBe(200);
  const finalized = await ownSimulation.json();
  expect(finalized.status).toBe("FINISHED");
  const answer = finalized.answers[0];
  expect(answer.snapshot.correctOption).toBeTruthy();
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
