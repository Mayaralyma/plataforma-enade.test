# AGENTS.md

## Stack and layout

- Next.js 15 App Router, React 19, TypeScript strict, Tailwind CSS v4, Prisma/PostgreSQL, Better Auth, pg-boss.
- Use Node 20+; CI and Docker use Node 22. Use npm (`package-lock.json`), not yarn/pnpm.
- `app/page.tsx` is the only page entry point: it renders `AuthScreen` or `Dashboard` based on the session.
- `components/dashboard.tsx` is one large client component for both student and admin views. There are no `/admin` or `/student` pages; client-side data flows through `app/api/**/route.ts` via `fetch`.
- Enforce authorization server-side with `requireRole` from `lib/session.ts`. `ADMIN` passes `STUDENT` checks (`lib/access.ts`).
- Import flow: `POST /api/admin/imports` writes the PDF to `PDF_STORAGE_DIR` and enqueues pg-boss job `extract-exam`; `worker/index.ts` consumes it using `lib/pdf-parser.ts`. The web app and worker share `DATABASE_URL`, and the worker must run separately in dev.
- Simulation scoring lives in `lib/simulation.ts`. It uses per-answer `snapshot` data captured at simulation creation; annulled questions are excluded from the denominator.

## Setup and commands

- Copy `.env.example` to `.env`; `BETTER_AUTH_SECRET` must be at least 32 characters.
- Docker: `docker compose up --build` (runs migrations, web, and worker).
- Local Windows PostgreSQL fallback: `npm run db:local:setup`, then `npm run db:local:start` / `npm run db:local:stop`. This installs PostgreSQL into ignored `.local/`; no Windows service is registered.
- Without Docker: `npm install`, `npm run db:deploy`, `npm run db:seed`, `npm run dev`, and in another terminal `npm run worker`.
- Verification order used by CI: `npm run db:generate` -> `npm run db:deploy` -> `npm run db:seed` -> `npm run lint` -> `npm run typecheck` -> `npm test` -> E2E -> `npm run build`.
- Single Vitest file: `npx vitest run tests/pdf-parser.test.ts` (add `-t "test name"` to filter).
- E2E: `npm run test:e2e`. Beforehand, configure `.env`, start/seed PostgreSQL, and run `npm run playwright:install` (Chromium goes to `.local/playwright`). E2E mutates a real database and the admin spec spawns its own worker; use only a local/test DB.
- Direct single Playwright file: set `$env:PLAYWRIGHT_BROWSERS_PATH="$((Get-Location).Path)\.local\playwright"` then `npx playwright test tests/e2e/student-flow.spec.ts`. Playwright starts Next automatically unless `PLAYWRIGHT_BASE_URL` is set.
- Parser regression validators: `npm run validate:official-enade` and `npm run validate:official-enade:2021`. They need no database, read `data/official-enade/`, and should be run after any `lib/pdf-parser.ts` change. `pdf-parse` warning output is expected.
- When running a standalone TypeScript script on Windows, use the same invocation as existing scripts: `node --import ./scripts/node-compat.mjs --import tsx <file>`. This works around restricted sessions where Node cannot call `os.userInfo()`. Existing scripts (`db:seed`, `worker`, validators) already do this.

## Conventions and gotchas

- Schema changes: run `npm run db:migrate` and commit the generated `prisma/migrations/` files; deployments use `npm run db:deploy`.
- `ADMIN_EMAILS` only sets a role when the user is created. To promote an existing account, update `user.role` directly or through Prisma (tests do this).
- Only `PENDING` questions can be edited. Publishing requires exactly five options and either `correctOption` or `annulled`.
- `data/official-enade/` is the single fixture root for validators and E2E. `knowledgeBase/EQUIPE_5_VFINAL.pdf` is a required E2E fixture; do not move or delete these files.
- The PRD mentions shadcn/ui, but it is not installed. Existing UI is hand-written React + Tailwind in `components/`; follow that pattern.
- UI copy and API error messages are pt-BR. Preserve that style.
- Git workflow from the PRD: work on feature branches and open PRs to `main`; CI runs on pushes and PRs to `main`.
- Never commit `.env`, `uploads/`, `.local/`, or `.next/`; they are ignored. Stored PDFs are private and served only through the authenticated admin route `app/api/admin/files/[id]/route.ts`.

## Known structural debt (verified; update/remove when resolved)

- `components/dashboard.tsx` is a single large client component for admin and student flows. Split incrementally with no behavior changes.
- `ADMIN_EMAILS` only assigns roles at signup. Add an explicit admin provisioning path for existing users.
- E2E uses a real database, local worker, and committed PDF fixtures. Keep destructive tests on a local/test DB only.
- Keep this file current when commands, paths, or entrypoints change.

## Suggested work order

1. Maintain `AGENTS.md`.
2. Add explicit admin provisioning.
3. Extract admin views from `components/dashboard.tsx`.
4. Extract student/simulation views.

## References

- Requirements/status: `knowledgeBase/PRD_Plataforma_Simulados_ENADE.md`, `knowledgeBase/VERIFICACAO_PRD.md`, `knowledgeBase/REVISAO_MANUAL_ENADE_2023.md`.
- Official validation PDFs and expected paths: `data/official-enade/README.md`.
- Operational setup: `README.md`.
