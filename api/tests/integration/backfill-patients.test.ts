import { describe, expect, it, beforeAll, afterAll, beforeEach } from "vitest";
import { buildApp } from "../../src/app.js";
import { backfillPatients } from "../../src/scripts/backfill-patients.js";

const hasDb = Boolean(process.env["DATABASE_URL"]);

describe.skipIf(!hasDb)("integration/backfill-patients", () => {
  let app: Awaited<ReturnType<typeof buildApp>>;
  let tenantId: number;
  let serviceId: number;

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    await app.prisma.appointment.deleteMany();
    await app.prisma.patient.deleteMany();
    await app.prisma.businessBreak.deleteMany();
    await app.prisma.businessHours.deleteMany();
    await app.prisma.businessDateOverride.deleteMany();
    await app.prisma.service.deleteMany();
    await app.prisma.user.deleteMany();
    await app.prisma.tenant.deleteMany();

    const t = await app.prisma.tenant.create({ data: { name: "Clinica", slug: "clinica" } });
    tenantId = t.id;
    const s = await app.prisma.service.create({
      data: { name: "Limpeza", priceInCents: 5000, durationInMinutes: 30, tenantId },
    });
    serviceId = s.id;

    // 2 agendamentos "legados" (sem patientId), mesmo telefone com formatações diferentes.
    await app.prisma.appointment.createMany({
      data: [
        { customerName: "Ana", customerPhone: "+55 11 90000-0000", serviceId, tenantId, startTime: new Date("2026-09-01T14:00:00Z"), endTime: new Date("2026-09-01T14:30:00Z") },
        { customerName: "Ana", customerPhone: "5511900000000", serviceId, tenantId, startTime: new Date("2026-09-02T14:00:00Z"), endTime: new Date("2026-09-02T14:30:00Z") },
      ],
    });
  });

  it("cria 1 paciente para o telefone, linka os 2 agendamentos e é idempotente", async () => {
    const first = await backfillPatients(app.prisma);
    expect(first.linked).toBe(2);
    expect(await app.prisma.patient.count()).toBe(1);
    expect(await app.prisma.appointment.count({ where: { patientId: null } })).toBe(0);

    // 2ª rodada: nada pendente, sem duplicar paciente.
    const second = await backfillPatients(app.prisma);
    expect(second.linked).toBe(0);
    expect(await app.prisma.patient.count()).toBe(1);
  });
});
