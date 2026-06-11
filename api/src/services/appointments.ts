import { Prisma, type PrismaClient, type AppointmentStatus } from "@prisma/client";
import { NotFoundError, ConflictError, ValidationError } from "../utils/errors.js";
import { getService } from "./services.js";
import { assertNoConflict } from "./appointment-conflict.js";
import { assertStatusTransition } from "./appointment-status.js";

const MAX_DURATION_MS = 24 * 60 * 60_000;

/** Valida o intervalo de um agendamento (usado quando a duração é custom). */
function assertValidRange(startTime: Date, endTime: Date): void {
  if (endTime.getTime() <= startTime.getTime()) {
    throw new ValidationError("Horário de término deve ser após o início");
  }
  if (endTime.getTime() - startTime.getTime() > MAX_DURATION_MS) {
    throw new ValidationError("Duração máxima de 24h excedida");
  }
}

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
    endTime?: Date | undefined;
  }
) {
  if (!data) {
    throw new ValidationError("Dados do agendamento não fornecidos");
  }

  // Valida serviço e calcula término (duração custom tem prioridade sobre a do serviço)
  const service = await getService(prisma, data.serviceId, tenantId);
  const endTime =
    data.endTime ?? new Date(data.startTime.getTime() + service.durationInMinutes * 60_000);
  assertValidRange(data.startTime, endTime);

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
    endTime?: Date | undefined;
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
    if (data?.startTime || data?.endTime) {
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

  // Mudança de horário (mover/redimensionar) exige checagem de conflito atômica.
  // - startTime sem endTime  => mover preservando a duração atual
  // - endTime                => duração custom (redimensionar), mantendo o início se não vier
  if (data?.startTime || data?.endTime) {
    const newStart = data.startTime ?? appointment.startTime;
    const currentDuration = appointment.endTime.getTime() - appointment.startTime.getTime();
    const newEnd = data.endTime ?? new Date(newStart.getTime() + currentDuration);
    assertValidRange(newStart, newEnd);

    try {
      return await prisma.$transaction(
        async (tx) => {
          await assertNoConflict(tx, tenantId, newStart, newEnd, id);
          return tx.appointment.update({
            where: { id },
            data: {
              startTime: newStart,
              endTime: newEnd,
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
