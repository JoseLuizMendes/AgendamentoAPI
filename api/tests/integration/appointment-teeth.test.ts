import { describe, expect, it, beforeAll, afterAll, beforeEach } from "vitest";
import { DentalProcedure } from "@prisma/client";
import { buildApp } from "../../src/app.js";
import { setAppointmentTeeth } from "../../src/services/appointment-teeth.js";
import { NotFoundError, ValidationError } from "../../src/utils/errors.js";

const hasDb = Boolean(process.env["DATABASE_URL"]);

describe.skipIf(!hasDb)("integration/appointment-teeth", () => {
  let app: Awaited<ReturnType<typeof buildApp>>;

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    await app.prisma.appointmentTooth.deleteMany();
    await app.prisma.appointment.deleteMany();
    await app.prisma.patient.deleteMany();
    await app.prisma.service.deleteMany();
    await app.prisma.user.deleteMany();
    await app.prisma.tenant.deleteMany();
  });

  async function makeAppointment(
    businessType: "GENERIC" | "DENTAL",
    slug: string
  ): Promise<{ tenantId: number; appointmentId: number }> {
    const tenant = await app.prisma.tenant.create({ data: { name: "Clinica", slug, businessType } });
    const service = await app.prisma.service.create({
      data: { name: "Limpeza", priceInCents: 5000, durationInMinutes: 30, tenantId: tenant.id },
    });
    const appt = await app.prisma.appointment.create({
      data: {
        customerName: "Ana",
        customerPhone: "5511900000000",
        serviceId: service.id,
        tenantId: tenant.id,
        startTime: new Date("2026-09-01T14:00:00Z"),
        endTime: new Date("2026-09-01T14:30:00Z"),
      },
    });
    return { tenantId: tenant.id, appointmentId: appt.id };
  }

  it("DENTAL: grava os dentes tratados na consulta", async () => {
    const { tenantId, appointmentId } = await makeAppointment("DENTAL", "clinica");
    await setAppointmentTeeth(app.prisma, tenantId, appointmentId, [
      { toothFdi: 11, procedure: DentalProcedure.RESTAURACAO },
      { toothFdi: 21, procedure: DentalProcedure.AVALIACAO, note: "avaliar" },
    ]);
    const teeth = await app.prisma.appointmentTooth.findMany({
      where: { appointmentId },
      orderBy: { toothFdi: "asc" },
    });
    expect(teeth.map((t) => t.toothFdi)).toEqual([11, 21]);
    expect(teeth[0]?.procedure).toBe("RESTAURACAO");
    expect(teeth[1]?.note).toBe("avaliar");
  });

  it("replace-on-edit: substitui o conjunto de dentes da consulta", async () => {
    const { tenantId, appointmentId } = await makeAppointment("DENTAL", "clinica");
    await setAppointmentTeeth(app.prisma, tenantId, appointmentId, [
      { toothFdi: 11, procedure: DentalProcedure.RESTAURACAO },
      { toothFdi: 21, procedure: DentalProcedure.AVALIACAO },
    ]);
    await setAppointmentTeeth(app.prisma, tenantId, appointmentId, [
      { toothFdi: 11, procedure: DentalProcedure.ENDODONTIA },
    ]);
    const teeth = await app.prisma.appointmentTooth.findMany({ where: { appointmentId } });
    expect(teeth).toHaveLength(1);
    expect(teeth[0]?.toothFdi).toBe(11);
    expect(teeth[0]?.procedure).toBe("ENDODONTIA");
  });

  it("GENERIC: recusa gravar dente (gating por vertical)", async () => {
    const { tenantId, appointmentId } = await makeAppointment("GENERIC", "generica");
    await expect(
      setAppointmentTeeth(app.prisma, tenantId, appointmentId, [
        { toothFdi: 11, procedure: DentalProcedure.RESTAURACAO },
      ])
    ).rejects.toBeInstanceOf(ValidationError);
    expect(await app.prisma.appointmentTooth.count()).toBe(0);
  });

  it("FDI inválido: rejeita e não apaga os dentes já gravados", async () => {
    const { tenantId, appointmentId } = await makeAppointment("DENTAL", "clinica");
    await setAppointmentTeeth(app.prisma, tenantId, appointmentId, [
      { toothFdi: 11, procedure: DentalProcedure.RESTAURACAO },
    ]);
    await expect(
      setAppointmentTeeth(app.prisma, tenantId, appointmentId, [
        { toothFdi: 99, procedure: DentalProcedure.RESTAURACAO },
      ])
    ).rejects.toBeInstanceOf(ValidationError);
    const teeth = await app.prisma.appointmentTooth.findMany({ where: { appointmentId } });
    expect(teeth).toHaveLength(1);
    expect(teeth[0]?.toothFdi).toBe(11);
  });

  it("multi-tenancy: não grava em consulta de outro tenant", async () => {
    const a = await makeAppointment("DENTAL", "clinica-a");
    const b = await makeAppointment("DENTAL", "clinica-b");
    await expect(
      setAppointmentTeeth(app.prisma, b.tenantId, a.appointmentId, [
        { toothFdi: 11, procedure: DentalProcedure.RESTAURACAO },
      ])
    ).rejects.toBeInstanceOf(NotFoundError);
    expect(await app.prisma.appointmentTooth.count()).toBe(0);
  });
});
