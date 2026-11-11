import { readFile } from "node:fs/promises";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const access = await requireRole("ADMIN");
  if (access.error) return access.error;
  const { id } = await params;
  const edition = await prisma.edition.findUnique({ where: { id } });
  if (!edition?.filePath) return Response.json({ error: "PDF não encontrado." }, { status: 404 });
  const bytes = await readFile(edition.filePath);
  return new Response(bytes, { headers: { "Content-Type": "application/pdf", "Content-Disposition": `inline; filename="${encodeURIComponent(edition.originalFileName || "prova.pdf")}"`, "Cache-Control": "private, no-store" } });
}
