import { addMinutes, dateAtUtcTime, parseTimeToMinutes, toIso } from "./time.js";
function overlaps(aStart, aEnd, bStart, bEnd) {
    return aStart < bEnd && aEnd > bStart;
}
export function calculateAvailableSlots(args) {
    const { date, serviceDurationMinutes, intervalMinutes, business, appointments } = args;
    if (!business || business.isOff) {
        return [];
    }
    if (serviceDurationMinutes <= 0) {
        throw new Error("Duração de serviço inválida");
    }
    if (intervalMinutes <= 0) {
        throw new Error("Intervalo de slots inválido");
    }
    const openMinutes = parseTimeToMinutes(business.openTime);
    const closeMinutes = parseTimeToMinutes(business.closeTime);
    if (closeMinutes <= openMinutes) {
        return [];
    }
    const openAt = dateAtUtcTime(date, business.openTime);
    const closeAt = dateAtUtcTime(date, business.closeTime);
    const breakRanges = business.breaks
        .map((b) => ({
        start: dateAtUtcTime(date, b.startTime),
        end: dateAtUtcTime(date, b.endTime),
    }))
        .filter((b) => b.end > b.start);
    const slots = [];
    for (let slotStart = openAt; addMinutes(slotStart, serviceDurationMinutes) <= closeAt; slotStart = addMinutes(slotStart, intervalMinutes)) {
        const slotEnd = addMinutes(slotStart, serviceDurationMinutes);
        const hitsBreak = breakRanges.some((b) => overlaps(slotStart, slotEnd, b.start, b.end));
        if (hitsBreak) {
            continue;
        }
        const hitsAppointment = appointments.some((a) => overlaps(slotStart, slotEnd, a.startTime, a.endTime));
        if (hitsAppointment) {
            continue;
        }
        slots.push({ startTime: toIso(slotStart), endTime: toIso(slotEnd) });
    }
    return slots;
}
export function isSlotWithinBusinessHours(args) {
    const { date, business, startTime, endTime } = args;
    if (!business || business.isOff) {
        return false;
    }
    const openAt = dateAtUtcTime(date, business.openTime);
    const closeAt = dateAtUtcTime(date, business.closeTime);
    if (!(startTime >= openAt && endTime <= closeAt)) {
        return false;
    }
    const breakRanges = business.breaks
        .map((b) => ({
        start: dateAtUtcTime(date, b.startTime),
        end: dateAtUtcTime(date, b.endTime),
    }))
        .filter((b) => b.end > b.start);
    return !breakRanges.some((b) => overlaps(startTime, endTime, b.start, b.end));
}
//# sourceMappingURL=slots.js.map