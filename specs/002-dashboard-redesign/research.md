# Research — Redesign do Dashboard

## 1. Os dados necessários já existem? (a dúvida do spec)

- **Decisão**: **Sim — nenhuma mudança de backend.** `GET /reports/summary` (`ReportSummary` em
  `web/src/components/tenant/dashboard/types.ts`) já entrega tudo, em `current` **e** `previous`:
  - Cancelamento: `canceled`, `cancelRate` (+ `byStatus`).
  - No-show: `noShow`, `noShowRate`.
  - Novos vs recorrentes: `clients`, `newClients` → recorrentes = `clients - newClients`.
  - Movimento: `byWeekday: number[]` e `byHour: number[]`.
- **Rationale**: `previous` permite calcular delta com `deltaPct` (já existente em `periods.ts`);
  recorrentes é derivação trivial; nenhum campo novo é preciso.
- **Alternativas**: estender o backend de relatórios — **desnecessário**, rejeitado (YAGNI).

## 2. Unificar movimento (por dia | por hora)

- **Decisão**: um `MovementCard` com `Tabs` (shadcn, já em `components/ui`) alternando a dimensão;
  reusa o `HighlightBars` existente, passando `byWeekday` ou `byHour` conforme a aba. Estado local
  (`useState`), sem refetch — o filtro de período global continua controlando o intervalo.
- **Rationale**: troca instantânea (estado client), zero dependência nova, reaproveita o gráfico.
- **Alternativas**: dois cards (atual, desperdiça espaço); `NativeSelect` em vez de Tabs (Tabs é
  mais claro para 2 dimensões). Rejeitados.

## 3. Métricas de retenção (apresentação)

- **Decisão**: bloco de **KPIs** no padrão já usado (`Kpi`/valor + `deltaPct`), não novos gráficos:
  Cancelamento (%), No-show (%), e Novos vs Recorrentes (contagem + proporção).
- **Rationale**: densifica com informação acionável sem inflar gráfico; coerente com os KPIs do topo.
- **Alternativas**: gráfico de pizza/donut para novos vs recorrentes (mais peso visual para pouca
  informação). Rejeitado — uma barra de proporção/`StatRow` basta.

## 4. Gráficos compactos

- **Decisão**: reduzir as alturas fixas dos gráficos (`RevenueArea`/`CountBars`/`HighlightBars`) e/ou
  parametrizar a altura, evitando 240px fixos que geram vão com pouco dado; manter `currentColor` +
  tokens.
- **Rationale**: proporcionalidade à densidade era o pedido central.
- **Alternativas**: manter altura fixa (problema atual). Rejeitado.

## 5. Estados vazios e deltas sem base

- **Decisão**: taxa com denominador zero → exibir "—" (não "0%"); delta omitido quando não há
  `previous` comparável.
- **Rationale**: evita números enganosos (edge cases do spec).
