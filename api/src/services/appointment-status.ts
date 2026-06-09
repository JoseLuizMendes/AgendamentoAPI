import type { AppointmentStatus } from "@prisma/client";
import { ValidationError } from "../utils/errors.js";

/** Transições de status permitidas (estados terminais não saem). */
export const ALLOWED_TRANSITIONS: Record<AppointmentStatus, AppointmentStatus[]> = {
  SCHEDULED: ["CONFIRMED", "COMPLETED", "NO_SHOW", "CANCELED"],
  CONFIRMED: ["COMPLETED", "NO_SHOW", "CANCELED"],
  COMPLETED: [],
  NO_SHOW: [],
  CANCELED: [],
};

/** Indica se a transição é permitida. Mesma situação (no-op) é sempre válida. */
export function canTransition(current: AppointmentStatus, next: AppointmentStatus): boolean {
  if (current === next) return true;
  return ALLOWED_TRANSITIONS[current].includes(next);
}

/** Lança ValidationError (400) se a transição de status for inválida. */
export function assertStatusTransition(current: AppointmentStatus, next: AppointmentStatus): void {
  if (!canTransition(current, next)) {
    throw new ValidationError(`Transição de status inválida: ${current} -> ${next}`);
  }
}
