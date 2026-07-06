---
nicho: "web/src/components/ui"
escopo: "Primitivos shadcn/ui (New York)"
---

# web/src/components/ui/

> Complementa `../CLAUDE.md` (components) e a raiz.

## Escopo

Componentes shadcn/ui gerados (button, input, label, sheet, popover, calendar, table, card,
dropdown-menu, tabs, sonner, skeleton, separator, alert, avatar, badge, `select`).

## Diretrizes

- **Gerados pelo shadcn** (`components.json`, estilo New York). Adicionar novos via CLI:
  `pnpm dlx shadcn@latest add <componente>`. **Não escrever primitivo à mão** sem necessidade.
- ⚠️ O CLI pode tentar **sobrescrever** componentes já customizados (ex.: `button.tsx`) — **recusar**
  o overwrite (responder N) e, se faltar, criar/ajustar o arquivo manualmente.
- Convenção do projeto: `cn` de `@/lib/utils`; `Button`/`buttonVariants` de `button.tsx`. Radix vem
  ora como `@radix-ui/react-*` (antigos), ora pelo meta-pacote `radix-ui` (novos) — ambos ok.
- **UI = Radix puro** (`@radix-ui/react-*` antigos ou o meta-pacote `radix-ui`). Base UI foi
  removido (combobox sem uso) — exceção revertida na raiz (2026-06-15).
- **Não colocar regra de negócio aqui.** São primitivos de apresentação reutilizáveis.
- `select` (shadcn, Radix via meta-pacote `radix-ui`) é o dropdown padrão — visual na identidade
  do projeto (popup `bg-popover`, tokens). Substituiu o antigo `native-select` (removido em
  2026-07-06, cujo popup nativo não seguia o tema).

## Referências
- `../CLAUDE.md` (components) · `components.json` (raiz do web) · raiz
