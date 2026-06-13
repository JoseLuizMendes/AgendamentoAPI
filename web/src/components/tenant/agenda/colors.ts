// Cores da agenda por tokens de design (definidos em app/globals.css, bloco
// `@theme static`). Zero hex aqui — só referências var(...), resolvidas pelo
// browser nas cores inline do FullCalendar e nos pontos do dashboard/legenda.

// Paleta estável por serviço — mesma cor sempre para o mesmo id.
const PALETTE = [
  { bg: "var(--color-service-1)", border: "var(--color-service-1-bd)" },
  { bg: "var(--color-service-2)", border: "var(--color-service-2-bd)" },
  { bg: "var(--color-service-3)", border: "var(--color-service-3-bd)" },
  { bg: "var(--color-service-4)", border: "var(--color-service-4-bd)" },
  { bg: "var(--color-service-5)", border: "var(--color-service-5-bd)" },
  { bg: "var(--color-service-6)", border: "var(--color-service-6-bd)" },
  { bg: "var(--color-service-7)", border: "var(--color-service-7-bd)" },
  { bg: "var(--color-service-8)", border: "var(--color-service-8-bd)" },
];

export type EventColor = { bg: string; border: string; text: string };

export function serviceColor(serviceId: number): EventColor {
  const c = PALETTE[serviceId % PALETTE.length] ?? PALETTE[0]!;
  return { bg: c.bg, border: c.border, text: "var(--color-on-event)" };
}

// Cor por status — usada no modo "status" e sempre na borda lateral do evento,
// para dar leitura imediata do estágio (espelha a semântica do StatusPill).
const STATUS_PALETTE: Record<string, { bg: string; border: string }> = {
  SCHEDULED: { bg: "var(--color-status-scheduled)", border: "var(--color-status-scheduled-bd)" },
  CONFIRMED: { bg: "var(--color-status-confirmed)", border: "var(--color-status-confirmed-bd)" },
  COMPLETED: { bg: "var(--color-status-completed)", border: "var(--color-status-completed-bd)" },
  NO_SHOW: { bg: "var(--color-status-no-show)", border: "var(--color-status-no-show-bd)" },
  CANCELED: { bg: "var(--color-status-canceled)", border: "var(--color-status-canceled-bd)" },
};

export function statusColor(status: string): EventColor {
  const c = STATUS_PALETTE[status] ?? STATUS_PALETTE["COMPLETED"]!;
  return { bg: c.bg, border: c.border, text: "var(--color-on-event)" };
}

export type ColorMode = "service" | "status";
