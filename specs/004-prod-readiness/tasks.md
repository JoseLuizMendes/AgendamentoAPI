---
description: "Task list — 004 Prod-Readiness & Hardening Final"
---

# Tasks: Prod-Readiness & Hardening Final

**Input**: Design documents from `specs/004-prod-readiness/`

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md),
[data-model.md](./data-model.md), [contracts/auth-response.md](./contracts/auth-response.md)

**Tests**: incluídos onde o canon TDD (C5) se aplica (mudança de contrato, gating, config). Tarefas de
infra/config são validadas via [quickstart.md](./quickstart.md), não por unit test.

**Organization**: por user story (US1…US5), em ordem de prioridade. Cada fase é um incremento
verificável independente. Verde antes da próxima (C2/C5).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: paralelizável (arquivos diferentes, sem dependência pendente)
- Caminhos de arquivo explícitos. `api/` = backend Fastify, `web/` = front Next.

---

## Phase 1: Setup (baseline)

**Purpose**: garantir ponto de partida verde antes de qualquer mudança.

- [x] T001 Confirmar baseline verde: rodar `pnpm -C api exec tsc -p tsconfig.json --noEmit`, `pnpm -C api test`, `pnpm -C web exec tsc --noEmit`, `pnpm -C web build` e registrar o resultado atual de `pnpm -C api audit` / `pnpm -C web audit` (snapshot pré-mudança). ✅ API 93 testes verdes; audit base API 4 crit/22 high, Web 8 high.

**Checkpoint**: estado atual conhecido e verde.

---

## Phase 2: Foundational (bloqueante)

**Purpose**: nada de produto bloqueia as stories; o único pré-requisito é trabalhar a partir de deps
saudáveis — por isso US1 vem primeiro e funciona como base para o build/test das demais.

- [x] T002 Confirmar branch de trabalho `feat/horarios-controle-total` limpa (`git status`) e sem mudanças não commitadas antes de iniciar as fases.

**Checkpoint**: pronto para iniciar US1.

---

## Phase 3: User Story 1 — Zero CVEs em dependências (Priority: P1) 🎯 MVP

**Goal**: eliminar advisories críticos de runtime e os CVEs `high` do Web, mantendo a suíte verde.

**Independent Test**: `pnpm audit` (API e Web) sem crítico runtime / sem `next` high; `tsc`+test+build verdes.

- [x] T003 [US1] Atualizar `api/package.json`: `fastify` 5.9.0, `@fastify/jwt` 10.1.0 (puxa `fast-jwt` 6.2.4); rodar `pnpm -C api install`. ✅
- [x] T004 [US1] `pnpm.overrides` em `api/package.json` (`fast-uri` ^3.1.2, `ajv` ≥8.18.0, `@fastify/static` ≥9.1.1, `lodash`/`defu`/`bn.js`/`postcss`) + bump `vitest`/`@vitest/coverage-v8` 4.1.9; reinstalar. ✅ **0 crítico runtime** (era 4); highs restantes = toolchain de teste (vite/rollup/hono), não-runtime.
- [x] T005 [US1] Verificar API verde após bumps: `tsc` ✅ + `pnpm -C api test` ✅ **93 testes**. (Integração roda no CI — exige Postgres `?schema=test`.)
- [x] T006 [P] [US1] `web/package.json`: `next` → 16.2.9, `eslint-config-next` 16.2.9, override `postcss` ≥8.5.10; `pnpm -C web install`. ✅
- [x] T007 [US1] Verificar Web verde: `tsc` ✅ + `lint` ✅ (0 erros) + `build` ✅ + `test` ✅ **61 testes**; `pnpm -C web audit` ✅ **0 vulnerabilidades** (todas severidades).

**Checkpoint**: dependências saudáveis; demais fases buildam sobre versões seguras.

---

## Phase 4: User Story 2 — App inteiro na VPS com HTTPS (Priority: P1)

**Goal**: servir Web + API pela VPS, cada um no seu domínio, com HTTPS automático e Web no CI/CD.

**Independent Test**: `docker compose up` → `curl -I https://app.<dominio>` e `https://api.<dominio>/health/live` 200; login ponta a ponta.

