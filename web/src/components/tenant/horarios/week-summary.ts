import type { BusinessHours } from "@/components/tenant/types";

const DAYS_IN_WEEK = 7;

export type WeekSummary = {
  /** Dias configurados e não isOff. */
  openDays: number;
  /** Dias configurados com isOff. */
  closedDays: number;
  /** Dias sem configuração (7 - configurados). */
  unsetDays: number;
  /** Soma das horas abertas líquidas (menos intervalos), >= 0. */
  totalOpenMinutes: number;
  /** Total de intervalos nos dias abertos. */
  breakCount: number;
};

/** "HH:MM" → minutos desde a meia-noite. */
function toMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

/** Estatísticas só-leitura da grade semanal de horários. */
export function summarizeWeek(hours: BusinessHours[]): WeekSummary {
  let openDays = 0;
  let closedDays = 0;
  let totalOpenMinutes = 0;
  let breakCount = 0;

  for (let day = 0; day < DAYS_IN_WEEK; day++) {
    const h = hours.find((x) => x.dayOfWeek === day);
    if (!h) continue;
    if (h.isOff) {
      closedDays++;
      continue;
    }
    openDays++;
    breakCount += h.breaks.length;
    const breakMinutes = h.breaks.reduce(
      (sum, b) => sum + Math.max(0, toMinutes(b.endTime) - toMinutes(b.startTime)),
      0,
    );
    const net = toMinutes(h.closeTime) - toMinutes(h.openTime) - breakMinutes;
    totalOpenMinutes += Math.max(0, net);
  }

  const configured = openDays + closedDays;
  return {
    openDays,
    closedDays,
    unsetDays: DAYS_IN_WEEK - configured,
    totalOpenMinutes,
    breakCount,
  };
}

/** Minutos → rótulo legível: "40h", "42h 30min", "0h 45min", "0h". */
export function formatOpenHours(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h}h` : `${h}h ${m}min`;
}
