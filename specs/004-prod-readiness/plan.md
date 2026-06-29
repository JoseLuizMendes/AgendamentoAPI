# Implementation Plan: Prod-Readiness & Hardening Final

**Branch**: `feat/horarios-controle-total` | **Date**: 2026-06-29 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/004-prod-readiness/spec.md`

## Summary

Fechar as arestas de produção apontadas na auditoria de 2026-06-29 e colocar **API + Web inteiros numa
VPS** (Docker + Caddy, sem Vercel), em **fases incrementais TDD**, ordenadas pela prioridade das user
stories. Sem trocar a stack (C6): atualizações de versão dentro do canon (Fastify 5.x, Next 16.x,
Prisma 7), dockerização do Web com `output:'standalone'`, roteamento de 2 domínios no Caddy, headers de
segurança via `next.config`, gate de rota no Web (proxy/middleware otimista por cookie), endurecimento
da sessão (token fora do body, JWT de 2 dias, Swagger fora de produção) e higiene de repo/infra
(lockfile único, remoção do Redis ocioso, `.env.example`, audit bloqueante, doc de backup/rollback).
**Sem Redis** nesta fase (decisão do dev); risco de sessão vazada mitigado por janela de validade curta.

## Technical Context

**Language/Version**: TypeScript 5.x (`strict: true`).

**Primary Dependencies**:
- API: Fastify **5.8.x** (≥5.8.5), `@fastify/jwt` 10.x (resolvendo `fast-jwt` ≥6.2.4), `@fastify/helmet`,
  `@fastify/cors`, `@fastify/rate-limit`, `@fastify/swagger(-ui)`, Prisma 7, Zod 4, bcryptjs, luxon.
- Web: Next.js **16.2.9** (≥16.2.6), React 19, @tanstack/react-query, Tailwind v4, Radix, ECharts.

**Storage**: PostgreSQL (Neon) via Prisma 7 + `@prisma/adapter-pg`. Sem mudança de schema (a limpeza de
tokens efêmeros é operacional, não estrutural).

**Testing**: Vitest (unit + integração API; unit de lógica pura no Web) + Playwright (E2E/visual).

**Target Platform**: VPS Linux (Ubuntu) com Docker + Docker Compose; borda Caddy 2 (HTTPS automático).

**Project Type**: Web (API Fastify + Web Next.js), monorepo leve (`api/`, `web/`).

**Performance Goals**: sem regressão; o foco é segurança/operação, não throughput.

**Constraints**: stack congelada (C6); TDD (C5/C2); zero hex no Web; multi-tenant por `tenantId`;
config só por `config.ts` (zod) na API; fetch só por React Query no Web.

**Scale/Scope**: instância única da API (sem escala horizontal nesta fase — ver Out of Scope do spec).

**Decisões do dev (fixadas)**: hospedagem inteira na VPS; sem Redis agora; **JWT = 2 dias**; domínios
`app.<dominio>` (Web) e `api.<dominio>` (API) como variáveis de ambiente de deploy.

**NEEDS CLARIFICATION**: nenhum (domínios e expiração resolvidos por decisão do dev; valores concretos
de domínio entram como env no deploy, não no código).

## Constitution Check

*GATE: passa antes do Phase 0; re-checado após o design.*

| Princípio | Status | Nota |
|---|---|---|
| I. Anti-Alucinação | ✅ | C7 aplicado: Context7 consultado p/ Next 16.2.9 (standalone/headers/proxy). Demais libs fixadas pela versão corrigida do `pnpm audit` + Context7 no momento da implementação. Sem invenção de API. |
| II. TDD | ✅ | Cada fatia RED→GREEN→REFACTOR; evidência (`tsc`/`lint`/`test`/`audit`). Mudanças de contrato (token fora do body) começam por teste. |
| III. Stack Congelada | ✅ | **Zero dep nova**; só atualização de versão dentro do canon. Remoção do Redis (não usado). Caddy/Docker já no projeto. |
| IV. Layered | ✅ | Mudanças respeitam camadas; rotas finas, regra nos services. Headers/CSP em config de plugin, não em service. |
| V. Segurança/Multi-tenant | ✅ | Endurece sessão (httpOnly only, JWT curto), CSP, headers, gate de rota. `tenantId` intocado. Secrets só em env. |
| VI. Fonte Única | ✅ | Spec/plan em `specs/004-…`; princípios na constitution; CLAUDE.md aponta para o plano. |

**Sem violações** → sem Complexity Tracking.

## Project Structure

### Documentation (this feature)

```text
specs/004-prod-readiness/
├── plan.md              # Este arquivo
├── research.md          # Phase 0 — decisões (versões, abordagens)
├── data-model.md        # Phase 1 — entidades (sem mudança de schema)
├── quickstart.md        # Phase 1 — roteiro de validação
├── contracts/           # Phase 1 — mudança de contrato da resposta de auth
└── tasks.md             # Phase 2 — gerado pelo /speckit-tasks (não aqui)
```

### Source Code (arquivos tocados, por área)

```text
api/
├── src/
│   ├── app.ts                 # Swagger condicional (fora de prod); CSP endurecida; CORS revisado
│   ├── config.ts              # JWT_EXPIRES_IN default "2d"; (cookie maxAge derivado)
│   ├── routes/auth.ts         # remover `token` do corpo de /login e /signup; cookie maxAge 2d
│   └── services/…             # (limpeza opcional de tokens efêmeros — job/SQL)
├── Dockerfile                 # (sem mudança estrutural)
├── docker-compose.yml         # remover serviço `redis` + depends_on
├── Caddyfile                  # 2º bloco: app.<dominio> -> web:3000
├── .env.example               # criar (hoje só o web tem)
└── prisma/…                   # sem migration nova (limpeza é operacional)

