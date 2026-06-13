---
nicho: "web/src/app/signup"
escopo: "Rota de cadastro (signup)"
---

# .../signup/

> Complementa `../CLAUDE.md` (app) e a raiz.

- `page.tsx`: cadastro que cria tenant + OWNER (`POST /auth/signup`: nome, e-mail, senha ≥ 8,
  tenantName, tenantSlug `[a-z0-9-]`). Usa `components/auth`.
- Sucesso → `setToken` → navega para `/{slug}`.
- Validar slug e força de senha na borda antes de chamar a API.
