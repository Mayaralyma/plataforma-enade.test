import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const roles = ["ADMIN", "STUDENT"] as const;
type Role = (typeof roles)[number];

const usage = [
  "Uso: npm run user:role -- --email <email> --role <ADMIN|STUDENT>",
  "",
  "Atualiza o papel de um usuário existente. ADMIN_EMAILS só se aplica no cadastro.",
].join("\n");

type Options = { email: string; role: Role } | { help: true };

function parseOptions(argv: string[]): Options {
  if (!argv.length || argv.includes("--help") || argv.includes("-h")) return { help: true };

  let email: string | undefined;
  let role: string | undefined;

  for (let index = 0; index < argv.length; index++) {
    const argument = argv[index];
    if (argument !== "--email" && argument !== "--role") {
      throw new Error(`Argumento desconhecido: ${argument}.`);
    }
    const value = argv[index + 1];
    if (!value || value.startsWith("--")) throw new Error(`Informe um valor para ${argument}.`);
    if (argument === "--email") email = value;
    else role = value;
    index++;
  }

  if (!email || !role) throw new Error("Informe --email e --role.");
  const normalizedEmail = email.trim().toLowerCase();
  const normalizedRole = role.trim().toUpperCase();
  if (!roles.includes(normalizedRole as Role)) throw new Error(`Papel inválido: ${role}. Use ADMIN ou STUDENT.`);

  return { email: normalizedEmail, role: normalizedRole as Role };
}

async function main() {
  const options = parseOptions(process.argv.slice(2));
  if ("help" in options) {
    console.info(usage);
    return;
  }

  const user = await prisma.user.findFirst({
    where: { email: { equals: options.email, mode: "insensitive" } },
    select: { id: true, email: true, role: true },
  });
  if (!user) throw new Error(`Usuário não encontrado: ${options.email}.`);

  if (user.role !== options.role) {
    await prisma.user.update({ where: { id: user.id }, data: { role: options.role } });
  }

  console.info(`${user.email}: ${user.role} -> ${options.role}`);
}

main()
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : "Falha ao atualizar o papel do usuário.");
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
