---
nicho: "api/src/utils"
escopo: "Helpers puros e transversais do backend"
---

# api/src/utils/

> Complementa `../CLAUDE.md` (api/src) e a raiz.

## Escopo

Utilitários puros: `errors` (classes de erro de domínio + handler), `guards` (auth/role),
`time` (parse/format de horários).

## Diretrizes

- **Funções puras e sem estado.** Sem acesso a DB, sem `req`/`reply`, sem `process.env`.
- **Erros de domínio** (`NotFoundError` 404, `ConflictError` 409, `ValidationError` 400) são
  lançados pelos services e convertidos pelo error handler — não montar resposta HTTP no service.
- `guards`: `requireAuth(req)` devolve `{ tenantId, userId, role }`; `requireRole(...)` é preHandler.
- `time`: lógica de minutos/slots testável isoladamente (há testes unitários — mantê-los verdes).

## Testes
- Unitário (Vitest) para toda lógica de tempo/guards. Cobrir os caminhos de erro.

## Referências
- `../CLAUDE.md` · `../services/CLAUDE.md` · raiz
