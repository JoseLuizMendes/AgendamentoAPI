---
nicho: "web"
escopo: "Frontend Next.js 16 (App Router) + React 19 do AgendamentoAPI"
---

# web/

> Complementa o `CLAUDE.md` raiz (não substitui). Leia a raiz primeiro.

## Escopo do Diretório

App do dono/staff: login/signup e o workspace da tenant (`/[tenant]/{agenda,dashboard,
clientes,servicos,horarios}`). Landing institucional em `components/landing`.

## Diretrizes Específicas

- **Componentes funcionais + hooks.** Server Components quando não houver interatividade;
  `"use client"` só onde precisa de estado/efeito/DOM.
- **Data fetching = React Query (`@tanstack/react-query`).** **`useEffect` para buscar dados é
  proibido (C6).** `useQuery` para leitura, `useMutation` + `invalidateQueries` para escrita.
  Efeito só para sincronizar com sistema externo (DOM, timers, localStorage) — nunca para fetch.
- **Transport:** as chamadas passam por `apiRequest`/`ApiError` (`lib/api.ts`); token via
  `lib/auth.ts` (`agendamento.jwt`). React Query orquestra cache/estado por cima.
- **Estilo = só tokens.** Tailwind v4; cores via tokens do `app/globals.css` (`--background`,
  `--primary`, `--service-*`, `--status-*`, `--phase-*`…). **Hex hardcoded proibido.** Sem CSS
  global novo fora do `globals.css`.
- **UI kit:** shadcn/ui (`components/ui`), sonner para toast, lucide para ícones (validar que o
  ícone existe na versão antes de usar).
- **a11y:** `focus-visible` em controles, `aria-pressed`/`aria-label` em toggles/icon-buttons,
  `prefers-reduced-motion` (usar `motion-reduce:*`) em animações.
- **Hydration:** subtree que depende de token/localStorage só renderiza pós-mount (padrão do
  `TenantProvider`); ou `useState` lazy com guarda `typeof window`.
- **Lint:** manter o baseline (raiz). Não introduzir novo `set-state-in-effect` — use React
  Query para fetch e callbacks (setInterval/setTimeout/handlers) para o resto.

## Stack Local

| Camada | Tecnologia | Restrição |
|---|---|---|
| Framework | Next 16 (App Router) + React 19 | Componentes funcionais. |
| Data | @tanstack/react-query | `useEffect`-fetch proibido. |
| Estilo | Tailwind v4 + shadcn | Só tokens; zero hex. |
| Forms/validação | React Hook Form + Zod (quando houver form) | Type-safe. |
| Agenda/gráficos | FullCalendar 6 + Recharts | Ver `components/tenant`. |

## Testes

- **Tipo:** E2E/visual via **Playwright (MCP)** — mockar `/auth/me`,`/services`,`/hours`,
  `/settings`,`/appointments`,`/reports/*`; injetar token + tema; checar claro/escuro e
  **0 erros de console**.
- **Verificação:** `pnpm -C web exec tsc --noEmit` e `pnpm -C web lint` (≤ baseline).

## Dependências Permitidas

- As de `web/package.json` (Next, React, FullCalendar, Recharts, sonner, lucide, next-themes,
  Radix, tailwind-merge, clsx) + `@tanstack/react-query`. Nova dep: C6 + C7.

## Quality Gate

- [ ] Fetch via React Query (nenhum `useEffect` de fetch novo)
- [ ] Cores via token (sem hex hardcoded)
- [ ] a11y (focus-visible, aria, prefers-reduced-motion)
- [ ] `tsc` limpo + lint ≤ baseline
- [ ] Verificado no Playwright (claro/escuro, sem erro de console)

## Referências

- `../CLAUDE.md` (raiz) · `src/components/tenant/CLAUDE.md`
