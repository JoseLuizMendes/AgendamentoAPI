import { Prisma, type PrismaClient, type Appointment } from "@prisma/client";
import { ConflictError } from "../utils/errors.js";

/**
 * Cria um agendamento de forma **idempotente** por `(tenantId, key)`:
 * - a primeira requisição "reivindica" a key (o índice único serve de trava anti-corrida);
 * - replays com a mesma key devolvem o agendamento original em vez de criar duplicado.
 *
 * Recebe `create` (a criação real, com toda a regra/transação Serializable já existente) e só
 * orquestra a idempotência em volta — sem duplicar regra de negócio.
 */
export async function createAppointmentIdempotent(
  prisma: PrismaClient,
  tenantId: number,
  key: string,
  create: () => Promise<Appointment>
): Promise<Appointment> {
  // 1. Reivindica a key. Se já existe (P2002), é replay → devolve o resultado guardado.
  try {
    await prisma.idempotencyKey.create({ data: { tenantId, key } });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      const existing = await prisma.idempotencyKey.findUnique({
        where: { tenantId_key: { tenantId, key } },
      });
      if (existing?.appointmentId) {
        const appointment = await prisma.appointment.findUnique({
          where: { id: existing.appointmentId },
        });
        if (appointment) return appointment;
      }
      // Reivindicada mas ainda sem resultado (criação concorrente em andamento ou falha).
      throw new ConflictError("Requisição idempotente em processamento. Tente novamente.");
    }
    throw err;
  }

  // 2. Reivindicamos com sucesso → cria de fato.
  let appointment: Appointment;
  try {
    appointment = await create();
  } catch (err) {
    // Falhou a criação → libera a key para permitir nova tentativa com a mesma chave.
    await prisma.idempotencyKey
      .delete({ where: { tenantId_key: { tenantId, key } } })
      .catch(() => undefined);
    throw err;
  }

  // 3. Grava o resultado para replays futuros.
  await prisma.idempotencyKey.update({
    where: { tenantId_key: { tenantId, key } },
    data: { appointmentId: appointment.id },
  });

  return appointment;
}

/** Extrai a Idempotency-Key do header (ignora vazio/array). */
export function readIdempotencyKey(raw: string | string[] | undefined): string | null {
  const value = Array.isArray(raw) ? raw[0] : raw;
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}
