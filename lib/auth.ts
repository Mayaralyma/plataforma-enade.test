import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { prisma } from "@/lib/prisma";

const secret = process.env.BETTER_AUTH_SECRET || (process.env.NODE_ENV === "development" ? "local-development-secret-change-before-deploy-123456" : undefined);
if (!secret && process.env.NEXT_PHASE !== "phase-production-build") {
  throw new Error("Configure BETTER_AUTH_SECRET com um segredo aleatório de pelo menos 32 caracteres.");
}

export const auth = betterAuth({
  baseURL: process.env.BETTER_AUTH_URL || "http://localhost:3000",
  secret,
  database: prismaAdapter(prisma, { provider: "postgresql" }),
  emailAndPassword: { enabled: true, minPasswordLength: 8 },
  user: { additionalFields: { role: { type: "string", required: false, defaultValue: "STUDENT", input: false } } },
  databaseHooks: {
    user: {
      create: {
        before: async (user) => {
          const admins = (process.env.ADMIN_EMAILS || "").toLowerCase().split(",").map((email) => email.trim());
          return { data: { ...user, role: admins.includes(user.email.toLowerCase()) ? "ADMIN" : "STUDENT" } };
        },
      },
    },
  },
  trustedOrigins: [process.env.BETTER_AUTH_URL || "http://localhost:3000"],
});
