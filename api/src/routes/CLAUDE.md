---
nicho: "api/src/routes"
escopo: "Camada de apresentação HTTP (Fastify) — rotas finas"
---

# api/src/routes/

> Complementa `../../CLAUDE.md` e o `CLAUDE.md` raiz.

## Escopo do Diretório

Plugins de rota Fastify registrados em `src/app.ts`: `auth`, `users`, `services`, `hours`,
`overrides`, `appointments`, `settings`, `reports`, `public`, `health`.

## Diretrizes Específicas

- **Rotas finas.** Cada handler: (1) `requireAuth(req)` / role guard, (2) mapear
  `req.body`/`params`/`query` para o DTO do service, (3) chamar o service, (4) `reply.send`.
  **Nenhuma regra de negócio aqui.**
- **Schema sempre:** usar `app.withTypeProvider<ZodTypeProvider>()` e declarar
  `schema: { body, params, querystring, response }` com os schemas de `../schemas/index.js`.
  Mapear campos explicitamente (espelhar `routes/appointments.ts`) — não repassar `req.body` cru.
- **Auth:** `preHandler: requireAuth` ou `requireRole("OWNER","STAFF")` de `../utils/guards`.
- **Status codes:** 201 (create), 204 (delete), 409 (conflito), 403 (role), 404 (not found).
  Erros de domínio lançados no service são convertidos pelo error handler — não tratar à mão.
- **Tenant:** nunca aceitar `tenantId` do body/query; vem sempre de `requireAuth(req)`.
- **Novo endpoint:** registrar o plugin em `src/app.ts` e os schemas em `schemas/index.ts`.

## Stack Local

| Camada | Tecnologia | Restrição |
|---|---|---|
| HTTP | Fastify 5 + `fastify-type-provider-zod` | Schema obrigatório por rota. |

## Testes

- **Tipo:** integração (Vitest via `app.inject`).
- **Cobertura:** status codes principais + RBAC (403) + validação (400). Exige `?schema=test`.

## Dependências Permitidas

- Fastify + plugins já instalados, schemas Zod internos, services. Sem lógica de negócio nova aqui.

## Quality Gate

- [ ] Handler sem regra de negócio (delega ao service)
- [ ] `schema` com request **e** response declarados
- [ ] `tenantId` vem de `requireAuth`, nunca do cliente
- [ ] Plugin registrado em `app.ts`; teste de integração verde

## Referências

- `../../CLAUDE.md` (api) · `../services/CLAUDE.md` · raiz
