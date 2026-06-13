---
nicho: "api"
escopo: "Backend Fastify + Prisma (REST multi-tenant) do AgendamentoAPI"
---

# api/

> Complementa o `CLAUDE.md` raiz (não substitui). Leia a raiz primeiro.

## Escopo do Diretório

API REST do AgendamentoAPI: autenticação (JWT), serviços, horários de funcionamento,
agendamentos (com checagem de conflito e optimistic lock), relatórios e settings da tenant.
Servidor Fastify montado em `src/app.ts` (`buildApp()`), iniciado em `src/server.ts`.

## Diretrizes Específicas

- **Camadas:** `routes/` (HTTP) → `services/` (regra) → Prisma (dados). Ver os CLAUDE.md de
  cada subpasta. `services/` **não** importam Fastify.
- **Multi-tenancy:** todo acesso a dado é escopado por `tenantId` (vem de `requireAuth(req)`).
  Nunca consultar/alterar sem o filtro de tenant. CUSTOMER só vê o próprio dado.
- **Optimistic lock:** `Appointment.version` incrementa em todo update (`version: { increment: 1 }`).
- **Conflito de horário:** usar `services/appointment-conflict.ts` (`assertNoConflict`,
  transação `Serializable`) — só `SCHEDULED`/`CONFIRMED` ocupam slot. Colisão → `ConflictError` (409).
- **Erros:** lançar de `utils/errors` (`NotFoundError` 404, `ConflictError` 409,
  `ValidationError` 400) — nunca `reply.status()` com erro manual no service.
- **Auth:** `preHandler: requireAuth` / `requireRole("OWNER","STAFF")` nas rotas; `requireAuth(req)`
  devolve `{ tenantId, userId, role }`.
- **Schemas:** Zod centralizado em `src/schemas/index.ts`. Request e **response** tipados.
- **Migrations:** campo/modelo novo no `prisma/schema.prisma` ⇒ **nova migration** em
  `prisma/migrations/<timestamp>_<nome>/migration.sql` + `prisma generate`. Aplicar com
  `prisma migrate deploy` (não `migrate dev` interativo contra o banco real).
- **Config:** ler de `src/config.ts` (zod env), nunca `process.env` solto.

## Stack Local

| Camada | Tecnologia | Restrição |
|---|---|---|
| HTTP | Fastify 5 + `fastify-type-provider-zod` | Express banido. Rotas finas. |
| ORM | Prisma 7 + Postgres | Schema declarativo. Migration versionada. |
| Auth | `@fastify/jwt` | Via `utils/guards`. |
| Validação | Zod | `schemas/index.ts`. |

## Testes

- **Ferramenta:** Vitest. Unit em `tests/unit`, integração em `tests/integration`.
- **TDD:** teste antes da implementação (C5). Mocks só para deps externas, nunca para lógica interna.
- **Integração:** `pnpm test:integration` — exige `DATABASE_URL` com `?schema=test`. **Nunca**
  rodar contra o banco real (faz `deleteMany` em tudo).
- **Comando rápido:** `pnpm -C api test` (unit) · `pnpm -C api exec tsc -p tsconfig.json --noEmit`.

## Dependências Permitidas

- As já presentes em `api/package.json` (Fastify + plugins, Prisma, zod, luxon, bcryptjs, pg).
- Nova dependência: C6 (validar) + C7 (Context7) antes de instalar.

## Quality Gate

- [ ] Acesso a dado escopado por `tenantId`
- [ ] Regra de negócio no service, não na rota
- [ ] Erros via `utils/errors`; response schema declarado
- [ ] Campo novo no schema ⇒ migration criada
- [ ] Teste (unit/integração) escrito e **verde** antes de marcar `completed`

## Referências

- `../CLAUDE.md` (raiz) · `src/services/CLAUDE.md` · `src/routes/CLAUDE.md`
- `Preferencias Dev` (vault) — stack e regras inegociáveis
