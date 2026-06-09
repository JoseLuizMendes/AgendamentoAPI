import { describe, expect, it } from "vitest";
import { zonedTimeToUtc, dayOfWeekInZone } from "../../src/utils/time.js";
import { calculateAvailableSlots } from "../../src/utils/slots.js";

const TZ = "America/Sao_Paulo"; // UTC-3 (sem DST atualmente)

describe("time/zonedTimeToUtc", () => {
  it("converte horário local para UTC corretamente", () => {
    // 09:00 em São Paulo (UTC-3) = 12:00 UTC
    expect(zonedTimeToUtc("2026-06-15", "09:00", TZ).toISOString()).toBe("2026-06-15T12:00:00.000Z");
    expect(zonedTimeToUtc("2026-06-15", "18:00", TZ).toISOString()).toBe("2026-06-15T21:00:00.000Z");
  });

  it("dayOfWeekInZone retorna 0=Domingo..6=Sábado", () => {
    // 2026-06-15 é segunda-feira (1)
    expect(dayOfWeekInZone("2026-06-15", TZ)).toBe(1);
    // 2026-06-14 é domingo (0)
    expect(dayOfWeekInZone("2026-06-14", TZ)).toBe(0);
  });
});

describe("slots com fuso (toUtc injetado)", () => {
  const toUtc = (d: string, t: string) => zonedTimeToUtc(d, t, TZ);
  const date = "2026-06-15";

  it("gera slots em UTC a partir de horário local", () => {
    const slots = calculateAvailableSlots({
      date,
      serviceDurationMinutes: 30,
      intervalMinutes: 30,
      business: { openTime: "09:00", closeTime: "11:00", isOff: false, breaks: [] },
      appointments: [],
      toUtc,
    });

    // 09:00, 09:30, 10:00, 10:30 local => +3h UTC
    expect(slots.map((s) => s.startTime)).toEqual([
      "2026-06-15T12:00:00.000Z",
      "2026-06-15T12:30:00.000Z",
      "2026-06-15T13:00:00.000Z",
      "2026-06-15T13:30:00.000Z",
    ]);
  });

  it("respeita intervalo de almoço local (12:00-13:00)", () => {
    const slots = calculateAvailableSlots({
      date,
      serviceDurationMinutes: 60,
      intervalMinutes: 60,
      business: {
        openTime: "11:00",
        closeTime: "15:00",
        isOff: false,
        breaks: [{ startTime: "12:00", endTime: "13:00" }],
      },
      appointments: [],
      toUtc,
    });

    // 11:00(ok), 12:00(almoço), 13:00(ok), 14:00(ok) local
    expect(slots.map((s) => s.startTime)).toEqual([
      "2026-06-15T14:00:00.000Z", // 11:00 local
      "2026-06-15T16:00:00.000Z", // 13:00 local
      "2026-06-15T17:00:00.000Z", // 14:00 local
    ]);
  });

  it("remove slot ocupado por agendamento existente (UTC real)", () => {
    const slots = calculateAvailableSlots({
      date,
      serviceDurationMinutes: 30,
      intervalMinutes: 30,
      business: { openTime: "09:00", closeTime: "10:30", isOff: false, breaks: [] },
      appointments: [
        {
          // 09:30 local = 12:30 UTC
          startTime: new Date("2026-06-15T12:30:00.000Z"),
          endTime: new Date("2026-06-15T13:00:00.000Z"),
        },
      ],
      toUtc,
    });

    expect(slots.map((s) => s.startTime)).toEqual([
      "2026-06-15T12:00:00.000Z", // 09:00 local
      "2026-06-15T13:00:00.000Z", // 10:00 local
    ]);
  });

  it("descarta slots antes de notBefore", () => {
    const slots = calculateAvailableSlots({
      date,
      serviceDurationMinutes: 30,
      intervalMinutes: 30,
      business: { openTime: "09:00", closeTime: "11:00", isOff: false, breaks: [] },
      appointments: [],
      toUtc,
      // descarta tudo antes de 10:00 local (13:00 UTC)
      notBefore: new Date("2026-06-15T13:00:00.000Z"),
    });

    expect(slots.map((s) => s.startTime)).toEqual([
      "2026-06-15T13:00:00.000Z", // 10:00 local
      "2026-06-15T13:30:00.000Z", // 10:30 local
    ]);
  });

  it("retorna vazio quando dia está fechado (isOff)", () => {
    expect(
      calculateAvailableSlots({
        date,
        serviceDurationMinutes: 30,
        intervalMinutes: 15,
        business: { openTime: "09:00", closeTime: "18:00", isOff: true, breaks: [] },
        appointments: [],
        toUtc,
      })
    ).toEqual([]);
  });
});
