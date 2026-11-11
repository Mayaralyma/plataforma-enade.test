import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";

export async function GET(request: Request) {
  const access = await requireRole("ADMIN");
  if (access.error) return access.error;
  const url = new URL(request.url);
  const status = url.searchParams.get("status") || "PENDING";
  const editionId = url.searchParams.get("editionId") || undefined;
  const questions = await prisma.question.findMany({ where: { status: status as "PENDING" | "PUBLISHED" | "DISCARDED", editionId }, include: { options: true, edition: true }, orderBy: [{ edition: { year: "desc" } }, { originalNumber: "asc" }], take: 200 });
  return Response.json(questions);
}
