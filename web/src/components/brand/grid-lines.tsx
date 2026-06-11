import { cn } from "@/lib/utils";

/**
 * Grade fina de fundo, motivo recorrente da referência (hero, auth, painel).
 * `tone="background"` desenha linhas claras para superfícies escuras.
 */
export function GridLines({
  className,
  rows = 8,
  cols = 12,
  tone = "foreground",
}: {
  className?: string;
  rows?: number;
  cols?: number;
  tone?: "foreground" | "background";
}) {
  const line = tone === "background" ? "bg-background/10" : "bg-foreground/10";
  return (
    <div className={cn("pointer-events-none absolute inset-0 overflow-hidden", className)} aria-hidden>
      {Array.from({ length: rows - 1 }).map((_, i) => (
        <div
          key={`h-${i}`}
          className={cn("absolute left-0 right-0 h-px", line)}
          style={{ top: `${(100 / rows) * (i + 1)}%` }}
        />
      ))}
      {Array.from({ length: cols - 1 }).map((_, i) => (
        <div
          key={`v-${i}`}
          className={cn("absolute bottom-0 top-0 w-px", line)}
          style={{ left: `${(100 / cols) * (i + 1)}%` }}
        />
      ))}
    </div>
  );
}
