import "dotenv/config";
import { PrismaClient, QuestionStatus } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const edition = await prisma.edition.upsert({
    where: { year_area: { year: 2023, area: "Sistemas de Informação" } },
    update: {},
    create: { year: 2023, area: "Sistemas de Informação" },
  });
  const sample = [
    { originalNumber: 1, statement: "Qual prática ajuda a manter a qualidade de um sistema ao longo do desenvolvimento?", options: ["A revisão e os testes frequentes", "Evitar documentação", "Adiar toda validação para o final", "Remover o controle de versão", "Fazer deploy sem revisão"], correctOption: "A" },
    { originalNumber: 2, statement: "Em uma aplicação web, qual camada deve validar permissões antes de executar uma operação protegida?", options: ["Somente o navegador", "Somente o CSS", "O backend", "A página inicial", "O arquivo de imagem"], correctOption: "C" },
    { originalNumber: 3, statement: "Qual é uma vantagem de processar tarefas demoradas em segundo plano?", options: ["A interface permanece disponível enquanto o trabalho é executado", "A tarefa deixa de precisar de armazenamento", "O banco não precisa registrar estados", "Os erros não podem mais acontecer", "Todas as operações viram síncronas"], correctOption: "A" },
  ];
  for (const q of sample) {
    await prisma.question.upsert({
      where: { editionId_originalNumber: { editionId: edition.id, originalNumber: q.originalNumber } },
      update: {},
      create: { editionId: edition.id, originalNumber: q.originalNumber, statement: q.statement, status: QuestionStatus.PUBLISHED, correctOption: q.correctOption, options: { create: q.options.map((text, i) => ({ label: String.fromCharCode(65 + i), text })) } },
    });
  }
  console.info(`Seed pronto: edição ${edition.year} ${edition.area} com questões demonstrativas.`);
}

main().finally(() => prisma.$disconnect());
