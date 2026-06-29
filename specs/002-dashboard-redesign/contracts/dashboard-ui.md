# Contract — UI do Dashboard (componentes)

Contrato dos componentes novos/alterados. Sem API nova — consomem `ReportSummary` já existente.

## MovementCard

- **Props**: `{ byWeekday: number[]; byHour: number[]; className?: string }`
- **Comportamento**:
  - Um `Card` com `Tabs` (shadcn): aba **"Por dia da semana"** (default) e **"Por hora"**.
  - Cada aba renderiza `HighlightBars` com a série da dimensão e o pico destacado.
  - Estado da aba é **local** (`useState`); trocar de aba **não** dispara fetch.
  - Período/intervalo vem de fora (a página já filtra `/reports/summary` por período).
- **Vazio**: se a série é toda zero, mostra estado vazio compacto (não barra invisível gigante).

## RetentionKpis

- **Props**: `{ current: ReportScalars; previous: ReportScalars }`
- **Renderiza** (padrão `Kpi` + `deltaPct`):
  - **Cancelamento**: `cancelRate` em %, delta vs `previous`; "—" se `appointmentsTotal === 0`.
  - **No-show**: `noShowRate` em %, delta vs `previous`; "—" se `appointmentsTotal === 0`.
  - **Novos vs recorrentes**: `clientSplit(current)` → novos/recorrentes + proporção.
- **Negativo**: aumento de cancelamento/no-show é "ruim" → usa o acento **coral** (canon: coral só
  para negativo); `invertGood` como nos KPIs existentes.

## charts.tsx (ajuste)

- Alturas dos gráficos reduzidas/parametrizadas (compacto), mantendo `currentColor` + tokens.
- Sem mudança de assinatura que quebre os usos atuais (ou com default retrocompatível).

## Página `dashboard/page.tsx` (reorganização)

- Substitui os dois cards de movimento pelo **MovementCard** único.
- Adiciona o bloco **RetentionKpis** onde antes havia gráfico inflado.
- Mantém: filtro de período no topo, KPIs existentes, `StatusFunnel`, Top serviços, export CSV.
