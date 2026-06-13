---
nicho: "api/tests"
escopo: "Testes do backend (Vitest)"
---

# api/tests/

> Complementa `../CLAUDE.md` (api) e a raiz.

## Escopo

`unit/` (lógica pura: time, slots, guards, status), `integration/` (endpoints via `app.inject`),
`scripts/` (prepare-integration-db).

## Diretrizes

- **TDD:** teste antes da implementação (raiz §C5). Nada marcado `completed` sem verde.
- **Unit** (`pnpm test`): puro, sem DB, sem rede. Mocks só p/ deps externas — nunca p/ lógica interna.
- **Integração** (`pnpm test:integration`): sobe a app real e usa `DATABASE_URL` com **`?schema=test`**.
  ⚠️ Faz `deleteMany` em todas as tabelas no `beforeEach` — **NUNCA** rodar apontando para o banco
  real (`schema=public`). O `prepare-integration-db` recusa sem `?schema=`.
- Padrão de integração: `beforeEach` limpa + faz signup (token OWNER); helpers criam service/appt.
- Caminhos de erro (409 conflito, 403 RBAC, 400 validação) têm teste.

## Referências
- `../CLAUDE.md` (api) · raiz · `scripts/prepare-integration-db.ts`
