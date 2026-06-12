import { statusColor } from "@/components/tenant/agenda/colors";
import { STATUS_META } from "@/components/tenant/shared";

const ORDER = ["SCHEDULED", "CONFIRMED", "COMPLETED", "NO_SHOW", "CANCELED"] as const;

/**
 * Distribuição dos agendamentos por status no período, em barras proporcionais
 * à fatia do total — leitura tipo funil do estágio de cada agendamento.
 */
export function StatusFunnel({ byStatus }: { byStatus: Record<string, number> }) {
  const total = ORDER.reduce((sum, s) => sum + (byStatus[s] ?? 0), 0);

  if (total === 0) {
    return <p className="text-muted-foreground text-sm">Sem dados no período.</p>;
  }

  const completed = byStatus["COMPLETED"] ?? 0;
  const conversion = Math.round((completed / total) * 100);

  return (
    <div className="space-y-3">
      {ORDER.map((s) => {
        const count = byStatus[s] ?? 0;
        const pct = Math.round((count / total) * 100);
        const color = statusColor(s).bg;
        return (
          <div key={s} className="space-y-1">
            <div className="flex items-baseline justify-between gap-3 text-sm">
              <span className="flex items-center gap-2 font-medium">
                <span className="size-2.5 shrink-0 rounded-[3px]" style={{ background: color }} aria-hidden />
                {STATUS_META[s]?.label ?? s}
              </span>
              <span className="text-muted-foreground shrink-0 tabular-nums">
                {count} · {pct}%
              </span>
            </div>
            <div className="bg-muted h-2 overflow-hidden rounded-full">
              <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
            </div>
          </div>
        );
      })}
      <p className="text-muted-foreground border-t pt-3 text-xs">
        Taxa de conclusão <span className="text-foreground font-medium tabular-nums">{conversion}%</span> ·{" "}
        {completed} de {total} agendamentos
      </p>
    </div>
  );
}
