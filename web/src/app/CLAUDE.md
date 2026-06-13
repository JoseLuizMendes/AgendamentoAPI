---
nicho: "web/src/app"
escopo: "Next.js App Router — layouts, providers e rotas"
---

# web/src/app/

> Complementa `../../CLAUDE.md` (web) e a raiz.

## Escopo

`layout.tsx` (root: fontes, ThemeProvider, **QueryProvider**, Toaster), `providers.tsx`
(QueryClient), `globals.css` (tokens Tailwind v4 + tema do FullCalendar), e as rotas
(`[tenant]/...`, `login`, `signup`, `dashboard` legado).

## Diretrizes

- **Server Components por padrão**; `"use client"` só onde há estado/efeito/DOM.
- O `QueryProvider` (React Query) e o `ThemeProvider` vivem no root layout — não recriar provider
  em rota.
- **`globals.css` é o único lugar de cores cruas/hex** (tokens). Componentes usam só `var(--*)` ou
  utilitários Tailwind. Tokens da agenda em `@theme static`.
- Páginas finas: a página monta o componente da feature (em `components/...`); regra/estado de
  servidor via React Query (sem `useEffect` de fetch).
- `[tenant]/layout.tsx` é o gate de auth (TenantProvider) — ver `[tenant]/CLAUDE.md`.

## Referências
- `../../CLAUDE.md` (web) · `[tenant]/CLAUDE.md` · raiz
