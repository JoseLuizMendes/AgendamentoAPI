import type { PrismaClient } from "@prisma/client";
import { DateTime } from "luxon";
import { parseTimeToMinutes } from "../utils/time.js";
import { NotFoundError } from "../utils/errors.js";

export type Granularity = "day" | "week" | "month";

type ApptWithService = {
  startTime: Date;
  endTime: Date;
  status: string;
  serviceId: number;
  customerPhone: string;
  service: { name: string; priceInCents: number } | null;
};

type BusinessHour = { dayOfWeek: number; openTime: string; closeTime: string; isOff: boolean };

const REALIZED = "COMPLETED";
const OCCUPYING = new Set(["SCHEDULED", "CONFIRMED", "COMPLETED"]);
const EXPECTED = new Set(["SCHEDULED", "CONFIRMED", "COMPLETED"]);

export type Scalars = {
  revenueRealizedInCents: number;
  revenueExpectedInCents: number;
  appointmentsTotal: number;
  completed: number;
  canceled: number;
  noShow: number;
  clients: number;
  newClients: number;
  ticketMedioInCents: number;
  occupancyRate: number;
  noShowRate: number;
  cancelRate: number;
};

/** Minutos disponíveis no período, somando o expediente de cada dia (no fuso da tenant). */
function availableMinutes(hours: BusinessHour[], from: Date, to: Date, tz: string): number {
  let total = 0;
  let cursor = DateTime.fromJSDate(from, { zone: tz }).startOf("day");
  const end = DateTime.fromJSDate(to, { zone: tz });
  // Guarda contra ranges absurdos.
  let guard = 0;
  while (cursor < end && guard < 1000) {
    const wd = cursor.weekday % 7; // luxon: 1=Seg..7=Dom -> 0=Dom..6=Sáb
    const h = hours.find((x) => x.dayOfWeek === wd && !x.isOff);
    if (h) total += Math.max(0, parseTimeToMinutes(h.closeTime) - parseTimeToMinutes(h.openTime));
    cursor = cursor.plus({ days: 1 });
    guard += 1;
  }
  return total;
}

function computeScalars(
  list: ApptWithService[],
  knownBefore: Set<string>,
  hours: BusinessHour[],
  from: Date,
  to: Date,
  tz: string,
): Scalars {
  let revenueRealizedInCents = 0;
  let revenueExpectedInCents = 0;
  let completed = 0;
  let canceled = 0;
  let noShow = 0;
  let bookedMinutes = 0;
  const phones = new Set<string>();
  const newPhones = new Set<string>();

  for (const a of list) {
    const price = a.service?.priceInCents ?? 0;
    if (a.status === REALIZED) {
      revenueRealizedInCents += price;
      completed += 1;
    }
    if (EXPECTED.has(a.status)) revenueExpectedInCents += price;
    if (a.status === "CANCELED") canceled += 1;
    if (a.status === "NO_SHOW") noShow += 1;
    if (OCCUPYING.has(a.status)) {
      bookedMinutes += Math.max(0, (a.endTime.getTime() - a.startTime.getTime()) / 60_000);
    }
    phones.add(a.customerPhone);
    if (!knownBefore.has(a.customerPhone)) newPhones.add(a.customerPhone);
  }

  const appointmentsTotal = list.length;
  const available = availableMinutes(hours, from, to, tz);

  return {
    revenueRealizedInCents,
    revenueExpectedInCents,
    appointmentsTotal,
    completed,
    canceled,
    noShow,
    clients: phones.size,
    newClients: newPhones.size,
    ticketMedioInCents: completed > 0 ? Math.round(revenueRealizedInCents / completed) : 0,
    occupancyRate: available > 0 ? Math.min(1, bookedMinutes / available) : 0,
    noShowRate: appointmentsTotal > 0 ? noShow / appointmentsTotal : 0,
    cancelRate: appointmentsTotal > 0 ? canceled / appointmentsTotal : 0,
  };
}

const UNIT: Record<Granularity, "day" | "week" | "month"> = { day: "day", week: "week", month: "month" };

function bucketKeyFmt(g: Granularity): string {
  return g === "month" ? "yyyy-LL" : "yyyy-LL-dd";
}
function bucketLabelFmt(g: Granularity): string {
  return g === "month" ? "LLL/yy" : "dd/LL";
}

