---
nicho: "api/src/plugins"
escopo: "Plugins Fastify (infra transversal)"
---

# api/src/plugins/

> Complementa `../CLAUDE.md` (api/src) e a raiz.

## Escopo

Plugins registrados em `app.ts`: `prisma.ts` (decora `app.prisma`), `auth.ts` (JWT/`@fastify/jwt`),
`docs/` (Swagger/OpenAPI).

## Diretrizes

- Plugins usam `fastify-plugin` quando precisam expor decorators no escopo da app (ex.: `app.prisma`).
- **Acesso ao banco só via `app.prisma`** (injetado pelo plugin) — nada de instanciar `PrismaClient`
  solto nos services/rotas.
- Ciclo de vida (conexões, hooks `onClose`) mora aqui, não nas rotas.
- Novo plugin: registrar em `app.ts` na ordem correta (infra antes das rotas).

## Referências
- `../CLAUDE.md` · `../../app.ts` (registro) · raiz
