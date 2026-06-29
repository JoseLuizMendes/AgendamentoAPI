---
description: "Task list — 005 Observabilidade de Produção"
---

# Tasks: Observabilidade de Produção

**Input**: Design documents from `specs/005-observabilidade/`

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md),
[data-model.md](./data-model.md), [contracts/observability-config.md](./contracts/observability-config.md)

**Tests**: TDD nos alvos puros/verificáveis (scrub `beforeSend`, gate por DSN). A captura real é
validada manualmente ([quickstart.md](./quickstart.md)).

**Organization**: por user story (US1…US4), em ordem de prioridade. Verde antes da próxima (C2/C5).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: paralelizável (arquivos diferentes, sem dependência pendente). `api/` = backend, `web/` = front.

---

## Phase 1: Setup

- [x] T001 Exceção de stack (C6) registrada na constituição (§Exceções) e no `CLAUDE.md` raiz. ✅
- [x] T002 Projeto Sentry criado pelo dev; DSN em mãos (1 projeto usado p/ API e Web — separável depois). ✅
- [x] T003 [P] `@sentry/node` **10.62.0** instalado em `api/`; audit 0 crítico. ✅
- [x] T004 [P] `@sentry/nextjs` **10.62.0** instalado em `web/`; audit 0. ✅

**Checkpoint**: SDKs instalados, exceção registrada, DSNs em mãos.

---

## Phase 2: Foundational (bloqueante)

**Purpose**: config validada + scrub puro — pré-requisitos compartilhados por US1/US2/US3.

- [x] T005 [US-shared] `api/src/config.ts`: bloco `sentry` por env (DSN/environment/release/tracesSampleRate; default dev 1.0/prod 0.1); `config.sentry = null` sem DSN. ✅
- [x] T006 (TDD-RED→GREEN) `api/tests/unit/scrub.test.ts` (3 testes). ✅ (RED confirmado antes da impl)
- [x] T007 `api/src/observability/scrub.ts`: `scrubEvent` puro (headers Authorization/Cookie/Set-Cookie, request.cookies, senha/token no corpo). ✅
- [x] T008 (TDD) `config.test.ts`: sem DSN ⇒ null; com DSN ⇒ sample rate default por ambiente; override. ✅

**Checkpoint**: config + scrub prontos e testados (sem tocar no SDK ainda).

---

## Phase 3: User Story 1 — Erros visíveis (P1) 🎯 MVP

**Goal**: exceções não tratadas (API e Web) viram eventos com stack, contexto e release.

**Independent Test**: provocar erro em prod/staging → evento no painel com stack + rota + release; sem DSN, nada é enviado.

- [x] T009 [US1] `api/src/instrument.ts`: `Sentry.init` gateado por `config.sentry` (sendDefaultPii:false + beforeSend scrub). ✅
- [x] T010 [US1] `api/src/server.ts`: `import "./instrument.js"` 1ª linha; produção via `node --import ./dist/instrument.js` (entrypoint + `start`). ✅
- [x] T011 [US1] `api/src/app.ts`: `Sentry.setupFastifyErrorHandler(app)` quando `config.sentry` (coexiste com o error handler). ✅
- [x] T012 [P] [US1] `web/instrumentation.ts`: `register()` + `onRequestError`, gate por DSN. ✅
- [x] T013 [P] [US1] `web/instrumentation-client.ts`: init client + `onRouterTransitionStart`, gate por DSN + scrub. ✅
- [x] T014 [US1] `web/next.config.ts`: `withSentryConfig` (sourcemaps atrás de `SENTRY_AUTH_TOKEN`, `silent`). ✅ build verde.
- [x] T015 [US1] `captureException` nas Error Boundaries (`error.tsx`, `global-error.tsx`) via `useEffect`. ✅
- [x] T016 [US1] `.env.example` (API+Web) com `SENTRY_*`/`NEXT_PUBLIC_SENTRY_DSN`; `web/Dockerfile` + `deploy.yml` passam DSN/`NEXT_PUBLIC_APP_VERSION`=`github.sha` + sourcemap args. DSN real nos `.env` locais (gitignored). ✅
- [x] T017 [US1] Verificado: API `tsc` + **102 unit** ✅; Web `tsc` + `lint` + `build` ✅. Captura real = manual (quickstart, precisa de tráfego).

