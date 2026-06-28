---
nicho: "web/src/components/tenant/dashboard"
escopo: "Indicadores e gráficos do dashboard (Recharts)"
---

# web/src/components/tenant/dashboard/

> Complementa `../CLAUDE.md` (tenant) e a raiz.

## Escopo

`charts` (área/barras Recharts; altura via prop `height`, default compacto),
`finance-chart` (**ECharts** — exceção C6 registrada na raiz/constitution — gráfico "Movimento
financeiro": agendamentos em barras + receita em linha, eixo duplo, zoom wheel/pinça via
`dataZoom: inside`; cores lidas dos tokens CSS, re-aplicadas no toggle de tema), `kpi-card`,
`movement-card` (movimento num card só, abas "Por dia da semana | Por hora" via shadcn `Tabs`,
reusa `HighlightBars`), `retention-kpis` (cancelamento + novos vs recorrentes, via `KpiCard`),
`metrics` (lógica pura testável: `clientSplit`, `formatRate`), `status-funnel`, `periods` (presets
de período + `deltaPct`), `export` (CSV), `types` (espelha `GET /reports/summary`).

## Diretrizes

- A página do dashboard busca `/reports/summary` via **`useQuery`** keyed por período; aqui ficam só
  os componentes de visualização (recebem dados por props).
- **Recharts via `currentColor` + tokens** (o tema vem do CSS), nunca cor fixa/hex. `ChartBox` mede a
  largura via `ResizeObserver` (evita o bug de width(-1) do ResponsiveContainer).
- `types.ts` espelha exatamente a resposta da API (`ReportSummary`) — atualizar junto quando o
  `/reports` mudar (ex.: `byStatus`).
- `periods.ts` é a fonte dos intervalos/buckets e do `deltaPct`. Cálculo de data no `queryFn` (não no
  render) p/ não chamar `new Date()` impuro durante a renderização.
- **Movimento = um card só** (`movement-card`): abas trocam a dimensão (dia/hora) por estado do
  `Tabs` (sem refetch); o filtro de período do topo continua mandando no intervalo.
- **Densidade > gráfico inflado** (`retention-kpis`): preferir KPIs (valor + `deltaPct`) a gráficos
  grandes/vazios. No-show já é KPI do topo — não duplicar. Lógica pura em `metrics.ts` (testada).

## Referências
- `../CLAUDE.md` (tenant) · raiz · `types.ts`
