import type { PrismaClient } from "@prisma/client";
import { NotFoundError, ConflictError, ValidationError } from "../utils/errors.js";
import { getService } from "./services.js";

export async function listAppointments(
  prisma: PrismaClient,
  filters?: {
    serviceId?: number;
    status?: string;
  }
) {
  return prisma.appointment.findMany({
    where: {
      ...(filters?.serviceId && { serviceId: filters.serviceId }),
      ...(filters?.status && { status: filters.status as any }),
    },
    include: {
      service: true,
    },
    orderBy: { startTime: "asc" },
  });
}

export async function getAppointment(prisma: PrismaClient, id: number) {
  const appointment = await prisma.appointment.findUnique({
    where: { id },
    include: {
      service: true,
    },
  });

  if (!appointment) {
    throw new NotFoundError("Agendamento não encontrado");
  }

  return appointment;
}

export async function createAppointment(
  prisma: PrismaClient,
  data: {
    customerName: string;
    customerPhone: string;
    serviceId: number;
    startTime: Date;
  }
) {
  // Validate service exists
  const service = await getService(prisma, data.serviceId);

  // Calculate end time
  const endTime = new Date(data.startTime);
  endTime.setMinutes(endTime.getMinutes() + service.durationInMinutes);

  // Check for conflicts
  const conflictingAppointment = await prisma.appointment.findFirst({
    where: {
      serviceId: data.serviceId,
      status: "SCHEDULED",
      OR: [
        {
          AND: [
            { startTime: { lte: data.startTime } },
            { endTime: { gt: data.startTime } },
          ],
        },
        {
          AND: [
            { startTime: { lt: endTime } },
            { endTime: { gte: endTime } },
          ],
        },
        {
          AND: [
            { startTime: { gte: data.startTime } },
            { endTime: { lte: endTime } },
          ],
        },
      ],
    },
  });

  if (conflictingAppointment) {
    throw new ConflictError("Já existe um agendamento nesse horário");
  }

  return prisma.appointment.create({
    data: {
      customerName: data.customerName,
      customerPhone: data.customerPhone,
      serviceId: data.serviceId,
      startTime: data.startTime,
      endTime,
      status: "SCHEDULED",
    },
  });
}

export async function updateAppointment(
  prisma: PrismaClient,
  id: number,
  data: {
    status?: "SCHEDULED" | "CANCELED";
    startTime?: Date;
  }
) {
  const appointment = await getAppointment(prisma, id);

  if (data.startTime && appointment.serviceId) {
    const service = await getService(prisma, appointment.serviceId);
    const endTime = new Date(data.startTime);
    endTime.setMinutes(endTime.getMinutes() + service.durationInMinutes);

    // Check for conflicts (excluding current appointment)
    const conflictingAppointment = await prisma.appointment.findFirst({
      where: {
        id: { not: id },
        serviceId: appointment.serviceId,
        status: "SCHEDULED",
        OR: [
          {
            AND: [
              { startTime: { lte: data.startTime } },
              { endTime: { gt: data.startTime } },
            ],
          },
          {
            AND: [
              { startTime: { lt: endTime } },
              { endTime: { gte: endTime } },
            ],
          },
        ],
      },
    });

    if (conflictingAppointment) {
      throw new ConflictError("Já existe um agendamento nesse horário");
    }

    return prisma.appointment.update({
      where: { id },
      data: {
        startTime: data.startTime,
        endTime,
        ...(data.status && { status: data.status }),
      },
    });
  }

  return prisma.appointment.update({
    where: { id },
    data: {
      ...(data.status && { status: data.status }),
    },
  });
}

export async function deleteAppointment(prisma: PrismaClient, id: number) {
  try {
    await prisma.appointment.delete({
      where: { id },
    });
  } catch (error: any) {
    if (error.code === "P2025") {
      throw new NotFoundError("Agendamento não encontrado");
    }
    throw error;
  }
}
