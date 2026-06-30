# Implementation Plan: Observabilidade de Produção

**Branch**: `feat/horarios-controle-total` | **Date**: 2026-06-29 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/005-observabilidade/spec.md`

## Summary

Dar visibilidade de **erros** e **performance** em produção (API Fastify + Web Next 16) com o menor
peso operacional na VPS única: **Sentry (SaaS)** para captura de erros + tracing, em vez de stack
auto-hospedado. SDK Node (`@sentry/node`, v8+ — **baseado em OpenTelemetry**, atende a portabilidade) na
API e `@sentry/nextjs` no Web. **Scrub** de dados sensíveis por padrão (`sendDefaultPii: false`) +
`beforeSend` para garantir que cookie/`Authorization`/corpo de auth nunca saiam. **Gate por DSN**: sem
credencial, init vira no-op (nada enviado — dev/local seguro). **Release** = SHA do deploy. Logs seguem
no **pino** (sem mudança). **Uptime** externo dos domínios via serviço gratuito (documentação). Nova dep
(`@sentry/*`) = **exceção de stack aprovada** (C6) — registrada.

## Technical Context

**Language/Version**: TypeScript 5.x (`strict`).

**Primary Dependencies (novas — exceção de stack)**:
- API: `@sentry/node` (última major v8+/v9 — OTel-based; `setupFastifyErrorHandler`).
- Web: `@sentry/nextjs` (casada com Next 16.2.x; `withSentryConfig`, `instrumentation.ts`).
- Versões exatas fixadas na implementação via Context7/npm (C7).

**Storage**: N/A (telemetria vai para o Sentry SaaS; sem mudança de schema/DB).

**Testing**: Vitest. Alvos de TDD: função de **scrub** (`beforeSend`, pura) e **gate por DSN**
(config). Captura real = validação manual/quickstart (provocar erro → ver no painel).

**Target Platform**: VPS (Docker + Caddy). Sentry SaaS externo.

**Project Type**: Web (API Fastify + Web Next.js).

**Constraints**: stack congelada + **exceção aprovada** para `@sentry/*` (C6/C7); falha de telemetria
**não** pode derrubar a app (best-effort/async); não contornar o redact de logs; DSN/sampling só por env
validada.

**Decisões do dev (fixadas)**: Sentry SaaS; sem self-host Grafana; logs no pino; uptime externo leve.

**NEEDS CLARIFICATION**: nenhum (fornecedor e escopo decididos; taxas de amostragem têm default
sensato — dev 1.0 / prod 0.1 — ajustável por env).

## Constitution Check

| Princípio | Status | Nota |
|---|---|---|
| I. Anti-Alucinação | ✅ | C7 aplicado (Context7: setup Next/Node, `sendDefaultPii`, `tracesSampleRate`, beforeSend). Versões exatas pinçadas no impl. |
| II. TDD | ✅ | Scrub e gate-por-DSN testados (RED→GREEN). Captura real = quickstart manual. |
| III. Stack Congelada | ⚠️→✅ | **Exceção aprovada**: `@sentry/node` + `@sentry/nextjs` (decisão do dev; registrada no plano/constituição). Sem outras libs. |
| IV. Layered | ✅ | Instrumentação na borda (server bootstrap / app.ts / next config), não na regra. Scrub é util puro. |
| V. Segurança/Multi-tenant | ✅ | `sendDefaultPii:false` + beforeSend (sem cookie/Authorization/senha); DSN por env; não toca `tenantId` nem o redact de logs. |
| VI. Fonte Única | ✅ | Spec/plan em `specs/005-…`; exceção de stack registrada; CLAUDE.md aponta para o plano. |

**Exceção de stack (C6) a confirmar:** adicionar `@sentry/node` e `@sentry/nextjs`. Justificativa:
observabilidade de produção sem auto-hospedar; SDK Node é OTel-based (portável). → registrar em
`.specify/memory/constitution.md` (§Exceções) e `CLAUDE.md` raiz.

## Project Structure

### Documentation (this feature)

```text
specs/005-observabilidade/
├── plan.md · research.md · data-model.md · quickstart.md · contracts/ · tasks.md (via /speckit-tasks)
```

### Source Code (arquivos tocados)

```text
api/
├── src/
│   ├── instrument.ts          # NOVO: Sentry.init (importado 1º em server.ts), gate por DSN
│   ├── server.ts              # importa ./instrument.js ANTES de tudo
│   ├── app.ts                 # Sentry.setupFastifyErrorHandler(app) quando habilitado
│   ├── config.ts              # SENTRY_DSN, SENTRY_TRACES_SAMPLE_RATE, SENTRY_ENVIRONMENT, SENTRY_RELEASE
│   └── observability/scrub.ts # NOVO: beforeSend puro (remove cookie/authorization/senha)
└── tests/unit/
    ├── scrub.test.ts          # NOVO (TDD): scrub remove campos sensíveis
    └── config.test.ts         # + casos de sentry (gate por DSN)

web/
├── next.config.ts             # withSentryConfig (wrap) — release/sourcemaps
├── instrumentation.ts         # NOVO: register() do Sentry (server/edge) + onRequestError
├── instrumentation-client.ts  # NOVO: Sentry client init (gate por NEXT_PUBLIC_SENTRY_DSN)
└── (Error Boundaries já existem — captureException integra)

(infra/doc)
├── api/.env.example · web/.env.example  # chaves SENTRY_*
├── api/DEPLOY.md                        # seção de uptime externo (monitor + health checks)
└── .github/workflows/deploy.yml         # SENTRY_RELEASE=SHA; sourcemaps opcional (SENTRY_AUTH_TOKEN)
```

**Structure Decision**: instrumentação isolada em arquivos de borda (`instrument.ts`/`instrumentation*.ts`)
+ um util puro de scrub testável. Nenhuma mudança na camada de regra (services) nem no schema.

## Fases de implementação (por prioridade — TDD)

### Fase 1 — US1: Erros visíveis (P1) 🎯 MVP
1. **API**: `config.ts` (bloco `sentry` por env, null sem DSN); `src/instrument.ts` (`Sentry.init` com
   `environment`/`release`/`tracesSampleRate`/`sendDefaultPii:false`, só se DSN); importar em `server.ts`
   **antes** do app; `setupFastifyErrorHandler` em `app.ts`.
2. **Web**: instalar `@sentry/nextjs`; `instrumentation.ts` + `instrumentation-client.ts` (gate por
   `NEXT_PUBLIC_SENTRY_DSN`); `withSentryConfig` no `next.config.ts`; `onRequestError` (App Router) +
   integração com as Error Boundaries existentes.
3. **Release**: `SENTRY_RELEASE`=SHA (API) e `NEXT_PUBLIC_APP_VERSION`/build SHA (Web); env/`deploy.yml`.

### Fase 2 — US3: Scrub + config segura (P2) — feita junto da Fase 1 por segurança
1. (TDD-RED) `tests/unit/scrub.test.ts`: evento com `Cookie`/`Authorization`/senha → saneado.
2. `src/observability/scrub.ts` (`beforeSend` puro) + ligar no `Sentry.init` (API e Web).
3. `config.ts`: validar `SENTRY_*` por zod; ausência de DSN = desligado (teste).

### Fase 3 — US2: Tracing de performance (P2)
1. `tracesSampleRate` por env (default dev 1.0 / prod 0.1) na API e no Web; confirmar spans de rota +
   consulta ao banco (auto-instrumentação OTel do `@sentry/node`).
2. (Opcional) upload de sourcemaps do Web no CI (`SENTRY_AUTH_TOKEN`) para stack trace legível — atrás
   de secret, não bloqueante.

### Fase 4 — US4: Uptime externo (P3)
1. `DEPLOY.md`: seção "Uptime externo" — monitor gratuito (ex.: UptimeRobot/Better Stack) apontando
   para `https://api.<dominio>/health/live` e `https://app.<dominio>/`, com notificação.

## Verificação (gate)
`pnpm -C api exec tsc --noEmit` · `pnpm -C api test` (scrub + config) · `pnpm -C web exec tsc --noEmit` ·
`pnpm -C web lint` · `pnpm -C web build` · validação manual (quickstart): provocar erro em API e Web e
ver no painel; inspecionar um evento de rota de auth (sem cookie/Authorization/senha); rodar sem DSN e
confirmar **zero** envio.

## Out of Scope (ver spec)
Stack Grafana auto-hospedado; APM pesado/profiling; alerting avançado; métricas de negócio/dashboards
customizados; session replay.
