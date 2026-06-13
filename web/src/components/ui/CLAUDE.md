---
nicho: "web/src/components/ui"
escopo: "Primitivos shadcn/ui (New York)"
---

# web/src/components/ui/

> Complementa `../CLAUDE.md` (components) e a raiz.

## Escopo

Componentes shadcn/ui gerados (button, input, label, sheet, popover, calendar, table, card,
dropdown-menu, tabs, sonner, skeleton, separator, alert, avatar, badge, `native-select`).

## Diretrizes

- **Gerados pelo shadcn** (`components.json`, estilo New York). Adicionar novos via CLI:
  `pnpm dlx shadcn@latest add <componente>`. **Não escrever primitivo à mão** sem necessidade.
- ⚠️ O CLI pode tentar **sobrescrever** componentes já customizados (ex.: `button.tsx`) — **recusar**
  o overwrite (responder N) e, se faltar, criar/ajustar o arquivo manualmente.
- Convenção do projeto: `cn` de `@/lib/utils`; `Button`/`buttonVariants` de `button.tsx`. Radix vem
  ora como `@radix-ui/react-*` (antigos), ora pelo meta-pacote `radix-ui` (novos) — ambos ok.
- **Não colocar regra de negócio aqui.** São primitivos de apresentação reutilizáveis.
- `native-select` é custom do projeto (não-shadcn) — mantê-lo.

## Referências
- `../CLAUDE.md` (components) · `components.json` (raiz do web) · raiz
