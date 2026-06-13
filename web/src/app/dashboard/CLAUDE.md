---
nicho: "web/src/app/dashboard"
escopo: "Rota legada (redirect)"
---

# .../dashboard/ (legado)

> Complementa `../CLAUDE.md` (app) e a raiz.

- `page.tsx` é um **redirect legado**: lê `/auth/me` e manda para o workspace da tenant
  (`/{slug}`). O dashboard real é `[tenant]/dashboard`.
- Não adicionar feature aqui — é só compatibilidade de rota antiga.
