import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const access = await requireRole("ADMIN");
  if (access.error) return access.error;
  const { id } = await params;
  const job = await prisma.importJob.findUnique({
    where: { id },
    include: {
      issues: { orderBy: { originalNumber: "asc" } },
      edition: { include: { questions: { select: { id: true, originalNumber: true, status: true, needsReview: true } } } },
    },
  });
  if (!job) return Response.json({ error: "Importação não encontrada." }, { status: 404 });
  return Response.json(job);
}
