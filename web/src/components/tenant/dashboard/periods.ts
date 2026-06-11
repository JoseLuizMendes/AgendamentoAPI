// Presets de período do dashboard → intervalo + granularidade da série.

export type PeriodKey = "day" | "week" | "month" | "quarter" | "semester";

export const PERIODS: { key: PeriodKey; label: string }[] = [
  { key: "day", label: "Hoje" },
  { key: "week", label: "Semana" },
  { key: "month", label: "Mês" },
  { key: "quarter", label: "Trimestre" },
  { key: "semester", label: "Semestre" },
];

export type Range = { from: string; to: string; granularity: "day" | "week" | "month" };

const DAY_MS = 86_400_000;

export function periodRange(key: PeriodKey): Range {
  const now = new Date();
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);
  const tomorrow = new Date(todayStart.getTime() + DAY_MS);
  const daysAgo = (n: number) => new Date(todayStart.getTime() - n * DAY_MS);

  switch (key) {
    case "day":
      return { from: todayStart.toISOString(), to: tomorrow.toISOString(), granularity: "day" };
    case "week":
      return { from: daysAgo(6).toISOString(), to: tomorrow.toISOString(), granularity: "day" };
    case "month":
      return { from: daysAgo(29).toISOString(), to: tomorrow.toISOString(), granularity: "day" };
    case "quarter":
      return { from: daysAgo(89).toISOString(), to: tomorrow.toISOString(), granularity: "week" };
    case "semester":
      return { from: daysAgo(179).toISOString(), to: tomorrow.toISOString(), granularity: "month" };
  }
}

/** Variação percentual atual vs anterior. null quando não há base de comparação. */
export function deltaPct(current: number, previous: number): number | null {
  if (previous === 0) return current === 0 ? 0 : null;
  return ((current - previous) / previous) * 100;
}