- [x] T008 [US2] `output: 'standalone'` + `outputFileTracingRoot` (standalone plano) + `poweredByHeader:false` em `web/next.config.ts`. ✅ build gera `.next/standalone/server.js`.
- [x] T009 [P] [US2] `web/Dockerfile` multi-stage (build → runtime standalone, non-root, `ARG NEXT_PUBLIC_API_URL` build-time, `EXPOSE 3000`, `CMD ["node","server.js"]`). Escrito conforme padrão oficial Next standalone (server.js confirmado pelo `next build`). _Build da imagem validado no CI/VPS — daemon Docker local indisponível nesta sessão._
- [x] T010 [P] [US2] `web/.dockerignore` criado (`node_modules`, `.next`, `.git`, `.env*`, etc.).
- [x] T011 [US2] Serviço `web` em `api/docker-compose.yml` (imagem GHCR `WEB_IMAGE`, healthcheck, `expose: 3000`, sem porta no host). ✅ `docker compose config` válido.
- [x] T012 [US2] `api/Caddyfile`: blocos `{$API_DOMAIN} -> api:3000` e `{$WEB_DOMAIN} -> web:3000`; compose passa `API_DOMAIN`/`WEB_DOMAIN`.
- [x] T013 [US2] `CORS_ORIGIN`/`NEXT_PUBLIC_API_URL` documentados; criado `api/.env.example` e atualizado `web/.env.example` com as chaves de deploy (API_IMAGE/WEB_IMAGE/API_DOMAIN/WEB_DOMAIN).
- [x] T014 [US2] `.github/workflows/ci.yml`: job `web` (install, audit, `tsc`, `lint`, `test`, `build`).
- [x] T015 [US2] `.github/workflows/deploy.yml`: build+push de **duas** imagens (`-api` e `-web`), Web com `--build-arg NEXT_PUBLIC_API_URL`.
- [~] T016 [US2] Validação: `next build` standalone ✅ + `docker compose config` ✅. `docker build`/`compose up` + `curl` nos domínios = validação de **CI/deploy na VPS** (daemon Docker local indisponível; DNS/HTTPS reais só na VPS).

**Checkpoint**: produto acessível por HTTPS na VPS; CI/CD cobre Web e API.

---

## Phase 5: User Story 3 — Superfície de auth/navegador endurecida (Priority: P2)

**Goal**: token fora do body, JWT curto, Swagger fora de prod, headers de segurança e gate de rota.

**Independent Test**: login sem `token` no corpo (cookie presente); `/documentation` 404 em prod; 5 headers no Web; rota de workspace redireciona sem sessão.

- [x] T017 [US3] (TDD) Teste de contrato `api/tests/integration/auth-contract.test.ts`: `/login` e `/signup` **sem** `token` no corpo e **com** `Set-Cookie token HttpOnly`. (Integração — roda no CI; `skipIf(!hasDb)`.)
- [x] T018 [US3] Removido `token` do corpo em `api/src/routes/auth.ts` (`/login` e `/signup`); cookie `maxAge` 2d. _Sem schema de response p/ esses endpoints (token só ia no `reply.send`)._ Testes de integração migrados para extrair o token do **cookie** (8 arquivos).
- [x] T019 [US3] `config.ts`: `JWT_EXPIRES_IN` default `"2d"`. Testes `config.test.ts` e `auth-token.test.ts` atualizados (172800s). ✅
- [x] T020 [US3] (TDD) `api/tests/unit/swagger-gating.test.ts`: prod → `GET /docs` 404 e `/` 200; dev → `/docs` disponível. ✅ verde.
- [x] T021 [US3] `app.ts`: Swagger só `!isProduction`; em prod, `GET /` mínimo (discovery). ✅
- [x] T022 [P] [US3] `web/next.config.ts`: `headers()` (HSTS, X-Frame-Options DENY, X-Content-Type-Options nosniff, Referrer-Policy, Permissions-Policy) + `poweredByHeader:false`. ✅ build verde.
- [x] T023 [P] [US3] `web/src/proxy.ts` (Next 16 — confirmado no build: `ƒ Proxy (Middleware)`): redireciona p/ `/login` sem cookie de sessão fora das rotas públicas. + `COOKIE_DOMAIN` na API (cookie cross-subdomínio legível pelo gate).
- [x] T024 [US3] CSRF: decisão `SameSite=lax` + CORS estrito (mitiga POST cross-site; preflight obrigatório por JSON) registrada em `research.md`. Token anti-CSRF = backlog.
- [x] T025 [US3] Verificado local: API `tsc` ✅ + 95 unit ✅; Web `tsc` ✅ + `lint` ✅ + `build` ✅. Integração (contrato + suíte migrada) roda no **CI** (sem DB/Docker local).

**Checkpoint**: sessão e navegador endurecidos sem mudança de produto.

---

## Phase 6: User Story 4 — Repo e operação confiáveis (Priority: P3)

**Goal**: lockfile único, sem serviço ocioso, exemplos de env, gate de audit e doc de rollback.

**Independent Test**: só `pnpm-lock.yaml`; `redis` ausente do compose; `.env.example` presentes; CI falha em crítico.

