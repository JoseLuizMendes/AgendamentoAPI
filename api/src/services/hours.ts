import type { PrismaClient } from "@prisma/client";
import { NotFoundError } from "../utils/errors.js";

export async function listBusinessHours(prisma: PrismaClient) {
  return prisma.businessHours.findMany({
    include: {
      breaks: true,
    },
    orderBy: { dayOfWeek: "asc" },
  });
}

export async function getBusinessHours(prisma: PrismaClient, id: number) {
  const hours = await prisma.businessHours.findUnique({
    where: { id },
    include: {
      breaks: true,
    },
  });

  if (!hours) {
    throw new NotFoundError("Horário de funcionamento não encontrado");
  }

  return hours;
}

export async function createBusinessHours(
  prisma: PrismaClient,
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
    },
  });
}

export async function updateBusinessHours(
  prisma: PrismaClient,
  id: number,
  data: {
    openTime?: string;
    closeTime?: string;
    isOff?: boolean;
  }
) {
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

export async function deleteBusinessHours(prisma: PrismaClient, id: number) {
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
