import { describe, it, expect } from "vitest";
import { effectiveHoursForDate, computeLockedBands, isAvailable } from "./availability";
import type { BusinessHours, BusinessDateOverride } from "@/components/tenant/types";

const SLOT_MIN = "08:30:00";
const SLOT_MAX = "21:00:00";

function bh(p: Partial<BusinessHours> & { dayOfWeek: number }): BusinessHours {
  return {
    id: p.dayOfWeek + 1,
    dayOfWeek: p.dayOfWeek,
    openTime: p.openTime ?? "09:00",
    closeTime: p.closeTime ?? "18:00",
    isOff: p.isOff ?? false,
    tenantId: 1,
    breaks: p.breaks ?? [],
  };
}
// Seg 2026-06-15; weekday local = 1 (segunda)
const monday = (h: number, m = 0) => new Date(2026, 5, 15, h, m, 0, 0);

describe("effectiveHoursForDate", () => {
  it("usa as horas do dia da semana quando não há override", () => {
    const eff = effectiveHoursForDate(monday(0), [bh({ dayOfWeek: 1, openTime: "09:00", closeTime: "18:00" })], []);
    expect(eff).toEqual({ open: "09:00", close: "18:00", breaks: [] });
  });
  it("retorna null em dia isOff", () => {
    expect(effectiveHoursForDate(monday(0), [bh({ dayOfWeek: 1, isOff: true })], [])).toBeNull();
  });
  it("retorna null em override de feriado (isOff)", () => {
    const ov: BusinessDateOverride[] = [{ id: 1, date: "2026-06-15", isOff: true, tenantId: 1 }];
    expect(effectiveHoursForDate(monday(0), [bh({ dayOfWeek: 1 })], ov)).toBeNull();
  });
  it("override de horário especial usa as horas do override + breaks do dia da semana", () => {
    const ov: BusinessDateOverride[] = [{ id: 1, date: "2026-06-15", isOff: false, openTime: "10:00", closeTime: "14:00", tenantId: 1 }];
    const hours = [bh({ dayOfWeek: 1, breaks: [{ id: 9, businessHoursId: 2, startTime: "12:00", endTime: "13:00" }] })];
    expect(effectiveHoursForDate(monday(0), hours, ov)).toEqual({
      open: "10:00",
      close: "14:00",
      breaks: [{ start: "12:00", end: "13:00" }],
    });
  });
});

describe("isAvailable", () => {
  const hours = [bh({ dayOfWeek: 1, openTime: "09:00", closeTime: "18:00", breaks: [{ id: 9, businessHoursId: 2, startTime: "12:00", endTime: "13:00" }] })];
  const now = monday(10, 0);
  it("true dentro do expediente e no futuro", () => {
    expect(isAvailable(monday(14, 0), monday(15, 0), hours, [], now, SLOT_MIN, SLOT_MAX)).toBe(true);
  });
  it("false no passado", () => {
    expect(isAvailable(monday(9, 0), monday(9, 30), hours, [], now, SLOT_MIN, SLOT_MAX)).toBe(false);
  });
  it("false dentro do almoço (break)", () => {
    expect(isAvailable(monday(12, 0), monday(12, 30), hours, [], now, SLOT_MIN, SLOT_MAX)).toBe(false);
  });
  it("false após o fechamento", () => {
    expect(isAvailable(monday(18, 0), monday(18, 30), hours, [], now, SLOT_MIN, SLOT_MAX)).toBe(false);
  });
  it("false em dia fechado", () => {
    expect(isAvailable(monday(14, 0), monday(15, 0), [bh({ dayOfWeek: 1, isOff: true })], [], now, SLOT_MIN, SLOT_MAX)).toBe(false);
  });
});

describe("computeLockedBands", () => {
  const hours = [bh({ dayOfWeek: 1, openTime: "09:00", closeTime: "18:00", breaks: [{ id: 9, businessHoursId: 2, startTime: "12:00", endTime: "13:00" }] })];
  it("gera faixas sem sobreposição e cobre passado/antes/almoço/depois", () => {
    const now = monday(10, 0);
    const bands = computeLockedBands([monday(0)], hours, [], now, SLOT_MIN, SLOT_MAX);
    const sorted = [...bands].sort((a, b) => a.start.getTime() - b.start.getTime());
    for (let i = 1; i < sorted.length; i++) {
      expect(sorted[i].start.getTime()).toBeGreaterThanOrEqual(sorted[i - 1].end.getTime());
    }
    const has = (s: Date, e: Date) => sorted.some((b) => b.start.getTime() === s.getTime() && b.end.getTime() === e.getTime());
    expect(has(monday(8, 30), monday(10, 0))).toBe(true);
    expect(has(monday(12, 0), monday(13, 0))).toBe(true);
    expect(has(monday(18, 0), monday(21, 0))).toBe(true);
  });
  it("dia fechado vira uma faixa cobrindo a grade inteira", () => {
    const now = monday(7, 0);
    const bands = computeLockedBands([monday(0)], [bh({ dayOfWeek: 1, isOff: true })], [], now, SLOT_MIN, SLOT_MAX);
    expect(bands).toHaveLength(1);
    expect(bands[0].start.getTime()).toBe(monday(8, 30).getTime());
    expect(bands[0].end.getTime()).toBe(monday(21, 0).getTime());
  });
});