**Checkpoint**: erros de produção capturados e correlacionados ao deploy.

---

## Phase 4: User Story 3 — Scrub + config segura (P2)

**Goal**: nenhum cookie/Authorization/senha sai nos eventos; sem DSN não envia nada.

**Independent Test**: erro em rota de auth autenticada → evento sem dados sensíveis; sem DSN → zero envio.

- [x] T018 [US3] `beforeSend: scrubEvent` + `sendDefaultPii:false` ligados nos inits da API (`instrument.ts`) e do Web (`instrumentation.ts` + `instrumentation-client.ts`). ✅
- [~] T019 [US3] Validação local: gate por DSN testado (sem DSN ⇒ no-op); scrub testado (unit). Inspeção do evento real saneado = **manual** (quickstart, precisa de DSN + erro autenticado).

**Checkpoint**: telemetria saneada e segura por padrão.

---

## Phase 5: User Story 2 — Tracing de performance (P2)

**Goal**: transações amostradas mostram rotas/queries lentas.

**Independent Test**: gerar tráfego → transações com spans de rota + consulta ao banco; ajustar sample rate por env muda o volume.

- [x] T020 [US2] `tracesSampleRate` por env (default dev 1.0/prod 0.1) ativo na API (`instrument.ts`) e Web. Spans de rota/consulta = auto-instrumentação OTel do `@sentry/node` (validação no painel). ✅
- [x] T021 [P] [US2] Sourcemaps fiados via `withSentryConfig` + `SENTRY_AUTH_TOKEN` (build-arg/secret), não bloqueante (sem token, build segue — confirmado). ✅

**Checkpoint**: performance observável por dados reais.

---

## Phase 6: User Story 4 — Uptime externo (P3)

**Goal**: indisponibilidade total de um domínio é detectada/notificada externamente.

**Independent Test**: derrubar um domínio → monitor externo notifica em poucos minutos.

- [x] T022 [US4] `api/DEPLOY.md` §7: seção "Observabilidade & Uptime externo" (monitor gratuito nos dois domínios + health checks + config Sentry de deploy). ✅

**Checkpoint**: rede de segurança final documentada.

---

## Phase 7: Polish & validação final

- [x] T023 Verificação consolidada verde: API `tsc` + **102 unit** + `audit` 0 crítico; Web `tsc` + `lint` + `build` + `audit` 0. ✅
- [x] T024 Status do spec/plan 005 → Implementada; marcador SPECKIT do `CLAUDE.md` atualizado.

---

## Dependencies & Execution Order

- **Setup (P1)** → **Foundational (P2: config + scrub)** → **US1 (P3)**.
- **US3** depende de US1 (inits existirem) — wiring do `beforeSend` + validação.
- **US2** depende de US1 (init com tracing) — só ajusta/valida sampling.
- **US4** é independente (doc).
- **Polish** por último.
- **T006 antes de T007** (TDD-RED→GREEN). **T009/T010/T011** sequenciais (mesmo fluxo de boot da API). **T012–T015** do Web em paralelo entre si.

### Parallel Opportunities
- T003/T004 (instalar SDKs) em paralelo. T012/T013 (Web instrumentation) em paralelo. T021 isolada.

---

## Implementation Strategy

### MVP de observabilidade
1. Setup + Foundational → 2. **US1** (erros visíveis, API+Web) + **US3** (scrub, feita junto por segurança) → **PARAR e VALIDAR** no painel. Esse é o ganho central.

### Incremental
3. **US2** (tracing) → 4. **US4** (uptime) → 5. Polish.

---

## Notes
- `[P]` = arquivos diferentes, sem dependência pendente. TDD: T006 (scrub) e T008 (config gate) primeiro.
- Captura real do Sentry = validação **manual** (quickstart) — precisa de DSN/ambiente.
- Total: **24 tarefas** — Setup 4, Foundational 4, US1 9, US3 2, US2 2, US4 1, Polish 2.
