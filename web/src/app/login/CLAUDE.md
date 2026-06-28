---
nicho: "web/src/app/login"
escopo: "Rota de login"
---

# .../login/

> Complementa `../CLAUDE.md` (app) e a raiz.

- `page.tsx`: tela de login (e-mail, senha, slug da tenant) usando `components/auth`
  (`auth-shell`, `password-input`).
- Submit → `POST /auth/login` via `apiRequest` → a API define o **cookie httpOnly de sessão** →
  navega para `/{slug}` (sem guardar token no client).
- Fora do `[tenant]` (sem TenantProvider). Auth não usa React Query (sem cache de servidor).
