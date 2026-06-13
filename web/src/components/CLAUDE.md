---
nicho: "web/src/components"
escopo: "Componentes React do frontend"
---

# web/src/components/

> Complementa `../../CLAUDE.md` (web) e a raiz.

## Mapa

| Pasta | Papel | CLAUDE.md |
|---|---|---|
| `ui/` | Primitivos shadcn/ui (gerados) | `ui/CLAUDE.md` |
| `tenant/` | Workspace da tenant (agenda, dashboard, etc.) | `tenant/CLAUDE.md` |
| `auth/` | Telas de login/signup | `auth/CLAUDE.md` |
| `brand/` | Primitivos de marca | `brand/CLAUDE.md` |
| `landing/` | Página institucional pública | `landing/CLAUDE.md` |
| (raiz) | `theme-provider`, `theme-toggle` | — |

## Diretrizes

- Componentes funcionais + hooks. Cliente só onde necessário (`"use client"`).
- Estilo via tokens (sem hex); ícones lucide; feedback via sonner.
- Reuso antes de recriar: helpers em `tenant/shared.tsx`, primitivos em `ui/`.

## Referências
- `../../CLAUDE.md` (web) · subpastas acima · raiz
