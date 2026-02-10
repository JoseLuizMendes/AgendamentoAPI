import type { Appointment, TransactionManager } from "../../ports/index.js";
export declare function createAppointment(tx: TransactionManager, input: {
    customerName: string;
    customerPhone: string;
    serviceId: number;
    startTime: Date;
}): Promise<Appointment>;
//# sourceMappingURL=createAppointment.d.ts.map