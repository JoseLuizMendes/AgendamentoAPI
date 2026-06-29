import type { PrismaClient } from "@prisma/client";
import { NotFoundError, ValidationError } from "../utils/errors.js";
import { parseTimeToMinutes } from "../utils/time.js";

export async function listBusinessHours(prisma: PrismaClient, tenantId: number) {
  return prisma.businessHours.findMany({
    where: { tenantId },
    include: {
      breaks: true,
    },
    orderBy: { dayOfWeek: "asc" },
  });
}

export async function getBusinessHours(prisma: PrismaClient, id: number, tenantId: number) {
  const hours = await prisma.businessHours.findUnique({
    where: { id },
    include: {
      breaks: true,
    },
  });

  if (!hours || hours.tenantId !== tenantId) {
    throw new NotFoundError("Horário de funcionamento não encontrado");
  }

  return hours;
}

export async function createBusinessHours(
  prisma: PrismaClient,
  tenantId: number,
  data: {
    dayOfWeek: number;
    openTime: string;
    closeTime: string;
    isOff?: boolean;
  }
) {
  return prisma.businessHours.create({
    data: {
      dayOfWeek: data.dayOfWeek,
      openTime: data.openTime,
      closeTime: data.closeTime,
      isOff: data.isOff ?? false,
      tenantId,
    },
  });
}

export async function updateBusinessHours(
  prisma: PrismaClient,
  id: number,
  tenantId: number,
  data: {
    openTime?: string;
    closeTime?: string;
    isOff?: boolean;
  }
) {
  // First check if hours exists and belongs to tenant
  await getBusinessHours(prisma, id, tenantId);

  try {
    return await prisma.businessHours.update({
      where: { id },
      data,
    });
  } catch (error: any) {
    if (error.code === "P2025") {
      throw new NotFoundError("Horário de funcionamento não encontrado");
    }
    throw error;
  }
}

export async function deleteBusinessHours(prisma: PrismaClient, id: number, tenantId: number) {
  // First check if hours exists and belongs to tenant
  await getBusinessHours(prisma, id, tenantId);

  try {
    await prisma.businessHours.delete({
      where: { id },
    });
  } catch (error: any) {
    if (error.code === "P2025") {
      throw new NotFoundError("Horário de funcionamento não encontrado");
    }
    throw error;
  }
}

// ---- Intervalos (almoço/pausas) ----

export async function createBreak(
  prisma: PrismaClient,
  hoursId: number,
  tenantId: number,
  data: { startTime: string; endTime: string; label?: string }
) {
  // Garante que o BusinessHours pertence ao tenant
  await getBusinessHours(prisma, hoursId, tenantId);

  if (parseTimeToMinutes(data.endTime) <= parseTimeToMinutes(data.startTime)) {
    throw new ValidationError("Intervalo inválido: fim deve ser depois do início");
  }

  return prisma.businessBreak.create({
    data: {
      businessHoursId: hoursId,
      startTime: data.startTime,
      endTime: data.endTime,
      label: data.label ?? null,
    },
  });
}

export async function deleteBreak(
  prisma: PrismaClient,
  hoursId: number,
  breakId: number,
  tenantId: number
) {
  // Garante que o BusinessHours pertence ao tenant
  await getBusinessHours(prisma, hoursId, tenantId);

  const brk = await prisma.businessBreak.findUnique({ where: { id: breakId } });
  if (!brk || brk.businessHoursId !== hoursId) {
    throw new NotFoundError("Intervalo não encontrado");
  }

  await prisma.businessBreak.delete({ where: { id: breakId } });
}
