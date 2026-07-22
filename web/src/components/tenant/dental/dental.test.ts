import { describe, expect, it } from "vitest";
import type { MeResponse } from "../types";
import {
  DENTAL_PROCEDURES,
  PERMANENT_LOWER,
  PERMANENT_UPPER,
  PROCEDURE_LABEL,
  isDental,
} from "./dental";

function me(businessType: "GENERIC" | "DENTAL"): MeResponse {
  return {
    id: 1,
    email: "owner@example.com",
    role: "OWNER",
    tenantId: 1,
    tenant: { id: 1, name: "Clinica", slug: "clinica", businessType },
  };
}

describe("odontograma (layout FDI)", () => {
  it("16 dentes por arcada, 32 no total, sem repetição", () => {
    expect(PERMANENT_UPPER).toHaveLength(16);
    expect(PERMANENT_LOWER).toHaveLength(16);
    expect(new Set([...PERMANENT_UPPER, ...PERMANENT_LOWER]).size).toBe(32);
  });

  it("só dentes permanentes válidos (quadrante 1-4, unidade 1-8)", () => {
    for (const n of [...PERMANENT_UPPER, ...PERMANENT_LOWER]) {
      const quadrant = Math.floor(n / 10);
      const unit = n % 10;
      expect(quadrant).toBeGreaterThanOrEqual(1);
      expect(quadrant).toBeLessThanOrEqual(4);
      expect(unit).toBeGreaterThanOrEqual(1);
      expect(unit).toBeLessThanOrEqual(8);
    }
  });

  it("todo procedimento tem rótulo pt-BR", () => {
    for (const p of DENTAL_PROCEDURES) {
      expect(PROCEDURE_LABEL[p]).toBeTruthy();
    }
  });

  it("isDental: true só para tenant DENTAL", () => {
    expect(isDental(me("DENTAL"))).toBe(true);
    expect(isDental(me("GENERIC"))).toBe(false);
  });
});
