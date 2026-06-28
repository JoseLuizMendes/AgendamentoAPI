---
description: "Task list — Observabilidade de Frontend (caseira)"
---

# Tasks: Observabilidade de Frontend (caseira)

**Input**: Design em `specs/001-observabilidade-frontend/` (plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md)

**Tests**: incluídos (TDD pedido) — endpoint via `app.inject` e `reportClientError` no Vitest. Os Error Boundaries/listeners são verificados por `tsc`/`lint` + teste manual.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: pode rodar em paralelo (arquivos diferentes, sem dependência)
- **[Story]**: US1 (Error Boundary) / US2 (reporte de erros)
- Caminhos de arquivo são absolutos a partir da raiz do repo.

## Path Conventions

- Backend: `api/src/...`, `api/tests/...`
- Frontend: `web/src/...`

---

## Phase 1: Setup

**Purpose**: configuração compartilhada mínima.

- [ ] T001 [P] Adicionar `NEXT_PUBLIC_APP_VERSION` em `web/.env.local` (ex.: short SHA do deploy) e registrar a var no deploy (`.specify/memory/project-context.md` §9) — usada como `appVersion` nos reports.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: nenhum bloqueio real — **US1 (fallback) e US2 (reporte) são independentes**. US1 entrega valor sem backend; US2 adiciona a visibilidade. Seguir direto para as stories.

**Checkpoint**: pode iniciar US1 e US2 (US2 pode começar em paralelo, mas o "ligar boundary↔reporter" depende de US1 existir).

---

## Phase 3: User Story 1 - App não dá "tela branca" (Priority: P1) 🎯 MVP

**Goal**: quando um componente quebra, o usuário vê um fallback amigável (não a tela branca) com ação de recuperação.

**Independent Test**: forçar `throw new Error("boom")` numa rota → aparece o fallback + botão "tentar de novo"; o resto do app não cai.

### Implementation for User Story 1

- [ ] T002 [P] [US1] Criar `web/src/app/error.tsx` (`"use client"`, props `{ error, reset }`): fallback amigável com tokens (sem hex) + botão que chama `reset()`. Sem reporte ainda.
- [ ] T003 [P] [US1] Criar `web/src/app/global-error.tsx` (`"use client"`, renderiza próprio `<html><body>`): fallback do root layout + botão recarregar.
- [ ] T004 [US1] Verificar US1: `pnpm -C web exec tsc --noEmit` + `pnpm -C web lint`; teste manual (forçar erro numa rota → fallback; root → global-error). (depende T002, T003)

**Checkpoint**: US1 funcional e testável sozinha (MVP — já elimina o white-screen).

---

## Phase 4: User Story 2 - Erros do navegador visíveis para o dev (Priority: P2)

**Goal**: erros (render + globais) são reportados para a API e registrados nos logs do servidor, com `appVersion`.

**Independent Test**: disparar um erro no navegador → `POST /client-errors` retorna 204 e há uma linha de log no servidor; reporter nunca derruba a app.

### Tests for User Story 2 (TDD — escrever PRIMEIRO, devem FALHAR) ⚠️

- [ ] T005 [P] [US2] Teste do endpoint em `api/tests/unit/client-errors.test.ts` (via `app.inject`, sem DB): body válido → 204; sem `message` → 400; 31ª req no IP → 429. (espelha `api/tests/unit/login-rate-limit.test.ts` para o 429)
- [ ] T006 [P] [US2] Teste do reporter em `web/src/lib/report-error.test.ts` (Vitest, mock de `fetch`): faz `POST /client-errors` com o shape do contrato; **engole** rejeição de rede sem propagar.

### Implementation for User Story 2

