import { describe, expect, it } from "vitest";
import { assertDental, isValidFdiTooth } from "../../src/utils/dental.js";
import { ValidationError } from "../../src/utils/errors.js";

describe("isValidFdiTooth (FDI/ISO 3950)", () => {
  it.each([11, 18, 21, 28, 31, 38, 41, 48])("aceita permanente %i", (n) => {
    expect(isValidFdiTooth(n)).toBe(true);
  });

  it.each([51, 55, 61, 65, 71, 75, 81, 85])("aceita decíduo %i", (n) => {
    expect(isValidFdiTooth(n)).toBe(true);
  });

  it.each([
    10, // dente 0
    19, // permanente só vai até 8
    29,
    39,
    49,
    50, // decíduo só vai até 5
    56,
    86,
    9, // sem quadrante
    0,
    90, // quadrante 9 não existe
    99,
    100,
    -11,
    11.5, // não inteiro
  ])("rejeita inválido %s", (n) => {
    expect(isValidFdiTooth(n)).toBe(false);
  });
});

describe("assertDental (gating por vertical)", () => {
  it("não lança para tenant DENTAL", () => {
    expect(() => assertDental("DENTAL")).not.toThrow();
  });

  it("lança ValidationError para tenant GENERIC", () => {
    expect(() => assertDental("GENERIC")).toThrow(ValidationError);
  });
});
