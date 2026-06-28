# AgendamentoAPI — Project Context (mapa consolidado)

> Conhecimento estrutural do projeto, do pequeno ao grande, num só lugar. **Princípios** vivem em
> `constitution.md`; **designs de feature** em `specs/NNN-*/`. Os `CLAUDE.md` por pasta são o
> **detalhe vivo** — este arquivo os mapeia e resume, sem duplicar verbatim. Em divergência, vale o
> CLAUDE.md da pasta + a constitution (C4: na dúvida, pare e pergunte).

## 1. Visão geral

SaaS de **agendamento multi-tenant** para estabelecimentos (clínicas, salões, etc.). O dono/staff
gerencia serviços, horários de funcionamento e a agenda; clientes finais podem se auto-agendar
(quando a tenant habilita). Monorepo com dois apps: **`api/`** (REST) e **`web/`** (painel + telas
públicas de marca).

## 2. Estrutura do repositório

```
AgendamentoAPI/
├── api/                      # Backend Fastify 5 + Prisma 7 + Postgres (Neon)
│   ├── src/
│   │   ├── app.ts            # buildApp(): registra plugins + rotas + error handler
│   │   ├── server.ts         # bootstrap (listen + graceful shutdown)
│   │   ├── config.ts         # env validada por zod (fonte única de process.env)
│   │   ├── shutdown.ts       # installGracefulShutdown (SIGTERM/SIGINT → app.close)
│   │   ├── routes/           # HTTP fino (schema zod + auth + mapear body→service)
│   │   ├── services/         # regra de negócio (sem Fastify)
│   │   ├── schemas/          # zod request/response (index.ts)
│   │   ├── plugins/          # prisma, auth (JWT), docs (swagger)
│   │   └── utils/            # errors, guards, time (puros)
│   ├── prisma/               # schema.prisma + migrations/
│   └── tests/                # unit/ (sem DB) + integration/ (app.inject, exige ?schema=test)
└── web/                      # Next.js 16 (App Router) + React 19
    └── src/
        ├── app/              # rotas: login, signup, [tenant]/{agenda,dashboard,clientes,
        │                     #   servicos,horarios}, dashboard (redirect legado)
        ├── components/       # ui (shadcn), tenant (workspace), auth, brand, landing
        └── lib/              # api.ts (transport), auth.ts (logout), utils, hooks
```

## 3. Arquitetura & camadas (inegociável)

`web (cliente HTTP) → api → routes (HTTP) → services (regra) → prisma (dados)`.
- `services/` **não** importam Fastify nem `req`/`reply`; recebem `PrismaClient` + ids/DTOs.
- `routes/` **não** carregam regra; só schema + auth + mapear body→service.
- Erros de domínio via `utils/errors` (`NotFoundError` 404, `ConflictError` 409, `ValidationError`
  400), convertidos pelo error handler em `app.ts`.
- Decisão registrada: arquitetura **Layered** (6/6 sinais) — ver constitution e `CLAUDE.md` raiz.

## 4. Data model (Prisma) — `api/prisma/schema.prisma`

| Modelo | Campos-chave | Notas |
|---|---|---|
| **Tenant** | `slug` (unique), settings (`allowCustomerBooking`, `timezone`, `slotIntervalMinutes`, `minLeadTimeMinutes`, `maxAdvanceDays`, `statusPromptAfterStartMin`, `overdueAfterEndMin`) | Raiz multi-tenant; `onDelete: Cascade` para os filhos. |
| **User** | `email`+`tenantId` (unique), `passwordHash` (bcrypt), `role` (OWNER/STAFF/CUSTOMER) | Login escopado por tenant. |
| **Service** | `name`, `description?`, `imageUrl?`, `priceInCents`, `durationInMinutes` | Imagem via upload assinado Cloudinary. |
| **Appointment** | `customerName/Phone/Email?`, `serviceId`, `userId?`, `startTime`/`endTime`, `status`, **`version`** | `version` = optimistic lock; status SCHEDULED/CONFIRMED/COMPLETED/NO_SHOW/CANCELED. |
| **BusinessHours** | `dayOfWeek`+`tenantId` (unique), `openTime`/`closeTime`, `isOff`, `breaks[]` | Horário semanal. |
| **BusinessBreak** | `startTime`/`endTime`, `label?` | Intervalos dentro do dia. |
| **BusinessDateOverride** | `date` (YYYY-MM-DD)+`tenantId` (unique), `openTime?/closeTime?/isOff` | Exceções de data. |

Índices sempre por `tenantId` (+ combinações para conflito de horário: `[tenantId, startTime, endTime]`).
**Regra:** campo/modelo novo ⇒ migration aditiva + `prisma generate` + refletir no response zod.

## 5. API surface (rotas registradas em `app.ts`)

- **Auth** (`/auth`): `signup`, `login` (rate limit 10/min), `logout`, `me`. Cookie httpOnly + token no body.
- **Users** (`/users`): CRUD restrito a OWNER.
- **Services** (`/services`): CRUD; STAFF cria, OWNER edita/exclui.
- **Hours** (`/hours`) e **Overrides** (`/overrides`): horário de funcionamento (OWNER).
- **Appointments** (`/appointments`): CRUD + transições de status; conflito via transação Serializable.
- **Settings** (`/settings`): PATCH dos limiares/flags da tenant.
- **Reports** (`/reports/summary`): KPIs/séries por período (timezone da tenant).
- **Uploads** (`/uploads/signature`): assinatura Cloudinary (OWNER/STAFF; `api_secret` nunca sai do servidor).
- **Public** (`/public/:slug/...`): serviços, disponibilidade e auto-agendamento (gated por `allowCustomerBooking`; rate limit reforçado).
- **Health** (`/health/live`, `/health/ready`) e `/docs` (Swagger).

