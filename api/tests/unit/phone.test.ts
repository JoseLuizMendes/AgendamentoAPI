import { describe, expect, it } from "vitest";
import { normalizePhone } from "../../src/utils/phone.js";

describe("normalizePhone", () => {
  it("mantém só dígitos", () => {
    expect(normalizePhone("+55 (11) 99999-1234")).toBe("5511999991234");
  });

  it("sem dígito vira string vazia", () => {
    expect(normalizePhone("abc-!")).toBe("");
  });

  it("já normalizado permanece igual", () => {
    expect(normalizePhone("5511900000000")).toBe("5511900000000");
  });
});