- [x] T026 [P] [US4] Removidos `package-lock.json` (raiz + `api/`) + cruft da raiz (`package.json`/`pnpm-lock.yaml` stray) + **`node_modules` desrastreado** (1568 arquivos commitados por acidente). `git ls-files | grep package-lock` vazio. ✅
- [x] T027 [P] [US4] Criado `.gitignore` na raiz (node_modules, lockfiles npm, builds, .env*). `api/.env.example` criado na US2; `web/.gitignore` passou a versionar `.env.example`. ✅
- [x] T028 [US4] `docker-compose.yml`: removidos serviço `redis`, `depends_on` e volume `redisdata`; decisão registrada (comentário no compose + research.md). ✅ `docker compose config` válido.
- [x] T029 [US4] `ci.yml`: `pnpm audit --audit-level=critical` **bloqueante** (sem `continue-on-error`) nos dois jobs (api + web). ✅
- [x] T030 [US4] `api/DEPLOY.md`: seção "Backup & Rollback de migrations" (snapshot/branch Neon, `prisma migrate resolve --rolled-back`, repin de imagem por `:sha`, migrations em 2 fases). ✅

**Checkpoint**: repositório e deploy coerentes e à prova de pegadinha.

---

## Phase 7: User Story 5 — Polimento final (Priority: P3)

**Goal**: zerar o débito residual de baixo risco da auditoria.

**Independent Test**: revisar cada item e confirmar tratado ou registrado como backlog aceito.

- [ ] T031 [P] [US5] `api/src/app.ts`: endurecer a CSP do Helmet (remover `'unsafe-inline'` e `unpkg`/`jsdelivr` do `scriptSrc`/`styleSrc`, agora que o Swagger saiu de prod); confirmar que nada quebra.
- [ ] T032 [P] [US5] `api/src/app.ts`: revisar o retorno `cb(null, true)` do CORS quando `!origin` (decidir manter para health/curl ou restringir); registrar decisão.
- [ ] T033 [P] [US5] Criar rotina de limpeza de tokens efêmeros (`DELETE` por data em `AuthToken`/`IdempotencyKey`) como script SQL/`tsx` agendável — sem migration (ver data-model.md).
- [ ] T034 [P] [US5] Migrar `web/src/app/dashboard/page.tsx` (fetch em client component) para React Query, ou remover a rota legada se não usada.
- [ ] T035 [P] [US5] Modernizações de front onde agregarem valor: `dvh`/viewport dinâmico, `focus-visible`, `prefers-reduced-motion` (`motion-reduce:*`).

**Checkpoint**: projeto sem débito conhecido da auditoria.

---

## Phase 8: Polish & validação final (cross-cutting)

- [ ] T036 Rodar o comando de verificação consolidado do [quickstart.md](./quickstart.md) (API tsc+test+integração + Web tsc+lint+build+test + audit crítico) e registrar evidência verde.
- [ ] T037 Atualizar status do spec/plan do 004 para concluído e o marcador SPECKIT do `CLAUDE.md`.

---

## Dependencies & Execution Order

- **Setup (Phase 1)** → **Foundational (Phase 2)** → **US1 (Phase 3)**: US1 é base (deps saudáveis) para o build/test das demais.
- **US2/US3/US4/US5** dependem de US1 verde. US2 e US3 podem andar em paralelo (arquivos majoritariamente distintos: infra/Docker/Caddy/CI vs auth/headers). US4 e US5 são higiene/polimento, melhor por último.
- **US5 T031 (CSP)** depende de **US3 T021** (Swagger fora de prod) — só endurecer a CSP depois que o Swagger sair.
- **US4 T029 (audit bloqueante)** depende de **US1** ter zerado os críticos.
- **Polish (Phase 8)** depende de todas as stories desejadas.

### Parallel Opportunities

- T009/T010 (Dockerfile + dockerignore do Web) em paralelo.
- T022 (headers Web) e T023 (gate de rota) em paralelo entre si e com as tarefas de API da US3.
- T026/T027 (lockfile + gitignore/env.example) em paralelo.
- T031–T035 (polimento) em paralelo (arquivos distintos).

---

## Implementation Strategy

### MVP (bloqueadores de go-live)
1. Phase 1–2 (baseline) → 2. **US1** (zero CVEs) → 3. **US2** (app na VPS com HTTPS) → **PARAR e VALIDAR**: produto seguro e no ar. Esse é o MVP de produção.

### Incremental
4. **US3** (endurecimento) → validar → 5. **US4** (higiene/operação) → 6. **US5** (polimento) → 7. **Phase 8** (validação final + status).

---

## Notes

- `[P]` = arquivos diferentes, sem dependência pendente.
- TDD: T017 e T020 escrevem o teste **antes** (RED) da mudança correspondente.
- Commit após cada tarefa ou grupo lógico; verde antes de avançar (C2/C5).
- Total: **37 tarefas** — US1:5, US2:9, US3:9, US4:5, US5:5, Setup/Found./Polish:4.
