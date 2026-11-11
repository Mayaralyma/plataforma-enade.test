import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canAccessRole } from "@/lib/access";

export async function getCurrentUser() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return null;
  return prisma.user.findUnique({ where: { id: session.user.id } });
}

export async function requireRole(role: "ADMIN" | "STUDENT") {
  const user = await getCurrentUser();
  if (!user) return { error: Response.json({ error: "Não autenticado." }, { status: 401 }) };
  if (!canAccessRole(user.role, role)) return { error: Response.json({ error: "Acesso não autorizado." }, { status: 403 }) };
  return { user };
}