web/
├── next.config.ts             # output:'standalone'; headers() de segurança; poweredByHeader:false
├── src/proxy.ts (ou middleware.ts)  # gate otimista por cookie em /[tenant]/*
├── Dockerfile                 # criar (build standalone, non-root)
├── .dockerignore              # criar
└── src/app/dashboard/page.tsx # migrar p/ React Query ou remover (legado)

(raiz)
├── .gitignore                 # criar na raiz
├── package-lock.json          # remover (raiz e api/) — canon pnpm
└── .github/workflows/ci.yml   # adicionar job do Web (typecheck+lint+build+test); audit bloqueante crítico
└── .github/workflows/deploy.yml # build/publish da imagem do Web; doc de rollback de migration
```

**Structure Decision**: monorepo leve existente (`api/` + `web/`) mantido. O Web ganha empacotamento
próprio (Dockerfile standalone) e passa a ser um serviço no `docker-compose.yml`, roteado pelo Caddy
junto da API. Nenhuma reorganização de pastas.

## Fases de implementação (ordenadas por prioridade das user stories — TDD)

> Cada fase é uma fatia independente, verde antes da próxima (C5/C2). Detalhe de decisões em
> [research.md](./research.md); validação em [quickstart.md](./quickstart.md).

### Fase 1 — US1: Zero CVEs em dependências (P1)
1. **API**: bump `fastify` ≥5.8.5, `@fastify/jwt` (resolver `fast-jwt` ≥6.2.4), `@fastify/swagger-ui`/
   `@fastify/static`; se transitivos (`ajv`/`fast-uri`/`fast-jwt`) não subirem, usar `pnpm.overrides`.
   `pnpm audit` runtime crítico = 0. Rodar `tsc` + unit + integração (verdes).
2. **Web**: bump `next` → 16.2.9 e `eslint-config-next` casado; `postcss` ≥8.5.10 (override se transitivo).
   `pnpm audit` + `tsc` + `build` + vitest verdes.

### Fase 2 — US2: App inteiro na VPS com HTTPS (P1)
1. `web/next.config.ts`: `output:'standalone'`. Criar `web/Dockerfile` (multi-stage, non-root) + `.dockerignore`.
2. `docker-compose.yml`: adicionar serviço `web` (expose 3000, sem porta no host). `Caddyfile`: bloco
   `app.<dominio> -> web:3000` (api fica `api.<dominio> -> api:3000`).
3. Env: `CORS_ORIGIN` inclui `https://app.<dominio>`; `NEXT_PUBLIC_API_URL=https://api.<dominio>`.
4. **CI**: novo job `web` (typecheck + lint + build + vitest). **Deploy**: build/publish da imagem do Web.

### Fase 3 — US3: Superfície de auth/navegador endurecida (P2)
1. **Token fora do body** (TDD: teste de contrato primeiro): `routes/auth.ts` remove `token` da resposta
   de `/login` e `/signup`; ajustar schemas de resposta. Cookie `maxAge` = 2 dias.
2. **JWT 2 dias**: `config.ts` `JWT_EXPIRES_IN` default `"2d"`.
3. **Swagger fora de produção**: registrar `swagger`/`swagger-ui` só quando `!config.isProduction`
   (ou atrás de basic-auth) em `app.ts`; ajustar a allowlist de rotas públicas/`onRequest`.
4. **Headers do Web**: `next.config.ts` `headers()` (HSTS, X-Frame-Options DENY, X-Content-Type-Options
   nosniff, Referrer-Policy, Permissions-Policy) + `poweredByHeader:false`.
5. **Gate de rota** (`web/src/proxy.ts` ou `middleware.ts`): redireciona visitante sem cookie de sessão
   em `/[tenant]/*` para `/login` (otimista — só presença do cookie; autorização real segue na API).
6. **CSRF**: avaliar `SameSite=strict` no workspace ou token anti-CSRF; decisão registrada em research.

### Fase 4 — US4: Repo/operação confiáveis (P3)
1. Remover `package-lock.json` (raiz e `api/`). Criar `.gitignore` raiz + `api/.env.example`.
2. `docker-compose.yml`: remover serviço `redis` + `depends_on`. Registrar decisão (research/CLAUDE).
3. **CI**: `pnpm audit` bloqueante em `--audit-level=critical` (após zerar os atuais).
4. **Deploy doc**: estratégia de backup (Neon branch/snapshot) e rollback de migration no `DEPLOY.md`.

### Fase 5 — US5: Polimento final (P3)
1. CSP da API endurecida (remover `unsafe-inline`/unpkg/jsdelivr, agora que o Swagger sai de prod).
2. Revisar CORS (`!origin → true`). TTL/limpeza de `IdempotencyKey`/`AuthToken` (cron SQL/script).
3. Migrar/remover `app/dashboard/page.tsx` legado (fetch em client component → React Query ou exclusão).
4. Modernizações de front: `dvh`/viewport dinâmico, `focus-visible`, `prefers-reduced-motion` onde fizer sentido.

## Verificação (gate por fase)

`pnpm -C api exec tsc -p tsconfig.json --noEmit` · `pnpm -C api test` · `pnpm -C api test:integration` ·
`pnpm -C api audit` · `pnpm -C web exec tsc --noEmit` · `pnpm -C web lint` · `pnpm -C web build` ·
`pnpm -C web test` · `pnpm -C web audit`. Validação ponta a ponta no [quickstart.md](./quickstart.md).

## Out of Scope (ver spec)

Observabilidade (→ 005); WAF/anti-DDoS gerenciado na borda; refresh token/denylist (depende de Redis);
escala horizontal/rate-limit distribuído; resistência total à enumeração no login (trade-off do 003).
