import { Prisma, type PrismaClient, type AppointmentStatus } from "@prisma/client";
import { ConflictError } from "../utils/errors.js";

/** Status que ocupam o slot (bloqueiam novos agendamentos no mesmo horário). */
export const ACTIVE_STATUSES: AppointmentStatus[] = ["SCHEDULED", "CONFIRMED"];

type PrismaTx = Prisma.TransactionClient | PrismaClient;

/** Filtro de sobreposição tenant-wide: existente.start < novo.end E existente.end > novo.start. */
function buildOverlapWhere(
  tenantId: number,
  startTime: Date,
  endTime: Date,
  excludeId?: number
): Prisma.AppointmentWhereInput {
  return {
    tenantId,
    status: { in: ACTIVE_STATUSES },
    ...(excludeId ? { id: { not: excludeId } } : {}),
    startTime: { lt: endTime },
    endTime: { gt: startTime },
  };
}

/**
 * Garante que não há agendamento ativo sobreposto no tenant (um profissional por tenant).
 * Lança ConflictError (409) em caso de colisão.
 */
export async function assertNoConflict(
  tx: PrismaTx,
  tenantId: number,
  startTime: Date,
  endTime: Date,
  excludeId?: number
): Promise<void> {
  const conflict = await tx.appointment.findFirst({
    where: buildOverlapWhere(tenantId, startTime, endTime, excludeId),
    select: { id: true },
  });
  if (conflict) {
    throw new ConflictError("Já existe um agendamento nesse horário");
  }
}
