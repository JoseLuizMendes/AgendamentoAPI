import { describe, it, expect } from "vitest";
import { summarizeWeek, formatOpenHours } from "./week-summary";
import type { BusinessHours } from "@/components/tenant/types";

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

describe("summarizeWeek", () => {
  it("lista vazia → tudo zero e 7 dias não configurados", () => {
    expect(summarizeWeek([])).toEqual({
      openDays: 0,
      closedDays: 0,
      unsetDays: 7,
      totalOpenMinutes: 0,
      breakCount: 0,
    });
  });

  it("conta dias abertos, fechados e não configurados", () => {
    const hours = [
      bh({ dayOfWeek: 1, openTime: "09:00", closeTime: "18:00" }), // aberto
      bh({ dayOfWeek: 2, openTime: "09:00", closeTime: "18:00" }), // aberto
      bh({ dayOfWeek: 3, isOff: true }), // fechado
    ];
    const s = summarizeWeek(hours);
    expect(s.openDays).toBe(2);
    expect(s.closedDays).toBe(1);
    expect(s.unsetDays).toBe(4); // 7 - 3 configurados
  });

  it("soma horas abertas líquidas (subtrai intervalos)", () => {
    const hours = [
      bh({
        dayOfWeek: 1,
        openTime: "09:00",
        closeTime: "18:00", // 540 min
        breaks: [{ id: 1, businessHoursId: 2, startTime: "12:00", endTime: "13:00" }], // -60
      }),
    ];
    const s = summarizeWeek(hours);
    expect(s.totalOpenMinutes).toBe(480); // 540 - 60
    expect(s.breakCount).toBe(1);
  });

  it("ignora intervalos de dias fechados/não configurados e clampa em zero", () => {
    const hours = [
      bh({ dayOfWeek: 0, isOff: true }),
      bh({
        dayOfWeek: 1,
        openTime: "10:00",
        closeTime: "10:30", // 30 min
        breaks: [{ id: 9, businessHoursId: 2, startTime: "10:00", endTime: "12:00" }], // -120 → clamp 0
      }),
    ];
    const s = summarizeWeek(hours);
    expect(s.totalOpenMinutes).toBe(0);
    expect(s.openDays).toBe(1);
    expect(s.breakCount).toBe(1);
  });
});

describe("formatOpenHours", () => {
  it("formata horas exatas sem minutos", () => {
    expect(formatOpenHours(40 * 60)).toBe("40h");
  });
  it("formata horas com minutos", () => {
    expect(formatOpenHours(42 * 60 + 30)).toBe("42h 30min");
  });
  it("zero", () => {
    expect(formatOpenHours(0)).toBe("0h");
  });
  it("menos de uma hora", () => {
    expect(formatOpenHours(45)).toBe("0h 45min");
  });
});
