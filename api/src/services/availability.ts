import type { PrismaClient } from "@prisma/client";
import { NotFoundError } from "../utils/errors.js";
import { getService } from "./services.js";
import {
  calculateAvailableSlots,
  type BusinessHoursForDay,
  type Slot,
} from "../utils/slots.js";
import { zonedTimeToUtc, dayOfWeekInZone } from "../utils/time.js";
import { ACTIVE_STATUSES } from "./appointment-conflict.js";

/**
 * Calcula os horários disponíveis para um serviço em uma data (YYYY-MM-DD),
 * considerando fuso do tenant, horário de funcionamento, intervalos, folgas
 * (date overrides) e agendamentos já existentes.
 */
export async function getAvailableSlots(
  prisma: PrismaClient,
  tenantId: number,
  serviceId: number,
  date: string
): Promise<Slot[]> {
  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
  if (!tenant) {
    throw new NotFoundError("Tenant não encontrado");
  }

  const service = await getService(prisma, serviceId, tenantId);

  const timezone = tenant.timezone;
  const toUtc = (d: string, t: string) => zonedTimeToUtc(d, t, timezone);

  // 1) Janela efetiva do dia: override tem prioridade sobre horário semanal.
  const business = await resolveBusinessForDay(prisma, tenantId, date, timezone);

  if (!business) {
    return [];
  }

  // 2) Agendamentos ativos que tocam o dia (janela ampla em UTC para cobrir o fuso).
  const dayStartUtc = toUtc(date, "00:00");
  const dayEndUtc = new Date(dayStartUtc.getTime() + 24 * 60 * 60_000);

  const appointments = await prisma.appointment.findMany({
    where: {
      tenantId,
      status: { in: ACTIVE_STATUSES },
      startTime: { lt: dayEndUtc },
      endTime: { gt: dayStartUtc },
    },
    select: { startTime: true, endTime: true },
  });

  // 3) Limite inferior: agora + lead time mínimo.
  const notBefore = new Date(Date.now() + tenant.minLeadTimeMinutes * 60_000);

  return calculateAvailableSlots({
    date,
    serviceDurationMinutes: service.durationInMinutes,
    intervalMinutes: tenant.slotIntervalMinutes,
    business,
    appointments,
    toUtc,
    notBefore,
  });
}

/**
 * Resolve o horário de funcionamento efetivo para uma data específica.
 * Override (BusinessDateOverride) tem prioridade; senão usa BusinessHours do dia da semana.
 * Retorna null quando o estabelecimento está fechado nesse dia.
 */
export async function resolveBusinessForDay(
  prisma: PrismaClient,
  tenantId: number,
  date: string,
  timezone: string
): Promise<BusinessHoursForDay | null> {
  const override = await prisma.businessDateOverride.findUnique({
    where: { tenantId_date: { tenantId, date } },
  });

  if (override) {
    if (override.isOff || !override.openTime || !override.closeTime) {
      return null;
    }
    // Override não tem intervalos próprios; herda os do dia da semana.
    const weekday = dayOfWeekInZone(date, timezone);
    const weekdayHours = await prisma.businessHours.findUnique({
      where: { tenantId_dayOfWeek: { tenantId, dayOfWeek: weekday } },
      include: { breaks: true },
    });
    return {
      openTime: override.openTime,
      closeTime: override.closeTime,
      isOff: false,
      breaks: (weekdayHours?.breaks ?? []).map((b) => ({ startTime: b.startTime, endTime: b.endTime })),
    };
  }

  const weekday = dayOfWeekInZone(date, timezone);
  const hours = await prisma.businessHours.findUnique({
    where: { tenantId_dayOfWeek: { tenantId, dayOfWeek: weekday } },
    include: { breaks: true },
  });

  if (!hours || hours.isOff) {
    return null;
  }

  return {
    openTime: hours.openTime,
    closeTime: hours.closeTime,
    isOff: false,
    breaks: hours.breaks.map((b) => ({ startTime: b.startTime, endTime: b.endTime })),
  };
}
