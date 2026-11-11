import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";

const updateSchema = z.object({ statement: z.string().trim().min(1), options: z.array(z.object({ label: z.enum(["A", "B", "C", "D", "E"]), text: z.string().trim().min(1) })).length(5), correctOption: z.enum(["A", "B", "C", "D", "E"]).nullable(), needsReview: z.boolean().optional() });

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const access = await requireRole("ADMIN");
  if (access.error) return access.error;
  const { id } = await params;
  const parsed = updateSchema.safeParse(await request.json());
  if (!parsed.success) return Response.json({ error: "Questão inválida: informe enunciado, cinco alternativas e gabarito." }, { status: 400 });
  const question = await prisma.question.findUnique({ where: { id } });
  if (!question || question.status !== "PENDING") return Response.json({ error: "Apenas questões pendentes podem ser editadas." }, { status: 404 });
  const updated = await prisma.$transaction(async (tx) => {
    await tx.option.deleteMany({ where: { questionId: id } });
    return tx.question.update({ where: { id }, data: { statement: parsed.data.statement, correctOption: parsed.data.correctOption, needsReview: parsed.data.needsReview ?? false, options: { create: parsed.data.options } }, include: { options: true, edition: true } });
  });
  return Response.json(updated);
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const access = await requireRole("ADMIN");
  if (access.error) return access.error;
  const { id } = await params;
  const action = (await request.json()).action;
  if (action !== "publish" && action !== "discard") return Response.json({ error: "Ação inválida." }, { status: 400 });
  const q = await prisma.question.findUnique({ where: { id }, include: { options: true } });
  if (!q || q.status !== "PENDING") return Response.json({ error: "Questão pendente não encontrada." }, { status: 404 });
  if (action === "publish" && (q.options.length !== 5 || (!q.correctOption && !q.annulled))) return Response.json({ error: "Para publicar, revise as cinco alternativas e informe uma resposta correta (exceto questões anuladas)." }, { status: 400 });
  const question = await prisma.question.update({ where: { id }, data: { status: action === "publish" ? "PUBLISHED" : "DISCARDED" } });
  return Response.json(question);
}
