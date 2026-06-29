# Implementation Plan: Observabilidade de Frontend (caseira)

**Branch**: `feat/horarios-controle-total` | **Date**: 2026-06-27 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/001-observabilidade-frontend/spec.md`

## Summary

Capturar erros do navegador sem dependência nova nem serviço externo: **Error Boundary** do Next
(fallback amigável, sem tela branca) + **captura global** (`window.onerror`/`unhandledrejection`) +
um **reporter fire-and-forget** que envia para `POST /client-errors` na própria Fastify, que valida
(Zod) e **loga via pino** (com o `redact` já existente), sem tocar no banco. Escopo: só erros
(Web Vitals depois). Inclui `appVersion` para rastrear o deploy.

## Technical Context

**Language/Version**: TypeScript 5.x (`strict`)

**Primary Dependencies**: Backend — Fastify 5, Zod (`fastify-type-provider-zod`), pino,
`@fastify/rate-limit` (já instalados). Frontend — Next.js 16 (App Router) + React 19 (recursos
nativos: `error.tsx`/`global-error.tsx`). **Nenhuma dependência nova** (Constituição §III respeitada;
sem exceção C6, sem Context7).

**Storage**: N/A — o endpoint só registra via pino (sem persistência em banco).

**Testing**: Vitest. Backend: `tests/unit/client-errors.test.ts` via `app.inject` (sem DB).
Frontend: `web` Vitest para `report-error.ts`. `error.tsx`/listener verificados por `tsc`/`lint` +
teste manual (forçar erro).

**Target Platform**: Node.js (API na VPS) + navegadores (web Next).

**Project Type**: Web application (monorepo `api/` backend + `web/` frontend).

**Performance Goals**: report **não bloqueia** a UI (fire-and-forget); endpoint barato (sem I/O de
banco). Reporter resiliente: nunca lança, nunca entra em loop.

**Constraints**: público (erros podem ocorrer antes do login) porém **rate-limited** (30/min/IP);
sem PII além dos campos controlados; `redact` de headers no log; tamanho máximo por campo.

**Scale/Scope**: baixo volume. ~1 endpoint + schema no backend; ~2 Error Boundaries + 1 reporter +
1 listener no frontend.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Princípio | Status | Nota |
|---|---|---|
| I. Anti-Alucinação | ✅ | Design vem do spec aprovado; `error.tsx`/`global-error.tsx` são recursos nativos do Next (sem lib nova → sem Context7). |
| II. TDD (NÃO-NEGOCIÁVEL) | ✅ | Teste antes: endpoint (204/400/429 via `app.inject`) e `reportClientError` (Vitest). |
| III. Stack Congelada | ✅ | **Zero dependência nova.** Reusa Fastify/Zod/pino/rate-limit + Next/React. |
| IV. Layered | ✅ | Rota fina (valida + loga); sem regra de negócio; sem Prisma. |
| V. Segurança & Multi-tenancy | ✅ | Público (pré-login) + rate limit + redact + sem PII + sem DB. Não há dado de tenant a escopar. |
| VI. Fonte Única | ✅ | Spec em `specs/`; princípios na constitution; sem conflito C4. |

**Resultado: PASS** — sem violações. Complexity Tracking vazio.

## Project Structure

### Documentation (this feature)

```text
specs/001-observabilidade-frontend/
├── plan.md              # Este arquivo
├── research.md          # Fase 0
├── data-model.md        # Fase 1
├── quickstart.md        # Fase 1
├── contracts/           # Fase 1 (contrato do endpoint)
└── tasks.md             # Fase 2 (/speckit-tasks — não criado aqui)
```

### Source Code (repository root)

```text
api/
├── src/
│   ├── routes/client-errors.ts        # NOVO: POST /client-errors (rota fina)
│   ├── schemas/index.ts               # + ClientErrorSchema (request) + 204
│   ├── plugins/auth.ts                # + "/client-errors" na allowlist pública
│   └── app.ts                         # registra clientErrorsRoutes
└── tests/unit/client-errors.test.ts   # NOVO: 204 / 400 / 429 via app.inject

web/
├── src/
│   ├── app/
│   │   ├── error.tsx                   # NOVO: boundary das rotas (fallback + reset)
│   │   ├── global-error.tsx            # NOVO: boundary do root layout
│   │   └── layout.tsx                  # monta <ClientErrorListeners/>
│   ├── components/observability/
│   │   └── client-error-listeners.tsx  # NOVO: window error/unhandledrejection
│   └── lib/
│       ├── report-error.ts             # NOVO: reportClientError (fire-and-forget)
│       └── report-error.test.ts        # NOVO: Vitest (shape + nunca lança)
```

**Structure Decision**: Web application (monorepo `api/` + `web/`). O backend ganha 1 rota fina +
schema; o frontend ganha as duas Error Boundaries do App Router, o reporter puro em `lib/` e um
listener client montado no root `layout.tsx`. Segue os diretórios e convenções já existentes (ver
`project-context.md` §2/§7).

## Complexity Tracking

> Sem violações de constituição — nada a justificar.
