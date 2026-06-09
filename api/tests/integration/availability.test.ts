import { describe, expect, it, beforeAll, afterAll, beforeEach } from "vitest";
import { buildApp } from "../../src/app.js";

const hasDb = Boolean(process.env["DATABASE_URL"]);

describe.skipIf(!hasDb)("integration/availability", () => {
  let app: Awaited<ReturnType<typeof buildApp>>;
  let token: string;
  let serviceId: number;
  let hoursId: number;

  // 2026-06-15 é segunda-feira (dayOfWeek=1) em America/Sao_Paulo
  const date = "2026-06-15";

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    await app.prisma.appointment.deleteMany();
    await app.prisma.businessBreak.deleteMany();
    await app.prisma.businessHours.deleteMany();
    await app.prisma.businessDateOverride.deleteMany();
    await app.prisma.service.deleteMany();
    await app.prisma.user.deleteMany();
    await app.prisma.tenant.deleteMany();

    const signup = await app.inject({
      method: "POST",
      url: "/auth/signup",
      payload: {
        email: "owner@example.com",
        password: "password123",
        tenantName: "Clinica",
        tenantSlug: "clinica",
      },
    });
    token = signup.json().token;

    const svc = await app.inject({
      method: "POST",
      url: "/services",
      headers: { authorization: `Bearer ${token}` },
      payload: { name: "Limpeza", priceInCents: 5000, durationInMinutes: 30 },
    });
    serviceId = svc.json().id;

    const hrs = await app.inject({
      method: "POST",
      url: "/hours",
      headers: { authorization: `Bearer ${token}` },
      payload: { dayOfWeek: 1, openTime: "09:00", closeTime: "12:00" },
    });
    hoursId = hrs.json().id;
  });

  it("retorna slots locais (UTC-3) começando às 09:00 local = 12:00Z", async () => {
    const res = await app.inject({
      method: "GET",
      url: `/availability?serviceId=${serviceId}&date=${date}`,
      headers: { authorization: `Bearer ${token}` },
    });
    expect(res.statusCode).toBe(200);
    const slots = res.json() as Array<{ startTime: string; endTime: string }>;
    expect(slots.length).toBeGreaterThan(0);
    expect(slots[0].startTime).toBe("2026-06-15T12:00:00.000Z");
  });

  it("remove slots que colidem com o intervalo de almoço (10:00-10:30 local)", async () => {
    await app.inject({
      method: "POST",
      url: `/hours/${hoursId}/breaks`,
      headers: { authorization: `Bearer ${token}` },
      payload: { startTime: "10:00", endTime: "10:30" },
    });

    const res = await app.inject({
      method: "GET",
      url: `/availability?serviceId=${serviceId}&date=${date}`,
      headers: { authorization: `Bearer ${token}` },
    });
    const starts = (res.json() as Array<{ startTime: string }>).map((s) => s.startTime);
    // 10:00-10:30 local = 13:00-13:30Z; nenhum slot pode sobrepor essa janela
    expect(starts).not.toContain("2026-06-15T12:45:00.000Z"); // 09:45 local termina 10:15 (colide)
    expect(starts).not.toContain("2026-06-15T13:00:00.000Z"); // 10:00 local (almoço)
    expect(starts).toContain("2026-06-15T13:30:00.000Z"); // 10:30 local (ok)
  });

  it("remove slot ocupado por agendamento existente", async () => {
    await app.inject({
      method: "POST",
      url: "/appointments",
      headers: { authorization: `Bearer ${token}` },
      payload: {
        customerName: "Jose",
        customerPhone: "559999999999",
        serviceId,
        startTime: "2026-06-15T12:00:00.000Z", // 09:00 local
      },
    });

    const res = await app.inject({
      method: "GET",
      url: `/availability?serviceId=${serviceId}&date=${date}`,
      headers: { authorization: `Bearer ${token}` },
    });
    const starts = (res.json() as Array<{ startTime: string }>).map((s) => s.startTime);
    expect(starts).not.toContain("2026-06-15T12:00:00.000Z");
  });
});
