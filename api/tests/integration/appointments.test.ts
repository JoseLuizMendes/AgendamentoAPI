import { describe, expect, it, beforeAll, afterAll, beforeEach } from "vitest";
import { buildApp } from "../../src/app.js";

const hasDb = Boolean(process.env["DATABASE_URL"]);

describe.skipIf(!hasDb)("integration/appointments", () => {
  const date = "2026-01-16";
  const startTime = `${date}T09:00:00.000Z`;

  let app: Awaited<ReturnType<typeof buildApp>>;

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    // limpeza determinística (ordem por FKs)
    await app.prisma.appointment.deleteMany();
    await app.prisma.businessBreak.deleteMany();
    await app.prisma.businessHours.deleteMany();
    await app.prisma.businessDateOverride.deleteMany();
    await app.prisma.service.deleteMany();
    await app.prisma.user.deleteMany();

    // sexta-feira (UTC) => 5
    await app.prisma.businessHours.upsert({
      where: { dayOfWeek: 5 },
      create: { dayOfWeek: 5, openTime: "09:00", closeTime: "12:00", isOff: false },
      update: { openTime: "09:00", closeTime: "12:00", isOff: false },
    });
  });

  it("cria agendamento e bloqueia conflito por overlap", async () => {
    const service = await app.prisma.service.create({
      data: { name: "Corte", priceInCents: 5000, durationInMinutes: 60 },
    });

    const first = await app.inject({
      method: "POST",
      url: "/appointments",
      payload: {
        customerName: "José",
        customerPhone: "559999999999",
        serviceId: service.id,
        startTime,
      },
    });

    expect(first.statusCode).toBe(201);
    const a1 = first.json();
    expect(a1.serviceId).toBe(service.id);
    expect(a1.status).toBe("SCHEDULED");

    const second = await app.inject({
      method: "POST",
      url: "/appointments",
      payload: {
        customerName: "Maria",
        customerPhone: "558888888888",
        serviceId: service.id,
        startTime, // mesmo horário
      },
    });

    expect(second.statusCode).toBe(409);
  });

  it("cancela com optimistic locking via version", async () => {
    const service = await app.prisma.service.create({
      data: { name: "Consulta", priceInCents: 10000, durationInMinutes: 30 },
    });

    const created = await app.inject({
      method: "POST",
      url: "/appointments",
      payload: {
        customerName: "Ana",
        customerPhone: "557777777777",
        serviceId: service.id,
        startTime,
      },
    });

    expect(created.statusCode).toBe(201);
    const appt = created.json() as { id: number; version: number; status: string };
    expect(appt.status).toBe("SCHEDULED");

    const wrong = await app.inject({
      method: "PATCH",
      url: `/appointments/${appt.id}/cancel`,
      payload: { version: appt.version + 1 },
    });
    expect(wrong.statusCode).toBe(409);

    const ok = await app.inject({
      method: "PATCH",
      url: `/appointments/${appt.id}/cancel`,
      payload: { version: appt.version },
    });

    expect(ok.statusCode).toBe(200);
    const canceled = ok.json() as { status: string; version: number };
    expect(canceled.status).toBe("CANCELED");
    expect(canceled.version).toBe(appt.version + 1);
  });

  it("slots não inclui horário já agendado", async () => {
    const service = await app.prisma.service.create({
      data: { name: "Barba", priceInCents: 3000, durationInMinutes: 60 },
    });

    const created = await app.inject({
      method: "POST",
      url: "/appointments",
      payload: {
        customerName: "Paulo",
        customerPhone: "556666666666",
        serviceId: service.id,
        startTime,
      },
    });
    expect(created.statusCode).toBe(201);

    const res = await app.inject({
      method: "GET",
      url: `/slots?serviceId=${service.id}&date=${date}&intervalMinutes=60`,
    });

    expect(res.statusCode).toBe(200);
    const slots = res.json() as Array<{ startTime: string; endTime: string }>;
    expect(slots.find((s) => s.startTime === startTime)).toBeUndefined();
  });
});
