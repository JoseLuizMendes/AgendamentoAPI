import type { Repositories } from "../../ports/index.js";
export declare function getAvailableSlots(repos: Pick<Repositories, "services" | "businessHours" | "businessDateOverrides" | "appointments">, input: {
    serviceId: number;
    date: string;
    intervalMinutes: number;
}): Promise<Array<{
    startTime: string;
    endTime: string;
}>>;
//# sourceMappingURL=getAvailableSlots.d.ts.map