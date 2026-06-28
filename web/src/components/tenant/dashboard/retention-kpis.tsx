import { CalendarX2, Repeat, UserPlus } from "lucide-react";

import { KpiCard } from "./kpi-card";
import { clientSplit, formatRate } from "./metrics";
import { deltaPct } from "./periods";
import type { ReportScalars } from "./types";

/**
 * Métricas de retenção que densificam o dashboard (em vez de gráficos inflados):
 * cancelamento (aumento é ruim → invertGood) e a divisão novos vs recorrentes.
 * No-show já é KPI no topo — não duplicado aqui.
 */
export function RetentionKpis({ current, previous }: { current: ReportScalars; previous: ReportScalars }) {
  const hasBase = current.appointmentsTotal > 0;
  const split = clientSplit(current);
  const pct = (v: number) => `${Math.round(v * 100)}%`;

  return (
    <div className="grid gap-4 sm:grid-cols-3">
      <KpiCard
        icon={CalendarX2}
        label="Cancelamento"
        value={formatRate(current.cancelRate, hasBase)}
        delta={deltaPct(current.cancelRate, previous.cancelRate)}
        invertGood
      />
      <KpiCard
        icon={UserPlus}
        label="Clientes novos"
        value={String(split.novos)}
        delta={deltaPct(current.newClients, previous.newClients)}
        hint={split.totalClientes > 0 ? `${pct(split.novosPct)} do total` : "no período"}
      />
      <KpiCard
        icon={Repeat}
        label="Recorrentes"
        value={String(split.recorrentes)}
        delta={deltaPct(current.clients - current.newClients, previous.clients - previous.newClients)}
        hint={split.totalClientes > 0 ? `${pct(1 - split.novosPct)} do total` : "no período"}
      />
    </div>
  );
}
