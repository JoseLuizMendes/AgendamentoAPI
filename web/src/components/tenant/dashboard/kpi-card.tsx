import { ArrowDown, ArrowUp } from "lucide-react";

import { cn } from "@/lib/utils";

type IconType = React.ComponentType<{ className?: string }>;

/**
 * Card de indicador com valor e variação vs período anterior.
 * `invertGood` para métricas onde cair é bom (ex.: no-show).
 */
export function KpiCard({
  icon: Icon,
  label,
  value,
  delta,
  invertGood = false,
  hint,
}: {
  icon: IconType;
  label: string;
  value: string;
  delta?: number | null;
  invertGood?: boolean;
  hint?: string;
}) {
  const hasDelta = delta !== undefined && delta !== null;
  const up = hasDelta && (delta as number) >= 0;
  const good = hasDelta && (invertGood ? !up : up);

  return (
    <div className="bg-card/60 relative overflow-hidden rounded-xl border p-5 backdrop-blur">
      <div className="text-muted-foreground flex items-center gap-2 font-mono text-xs uppercase tracking-widest">
        <Icon className="size-4" />
        {label}
      </div>
      <div className="font-display mt-3 text-3xl leading-none tracking-wide lg:text-4xl">{value}</div>
      <div className="mt-2 flex items-center gap-2 text-xs">
        {hasDelta ? (
          <span
            className={cn(
              "inline-flex items-center gap-0.5 font-medium",
              good ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400",
            )}
          >
            {up ? <ArrowUp className="size-3" /> : <ArrowDown className="size-3" />}
            {Math.abs(delta as number).toFixed(0)}%
          </span>
        ) : (
          <span className="text-muted-foreground">—</span>
        )}
        <span className="text-muted-foreground">{hint ?? "vs período anterior"}</span>
      </div>
    </div>
  );
}
