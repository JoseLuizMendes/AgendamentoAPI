---
description: "Task list — Redesign do Dashboard (densidade > espaço vazio)"
---

# Tasks: Redesign do Dashboard (densidade > espaço vazio)

**Input**: Design em `specs/002-dashboard-redesign/` (plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md)

**Tests**: incluídos só para a **lógica pura** (`metrics.ts`) via Vitest (TDD). Card/abas/gráficos/layout são verificados por `tsc`/`lint` + visual (Playwright/manual). Feature **100% frontend, zero dependência nova** (dados já em `/reports/summary`; shadcn `Tabs` já existe).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: paralelizável (arquivos diferentes, sem dependência)
- **[Story]**: US1 (movimento) / US2 (retenção) / US3 (compactação)
- Todos os caminhos sob `web/src/`.

---

## Phase 1: Setup

- [x] T001 Confirmar `web/src/components/ui/tabs.tsx` (shadcn Tabs) presente — **já existe**; nenhuma instalação necessária. (gate rápido, sem código)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: nenhum bloqueio compartilhado — as 3 stories são independentes (US1 layout do movimento, US2 métricas/lógica pura, US3 alturas). Seguir direto.

**Checkpoint**: US1, US2 e US3 podem ser feitas em qualquer ordem (sugestão: P1→P2→P3).

---

## Phase 3: User Story 1 - Movimento num card só, com abas (Priority: P1) 🎯 MVP

**Goal**: substituir os dois cards de "Movimento por dia/hora" por um único card com abas.

**Independent Test**: dashboard mostra **um** card "Movimento" com abas "Por dia da semana | Por hora"; trocar de aba muda a série **sem recarregar**; período do topo afeta as duas.

### Implementation for User Story 1

- [x] T002 [US1] Criar `web/src/components/tenant/dashboard/movement-card.tsx` — `Card` + shadcn `Tabs` ("Por dia da semana" default | "Por hora"); cada aba renderiza `HighlightBars` com a série da dimensão (reusa `WEEKDAYS` e o filtro de horas 6h–22h hoje na page); estado de aba via `useState`; props `{ byWeekday: number[]; byHour: number[]; className? }`; estado vazio compacto quando a série é toda zero. Tokens/`currentColor`, zero hex.
- [x] T003 [US1] Em `web/src/app/[tenant]/dashboard/page.tsx`, substituir os dois `Card` de "Agendamentos por dia"/"por hora" (`HighlightBars`) por `<MovementCard byWeekday={summary.byWeekday} byHour={hourData} />`; remover o `argmax`/`weekdayData`/`hourData` duplicado se ficar só no card (mover o preparo da série para o card ou manter na page e passar pronto). (depende T002)
- [x] T004 [US1] Verificar US1: `pnpm -C web exec tsc --noEmit` + `pnpm -C web lint`; manual (abas trocam sem reload; pico destacado; período do topo reflete). (depende T002, T003)

**Checkpoint**: US1 entregue (MVP — fim dos dois cards grandes de movimento).

---

## Phase 4: User Story 2 - Métricas de retenção (Priority: P2)

**Goal**: mostrar cancelamento/no-show (%) + novos vs recorrentes, com delta vs período anterior.

**Independent Test**: com dados, os indicadores aparecem corretos (taxas em %, divisão novos/recorrentes) e o delta vs `previous`; sem dados → "—".

### Tests for User Story 2 (TDD — escrever PRIMEIRO, deve FALHAR) ⚠️

- [x] T005 [P] [US2] Teste em `web/src/components/tenant/dashboard/metrics.test.ts` (Vitest): `clientSplit(scalars)` — sem clientes (`clients:0` → novos 0, recorrentes 0, `novosPct` 0); só novos; mistura (recorrentes = `clients - newClients`, nunca < 0).

### Implementation for User Story 2

