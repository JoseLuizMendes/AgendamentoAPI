import type { PrismaClient } from "@prisma/client";
import { NotFoundError } from "../utils/errors.js";

export async function listServices(prisma: PrismaClient) {
  return prisma.service.findMany({
    orderBy: { createdAt: "desc" },
  });
}

export async function getService(prisma: PrismaClient, id: number) {
  const service = await prisma.service.findUnique({
    where: { id },
  });

  if (!service) {
    throw new NotFoundError("Serviço não encontrado");
  }

  return service;
}

export async function createService(
  prisma: PrismaClient,
  data: {
    name: string;
    priceInCents: number;
    durationInMinutes: number;
  }
) {
  return prisma.service.create({
    data,
  });
}

export async function updateService(
  prisma: PrismaClient,
  id: number,
  data: {
    name?: string;
    priceInCents?: number;
    durationInMinutes?: number;
  }
) {
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

export async function deleteService(prisma: PrismaClient, id: number) {
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
