import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getQueue } from "@/lib/queue";
import { requireRole } from "@/lib/session";

export async function GET() {
  const access = await requireRole("ADMIN");
  if (access.error) return access.error;
  const jobs = await prisma.importJob.findMany({ include: { edition: true }, orderBy: { createdAt: "desc" }, take: 50 });
  return Response.json(jobs);
}

export async function POST(request: Request) {
  const access = await requireRole("ADMIN");
  if (access.error) return access.error;
  const data = await request.formData();
  const parsed = z.object({ year: z.coerce.number().int().min(2004).max(2100), area: z.string().trim().min(2).max(120) }).safeParse({ year: data.get("year"), area: data.get("area") });
  const file = data.get("file");
  if (!parsed.success || !(file instanceof File) || file.type !== "application/pdf" || file.size > 30 * 1024 * 1024) return Response.json({ error: "Informe ano, área e um PDF de até 30 MB." }, { status: 400 });
  const storage = path.resolve(process.env.PDF_STORAGE_DIR || "./uploads");
  await mkdir(storage, { recursive: true });
  const fileName = `${randomUUID()}.pdf`;
  await writeFile(path.join(storage, fileName), Buffer.from(await file.arrayBuffer()));
  try {
    const edition = await prisma.edition.upsert({ where: { year_area: parsed.data }, update: { originalFileName: file.name, filePath: path.join(storage, fileName) }, create: { ...parsed.data, originalFileName: file.name, filePath: path.join(storage, fileName) } });
    const job = await prisma.importJob.create({ data: { editionId: edition.id } });
    const queue = await getQueue();
    await queue.send("extract-exam", { jobId: job.id }, { singletonKey: job.id });
    return Response.json({ jobId: job.id, edition }, { status: 202 });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Falha ao registrar a prova." }, { status: 500 });
  }
}
