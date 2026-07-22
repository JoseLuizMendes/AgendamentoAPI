import { describe, expect, it } from "vitest";
import type { MeResponse, Patient } from "../types";
import {
  DENTAL_PROCEDURES,
  PERMANENT_LOWER,
  PERMANENT_UPPER,
  PROCEDURE_LABEL,
  digitsOnly,
  findPatientByPhone,
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

function patient(id: number, phone: string): Patient {
  return {
    id,
    tenantId: 1,
    name: `Paciente ${id}`,
    phone,
    email: null,
    birthDate: null,
    notes: null,
    createdAt: "",
    updatedAt: "",
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

describe("findPatientByPhone", () => {
  it("digitsOnly remove a formatação", () => {
    expect(digitsOnly("+55 (11) 90000-0000")).toBe("5511900000000");
  });

  it("casa telefone formatado do cliente com o normalizado do paciente", () => {
    const patients = [patient(1, "5511900000000"), patient(2, "5511888887777")];
    expect(findPatientByPhone(patients, "+55 11 90000-0000")?.id).toBe(1);
  });

  it("sem correspondência → undefined", () => {
    expect(findPatientByPhone([patient(1, "5511900000000")], "5511111111111")).toBeUndefined();
  });

  it("telefone vazio → undefined", () => {
    expect(findPatientByPhone([patient(1, "5511900000000")], "")).toBeUndefined();
  });
});
