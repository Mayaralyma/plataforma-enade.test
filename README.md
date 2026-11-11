# Plataforma de Simulados Interativos do ENADE

Aplicação para importar provas do ENADE, revisar questões extraídas e permitir que estudantes pratiquem, recebam correção e consultem o histórico.

## Requisitos locais

- Node.js 20 ou superior e npm
- Docker Desktop com Docker Compose

## Iniciar com Docker

1. Copie `.env.example` para `.env` e substitua `BETTER_AUTH_SECRET` por um segredo aleatório longo. Configure `ADMIN_EMAILS` com os e-mails que receberão perfil de administrador ao criar a conta.
2. Na raiz do repositório, execute `docker compose up --build`.
3. Acesse `http://localhost:3000` e crie sua conta usando um e-mail listado em `ADMIN_EMAILS` para acessar a área administrativa. Outros cadastros recebem perfil de estudante.

O Compose inicia PostgreSQL, a aplicação web e o worker de extração. O banco e os PDFs ficam em volumes persistentes. Para encerrar, use `docker compose down`; os volumes são preservados. Para apagar os dados locais por completo, use `docker compose down -v`.

## Iniciar sem Docker

1. Inicie um PostgreSQL e configure `DATABASE_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `ADMIN_EMAILS` e `PDF_STORAGE_DIR` em `.env`.
2. Execute `npm install`, `npm run db:deploy` e `npm run dev` em um terminal.
3. Em outro terminal, execute `npm run worker`.

## Fluxos disponíveis

- Cadastro/login por e-mail e senha, com controle de perfil no servidor.
- Upload de PDFs e processamento em worker separado com fila pg-boss.
- Importação de gabarito em TXT/CSV: uma resposta por linha, por exemplo `1; A` ou `12; ANULADA`.
- Revisão, edição, publicação ou descarte de questões.
- Simulados com navegação livre, salvamento de respostas, correção no servidor e histórico individual.
- PDFs originais armazenados localmente e entregues apenas por rota administrativa autenticada.

## Observações de implementação

- O parser inicial foi feito para provas digitais com texto selecionável e padrões simples de numeração e alternativas A–E. A extração precisa ser calibrada com as provas escolhidas pela equipe; conteúdo com figuras, tabelas e gráficos exige conferência manual. OCR permanece fora do escopo inicial do PRD.
- O gabarito aceito nesta primeira versão é TXT/CSV em linhas `número; alternativa`, incluindo `ANULADA`. A associação é feita pelo número original da questão.
- O banco usa a migração inicial do Prisma. Para um ambiente publicado, configure armazenamento privado de arquivos antes da implantação.
- O PRD ainda deixa pendentes a definição de métrica de sucesso, meta numérica para “resposta rápida”, provas de validação, hospedagem e algumas responsabilidades da equipe.

## Comandos úteis

- `npm run db:generate`: gera o Prisma Client.
- `npm run db:seed`: cria uma edição de demonstração com três questões fictícias publicadas.
- `npm run typecheck`: verifica os tipos TypeScript.
- `npm run lint`: executa ESLint.
- `npm test`: executa os testes unitários Vitest.
- `npm run test:e2e`: executa o fluxo Playwright. Antes, configure `.env`, inicie o PostgreSQL portátil (`npm run db:local:start`), aplique a migração (`npm run db:deploy`), carregue os dados demonstrativos (`npm run db:seed`) e instale o Chromium na pasta ignorada do projeto (`npm run playwright:install`). O Playwright inicia o Next.js local automaticamente.
- `npm run db:local:install`: baixa e verifica o ZIP oficial do PostgreSQL 16.15, instalando só `bin`, `lib` e `share` em `.local/postgres`. O cluster local fica em `.local/postgres-data`; nada é registrado como serviço do Windows.
- `npm run db:local:start` / `npm run db:local:stop`: inicia ou para esse banco local sem apagar os dados.