async function phonesBefore(prisma: PrismaClient, tenantId: number, cutoff: Date): Promise<Set<string>> {
  const rows = await prisma.appointment.findMany({
    where: { tenantId, startTime: { lt: cutoff } },
    select: { customerPhone: true },
    distinct: ["customerPhone"],
  });
  return new Set(rows.map((r) => r.customerPhone));
}

export async function getSummary(
  prisma: PrismaClient,
  tenantId: number,
  from: Date,
  to: Date,
  granularity: Granularity,
) {
  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId }, select: { timezone: true } });
  if (!tenant) throw new NotFoundError("Tenant não encontrado");
  const tz = tenant.timezone || "America/Sao_Paulo";

  const span = to.getTime() - from.getTime();
  const prevFrom = new Date(from.getTime() - span);

  const appts = (await prisma.appointment.findMany({
    where: { tenantId, startTime: { gte: prevFrom, lt: to } },
    select: {
      startTime: true,
      endTime: true,
      status: true,
      serviceId: true,
      customerPhone: true,
      service: { select: { name: true, priceInCents: true } },
    },
    orderBy: { startTime: "asc" },
  })) as ApptWithService[];

  const hours = (await prisma.businessHours.findMany({
    where: { tenantId },
    select: { dayOfWeek: true, openTime: true, closeTime: true, isOff: true },
  })) as BusinessHour[];

  const beforeFrom = await phonesBefore(prisma, tenantId, from);
  const beforePrevFrom = await phonesBefore(prisma, tenantId, prevFrom);

  const cur = appts.filter((a) => a.startTime >= from && a.startTime < to);
  const prev = appts.filter((a) => a.startTime >= prevFrom && a.startTime < from);

  const current = computeScalars(cur, beforeFrom, hours, from, to, tz);
  const previous = computeScalars(prev, beforePrevFrom, hours, prevFrom, from, tz);

  // Série temporal (buckets vazios incluídos)
  const unit = UNIT[granularity];
  const keyFmt = bucketKeyFmt(granularity);
  const labelFmt = bucketLabelFmt(granularity);
  const series: { key: string; label: string; revenueInCents: number; appointments: number }[] = [];
  const indexByKey = new Map<string, number>();
  let cursor = DateTime.fromJSDate(from, { zone: tz }).startOf(unit);
  const end = DateTime.fromJSDate(to, { zone: tz });
  let guard = 0;
  while (cursor < end && guard < 1000) {
    const key = cursor.toFormat(keyFmt);
    indexByKey.set(key, series.length);
    series.push({ key, label: cursor.setLocale("pt-BR").toFormat(labelFmt), revenueInCents: 0, appointments: 0 });
    cursor = cursor.plus({ [unit]: 1 });
    guard += 1;
  }

  // Top serviços + distribuições + preenchimento da série (período atual)
  const byWeekday = Array.from({ length: 7 }, () => 0);
  const byHour = Array.from({ length: 24 }, () => 0);
  const svcMap = new Map<number, { serviceId: number; name: string; count: number; revenueInCents: number }>();

  for (const a of cur) {
    const dt = DateTime.fromJSDate(a.startTime, { zone: tz }).startOf(unit);
    const idx = indexByKey.get(dt.toFormat(keyFmt));
    if (idx !== undefined) {
      const bucket = series[idx]!;
      if (a.status !== "CANCELED") bucket.appointments += 1;
      if (a.status === REALIZED) bucket.revenueInCents += a.service?.priceInCents ?? 0;
    }

    if (a.status !== "CANCELED") {
      const local = DateTime.fromJSDate(a.startTime, { zone: tz });
      const wd = local.weekday % 7;
      byWeekday[wd] = (byWeekday[wd] ?? 0) + 1;
      byHour[local.hour] = (byHour[local.hour] ?? 0) + 1;

      const svc = svcMap.get(a.serviceId) ?? {
        serviceId: a.serviceId,
        name: a.service?.name ?? "—",
        count: 0,
        revenueInCents: 0,
      };
      svc.count += 1;
      if (a.status === REALIZED) svc.revenueInCents += a.service?.priceInCents ?? 0;
      svcMap.set(a.serviceId, svc);
    }
  }

  const topServices = [...svcMap.values()].sort((a, b) => b.count - a.count).slice(0, 6);

  return {
    range: { from: from.toISOString(), to: to.toISOString(), granularity },
    current,
    previous,
    series,
    topServices,
    byWeekday,
    byHour,
  };
}
