import type { DentalProcedure, MeResponse } from "../types";

/** Vocabulário de procedimentos (espelha o enum DentalProcedure da API). */
export const DENTAL_PROCEDURES: readonly DentalProcedure[] = [
  "AVALIACAO",
  "PROFILAXIA",
  "RESTAURACAO",
  "ENDODONTIA",
  "EXTRACAO",
  "COROA",
  "PROTESE",
  "IMPLANTE",
  "CLAREAMENTO",
  "RASPAGEM",
  "SELANTE",
  "FLUOR",
  "RADIOGRAFIA",
  "OUTRO",
];

export const PROCEDURE_LABEL: Record<DentalProcedure, string> = {
  AVALIACAO: "Avaliação",
  PROFILAXIA: "Profilaxia",
  RESTAURACAO: "Restauração",
  ENDODONTIA: "Endodontia",
  EXTRACAO: "Extração",
  COROA: "Coroa",
  PROTESE: "Prótese",
  IMPLANTE: "Implante",
  CLAREAMENTO: "Clareamento",
  RASPAGEM: "Raspagem",
  SELANTE: "Selante",
  FLUOR: "Flúor",
  RADIOGRAFIA: "Radiografia",
  OUTRO: "Outro",
};

// Layout do odontograma na notação FDI/ISO 3950 (visão do profissional: da direita do
// paciente para a esquerda). Só dentes permanentes no MVP — o dado já suporta decíduos (51-85).
export const PERMANENT_UPPER: readonly number[] = [
  18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28,
];
export const PERMANENT_LOWER: readonly number[] = [
  48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38,
];

/** Gate de vertical: a UI odontológica só aparece em tenant DENTAL. */
export function isDental(me: MeResponse): boolean {
  return me.tenant.businessType === "DENTAL";
}
