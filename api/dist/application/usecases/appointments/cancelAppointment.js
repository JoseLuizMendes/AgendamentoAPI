import { ConflictError, NotFoundError } from "../../errors.js";
export async function cancelAppointment(repos, input) {
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
//# sourceMappingURL=cancelAppointment.js.map