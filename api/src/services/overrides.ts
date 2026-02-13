import type { PrismaClient } from "@prisma/client";
import { NotFoundError } from "../utils/errors.js";

export async function listOverrides(prisma: PrismaClient, tenantId: number) {
  return prisma.businessDateOverride.findMany({
    where: { tenantId },
    orderBy: { date: "asc" },
  });
}

export async function getOverride(prisma: PrismaClient, id: number, tenantId: number) {
  const override = await prisma.businessDateOverride.findUnique({
    where: { id },
  });

  if (!override || override.tenantId !== tenantId) {
    throw new NotFoundError("Override não encontrado");
  }

  return override;
}

export async function createOverride(
  prisma: PrismaClient,
  tenantId: number,
  data: {
    date: string;
    openTime?: string;
    closeTime?: string;
    isOff?: boolean;
  }
) {
  return prisma.businessDateOverride.create({
    data: {
      date: data.date,
      ...(data.openTime !== undefined && { openTime: data.openTime }),
      ...(data.closeTime !== undefined && { closeTime: data.closeTime }),
      isOff: data.isOff ?? false,
      tenantId,
    },
  });
}

export async function updateOverride(
  prisma: PrismaClient,
  id: number,
  tenantId: number,
  data: {
    openTime?: string;
    closeTime?: string;
    isOff?: boolean;
  }
) {
  // First check if override exists and belongs to tenant
  await getOverride(prisma, id, tenantId);

  try {
    return await prisma.businessDateOverride.update({
      where: { id },
      data,
    });
  } catch (error: any) {
    if (error.code === "P2025") {
      throw new NotFoundError("Override não encontrado");
    }
    throw error;
  }
}

export async function deleteOverride(prisma: PrismaClient, id: number, tenantId: number) {
  // First check if override exists and belongs to tenant
  await getOverride(prisma, id, tenantId);

  try {
    await prisma.businessDateOverride.delete({
      where: { id },
    });
  } catch (error: any) {
    if (error.code === "P2025") {
      throw new NotFoundError("Override não encontrado");
    }
    throw error;
  }
}
