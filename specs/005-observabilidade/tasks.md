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

- [ ] T001 Confirmar/registrar a **exceção de stack (C6)** para `@sentry/node` + `@sentry/nextjs` em `.specify/memory/constitution.md` (§Exceções) e `CLAUDE.md` raiz (data + justificativa: observabilidade SaaS, SDK OTel-based portável).
- [ ] T002 Criar 2 projetos no Sentry (um p/ API, um p/ Web) e anotar os DSNs (ação do dev — fora do código).
- [ ] T003 [P] Instalar `@sentry/node` em `api/` (`pnpm -C api add @sentry/node`) — versão exata via C7/npm; rodar `pnpm -C api audit`.
- [ ] T004 [P] Instalar `@sentry/nextjs` em `web/` (`pnpm -C web add @sentry/nextjs`) — versão casada com Next 16.2.x; rodar `pnpm -C web audit`.

**Checkpoint**: SDKs instalados, exceção registrada, DSNs em mãos.

---

## Phase 2: Foundational (bloqueante)

**Purpose**: config validada + scrub puro — pré-requisitos compartilhados por US1/US2/US3.

- [ ] T005 [US-shared] `api/src/config.ts`: bloco `sentry` por env (`SENTRY_DSN` opcional, `SENTRY_ENVIRONMENT` default `NODE_ENV`, `SENTRY_RELEASE` opcional, `SENTRY_TRACES_SAMPLE_RATE` número 0..1 com default dev 1.0/prod 0.1). `config.sentry = null` sem DSN.
- [ ] T006 (TDD-RED) `api/tests/unit/scrub.test.ts`: evento com `Authorization`/`Cookie`/`set-cookie`/`request.cookies` e corpo de `/auth/*` com `password` → saneado (`[Filtered]`/removido); evento sem `request` passa inalterado.
- [ ] T007 `api/src/observability/scrub.ts`: `scrubEvent` puro (implementa o contrato de `contracts/observability-config.md`) — GREEN do T006.
- [ ] T008 (TDD) `api/tests/unit/config.test.ts`: casos `sentry` — sem DSN ⇒ `config.sentry === null`; com DSN ⇒ objeto com sample rate default por ambiente.

**Checkpoint**: config + scrub prontos e testados (sem tocar no SDK ainda).

---

## Phase 3: User Story 1 — Erros visíveis (P1) 🎯 MVP

**Goal**: exceções não tratadas (API e Web) viram eventos com stack, contexto e release.

**Independent Test**: provocar erro em prod/staging → evento no painel com stack + rota + release; sem DSN, nada é enviado.

- [ ] T009 [US1] `api/src/instrument.ts`: `Sentry.init({ dsn, environment, release, tracesSampleRate, sendDefaultPii:false, beforeSend: scrubEvent })` **somente se** `config.sentry`; no-op caso contrário.
- [ ] T010 [US1] `api/src/server.ts`: `import "./instrument.js"` como **primeira** linha (antes de qualquer outro import do app).
- [ ] T011 [US1] `api/src/app.ts`: `Sentry.setupFastifyErrorHandler(app)` quando `config.sentry` (depois do error handler atual, sem suprimir as respostas existentes).
- [ ] T012 [P] [US1] `web/instrumentation.ts`: `register()` (server/edge) + `onRequestError` do `@sentry/nextjs`, gate por `NEXT_PUBLIC_SENTRY_DSN`.
- [ ] T013 [P] [US1] `web/instrumentation-client.ts`: `Sentry.init` client (gate por DSN, `beforeSend` de scrub, `tracesSampleRate`).
- [ ] T014 [US1] `web/next.config.ts`: envolver com `withSentryConfig` (release/sourcemaps; sourcemaps atrás de `SENTRY_AUTH_TOKEN`, não bloqueante).
- [ ] T015 [US1] Integrar `captureException` nas Error Boundaries existentes (`web/src/app/error.tsx`, `global-error.tsx`).
- [ ] T016 [US1] Release/env: `api/.env.example` + `web/.env.example` com chaves `SENTRY_*`/`NEXT_PUBLIC_SENTRY_DSN`; `deploy.yml` passa `SENTRY_RELEASE`=SHA (API) e usa `NEXT_PUBLIC_APP_VERSION`=SHA (Web).
- [ ] T017 [US1] Verificar: API `tsc` + `test`; Web `tsc` + `lint` + `build`. Validação manual (quickstart US1).

**Checkpoint**: erros de produção capturados e correlacionados ao deploy.

---

## Phase 4: User Story 3 — Scrub + config segura (P2)

**Goal**: nenhum cookie/Authorization/senha sai nos eventos; sem DSN não envia nada.

**Independent Test**: erro em rota de auth autenticada → evento sem dados sensíveis; sem DSN → zero envio.

- [ ] T018 [US3] Confirmar `beforeSend: scrubEvent` ligado nos dois inits (API `instrument.ts` e Web client/server) e `sendDefaultPii:false` em ambos.
- [ ] T019 [US3] (validação) Quickstart US3: provocar erro autenticado e inspecionar o evento (sem `Cookie`/`Authorization`/`password`); rodar sem DSN e confirmar **zero** envio.

**Checkpoint**: telemetria saneada e segura por padrão.

---

## Phase 5: User Story 2 — Tracing de performance (P2)

**Goal**: transações amostradas mostram rotas/queries lentas.

**Independent Test**: gerar tráfego → transações com spans de rota + consulta ao banco; ajustar sample rate por env muda o volume.

- [ ] T020 [US2] Confirmar `tracesSampleRate` (env, default dev 1.0/prod 0.1) ativo na API e no Web; validar spans de rota + consulta (auto-instrumentação OTel do `@sentry/node`).
- [ ] T021 [P] [US2] (Opcional) Upload de sourcemaps do Web no CI via `withSentryConfig` + `SENTRY_AUTH_TOKEN` (secret) — não bloqueante (sem token, build segue).

**Checkpoint**: performance observável por dados reais.

---

## Phase 6: User Story 4 — Uptime externo (P3)

**Goal**: indisponibilidade total de um domínio é detectada/notificada externamente.

**Independent Test**: derrubar um domínio → monitor externo notifica em poucos minutos.

- [ ] T022 [US4] `api/DEPLOY.md`: seção "Uptime externo" — monitor gratuito (UptimeRobot/Better Stack) em `https://api.<dominio>/health/live` e `https://app.<dominio>/`, com notificação; distinção host-vs-app via health checks.

**Checkpoint**: rede de segurança final documentada.

---

## Phase 7: Polish & validação final

- [ ] T023 Rodar verificação consolidada (API `tsc`+`test`; Web `tsc`+`lint`+`build`; `audit`) e registrar evidência verde.
- [ ] T024 Atualizar status do spec/plan 005 e o marcador SPECKIT do `CLAUDE.md` para concluído.

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
