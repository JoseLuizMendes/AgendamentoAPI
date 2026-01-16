import { describe, expect, it } from "vitest";
import { calculateAvailableSlots, isSlotWithinBusinessHours } from "../../src/lib/slots.js";

const date = "2026-01-16";

describe("lib/slots", () => {
  it("retorna vazio quando business é null/off", () => {
    expect(
      calculateAvailableSlots({
        date,
        serviceDurationMinutes: 30,
        intervalMinutes: 15,
        business: null,
        appointments: [],
      })
    ).toEqual([]);

    expect(
      calculateAvailableSlots({
        date,
        serviceDurationMinutes: 30,
        intervalMinutes: 15,
        business: { openTime: "09:00", closeTime: "10:00", isOff: true, breaks: [] },
        appointments: [],
      })
    ).toEqual([]);
  });

  it("gera slots respeitando duração e intervalo", () => {
    const slots = calculateAvailableSlots({
      date,
      serviceDurationMinutes: 30,
      intervalMinutes: 15,
      business: { openTime: "09:00", closeTime: "10:00", isOff: false, breaks: [] },
      appointments: [],
    });

    expect(slots).toEqual([
      { startTime: "2026-01-16T09:00:00.000Z", endTime: "2026-01-16T09:30:00.000Z" },
      { startTime: "2026-01-16T09:15:00.000Z", endTime: "2026-01-16T09:45:00.000Z" },
      { startTime: "2026-01-16T09:30:00.000Z", endTime: "2026-01-16T10:00:00.000Z" },
    ]);
  });

  it("remove slots que colidem com pausas", () => {
    const slots = calculateAvailableSlots({
      date,
      serviceDurationMinutes: 30,
      intervalMinutes: 15,
      business: {
        openTime: "09:00",
        closeTime: "10:00",
        isOff: false,
        breaks: [{ startTime: "09:10", endTime: "09:20" }],
      },
      appointments: [],
    });

    expect(slots).toEqual([{ startTime: "2026-01-16T09:30:00.000Z", endTime: "2026-01-16T10:00:00.000Z" }]);
  });

  it("remove slots que colidem com agendamentos existentes", () => {
    const slots = calculateAvailableSlots({
      date,
      serviceDurationMinutes: 30,
      intervalMinutes: 15,
      business: { openTime: "09:00", closeTime: "10:00", isOff: false, breaks: [] },
      appointments: [
        {
          startTime: new Date("2026-01-16T09:30:00.000Z"),
          endTime: new Date("2026-01-16T10:00:00.000Z"),
        },
      ],
    });

    expect(slots).toEqual([{ startTime: "2026-01-16T09:00:00.000Z", endTime: "2026-01-16T09:30:00.000Z" }]);
  });

  it("isSlotWithinBusinessHours valida janela e pausas", () => {
    const business = {
      openTime: "09:00",
      closeTime: "10:00",
      isOff: false,
      breaks: [{ startTime: "09:10", endTime: "09:20" }],
    };

    expect(
      isSlotWithinBusinessHours({
        date,
        business,
        startTime: new Date("2026-01-16T09:00:00.000Z"),
        endTime: new Date("2026-01-16T09:30:00.000Z"),
      })
    ).toBe(false);

    expect(
      isSlotWithinBusinessHours({
        date,
        business,
        startTime: new Date("2026-01-16T09:30:00.000Z"),
        endTime: new Date("2026-01-16T10:00:00.000Z"),
      })
    ).toBe(true);
  });
});
