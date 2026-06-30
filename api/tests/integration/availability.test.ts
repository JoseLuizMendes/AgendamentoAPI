import { describe, expect, it, beforeAll, afterAll, beforeEach } from "vitest";
import { buildApp } from "../../src/app.js";

const hasDb = Boolean(process.env["DATABASE_URL"]);

/**
 * Próxima segunda-feira (dayOfWeek=1) a partir de ~2 semanas à frente — sempre no FUTURO e dentro
 * da janela de agendamento (maxAdvanceDays=90). Evita o time-bomb de data hardcoded (disponibilidade
 * só devolve slots para datas futuras). São Paulo é UTC-3 o ano todo → 09:00 local = 12:00Z.
 */
function futureMonday(): string {
  const d = new Date();
  d.setUTCHours(12, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() + 14);
  while (d.getUTCDay() !== 1) d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

describe.skipIf(!hasDb)("integration/availability", () => {
  let app: Awaited<ReturnType<typeof buildApp>>;
  let token: string;
  let serviceId: number;
  let hoursId: number;

  // Segunda-feira futura (dayOfWeek=1) em America/Sao_Paulo.
  const date = futureMonday();

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
    token = signup.cookies.find((c) => c.name === "token")?.value ?? "";

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
    expect(slots[0].startTime).toBe(`${date}T12:00:00.000Z`);
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
    expect(starts).not.toContain(`${date}T12:45:00.000Z`); // 09:45 local termina 10:15 (colide)
    expect(starts).not.toContain(`${date}T13:00:00.000Z`); // 10:00 local (almoço)
    expect(starts).toContain(`${date}T13:30:00.000Z`); // 10:30 local (ok)
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
        startTime: `${date}T12:00:00.000Z`, // 09:00 local
      },
    });

    const res = await app.inject({
      method: "GET",
      url: `/availability?serviceId=${serviceId}&date=${date}`,
      headers: { authorization: `Bearer ${token}` },
    });
    const starts = (res.json() as Array<{ startTime: string }>).map((s) => s.startTime);
    expect(starts).not.toContain(`${date}T12:00:00.000Z`);
  });
});
