import type { PrismaClient } from "@prisma/client";
import { NotFoundError, ConflictError, ValidationError } from "../utils/errors.js";
import { getService } from "./services.js";

export async function listAppointments(
  prisma: PrismaClient,
  tenantId: number,
  userId?: number,
  role?: string,
  filters?: {
    serviceId?: number;
    status?: string;
  }
) {
  // CUSTOMER can only see their own appointments
  const where: any = {
    tenantId,
    ...(filters?.serviceId && { serviceId: filters.serviceId }),
    ...(filters?.status && { status: filters.status as any }),
  };

  if (role === "CUSTOMER" && userId) {
    where.userId = userId;
  }

  return prisma.appointment.findMany({
    where,
    include: {
      service: true,
    },
    orderBy: { startTime: "asc" },
  });
}

export async function getAppointment(prisma: PrismaClient, id: number, tenantId: number, userId?: number, role?: string) {
  const appointment = await prisma.appointment.findUnique({
    where: { id },
    include: {
      service: true,
    },
  });

  if (!appointment || appointment.tenantId !== tenantId) {
    throw new NotFoundError("Agendamento não encontrado");
  }

  // CUSTOMER can only see their own appointments
  if (role === "CUSTOMER" && appointment.userId !== userId) {
    throw new NotFoundError("Agendamento não encontrado");
  }

  return appointment;
}

export async function createAppointment(
  prisma: PrismaClient,
  tenantId: number,
  userId?: number,
  data?: {
    customerName: string;
    customerPhone: string;
    serviceId: number;
    startTime: Date;
  }
) {
  if (!data) {
    throw new ValidationError("Dados do agendamento não fornecidos");
  }

  // Validate service exists and belongs to tenant
  const service = await getService(prisma, data.serviceId, tenantId);

  // Calculate end time
  const endTime = new Date(data.startTime);
  endTime.setMinutes(endTime.getMinutes() + service.durationInMinutes);

  // Check for conflicts within the same tenant
  const conflictingAppointment = await prisma.appointment.findFirst({
    where: {
      tenantId,
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
      userId: userId ?? null,
      tenantId,
      startTime: data.startTime,
      endTime,
      status: "SCHEDULED",
    },
  });
}

export async function updateAppointment(
  prisma: PrismaClient,
  id: number,
  tenantId: number,
  userId?: number,
  role?: string,
  data?: {
    status?: "SCHEDULED" | "CANCELED";
    startTime?: Date;
  }
) {
  const appointment = await getAppointment(prisma, id, tenantId, userId, role);

  // CUSTOMER can only cancel their own appointments
  if (role === "CUSTOMER") {
    if (appointment.userId !== userId) {
      throw new NotFoundError("Agendamento não encontrado");
    }
    // Customer can only cancel, not reschedule
    if (data?.startTime) {
      throw new ValidationError("Clientes não podem reagendar. Cancele e crie um novo agendamento.");
    }
  }

  if (data?.startTime && appointment.serviceId) {
    const service = await getService(prisma, appointment.serviceId, tenantId);
    const endTime = new Date(data.startTime);
    endTime.setMinutes(endTime.getMinutes() + service.durationInMinutes);

    // Check for conflicts (excluding current appointment)
    const conflictingAppointment = await prisma.appointment.findFirst({
      where: {
        id: { not: id },
        tenantId,
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
      ...(data?.status && { status: data.status }),
    },
  });
}

export async function deleteAppointment(prisma: PrismaClient, id: number, tenantId: number, userId?: number, role?: string) {
  const appointment = await getAppointment(prisma, id, tenantId, userId, role);

  // CUSTOMER can only delete their own appointments
  if (role === "CUSTOMER" && appointment.userId !== userId) {
    throw new NotFoundError("Agendamento não encontrado");
  }

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
