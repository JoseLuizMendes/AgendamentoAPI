import type { Appointment, BusinessDateOverride, BusinessHours, Service } from "./types.js";
export interface ServiceRepository {
    list(): Promise<Service[]>;
    getById(id: number): Promise<Service | null>;
    create(input: {
        name: string;
        priceInCents: number;
        durationInMinutes: number;
    }): Promise<Service>;
    update(id: number, input: {
        name: string;
        priceInCents: number;
        durationInMinutes: number;
    }): Promise<Service>;
    delete(id: number): Promise<void>;
}
export interface BusinessHoursRepository {
    list(): Promise<BusinessHours[]>;
    upsertMany(items: Array<Pick<BusinessHours, "dayOfWeek" | "openTime" | "closeTime" | "isOff">>): Promise<void>;
    getByDayOfWeek(dayOfWeek: number): Promise<BusinessHours | null>;
    replaceBreaks(dayOfWeek: number, breaks: BusinessHours["breaks"]): Promise<BusinessHours>;
}
export interface BusinessDateOverrideRepository {
    list(): Promise<BusinessDateOverride[]>;
    getByDate(date: string): Promise<BusinessDateOverride | null>;
    upsert(input: {
        date: string;
        isOff: boolean;
        openTime: string | null;
        closeTime: string | null;
    }): Promise<BusinessDateOverride>;
    deleteByDate(date: string): Promise<void>;
}
export interface AppointmentRepository {
    listScheduledWithinDate(date: string): Promise<Array<Pick<Appointment, "startTime" | "endTime">>>;
    findScheduledConflict(args: {
        startTime: Date;
        endTime: Date;
    }): Promise<{
        id: number;
    } | null>;
    create(input: {
        customerName: string;
        customerPhone: string;
        serviceId: number;
        startTime: Date;
        endTime: Date;
    }): Promise<Appointment>;
    findById(id: number): Promise<Appointment | null>;
    cancelOptimistic(args: {
        id: number;
        version: number;
    }): Promise<{
        updated: boolean;
    }>;
}
export type Repositories = {
    services: ServiceRepository;
    businessHours: BusinessHoursRepository;
    businessDateOverrides: BusinessDateOverrideRepository;
    appointments: AppointmentRepository;
};
export interface TransactionManager {
    runSerializable<T>(fn: (repos: Repositories) => Promise<T>): Promise<T>;
}
//# sourceMappingURL=repositories.d.ts.map