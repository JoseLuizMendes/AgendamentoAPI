import type { PrismaClient } from "@prisma/client";
import { NotFoundError } from "../utils/errors.js";

export async function listServices(prisma: PrismaClient, tenantId: number) {
  return prisma.service.findMany({
    where: { tenantId },
    orderBy: { createdAt: "desc" },
  });
}

export async function getService(prisma: PrismaClient, id: number, tenantId: number) {
  const service = await prisma.service.findUnique({
    where: { id },
  });

  if (!service || service.tenantId !== tenantId) {
    throw new NotFoundError("Serviço não encontrado");
  }

  return service;
}

export async function createService(
  prisma: PrismaClient,
  tenantId: number,
  data: {
    name: string;
    priceInCents: number;
    durationInMinutes: number;
  }
) {
  return prisma.service.create({
    data: {
      ...data,
      tenantId,
    },
  });
}

export async function updateService(
  prisma: PrismaClient,
  id: number,
  tenantId: number,
  data: {
    name?: string;
    priceInCents?: number;
    durationInMinutes?: number;
  }
) {
  // First check if service exists and belongs to tenant
  await getService(prisma, id, tenantId);

  try {
    return await prisma.service.update({
      where: { id },
      data,
    });
  } catch (error: any) {
    if (error.code === "P2025") {
      throw new NotFoundError("Serviço não encontrado");
    }
    throw error;
  }
}

export async function deleteService(prisma: PrismaClient, id: number, tenantId: number) {
  // First check if service exists and belongs to tenant
  await getService(prisma, id, tenantId);

  try {
    await prisma.service.delete({
      where: { id },
    });
  } catch (error: any) {
    if (error.code === "P2025") {
      throw new NotFoundError("Serviço não encontrado");
    }
    throw error;
  }
}
