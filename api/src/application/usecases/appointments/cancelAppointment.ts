import { ConflictError, NotFoundError } from "../../errors.js";
import type { Appointment, Repositories } from "../../ports/index.js";

export async function cancelAppointment(
  repos: Pick<Repositories, "appointments">,
  input: { id: number; version: number }
): Promise<Appointment> {
  const res = await repos.appointments.cancelOptimistic({ id: input.id, version: input.version });
  if (!res.updated) {
    throw new ConflictError("Conflito de versão ou agendamento não encontrado/já cancelado");
  }

  const updated = await repos.appointments.findById(input.id);
  if (!updated) {
    throw new NotFoundError("Agendamento não encontrado");
  }

  return updated;
}
