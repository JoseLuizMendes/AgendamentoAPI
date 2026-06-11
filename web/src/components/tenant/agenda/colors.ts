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
