import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";

export async function GET() {
  const access = await requireRole("STUDENT");
  if (access.error) return access.error;
  return Response.json(await prisma.simulation.findMany({ where: { userId: access.user.id }, include: { edition: true }, orderBy: { startedAt: "desc" }, take: 100 }));
}

export async function POST(request: Request) {
  const access = await requireRole("STUDENT");
  if (access.error) return access.error;
  const parsed = z.object({ editionId: z.string().min(1) }).safeParse(await request.json());
  if (!parsed.success) return Response.json({ error: "Selecione uma edição." }, { status: 400 });
  const questions = await prisma.question.findMany({ where: { editionId: parsed.data.editionId, status: "PUBLISHED" }, include: { options: true }, orderBy: { originalNumber: "asc" } });
  if (!questions.length) return Response.json({ error: "Esta edição ainda não tem questões publicadas." }, { status: 400 });
  const simulation = await prisma.simulation.create({ data: { userId: access.user.id, editionId: parsed.data.editionId, answers: { create: questions.map((q) => ({ questionId: q.id, snapshot: { originalNumber: q.originalNumber, statement: q.statement, options: q.options.map(({ label, text }) => ({ label, text })), correctOption: q.correctOption, annulled: q.annulled } })) } } });
  return Response.json(simulation, { status: 201 });
}
