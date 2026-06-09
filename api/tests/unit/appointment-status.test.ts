import { describe, expect, it } from "vitest";
import { assertStatusTransition, canTransition } from "../../src/services/appointment-status.js";
import { ValidationError } from "../../src/utils/errors.js";

describe("appointment-status/canTransition", () => {
  it("permite transições válidas", () => {
    expect(canTransition("SCHEDULED", "CONFIRMED")).toBe(true);
    expect(canTransition("SCHEDULED", "CANCELED")).toBe(true);
    expect(canTransition("CONFIRMED", "COMPLETED")).toBe(true);
    expect(canTransition("CONFIRMED", "NO_SHOW")).toBe(true);
  });

  it("bloqueia transições inválidas (estados terminais)", () => {
    expect(canTransition("CANCELED", "COMPLETED")).toBe(false);
    expect(canTransition("COMPLETED", "CONFIRMED")).toBe(false);
    expect(canTransition("NO_SHOW", "SCHEDULED")).toBe(false);
  });

  it("trata mesma situação (no-op) como válida", () => {
    expect(canTransition("SCHEDULED", "SCHEDULED")).toBe(true);
    expect(canTransition("COMPLETED", "COMPLETED")).toBe(true);
  });
});

describe("appointment-status/assertStatusTransition", () => {
  it("não lança em transição válida", () => {
    expect(() => assertStatusTransition("SCHEDULED", "CONFIRMED")).not.toThrow();
  });

  it("não lança quando o status não muda", () => {
    expect(() => assertStatusTransition("CONFIRMED", "CONFIRMED")).not.toThrow();
  });

  it("lança ValidationError em transição inválida", () => {
    expect(() => assertStatusTransition("CANCELED", "COMPLETED")).toThrow(ValidationError);
    expect(() => assertStatusTransition("CANCELED", "COMPLETED")).toThrow(/inválida/i);
  });
});
