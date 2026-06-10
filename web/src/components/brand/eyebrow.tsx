import { cn } from "@/lib/utils";

/**
 * Rótulo "eyebrow" da referência: traço curto + texto em mono.
 * `tone="invert"` para uso sobre superfícies escuras (painel de marca).
 */
export function Eyebrow({
  children,
  className,
  tone = "muted",
}: {
  children: React.ReactNode;
  className?: string;
  tone?: "muted" | "invert";
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-3 font-mono text-sm",
        tone === "invert" ? "text-background/60" : "text-muted-foreground",
        className,
      )}
    >
      <span className={cn("h-px w-8", tone === "invert" ? "bg-background/30" : "bg-foreground/30")} />
      {children}
    </span>
  );
}
