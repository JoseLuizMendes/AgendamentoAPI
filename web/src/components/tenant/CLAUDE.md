---
nicho: "web/src/components/tenant"
escopo: "Workspace da tenant — agenda, dashboard, clientes, serviços, horários"
---

# web/src/components/tenant/

> Complementa `web/CLAUDE.md` e o `CLAUDE.md` raiz.

## Escopo do Diretório

Componentes do app de gestão da tenant: shell (`app-shell`), contexto (`tenant-context`),
agenda (FullCalendar), dashboard (Recharts), clientes, e helpers compartilhados.

## Diretrizes Específicas

- **Contexto:** dados da tenant vêm de `useTenant()` (`tenant-context.tsx`): `me`, `slug`,
  `services`, `hours`, `settings`. **Não** refazer fetch desses nos componentes — consumir o
  contexto. (O contexto usa React Query por baixo; recarregar = invalidar a query.)
- **Reuso obrigatório** (`shared.tsx`): `STATUS_META`, `NEXT_STATUS`, `StatusPill`, `formatBRL`,
  `EmptyState`, `Kpi`, `DAYS`. Não duplicar essas constantes/labels.
- **Agenda (`agenda/`):**
  - Cores por `colors.ts` (`serviceColor`/`statusColor`) — que retornam **tokens**, nunca hex.
  - Ciclo de vida do card por `phase.ts` (`phaseOf`/`PHASE_CLASS`/`NEEDS_TRIAGE`); fases
    derivadas de tempo + status + `settings` (limiares). Não recalcular fase ad-hoc.
  - `selectAllow` bloqueia criar no passado; sem `nowIndicator` (removido por decisão de UX).
  - `renderEvent` deve tolerar evento sem `extendedProps.appt` (mirror/seleção, bg do passado).
  - Datas custom: `datetime.ts` (`toLocalInputValue`/`localInputToISO`/`durationLabel`).
  - Drawers via `Sheet` (shadcn); estado de form resetado por `key` (evita efeito de sync).
- **Dashboard (`dashboard/`):** Recharts com `currentColor` + tokens (tema via CSS), nunca cor
  fixa. Períodos/buckets em `periods.ts`; export em `export.ts`.
- **Mutations** (criar/mover/redimensionar/status/excluir/settings): `useMutation` →
  `invalidateQueries` (agenda + triagem) no `onSuccess`; tratar 409 com toast + revert.

## Stack Local

| Camada | Tecnologia | Restrição |
|---|---|---|
| Agenda | FullCalendar 6 (timegrid/daygrid/interaction) | Cores por token; pt-br. |
| Gráficos | Recharts | `currentColor` + tokens. |
| Drawers/UI | shadcn `Sheet`/`Button`/`Input`/`NativeSelect` | — |
| Estado servidor | @tanstack/react-query | Via `useTenant` + queries locais. |

## Testes

- **Tipo:** Playwright (MCP) — relógio fixo (`page.clock.setFixedTime`) p/ fases determinísticas;
  mockar endpoints; checar fases (resolved/awaiting/overdue), bloqueio de passado, triagem,
  claro/escuro.

## Dependências Permitidas

- FullCalendar, Recharts, shadcn ui, sonner, lucide, date utils internos, React Query. Sem state
  lib global nova sem C6.

## Quality Gate

- [ ] Dados da tenant via `useTenant` (sem refetch duplicado)
- [ ] Constantes/labels reusadas de `shared.tsx`
- [ ] Cores via `colors.ts`/tokens (zero hex)
- [ ] Fase via `phase.ts`; mutations invalidam as queries certas
- [ ] Verificado no Playwright (fases + claro/escuro)

## Referências

- `../../../CLAUDE.md` (web) · raiz · `shared.tsx`, `tenant-context.tsx`, `agenda/phase.ts`,
  `agenda/colors.ts`
