import type { Appointment, Repositories } from "../../ports/index.js";
export declare function cancelAppointment(repos: Pick<Repositories, "appointments">, input: {
    id: number;
    version: number;
}): Promise<Appointment>;
//# sourceMappingURL=cancelAppointment.d.ts.map