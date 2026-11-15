import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";
import { calculateSimulationResult, sanitizeSimulationForStudent } from "@/lib/simulation";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const access = await requireRole("STUDENT");
  if (access.error) return access.error;
  const { id } = await params;
  const simulation = await prisma.simulation.findFirst({ where: { id, userId: access.user.id }, include: { edition: true, answers: { orderBy: { question: { originalNumber: "asc" } } } } });
  if (!simulation) return Response.json({ error: "Simulado não encontrado." }, { status: 404 });
  return Response.json(sanitizeSimulationForStudent(simulation));
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const access = await requireRole("STUDENT");
  if (access.error) return access.error;
  const { id } = await params;
  const parsed = z.object({ answerId: z.string().optional(), selected: z.enum(["A", "B", "C", "D", "E"]).nullable().optional(), finish: z.boolean().optional() }).refine((value) => value.finish === true || (Boolean(value.answerId) && value.selected !== undefined), "Informe uma resposta ou finalize o simulado.").safeParse(await request.json());
  if (!parsed.success) return Response.json({ error: "Resposta inválida." }, { status: 400 });
  const simulation = await prisma.simulation.findFirst({ where: { id, userId: access.user.id }, include: { answers: true } });
  if (!simulation) return Response.json({ error: "Simulado não encontrado." }, { status: 404 });
  if (simulation.status === "FINISHED") return Response.json({ error: "Simulado finalizado não pode ser alterado." }, { status: 409 });
  if (parsed.data.selected !== undefined && parsed.data.answerId) {
    const answer = simulation.answers.find((a) => a.id === parsed.data.answerId);
    if (!answer) return Response.json({ error: "Questão não pertence a este simulado." }, { status: 404 });
    await prisma.simulationAnswer.update({ where: { id: answer.id }, data: { selected: parsed.data.selected } });
  }
  if (parsed.data.finish) {
    const result = await prisma.$transaction(async (tx) => {
      const answers = await tx.simulationAnswer.findMany({ where: { simulationId: id } });
      const result = calculateSimulationResult(answers.map((answer) => ({ ...answer, snapshot: answer.snapshot as { correctOption?: string | null; annulled?: boolean } | null })));
      for (const answer of result.answers) {
        await tx.simulationAnswer.update({ where: { id: answer.id }, data: { isCorrect: answer.isCorrect } });
      }
      return tx.simulation.update({ where: { id }, data: { status: "FINISHED", score: result.score, total: result.total, finishedAt: new Date() } });
    });
    return Response.json(result);
  }
  return Response.json({ saved: true });
}
