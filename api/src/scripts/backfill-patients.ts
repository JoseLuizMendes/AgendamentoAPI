import { pathToFileURL } from "node:url";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { config } from "../config.js";
import { normalizePhone } from "../utils/phone.js";

/**
 * Backfill de Paciente: para todo `Appointment` **sem** `patientId`, acha/cria o Paciente por
 * telefone normalizado (chave `(tenantId, phone)`) e liga o agendamento. Aditivo e **idempotente**
 * — rodar de novo não duplica paciente nem re-linka o que já está ligado.
 *
 * Uso local:   pnpm -C api exec tsx src/scripts/backfill-patients.ts
 * Uso em prod: node dist/scripts/backfill-patients.js
 */
type PatientBackfiller = Pick<PrismaClient, "appointment" | "patient">;

export async function backfillPatients(prisma: PatientBackfiller): Promise<{ linked: number }> {
  const pending = await prisma.appointment.findMany({
    where: { patientId: null },
    select: { id: true, tenantId: true, customerName: true, customerPhone: true, customerEmail: true },
  });

  let linked = 0;
  for (const appt of pending) {
    const phone = normalizePhone(appt.customerPhone);
    const patient = await prisma.patient.upsert({
      where: { tenantId_phone: { tenantId: appt.tenantId, phone } },
      create: { tenantId: appt.tenantId, phone, name: appt.customerName, email: appt.customerEmail },
      update: {},
    });
    await prisma.appointment.update({ where: { id: appt.id }, data: { patientId: patient.id } });
    linked++;
  }
  return { linked };
}

async function main(): Promise<void> {
  if (!config.databaseUrl) throw new Error("DATABASE_URL não definido");
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: config.databaseUrl }) });
  try {
    const res = await backfillPatients(prisma);
    // eslint-disable-next-line no-console
    console.log(`[backfill-patients] agendamentos linkados: ${res.linked}`);
  } finally {
    await prisma.$disconnect();
  }
}

// Auto-executa só quando chamado diretamente (não ao ser importado por testes).
const isMain = import.meta.url === pathToFileURL(process.argv[1] ?? "").href;
if (isMain) {
  main().catch((err) => {
    // eslint-disable-next-line no-console
    console.error("[backfill-patients] falhou:", err);
    process.exit(1);
  });
}