- [x] T006 [US2] Implementar `web/src/components/tenant/dashboard/metrics.ts` — `clientSplit(scalars)` → `{ novos, recorrentes, totalClientes, novosPct }` + helper de taxa que devolve "—" quando denominador é zero. (faz T005 ficar verde)
- [x] T007 [US2] Criar `web/src/components/tenant/dashboard/retention-kpis.tsx` — props `{ current, previous }`; Cancelamento e No-show (de `cancelRate`/`noShowRate`, em %, com `deltaPct(previous)` e `invertGood`/acento coral pois aumento é ruim); Novos vs Recorrentes via `clientSplit` (contagem + proporção); estados "—". Reusa `Kpi`/`KpiCard` + `deltaPct` existentes. (depende T006)
- [x] T008 [US2] Em `web/src/app/[tenant]/dashboard/page.tsx`, montar `<RetentionKpis current={c} previous={p} />` no lugar de um dos gráficos inflados. (depende T007)
- [x] T009 [US2] Verificar US2: `pnpm -C web test` (metrics verde) + `pnpm -C web exec tsc --noEmit` + `pnpm -C web lint`.

**Checkpoint**: US1 e US2 funcionam de forma independente.

---

## Phase 5: User Story 3 - Layout compacto e proporcional (Priority: P3)

**Goal**: gráficos com altura proporcional, sem grandes vãos com pouco dado.

**Independent Test**: com pouco dado, nenhum card de gráfico fica desproporcionalmente alto/vazio; grade equilibrada.

### Implementation for User Story 3

- [x] T010 [US3] Em `web/src/components/tenant/dashboard/charts.tsx`, reduzir/parametrizar as alturas (`RevenueArea`/`CountBars`/`HighlightBars`) — altura menor por default e/ou prop `height` retrocompatível; manter `currentColor` + tokens.
- [x] T011 [US3] Em `web/src/app/[tenant]/dashboard/page.tsx`, ajustar a grade/proporção (sem card de gráfico solitário ocupando toda a largura sem necessidade; agrupar com os KPIs de retenção). (depende T010)
- [x] T012 [US3] Verificar US3: `pnpm -C web exec tsc --noEmit` + `pnpm -C web lint`; visual (pouco dado → sem vão; claro/escuro; 0 erro de console). (depende T010, T011)

**Checkpoint**: as 3 stories independentes e funcionais.

---

## Phase 6: Polish & Cross-Cutting

- [x] T013 [P] Docs: atualizar `web/src/components/tenant/dashboard/CLAUDE.md` (novos: `movement-card`, `retention-kpis`, `metrics`) e `.specify/memory/project-context.md` se necessário.
- [ ] T014 Rodar `quickstart.md`: lógica pura verde + checagem visual (movimento/retenção/compactação, claro/escuro, console limpo).

---

## Dependencies & Execution Order

- **Setup (T001)**: gate (Tabs já existe).
- **US1 (T002–T004)**: independente → MVP.
- **US2 (T005–T009)**: TDD (T005 antes de T006); independente de US1.
- **US3 (T010–T012)**: ajuste de altura/grade; melhor depois de US1/US2 estarem na página (a grade final considera os novos blocos).
- **Polish (T013–T014)**: depois das stories desejadas.

### Within each story (TDD)
- US2: T005 (teste) falha antes de T006 (implementação).
- Componente antes de montar na página; verificação por último.

### Parallel Opportunities
- T005 (teste) pode ser escrito em paralelo ao trabalho de US1.
- T002 (movement-card) ‖ T006/T007 (metrics/retention) — arquivos diferentes.

---

## Implementation Strategy

### MVP primeiro (US1)
1. T001 → 2. US1 (T002–T004) → **valida o movimento unificado** → já reduz o espaço desperdiçado.

### Incremental
1. US1 (MVP) → 2. US2 (retenção) → 3. US3 (compactação) → Polish. Cada uma entrega valor sem quebrar a anterior.

---

## Notes
- `[P]` = arquivos diferentes, sem dependência.
- TDD: confirmar T005 falhando antes de implementar `metrics.ts` (C5).
- Zero dependência nova; cores via token; coral só para negativo (canon).
- Commit após cada task ou grupo lógico.
