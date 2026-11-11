import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";

export async function GET() {
  const access = await requireRole("STUDENT");
  if (access.error) return access.error;
  const editions = await prisma.edition.findMany({
    where: { questions: { some: { status: "PUBLISHED" } } },
    include: { _count: { select: { questions: { where: { status: "PUBLISHED" } } } } },
    orderBy: [{ year: "desc" }, { area: "asc" }],
  });
  return Response.json(editions);
}
