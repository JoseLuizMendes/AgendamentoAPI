---
nicho: "web/src/components/auth"
escopo: "UI de autenticação (login/signup)"
---

# web/src/components/auth/

> Complementa `../CLAUDE.md` (components) e a raiz.

## Escopo

`auth-shell.tsx` (layout split-screen das telas de auth) e `password-input.tsx` (input de senha com
toggle de visibilidade). Consumidos por `app/login` e `app/signup`.

## Diretrizes

- Submit de login/signup chama `apiRequest`; a **API define o cookie httpOnly de sessão** na
  resposta (o JS não guarda token). Depois navega para `/{slug}`. (Auth não gerencia cache de
  servidor → não precisa de React Query.)
- Validação nas bordas (campos obrigatórios, e-mail, senha ≥ 8) antes de chamar a API.
- a11y: `label`/`aria` nos campos; `password-input` com `aria-label` no toggle.

## Referências
- `../CLAUDE.md` (components) · `../../lib/CLAUDE.md` · raiz
