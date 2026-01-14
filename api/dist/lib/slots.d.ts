export type BreakWindow = {
    startTime: string;
    endTime: string;
};
export type BusinessHoursForDay = {
    openTime: string;
    closeTime: string;
    isOff: boolean;
    breaks: BreakWindow[];
};
export type AppointmentWindow = {
    startTime: Date;
    endTime: Date;
};
export type Slot = {
    startTime: string;
    endTime: string;
};
export declare function calculateAvailableSlots(args: {
    date: string;
    serviceDurationMinutes: number;
    intervalMinutes: number;
    business: BusinessHoursForDay | null;
    appointments: AppointmentWindow[];
}): Slot[];
export declare function isSlotWithinBusinessHours(args: {
    date: string;
    business: BusinessHoursForDay | null;
    startTime: Date;
    endTime: Date;
}): boolean;
//# sourceMappingURL=slots.d.ts.map