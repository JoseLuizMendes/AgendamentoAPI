import type { Prisma, PrismaClient } from "@prisma/client";

type Db = PrismaClient | Prisma.TransactionClient;

/**
 * Acha (por `tenantId` + telefone normalizado) ou cria o Paciente; atualiza o nome (e o email,
 * se veio). O `phone` já deve chegar **normalizado** (só dígitos — ver `utils/phone.normalizePhone`).
 *
 * Aceita tanto `PrismaClient` quanto `Prisma.TransactionClient`, para ser chamado de dentro da
 * transação do booking (mesma atomicidade do agendamento).
 */
export async function upsertPatient(
  db: Db,
  tenantId: number,
  phone: string,
  name: string,
  email?: string | null,
) {
  return db.patient.upsert({
    where: { tenantId_phone: { tenantId, phone } },
    create: { tenantId, phone, name, email: email ?? null },
    update: { name, ...(email !== undefined ? { email: email ?? null } : {}) },
  });
}
