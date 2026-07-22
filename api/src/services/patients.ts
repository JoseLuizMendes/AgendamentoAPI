import type { DentalProcedure, Prisma, PrismaClient } from "@prisma/client";
import { NotFoundError } from "../utils/errors.js";
import { normalizePhone } from "../utils/phone.js";

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

/** Lista pacientes do tenant, com busca opcional por nome (case-insensitive) ou telefone (dígitos). */
export async function listPatients(prisma: PrismaClient, tenantId: number, search?: string) {
  const term = search?.trim();
  const digits = term ? normalizePhone(term) : "";
  const where: Prisma.PatientWhereInput = { tenantId };
  if (term) {
    where.OR = [
      { name: { contains: term, mode: "insensitive" } },
      ...(digits ? [{ phone: { contains: digits } }] : []),
    ];
  }
  return prisma.patient.findMany({ where, orderBy: { name: "asc" } });
}

/** Ficha do paciente (escopado por tenant) + histórico de consultas (mais recente primeiro). */
export async function getPatient(prisma: PrismaClient, tenantId: number, id: number) {
  const patient = await prisma.patient.findFirst({
    where: { id, tenantId },
    include: {
      appointments: {
        include: { service: true },
        orderBy: { startTime: "desc" },
      },
    },
  });
  if (!patient) {
    throw new NotFoundError("Paciente não encontrado");
  }
  return patient;
}

/** Enriquece a ficha (nome/email/nascimento/notas), escopado por tenant. */
export async function updatePatient(
  prisma: PrismaClient,
  tenantId: number,
  id: number,
  data: { name?: string; email?: string | null; birthDate?: Date | null; notes?: string | null },
) {
  const existing = await prisma.patient.findFirst({ where: { id, tenantId }, select: { id: true } });
  if (!existing) {
    throw new NotFoundError("Paciente não encontrado");
  }
  return prisma.patient.update({
    where: { id },
    data: {
      ...(data.name !== undefined && { name: data.name }),
      ...(data.email !== undefined && { email: data.email }),
      ...(data.birthDate !== undefined && { birthDate: data.birthDate }),
      ...(data.notes !== undefined && { notes: data.notes }),
    },
  });
}

/**
 * Odontograma consolidado do paciente: o **último** procedimento registrado por dente,
 * agregando todo o histórico de consultas (charting por consulta → estado por dente).
 * Read-only; base pra visão clínica na UI. Tenant genérico simplesmente não terá dentes → lista vazia.
 */
export async function getPatientOdontogram(prisma: PrismaClient, tenantId: number, id: number) {
  const patient = await prisma.patient.findFirst({ where: { id, tenantId }, select: { id: true } });
  if (!patient) {
    throw new NotFoundError("Paciente não encontrado");
  }

  const rows = await prisma.appointmentTooth.findMany({
    where: { appointment: { patientId: id, tenantId } },
    include: { appointment: { select: { startTime: true } } },
    orderBy: [{ toothFdi: "asc" }, { appointment: { startTime: "desc" } }],
  });

  // Ordenado por dente asc, data desc → o 1º registro de cada dente é o mais recente.
  const latestByTooth = new Map<
    number,
    { toothFdi: number; procedure: DentalProcedure; note: string | null; lastTreatedAt: Date }
  >();
  for (const row of rows) {
    if (!latestByTooth.has(row.toothFdi)) {
      latestByTooth.set(row.toothFdi, {
        toothFdi: row.toothFdi,
        procedure: row.procedure,
        note: row.note,
        lastTreatedAt: row.appointment.startTime,
      });
    }
  }
  return [...latestByTooth.values()];
}
