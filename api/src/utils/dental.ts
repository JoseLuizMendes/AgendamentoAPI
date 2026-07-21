import type { BusinessType } from "@prisma/client";
import { ValidationError } from "./errors.js";

/**
 * Valida um número de dente na notação **FDI/ISO 3950** (dois dígitos: quadrante + dente).
 *
 * - Permanentes: quadrantes 1–4, dentes 1–8 → 11–18, 21–28, 31–38, 41–48.
 * - Decíduos (dentes de leite): quadrantes 5–8, dentes 1–5 → 51–55, 61–65, 71–75, 81–85.
 *
 * O dado suporta ambos (aditivo). Mostrar decíduo no picker é decisão de UI (Fatia 4).
 */
export function isValidFdiTooth(n: number): boolean {
  if (!Number.isInteger(n)) return false;
  const quadrant = Math.floor(n / 10);
  const tooth = n % 10;
  if (quadrant >= 1 && quadrant <= 4) return tooth >= 1 && tooth <= 8; // permanentes
  if (quadrant >= 5 && quadrant <= 8) return tooth >= 1 && tooth <= 5; // decíduos
  return false;
}

/**
 * Gating por vertical: recursos odontológicos só operam em tenant `DENTAL`.
 *
 * Tenant `GENERIC` nunca grava nem enxerga dente — mantém a API genérica/revendável limpa.
 */
export function assertDental(businessType: BusinessType): void {
  if (businessType !== "DENTAL") {
    throw new ValidationError("Módulo odontológico não habilitado para este tenant");
  }
}
