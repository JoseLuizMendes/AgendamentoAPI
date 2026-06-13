---
nicho: "api/src/plugins/docs"
escopo: "Plugin de documentação OpenAPI/Swagger"
---

# api/src/plugins/docs/

> Complementa `../CLAUDE.md` (plugins) e a raiz.

- `swagger.ts`: registra `@fastify/swagger` + `@fastify/swagger-ui` (UI em `/docs`). A spec é
  gerada a partir dos **schemas Zod das rotas** — manter request/response schemas corretos é o que
  mantém a doc fiel (ver `../../schemas/CLAUDE.md`).
- Rotas de doc/health ficam fora do rate-limit (allowList em `app.ts`).
