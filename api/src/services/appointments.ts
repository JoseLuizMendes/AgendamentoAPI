import { Prisma, type PrismaClient, type AppointmentStatus } from "@prisma/client";
import { NotFoundError, ConflictError, ValidationError } from "../utils/errors.js";
import { getService } from "./services.js";
import { assertNoConflict } from "./appointment-conflict.js";
import { assertStatusTransition } from "./appointment-status.js";

export async function listAppointments(
  prisma: PrismaClient,
  tenantId: number,
  userId?: number,
  role?: string,
  filters?: {
    serviceId?: number;
    status?: AppointmentStatus;
    from?: Date;
    to?: Date;
  }
) {
  const where: Prisma.AppointmentWhereInput = {
    tenantId,
    ...(filters?.serviceId && { serviceId: filters.serviceId }),
    ...(filters?.status && { status: filters.status }),
  };

  if (filters?.from || filters?.to) {
    where.startTime = {
      ...(filters.from && { gte: filters.from }),
      ...(filters.to && { lte: filters.to }),
    };
  }

  // CUSTOMER só vê os próprios agendamentos
  if (role === "CUSTOMER" && userId) {
    where.userId = userId;
  }

  return prisma.appointment.findMany({
    where,
    include: { service: true },
    orderBy: { startTime: "asc" },
  });
}

export async function getAppointment(
  prisma: PrismaClient,
  id: number,
  tenantId: number,
  userId?: number,
  role?: string
) {
  const appointment = await prisma.appointment.findUnique({
    where: { id },
    include: { service: true },
  });

  if (!appointment || appointment.tenantId !== tenantId) {
    throw new NotFoundError("Agendamento não encontrado");
  }

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
    customerEmail?: string | undefined;
    notes?: string | undefined;
    serviceId: number;
    startTime: Date;
  }
) {
  if (!data) {
    throw new ValidationError("Dados do agendamento não fornecidos");
  }

  // Valida serviço e calcula término
  const service = await getService(prisma, data.serviceId, tenantId);
  const endTime = new Date(data.startTime.getTime() + service.durationInMinutes * 60_000);

  // Transação serializável: re-checa conflito e cria atomicamente (anti corrida de duplo-agendamento)
  try {
    return await prisma.$transaction(
      async (tx) => {
        await assertNoConflict(tx, tenantId, data.startTime, endTime);
        return tx.appointment.create({
          data: {
            customerName: data.customerName,
            customerPhone: data.customerPhone,
            customerEmail: data.customerEmail ?? null,
            notes: data.notes ?? null,
            serviceId: data.serviceId,
            userId: userId ?? null,
            tenantId,
            startTime: data.startTime,
            endTime,
            status: "SCHEDULED",
          },
        });
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
    );
  } catch (err) {
    // Falha de serialização concorrente -> tratar como conflito de horário
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2034") {
      throw new ConflictError("Já existe um agendamento nesse horário");
    }
    throw err;
  }
}

export async function updateAppointment(
  prisma: PrismaClient,
  id: number,
  tenantId: number,
  userId?: number,
  role?: string,
  data?: {
    status?: AppointmentStatus | undefined;
    startTime?: Date | undefined;
    customerName?: string | undefined;
    customerPhone?: string | undefined;
    customerEmail?: string | undefined;
    notes?: string | undefined;
  }
) {
  const appointment = await getAppointment(prisma, id, tenantId, userId, role);

  // Regras para CUSTOMER: só pode cancelar o próprio agendamento, não reagendar/editar dados
  if (role === "CUSTOMER") {
    if (appointment.userId !== userId) {
      throw new NotFoundError("Agendamento não encontrado");
    }
    if (data?.startTime) {
      throw new ValidationError("Clientes não podem reagendar. Cancele e crie um novo agendamento.");
    }
    if (data?.status && data.status !== "CANCELED") {
      throw new ValidationError("Clientes só podem cancelar agendamentos.");
    }
  }

  // Valida transição de status
  if (data?.status) {
    assertStatusTransition(appointment.status, data.status);
  }

  const dataFields = {
    ...(data?.status && { status: data.status }),
    ...(data?.customerName && { customerName: data.customerName }),
    ...(data?.customerPhone && { customerPhone: data.customerPhone }),
    ...(data?.customerEmail !== undefined && { customerEmail: data.customerEmail }),
    ...(data?.notes !== undefined && { notes: data.notes }),
  };

  // Reagendamento (mudança de horário) exige checagem de conflito atômica
  if (data?.startTime) {
    const newStart = data.startTime;
    const service = await getService(prisma, appointment.serviceId, tenantId);
    const endTime = new Date(newStart.getTime() + service.durationInMinutes * 60_000);

    try {
      return await prisma.$transaction(
        async (tx) => {
          await assertNoConflict(tx, tenantId, newStart, endTime, id);
          return tx.appointment.update({
            where: { id },
            data: {
              startTime: newStart,
              endTime,
              version: { increment: 1 },
              ...dataFields,
            },
          });
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
      );
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2034") {
        throw new ConflictError("Já existe um agendamento nesse horário");
      }
      throw err;
    }
  }

  return prisma.appointment.update({
    where: { id },
    data: { version: { increment: 1 }, ...dataFields },
  });
}

export async function deleteAppointment(
  prisma: PrismaClient,
  id: number,
  tenantId: number,
  userId?: number,
  role?: string
) {
  const appointment = await getAppointment(prisma, id, tenantId, userId, role);

  if (role === "CUSTOMER" && appointment.userId !== userId) {
    throw new NotFoundError("Agendamento não encontrado");
  }

  try {
    await prisma.appointment.delete({ where: { id } });
  } catch (error: any) {
    if (error.code === "P2025") {
      throw new NotFoundError("Agendamento não encontrado");
    }
    throw error;
  }
}
