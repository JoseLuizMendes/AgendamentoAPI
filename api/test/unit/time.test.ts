import { describe, expect, it } from "vitest";
import { assertIsoDate, dateAtUtcTime, parseTimeToMinutes, toDayOfWeekUtc } from "../../src/lib/time.js";

describe("lib/time", () => {
  it("parseTimeToMinutes converte HH:MM", () => {
    expect(parseTimeToMinutes("00:00")).toBe(0);
    expect(parseTimeToMinutes("01:30")).toBe(90);
    expect(parseTimeToMinutes("23:59")).toBe(23 * 60 + 59);
  });

  it("parseTimeToMinutes rejeita formato inválido", () => {
    expect(() => parseTimeToMinutes("9:00")).toThrow(/HH:MM/);
    expect(() => parseTimeToMinutes("24:00")).toThrow(/intervalo/);
    expect(() => parseTimeToMinutes("10:60")).toThrow(/intervalo/);
  });

  it("assertIsoDate valida YYYY-MM-DD", () => {
    expect(() => assertIsoDate("2026-01-16")).not.toThrow();
    expect(() => assertIsoDate("2026/01/16")).toThrow(/YYYY-MM-DD/);
  });

  it("toDayOfWeekUtc usa UTC", () => {
    // 2026-01-16 é sexta-feira (5)
    expect(toDayOfWeekUtc("2026-01-16")).toBe(5);
  });

  it("dateAtUtcTime cria Date em UTC", () => {
    expect(dateAtUtcTime("2026-01-16", "09:15").toISOString()).toBe("2026-01-16T09:15:00.000Z");
  });
});
