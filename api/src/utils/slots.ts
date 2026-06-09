import { addMinutes, dateAtUtcTime, parseTimeToMinutes, toIso } from "./time.js";

export type BreakWindow = {
  startTime: string; // HH:MM
  endTime: string; // HH:MM
};

export type BusinessHoursForDay = {
  openTime: string; // HH:MM
  closeTime: string; // HH:MM
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

function overlaps(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date): boolean {
  return aStart < bEnd && aEnd > bStart;
}

/**
 * Converte data (YYYY-MM-DD) + hora (HH:MM) num instante Date.
 * Padrão: interpreta como UTC (dateAtUtcTime). O serviço de disponibilidade
 * injeta um conversor com fuso (luxon) para correção de horário local.
 */
export type TimeToUtc = (date: string, time: string) => Date;

export function calculateAvailableSlots(args: {
  date: string; // YYYY-MM-DD
  serviceDurationMinutes: number;
  intervalMinutes: number;
  business: BusinessHoursForDay | null;
  appointments: AppointmentWindow[];
  toUtc?: TimeToUtc;
  /** Limite inferior: descarta slots que começam antes deste instante (ex.: agora + lead time). */
  notBefore?: Date;
}): Slot[] {
  const { date, serviceDurationMinutes, intervalMinutes, business, appointments } = args;
  const toUtc: TimeToUtc = args.toUtc ?? dateAtUtcTime;

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

  const openAt = toUtc(date, business.openTime);
  const closeAt = toUtc(date, business.closeTime);

  const breakRanges = business.breaks
    .map((b) => ({
      start: toUtc(date, b.startTime),
      end: toUtc(date, b.endTime),
    }))
    .filter((b) => b.end > b.start);

  const slots: Slot[] = [];

  for (let slotStart = openAt; addMinutes(slotStart, serviceDurationMinutes) <= closeAt; slotStart = addMinutes(slotStart, intervalMinutes)) {
    const slotEnd = addMinutes(slotStart, serviceDurationMinutes);

    if (args.notBefore && slotStart < args.notBefore) {
      continue;
    }

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

export function isSlotWithinBusinessHours(args: {
  date: string;
  business: BusinessHoursForDay | null;
  startTime: Date;
  endTime: Date;
  toUtc?: TimeToUtc;
}): boolean {
  const { date, business, startTime, endTime } = args;
  const toUtc: TimeToUtc = args.toUtc ?? dateAtUtcTime;

  if (!business || business.isOff) {
    return false;
  }

  const openAt = toUtc(date, business.openTime);
  const closeAt = toUtc(date, business.closeTime);

  if (!(startTime >= openAt && endTime <= closeAt)) {
    return false;
  }

  const breakRanges = business.breaks
    .map((b) => ({
      start: toUtc(date, b.startTime),
      end: toUtc(date, b.endTime),
    }))
    .filter((b) => b.end > b.start);

  return !breakRanges.some((b) => overlaps(startTime, endTime, b.start, b.end));
}
