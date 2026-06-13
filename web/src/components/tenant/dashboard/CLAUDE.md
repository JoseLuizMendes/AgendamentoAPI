---
nicho: "web/src/components/tenant/dashboard"
escopo: "Indicadores e gráficos do dashboard (Recharts)"
---

# web/src/components/tenant/dashboard/

> Complementa `../CLAUDE.md` (tenant) e a raiz.

## Escopo

`charts` (área/barras Recharts), `kpi-card`, `status-funnel`, `periods` (presets de período +
deltas), `export` (CSV), `types` (espelha `GET /reports/summary`).

## Diretrizes

- A página do dashboard busca `/reports/summary` via **`useQuery`** keyed por período; aqui ficam só
  os componentes de visualização (recebem dados por props).
- **Recharts via `currentColor` + tokens** (o tema vem do CSS), nunca cor fixa/hex. `ChartBox` mede a
  largura via `ResizeObserver` (evita o bug de width(-1) do ResponsiveContainer).
- `types.ts` espelha exatamente a resposta da API (`ReportSummary`) — atualizar junto quando o
  `/reports` mudar (ex.: `byStatus`).
- `periods.ts` é a fonte dos intervalos/buckets e do `deltaPct`. Cálculo de data no `queryFn` (não no
  render) p/ não chamar `new Date()` impuro durante a renderização.

## Referências
- `../CLAUDE.md` (tenant) · raiz · `types.ts`
