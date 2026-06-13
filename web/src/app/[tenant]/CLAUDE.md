---
nicho: "web/src/app/[tenant]"
escopo: "Workspace da tenant (rotas autenticadas /{slug}/...)"
---

# web/src/app/[tenant]/

> Complementa `../CLAUDE.md` (app) e a raiz.

## Escopo

`layout.tsx` monta `TenantProvider` (gate de auth + dados via React Query) + `AppShell` (sidebar/
topbar). Sub-rotas: `agenda`, `dashboard`, `clientes`, `servicos`, `horarios`.

## Diretrizes

- **Dados da tenant vêm de `useTenant()`** (me/services/hours/settings) — não refazer fetch nas
  páginas. Recarregar = `reloadX()` (invalida a query).
- Cada `page.tsx` é fina: monta o componente da feature; a UI/regra mora em
  `components/tenant/...`. Ver os CLAUDE.md de cada rota.
- O `slug` da URL precisa bater com o tenant do token (o TenantProvider redireciona se divergir).
- Novo: criar a sub-rota + item no `app-shell` (NAV) quando for navegável.

## Referências
- `../CLAUDE.md` (app) · `../../components/tenant/CLAUDE.md` · raiz