## 6. Auth & segurança

- **JWT** assinado por `@fastify/jwt` com `expiresIn` (`JWT_EXPIRES_IN`, default 7d). Cookie **httpOnly**
  + `sameSite`/`secure` por env (`COOKIE_SAMESITE`; secure automático em prod ou sameSite=none).
- **Sessão no web = cookie** (não há token em localStorage); `apiRequest` usa `credentials: "include"`;
  logout via `POST /auth/logout`.
- **Multi-tenant:** todo `where` inclui `tenantId` (vindo de `requireAuth`); `tenantId` nunca vem do cliente.
- **Defesas HTTP:** Helmet+CSP, CORS por allowlist (`CORS_ORIGIN`), rate limit global + reforçado em
  login e booking público; error handler preserva 4xx (ex.: 429) em vez de mascarar como 500.
- **Logs:** pino com `redact` de `authorization`/`cookie`/`set-cookie`.
- **Segredos:** só em `.env` (gitignored), validados por zod; produção usa segredos próprios na VPS.

## 7. Frontend (web)

- **Next 16 App Router + React 19**; Server Components por padrão, `"use client"` só onde há estado/DOM.
- **Data fetching = React Query** (`useEffect`-fetch proibido). `apiRequest`/`ApiError` em `lib/api.ts`.
- **TenantProvider** (`components/tenant/tenant-context.tsx`): gate de auth via `/auth/me` (401 → login)
  + carga de services/hours/settings/overrides.
- **Estilo:** Tailwind v4 + shadcn; **só tokens** (zero hex). Agenda = FullCalendar; gráficos = Recharts
  (`currentColor` + tokens). Layout das telas de gestão = **bento** de largura total (`p-6 lg:p-8`).
- Telas: `agenda`, `dashboard`, `clientes` (derivado dos agendamentos — não há model Customer),
  `servicos` (CRUD + imagem), `horarios` (semana + exceções + triagem).

## 8. Testes & verificação

- **API:** Vitest. `pnpm -C api test` (unit, sem DB) · `test:integration` (`app.inject`, exige
  `DATABASE_URL` com `?schema=test`, faz `deleteMany`) · `tsc -p tsconfig.json --noEmit`.
- **Web:** Vitest (lógica pura de UI) · `tsc --noEmit` · `lint` (≤ baseline) · Playwright (E2E/visual,
  mockando `/auth/me`,`/services`,`/hours`,`/settings`,`/appointments`,`/reports/*`).
- **TDD inegociável** (RED→GREEN→REFACTOR); nada `done` sem verde + evidência (C5/C2).

## 9. Deploy (VPS)

- Build API: `prisma generate && tsc`; start: `node dist/server.js` (com graceful shutdown).
- Front + API na **mesma VPS** (mesmo site / reverse proxy) → cookie `sameSite=lax`.
- **HTTPS obrigatório em prod** (cookie `secure`). Env de produção própria (segredos novos).
- Env vars relevantes: `DATABASE_URL`/`DIRECT_DATABASE_URL`, `JWT_SECRET` (≥32), `JWT_EXPIRES_IN`,
  `NODE_ENV`, `HOST`/`PORT`, `CORS_ORIGIN`, `RATE_LIMIT_*`, `COOKIE_SAMESITE`, `PUBLIC_HEALTH`,
  `CLOUDINARY_*` + `CLOUDINARY_ALLOWED_FORMATS`. Web: `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_APP_VERSION`.

## 10. Estado atual / mudanças recentes

- **Prod-readiness (concluído, sessão atual):** JWT com expiração; rate limit no login; graceful
  shutdown; restrição de formato no upload (jpg/png/webp); redact no logger; **swap web
  localStorage → cookie httpOnly**; fix do error handler que mascarava 429.
- **Spec Kit instalado** — princípios em `constitution.md`, este mapa, e `specs/001-observabilidade-frontend`.
- **WIP pré-existente (fora desta sessão):** feature de horários (overrides/triagem), bento de
  clientes/serviços, `paginate`, upload Cloudinary — modificações ainda não commitadas no branch.

## 11. Onde achar o detalhe (mapa dos CLAUDE.md)

Raiz `CLAUDE.md` (regras globais) · `api/CLAUDE.md` · `api/prisma/CLAUDE.md` · `api/src/CLAUDE.md`
(+ `routes/`, `services/`, `schemas/`, `plugins/`, `utils/`) · `api/tests/CLAUDE.md` · `web/CLAUDE.md`
(+ `src/app/`, `src/app/[tenant]/{clientes,servicos,horarios,login,signup}`, `components/`,
`components/ui`, `components/tenant` (+ `dashboard`, `horarios`, `clientes`, `servicos`), `lib/`).

## 12. Pendências conhecidas

- **Observabilidade de frontend** (`specs/001-…`): aprovada, a implementar (`/speckit-plan`).
- **Lacunas adiadas:** acessibilidade (auditoria leve) e virtualização de listas (YAGNI até crescer).
- **Detalhe do cliente:** drawer de histórico ficou de fora (decisão registrada nos CLAUDE.md).
