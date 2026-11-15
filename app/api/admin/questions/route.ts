import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";

const statusSchema = z.enum(["PENDING", "PUBLISHED", "DISCARDED"]);

export async function GET(request: Request) {
  const access = await requireRole("ADMIN");
  if (access.error) return access.error;
  const url = new URL(request.url);
  const parsedStatus = statusSchema.safeParse(url.searchParams.get("status") || "PENDING");
  if (!parsedStatus.success) return Response.json({ error: "Status inválido." }, { status: 400 });
  const editionId = url.searchParams.get("editionId") || undefined;
  const questions = await prisma.question.findMany({ where: { status: parsedStatus.data, editionId }, include: { options: true, edition: true }, orderBy: [{ edition: { year: "desc" } }, { originalNumber: "asc" }], take: 200 });
  return Response.json(questions);
}
