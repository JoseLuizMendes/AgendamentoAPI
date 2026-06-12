// Paleta estável por serviço — dá o visual colorido tipo as agendas de referência.
// A cor é determinística pelo id do serviço (mesmo serviço = mesma cor sempre).

const PALETTE = [
  { bg: "#2563eb", border: "#1d4ed8" }, // azul
  { bg: "#059669", border: "#047857" }, // esmeralda
  { bg: "#7c3aed", border: "#6d28d9" }, // violeta
  { bg: "#d97706", border: "#b45309" }, // âmbar
  { bg: "#db2777", border: "#be185d" }, // rosa
  { bg: "#0891b2", border: "#0e7490" }, // ciano
  { bg: "#ea580c", border: "#c2410c" }, // laranja
  { bg: "#0d9488", border: "#0f766e" }, // teal
];

export type EventColor = { bg: string; border: string; text: string };

export function serviceColor(serviceId: number): EventColor {
  const c = PALETTE[serviceId % PALETTE.length] ?? PALETTE[0]!;
  return { bg: c.bg, border: c.border, text: "#ffffff" };
}

// Cor por status — usada no modo "status" e sempre na borda lateral do evento,
// para dar leitura imediata do estágio (espelha a semântica do StatusPill).
const STATUS_PALETTE: Record<string, { bg: string; border: string }> = {
  SCHEDULED: { bg: "#3b82f6", border: "#1d4ed8" }, // azul — agendado
  CONFIRMED: { bg: "#10b981", border: "#047857" }, // esmeralda — confirmado
  COMPLETED: { bg: "#64748b", border: "#334155" }, // slate — concluído
  NO_SHOW: { bg: "#f59e0b", border: "#b45309" }, // âmbar — faltou
  CANCELED: { bg: "#ef4444", border: "#b91c1c" }, // vermelho — cancelado
};

export function statusColor(status: string): EventColor {
  const c = STATUS_PALETTE[status] ?? { bg: "#64748b", border: "#334155" };
  return { bg: c.bg, border: c.border, text: "#ffffff" };
}

export type ColorMode = "service" | "status";
