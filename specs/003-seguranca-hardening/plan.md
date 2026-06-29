# Implementation Plan: Segurança & Hardening

**Branch**: `feat/horarios-controle-total` | **Date**: 2026-06-28 | **Spec**: [spec.md](./spec.md)

## Summary

Fechar os furos de segurança da API em **fases incrementais** (TDD, verde antes da próxima),
sem trocar a stack. Fase 1 (anti-brute-force + hardening) **sem dependência nova**; Fase 2 (email)
usa **Resend via `fetch`** na REST API (sem pacote npm novo — só `RESEND_API_KEY`). Tokens guardados
como **hash** no banco. Arquitetura mantida: `routes` (fino) → `services` (regra) → Prisma; erros via
`utils/errors`; config só por `config.ts` (zod). Campo novo ⇒ migration aditiva.

## Technical Context

**Language/Version**: TypeScript 5.x (`strict`)
**Backend**: Fastify 5 + Zod + Prisma 7/Postgres (Neon); bcryptjs; pino. **Frontend**: Next 16 + React 19.
**Email**: Resend (REST via `fetch`); sem credencial → modo dev (loga o link).
**Testing**: Vitest (unit com Prisma mockado / `app.inject`); Playwright (páginas web).
**Constraints**: stack congelada (C6); TDD (C5); zero hex no web; multi-tenant por `tenantId`.

## Constitution Check

| Princípio | Status | Nota |
|---|---|---|
| I. Anti-Alucinação | ✅ | Design do spec aprovado; Context7 consultado p/ Fastify (405) e Resend. |
| II. TDD | ✅ | RED→GREEN em cada fatia; evidência (tsc + testes verdes). |
| III. Stack Congelada | ✅ | **Zero dep nova** — Resend via `fetch`; reusa bcrypt/pino/Fastify/Prisma. |
| IV. Layered | ✅ | Regra nos services (`auth`, `auth-tokens`, `mail`, `idempotency`); rotas finas. |
| V. Segurança/Multi-tenant | ✅ | Lockout/verify/reset escopados por `tenantId`; tokens com hash; anti-enumeração. |
| VI. Fonte Única | ✅ | Spec em `specs/003-…`; princípios na constitution. |

## Fases (todas implementadas e verdes)

### Fase 1a — Timing oracle (login)
`login` em [services/auth.ts](../../api/src/services/auth.ts) roda **sempre um** `bcrypt.compare`
(hash real ou `DUMMY_HASH`). Teste: [auth-timing.test.ts](../../api/tests/unit/auth-timing.test.ts).

### Fase 1b — Lockout de conta (DB)
`User.failedLoginAttempts/lockedUntil` (migration `20260628000000_account_lockout`);
`TooManyRequestsError` (429); helper puro `computeLockout`; limiares em `config.ts`
(`LOGIN_MAX_ATTEMPTS`/`LOGIN_LOCK_MINUTES`). Testes: [auth-lockout.test.ts](../../api/tests/unit/auth-lockout.test.ts).

### Fase 1c — Hardening
`bodyLimit` (512 KB → 413) em [app.ts](../../api/src/app.ts); **Idempotency-Key** no booking
([services/idempotency.ts](../../api/src/services/idempotency.ts) + migration `20260628010000_idempotency_key`);
`pnpm audit` no [CI](../../.github/workflows/ci.yml). Testes: `body-limit` + `idempotency`.

### Fase 2 — Email (verificação + reset)
[services/mail.ts](../../api/src/services/mail.ts) (Resend via `fetch` + fallback dev) e
[services/auth-tokens.ts](../../api/src/services/auth-tokens.ts) (hash SHA-256, uso único, expiração).
Fluxos em `auth.ts` (signup envia verificação; `verifyEmail`, `requestPasswordReset` anti-enumeração,
`resetPassword`). 4 rotas públicas em [routes/auth.ts](../../api/src/routes/auth.ts) + allowlist + schemas;
migration `20260628020000_email_verification_reset` (`User.emailVerifiedAt` + `AuthToken`).
Frontend: páginas `/forgot-password`, `/reset-password`, `/verify-email` (AuthShell + `apiRequest`).
Config: `RESEND_API_KEY`/`RESEND_FROM`/`APP_BASE_URL`. Testes: `auth-tokens`, `auth-email`, `mail`, `auth-email-routes`.

## Verificação
`pnpm -C api exec tsc --noEmit` · `pnpm -C api test` (96 verdes) · `pnpm -C web exec tsc --noEmit` ·
`pnpm -C web lint` · `pnpm -C api test:integration` (lockout/idempotency no CI). Migrations aplicadas
com `prisma migrate deploy`.

## Out of scope
WAF/anti-DDoS na borda (Cloudflare — config de infra); observabilidade (serviço externo);
resistência total à enumeração no login (lockout responde 429 — trade-off registrado no spec).