- [ ] T007 [US2] Adicionar `ClientErrorSchema` (+ `z.infer`) em `api/src/schemas/index.ts` conforme `data-model.md` (`message` obrigatório; `stack`/`componentStack`/`url`/`userAgent`/`appVersion`/`kind` opcionais com máximos; `kind` enum). (faz parte de T005 passar)
- [ ] T008 [US2] Criar `api/src/routes/client-errors.ts` (`POST /client-errors` público, `config.rateLimit { max: 30, timeWindow: "1 minute" }`, valida com `ClientErrorSchema`, `req.log.error({ clientError, ip }, "client error")`, responde 204). (depende T007)
- [ ] T009 [US2] Registrar `clientErrorsRoutes` em `api/src/app.ts` e adicionar `"/client-errors"` à allowlist pública em `api/src/plugins/auth.ts`. (depende T008; faz T005 ficar verde)
- [ ] T010 [US2] Implementar `web/src/lib/report-error.ts` — `reportClientError(payload)`: `fetch` fire-and-forget para `${NEXT_PUBLIC_API_URL}/client-errors`, `try/catch` silencioso (nunca lança), inclui `appVersion`, guarda contra loop. (faz T006 ficar verde)
- [ ] T011 [P] [US2] Criar `web/src/components/observability/client-error-listeners.tsx` (`"use client"`): `useEffect` registra `window.addEventListener("error"|"unhandledrejection")` → `reportClientError({ kind: "unhandled"|"rejection" })`; cleanup no unmount. (depende T010)
- [ ] T012 [US2] Montar `<ClientErrorListeners/>` no `web/src/app/layout.tsx`. (depende T011)
- [ ] T013 [US2] Ligar as boundaries ao reporter: em `web/src/app/error.tsx` e `global-error.tsx`, `useEffect` chama `reportClientError({ message, stack, componentStack, kind: "render" })`. (depende T010 + T002/T003)
- [ ] T014 [US2] Verificar US2: `pnpm -C api test` (client-errors verde) + `pnpm -C api exec tsc -p tsconfig.json --noEmit` + `pnpm -C web test` (report-error verde) + `pnpm -C web exec tsc --noEmit` + `pnpm -C web lint`.

**Checkpoint**: US1 e US2 funcionam de forma independente.

---

## Phase 5: Polish & Cross-Cutting

- [ ] T015 [P] Docs: atualizar `web/CLAUDE.md` (transport/observabilidade) e `.specify/memory/project-context.md` (endpoint `/client-errors` + `NEXT_PUBLIC_APP_VERSION`).
- [ ] T016 Rodar `quickstart.md`: `curl` → 204 + linha de log; forçar erro no navegador → log com `appVersion` (`kind` render/rejection).

---

## Dependencies & Execution Order

- **Setup (T001)**: sem dependência.
- **US1 (T002–T004)**: independente; entrega o MVP (fim do white-screen).
- **US2 (T005–T014)**: backend (T007→T008→T009) e reporter (T010) podem andar em paralelo; T013 (ligar boundary↔reporter) depende de US1 (T002/T003) + T010.
- **Polish (T015–T016)**: depois de US1 + US2.

### Dentro de cada story (TDD)
- Testes (T005, T006) escritos e **falhando** antes da implementação.
- Schema antes da rota; rota antes do registro; reporter antes dos listeners/wiring.

### Parallel Opportunities
- T002 ‖ T003 (arquivos diferentes).
- T005 ‖ T006 (backend vs web).
- Backend (T007–T009) ‖ reporter (T010–T011), até o wiring T013.

---

## Implementation Strategy

### MVP primeiro (US1)
1. T001 (setup) → 2. US1 (T002–T004) → **valida sem white-screen** → já entregável.

### Incremental
1. US1 (MVP) → demo.
2. US2 (reporte + endpoint) → demo (agora com visibilidade no servidor).
3. Polish (docs + quickstart).

---

## Notes
- `[P]` = arquivos diferentes, sem dependência.
- TDD: confirmar que T005/T006 falham antes de implementar (C5).
- Commit após cada task ou grupo lógico.
- Zero dependência nova (Constituição §III); cores via token; rota fina sem DB.
