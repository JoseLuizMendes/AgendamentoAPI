# Implementation Plan: Redesign do Dashboard (densidade > espaço vazio)

**Branch**: `feat/horarios-controle-total` | **Date**: 2026-06-28 | **Spec**: [spec.md](./spec.md)

**Input**: `specs/002-dashboard-redesign/spec.md`

## Summary

Reorganizar o dashboard da tenant para acabar com gráficos grandes/vazios: (1) **unificar** os dois
cards de movimento num só, com **abas** "Por dia da semana | Por hora" (estado client-side; filtro de
período global continua mandando); (2) **adicionar métricas de retenção** — cancelamento/no-show e
novos vs recorrentes, com delta vs período anterior; (3) **compactar** as alturas dos gráficos. Tudo
**frontend**: os dados já existem em `/reports/summary` (ver Research) — **sem mudança de backend e
sem dependência nova**.

## Technical Context

**Language/Version**: TypeScript 5.x (`strict`)

**Primary Dependencies**: Next.js 16 (App Router) + React 19, Recharts (tokens/`currentColor`),
`@tanstack/react-query`, shadcn `Tabs` (já em `components/ui`). **Nenhuma dependência nova.**

**Storage**: N/A — consome `/reports/summary` (React Query); sem persistência nova.

**Testing**: Vitest (web) para lógica pura nova (`metrics.ts`); o resto (layout, abas, gráficos
compactos) por `tsc`/`lint` + Playwright/visual (claro/escuro, sem erro de console).

**Target Platform**: Navegadores (web Next).

**Project Type**: Web application — alteração restrita ao **frontend** (`web/`).

**Performance Goals**: trocar de aba é estado local (sem refetch); reusa o `useQuery(["reports",period])`
existente.

**Constraints**: só tokens (zero hex); coral só para negativo; estado vazio claro (taxa "—" quando
denominador zero); deltas omitidos sem base comparável.

**Scale/Scope**: 1 página reorganizada + 1 card novo (movimento com abas) + 1 bloco de KPIs de
retenção + 1 helper puro testado + ajuste de altura nos gráficos.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Princípio | Status | Nota |
|---|---|---|
| I. Anti-Alucinação | ✅ | Campos confirmados lendo `types.ts` (não presumidos); shadcn `Tabs` confirmado no `ui/`. |
| II. TDD | ✅ | Lógica pura nova (`clientSplit` etc.) com teste Vitest antes; UI por verificação visual. |
| III. Stack Congelada | ✅ | **Zero dependência nova** (Recharts/React Query/shadcn Tabs já no canon). |
| IV. Layered / front | ✅ | Página fina consome React Query; visualização recebe dados por props; lógica pura isolada. |
| V. Segurança & tokens | ✅ | Sem dado sensível novo; cores via token; coral só negativo. |
| VI. Fonte Única | ✅ | Spec em `specs/`; princípios na constitution. |

**Resultado: PASS** — sem violações. Complexity Tracking vazio.

## Project Structure

### Documentation (this feature)

```text
specs/002-dashboard-redesign/
├── plan.md · research.md · data-model.md · quickstart.md · contracts/ · checklists/
└── tasks.md   # /speckit-tasks (não criado aqui)
```

### Source Code (repository root) — só `web/`

```text
web/src/
├── app/[tenant]/dashboard/page.tsx          # reorganiza: movimento unificado + KPIs retenção + compacto
├── components/tenant/dashboard/
│   ├── movement-card.tsx                     # NOVO: card com Tabs "Por dia | Por hora" (reusa HighlightBars)
│   ├── retention-kpis.tsx                     # NOVO: cancelamento/no-show + novos vs recorrentes (Kpi/StatRow + delta)
│   ├── metrics.ts                            # NOVO: lógica pura (clientSplit, helpers de taxa "—")
│   ├── metrics.test.ts                       # NOVO: Vitest da lógica pura
│   └── charts.tsx                            # ajuste: alturas compactas (RevenueArea/CountBars/HighlightBars)
```

**Structure Decision**: alteração **somente frontend**. A página (`page.tsx`) já busca
`/reports/summary` via React Query e passa `current`/`previous`/`byWeekday`/`byHour` aos componentes.
O movimento vira um card com `Tabs` (estado `useState`), reusando `HighlightBars`. As métricas de
retenção usam o padrão `Kpi`/`deltaPct` (já existentes). Sem tocar em `api/`.

## Complexity Tracking

> Sem violações — nada a justificar.
