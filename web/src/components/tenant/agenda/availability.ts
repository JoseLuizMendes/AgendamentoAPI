import type { BusinessHours, BusinessDateOverride } from "@/components/tenant/types";

export type Interval = { start: Date; end: Date };
type EffectiveHours = { open: string; close: string; breaks: { start: string; end: string }[] };

/** "yyyy-MM-dd" local de um Date. */
function dateKey(day: Date): string {
  const y = day.getFullYear();
  const m = String(day.getMonth() + 1).padStart(2, "0");
  const d = String(day.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Date no dia `day` (local) na hora "HH:MM[:SS]". "24:00" → 00:00 do dia seguinte. */
function atTime(day: Date, hhmm: string): Date {
  const [h, m, s] = hhmm.split(":").map(Number);
  const d = new Date(day);
  d.setHours(h, m, s || 0, 0);
  return d;
}

/** Expediente efetivo da data (espelha resolveBusinessForDay do backend). null = fechado. */
export function effectiveHoursForDate(
  day: Date,
  hours: BusinessHours[],
  overrides: BusinessDateOverride[],
): EffectiveHours | null {
  const override = overrides.find((o) => o.date === dateKey(day));
  const weekly = hours.find((h) => h.dayOfWeek === day.getDay());

  if (override) {
    if (override.isOff || !override.openTime || !override.closeTime) return null;
    return {
      open: override.openTime,
      close: override.closeTime,
      breaks: (weekly?.breaks ?? []).map((b) => ({ start: b.startTime, end: b.endTime })),
    };
  }
  if (!weekly || weekly.isOff) return null;
  return {
    open: weekly.openTime,
    close: weekly.closeTime,
    breaks: weekly.breaks.map((b) => ({ start: b.startTime, end: b.endTime })),
  };
}

/** `iv` menos o intervalo [cs, ce]. */
function subtract(iv: Interval, cs: Date, ce: Date): Interval[] {
  if (ce <= iv.start || cs >= iv.end) return [iv];
  const out: Interval[] = [];
  if (cs > iv.start) out.push({ start: iv.start, end: cs });
  if (ce < iv.end) out.push({ start: ce, end: iv.end });
  return out;
}

/** Intervalos DISPONÍVEIS da data: [max(open, now), close] ∩ [slotMin, slotMax] − breaks. */
function availableIntervalsForDay(
  day: Date,
  hours: BusinessHours[],
  overrides: BusinessDateOverride[],
  now: Date,
  slotMin: string,
  slotMax: string,
): Interval[] {
  const eff = effectiveHoursForDate(day, hours, overrides);
  if (!eff) return [];
  const gridStart = atTime(day, slotMin);
  const gridEnd = atTime(day, slotMax);
  let start = atTime(day, eff.open);
  let end = atTime(day, eff.close);
  if (start < gridStart) start = gridStart;
  if (end > gridEnd) end = gridEnd;
  if (now > start) start = now;
  if (end <= start) return [];

  let intervals: Interval[] = [{ start, end }];
  for (const b of eff.breaks) {
    const bs = atTime(day, b.start);
    const be = atTime(day, b.end);
    intervals = intervals.flatMap((iv) => subtract(iv, bs, be));
  }
  return intervals;
}

/** Faixas TRAVADAS (cinza) = complemento das disponíveis dentro de [slotMin, slotMax], por dia. */
export function computeLockedBands(
  days: Date[],
  hours: BusinessHours[],
  overrides: BusinessDateOverride[],
  now: Date,
  slotMin: string,
  slotMax: string,
): Interval[] {
  const bands: Interval[] = [];
  for (const day of days) {
    const gridStart = atTime(day, slotMin);
    const gridEnd = atTime(day, slotMax);
    const avail = availableIntervalsForDay(day, hours, overrides, now, slotMin, slotMax).sort(
      (a, b) => a.start.getTime() - b.start.getTime(),
    );
    let cursor = gridStart;
    for (const iv of avail) {
      if (iv.start > cursor) bands.push({ start: cursor, end: iv.start });
      if (iv.end > cursor) cursor = iv.end;
    }
    if (cursor < gridEnd) bands.push({ start: cursor, end: gridEnd });
  }
  return bands;
}

/** [start, end] cabe inteiro numa janela disponível? (mesma base das faixas). */
export function isAvailable(
  start: Date,
  end: Date,
  hours: BusinessHours[],
  overrides: BusinessDateOverride[],
  now: Date,
  slotMin: string,
  slotMax: string,
): boolean {
  return availableIntervalsForDay(start, hours, overrides, now, slotMin, slotMax).some(
    (iv) => start >= iv.start && end <= iv.end,
  );
}
