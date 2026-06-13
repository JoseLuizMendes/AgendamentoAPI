---
nicho: "api/prisma"
escopo: "Schema e migrations do Prisma (PostgreSQL)"
---

# api/prisma/

> Complementa `../CLAUDE.md` (api) e a raiz.

## Escopo

`schema.prisma` (modelos declarativos) + `migrations/` (histórico versionado).

## Diretrizes

- **Campo/modelo novo = migration.** Editar `schema.prisma` → gerar a migration em
  `migrations/<timestamp>_<nome>/migration.sql` → `prisma generate` (atualiza os tipos do client).
- Aplicar com **`prisma migrate deploy`** (não `migrate dev` interativo contra o banco real).
- Migration é **aditiva** quando possível (colunas com default) p/ não quebrar dados existentes.
- Multi-tenant: relações sempre com `tenantId` + `onDelete: Cascade` a partir de `Tenant`.
- `version` em `Appointment` = optimistic lock (incrementa em todo update no service).
- Refletir o campo novo também no `SettingsResponse`/`AppointmentResponse` zod (senão some na API) —
  ver `../src/schemas/CLAUDE.md`.

## Quality Gate
- [ ] Mudou o schema ⇒ migration criada + `prisma generate`
- [ ] Migration aditiva/segura (sem perda de dados)
- [ ] Response zod atualizado para o campo novo

## Referências
- `../CLAUDE.md` (api) · `../src/schemas/CLAUDE.md` · raiz
