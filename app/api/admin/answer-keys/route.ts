import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { parseAnswerKey } from "@/lib/pdf-parser";
import { requireRole } from "@/lib/session";

export async function POST(request: Request) {
  const access = await requireRole("ADMIN");
  if (access.error) return access.error;
  const data = await request.formData();
  const editionId = String(data.get("editionId") || "");
  const file = data.get("file");
  if (!(file instanceof File) || file.size > 5 * 1024 * 1024) return Response.json({ error: "Envie um arquivo de gabarito de até 5 MB." }, { status: 400 });
  const edition = await prisma.edition.findUnique({ where: { id: editionId } });
  if (!edition) return Response.json({ error: "Edição não encontrada." }, { status: 404 });
  const raw = await file.text();
  const key = parseAnswerKey(raw);
  if (!key.size) return Response.json({ error: "Não encontrei respostas. Use uma linha por questão: número; alternativa (A–E ou ANULADA)." }, { status: 400 });
  const storage = path.resolve(process.env.PDF_STORAGE_DIR || "./uploads");
  await mkdir(storage, { recursive: true });
  const keyPath = path.join(storage, `${randomUUID()}-${file.name.replace(/[^\w.-]/g, "_")}`);
  await writeFile(keyPath, raw, "utf8");
  let updated = 0;
  for (const [number, answer] of key) {
    await prisma.answerKeyEntry.upsert({
      where: { editionId_originalNumber: { editionId, originalNumber: number } },
      update: { correctOption: answer, annulled: answer === null },
      create: { editionId, originalNumber: number, correctOption: answer, annulled: answer === null },
    });
    const question = await prisma.question.findUnique({ where: { editionId_originalNumber: { editionId, originalNumber: number } } });
    if (!question) continue;
    await prisma.question.update({ where: { id: question.id }, data: { correctOption: answer, annulled: answer === null } });
    updated++;
  }
  await prisma.edition.update({ where: { id: editionId }, data: { answerKeyPath: keyPath } });
  return Response.json({ updated, provided: key.size });
}
