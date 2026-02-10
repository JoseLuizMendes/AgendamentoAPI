export type AppointmentStatus = "SCHEDULED" | "CANCELED";
export type Service = {
    id: number;
    name: string;
    priceInCents: number;
    durationInMinutes: number;
    createdAt: Date;
    updatedAt: Date;
};
export type Appointment = {
    id: number;
    customerName: string;
    customerPhone: string;
    serviceId: number;
    startTime: Date;
    endTime: Date;
    status: AppointmentStatus;
    version: number;
    createdAt: Date;
    updatedAt: Date;
};
export type BusinessBreak = {
    startTime: string;
    endTime: string;
};
export type BusinessHours = {
    dayOfWeek: number;
    openTime: string;
    closeTime: string;
    isOff: boolean;
    breaks: BusinessBreak[];
};
export type BusinessDateOverride = {
    id: number;
    date: string;
    openTime: string | null;
    closeTime: string | null;
    isOff: boolean;
    createdAt: Date;
    updatedAt: Date;
};
//# sourceMappingURL=types.d.ts.map