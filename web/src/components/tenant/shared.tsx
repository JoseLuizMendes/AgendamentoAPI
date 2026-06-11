// Helpers e pequenos componentes reusados entre Agenda, Serviços, Horários e Dashboard.

export const DAYS = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

export const STATUS_META: Record<string, { label: string; cls: string }> = {
  SCHEDULED: { label: "Agendado", cls: "border-foreground/20 text-foreground" },
  CONFIRMED: {
    label: "Confirmado",
    cls: "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  },
  COMPLETED: { label: "Concluído", cls: "border-foreground/15 bg-foreground/5 text-muted-foreground" },
  NO_SHOW: {
    label: "Não compareceu",
    cls: "border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400",
  },
  CANCELED: { label: "Cancelado", cls: "border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-400" },
};

/** Próximos status possíveis a partir do atual (espelha o backend). */
export const NEXT_STATUS: Record<string, { value: string; label: string }[]> = {
  SCHEDULED: [
    { value: "CONFIRMED", label: "Confirmar" },
    { value: "COMPLETED", label: "Concluir" },
    { value: "CANCELED", label: "Cancelar" },
  ],
  CONFIRMED: [
    { value: "COMPLETED", label: "Concluir" },
    { value: "NO_SHOW", label: "Faltou" },
    { value: "CANCELED", label: "Cancelar" },
  ],
  COMPLETED: [],
  NO_SHOW: [],
  CANCELED: [],
};

export function formatBRL(cents: number): string {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function StatusPill({ status }: { status: string }) {
  const meta = STATUS_META[status] ?? { label: status, cls: "border-foreground/20 text-foreground" };
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${meta.cls}`}>
      {meta.label}
    </span>
  );
}

type IconType = React.ComponentType<{ className?: string }>;

export function EmptyState({ icon: Icon, children }: { icon: IconType; children: React.ReactNode }) {
  return (
    <div className="border-border flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed px-6 py-12 text-center">
      <Icon className="text-muted-foreground size-6" />
      <p className="text-muted-foreground text-sm">{children}</p>
    </div>
  );
}

export function Kpi({ icon: Icon, label, value }: { icon: IconType; label: string; value: string | number }) {
  return (
    <div className="bg-card/60 relative overflow-hidden rounded-xl border p-5 backdrop-blur">
      <div className="text-muted-foreground flex items-center gap-2 font-mono text-xs uppercase tracking-widest">
        <Icon className="size-4" />
        {label}
      </div>
      <div className="font-display mt-3 text-4xl leading-none tracking-wide">{value}</div>
    </div>
  );
}
