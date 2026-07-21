import type { DentalProcedure, PrismaClient } from "@prisma/client";
import { assertDental, isValidFdiTooth } from "../utils/dental.js";
import { NotFoundError, ValidationError } from "../utils/errors.js";

export interface ToothInput {
  toothFdi: number;
  procedure: DentalProcedure;
  note?: string | null;
}

/**
 * Grava os dentes tratados numa consulta (charting odontológico), escopado por tenant.
 *
 * Precedência das checagens:
 *  1. A consulta precisa pertencer ao `tenantId` (senão `NotFoundError` — não vaza dado de outro tenant).
 *  2. Gating por vertical: só tenant `DENTAL` (`assertDental`); `GENERIC` nunca grava dente.
 *  3. Cada dente é validado em FDI/ISO 3950 **antes** de qualquer escrita (input inválido não apaga nada).
 *  4. Replace-on-edit: substitui atomicamente o conjunto de dentes da consulta.
 *
 * Não importa Fastify nem `req`/`reply` (regra de camadas): recebe o `PrismaClient` + ids/DTO.
 */
export async function setAppointmentTeeth(
  prisma: PrismaClient,
  tenantId: number,
  appointmentId: number,
  teeth: ToothInput[]
): Promise<void> {
  const appointment = await prisma.appointment.findFirst({
    where: { id: appointmentId, tenantId },
    select: { id: true, tenant: { select: { businessType: true } } },
  });
  if (!appointment) {
    throw new NotFoundError("Agendamento não encontrado");
  }

  assertDental(appointment.tenant.businessType);

  for (const tooth of teeth) {
    if (!isValidFdiTooth(tooth.toothFdi)) {
      throw new ValidationError(`Dente FDI inválido: ${tooth.toothFdi}`);
    }
  }

  await prisma.$transaction(async (tx) => {
    await tx.appointmentTooth.deleteMany({ where: { appointmentId } });
    if (teeth.length > 0) {
      await tx.appointmentTooth.createMany({
        data: teeth.map((tooth) => ({
          appointmentId,
          toothFdi: tooth.toothFdi,
          procedure: tooth.procedure,
          note: tooth.note ?? null,
        })),
      });
    }
  });
}
