// Ciclo de vida derivado do agendamento (tempo + status). Puro e testável.

import type { Appointment, TenantSettings } from "@/components/tenant/types";

export type ApptPhase = "upcoming" | "inProgress" | "awaiting" | "overdue" | "resolved";

const TERMINAL = new Set(["COMPLETED", "NO_SHOW", "CANCELED"]);

/**
 * - resolved: status terminal (concluído/faltou/cancelado).
 * - overdue:  ativo e já passou `overdueAfterEndMin` do fim → "passou, defina o status".
 * - awaiting: ativo e já passou `statusPromptAfterStartMin` do início → "aguardando status".
 * - inProgress: ativo, começou mas ainda não entrou em "aguardando".
 * - upcoming: ativo e ainda não começou.
 */
export function phaseOf(appt: Appointment, now: number, settings: TenantSettings): ApptPhase {
  if (TERMINAL.has(appt.status)) return "resolved";
  const start = new Date(appt.startTime).getTime();
  const end = new Date(appt.endTime).getTime();
  const awaitingAt = start + settings.statusPromptAfterStartMin * 60_000;
  const overdueAt = end + settings.overdueAfterEndMin * 60_000;
  if (now >= overdueAt) return "overdue";
  if (now >= awaitingAt) return "awaiting";
  if (now >= start) return "inProgress";
  return "upcoming";
}

/** Classe CSS aplicada ao evento do FullCalendar por fase. */
export const PHASE_CLASS: Record<ApptPhase, string> = {
  upcoming: "",
  inProgress: "fc-appt-now",
  awaiting: "fc-appt-awaiting",
  overdue: "fc-appt-overdue",
  resolved: "fc-appt-resolved",
};

/** Fases que precisam de definição de status pelo dono (alimentam a triagem). */
export const NEEDS_TRIAGE = new Set<ApptPhase>(["awaiting", "overdue"]);
