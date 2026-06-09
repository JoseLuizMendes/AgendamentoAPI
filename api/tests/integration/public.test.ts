import { describe, expect, it, beforeAll, afterAll, beforeEach } from "vitest";
import { buildApp } from "../../src/app.js";

const hasDb = Boolean(process.env["DATABASE_URL"]);

describe.skipIf(!hasDb)("integration/public (auto-agendamento)", () => {
  let app: Awaited<ReturnType<typeof buildApp>>;
  let ownerToken: string;
  let serviceId: number;

  const slug = "clinica";
  const date = "2026-06-15"; // segunda

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
        tenantSlug: slug,
      },
    });
    ownerToken = signup.json().token;

    const svc = await app.inject({
      method: "POST",
      url: "/services",
      headers: { authorization: `Bearer ${ownerToken}` },
      payload: { name: "Limpeza", priceInCents: 5000, durationInMinutes: 30 },
    });
    serviceId = svc.json().id;

    await app.inject({
      method: "POST",
      url: "/hours",
      headers: { authorization: `Bearer ${ownerToken}` },
      payload: { dayOfWeek: 1, openTime: "09:00", closeTime: "12:00" },
    });
  });

  it("lista serviços públicos sem auth", async () => {
    const res = await app.inject({ method: "GET", url: `/public/${slug}/services` });
    expect(res.statusCode).toBe(200);
    const list = res.json() as Array<{ name: string }>;
    expect(list[0].name).toBe("Limpeza");
  });

  it("disponibilidade pública sem auth", async () => {
    const res = await app.inject({
      method: "GET",
      url: `/public/${slug}/availability?serviceId=${serviceId}&date=${date}`,
    });
    expect(res.statusCode).toBe(200);
    expect((res.json() as unknown[]).length).toBeGreaterThan(0);
  });

  it("bloqueia auto-agendamento quando allowCustomerBooking=false (403)", async () => {
    const res = await app.inject({
      method: "POST",
      url: `/public/${slug}/appointments`,
      payload: {
        customerName: "Cliente Web",
        customerPhone: "551111111111",
        serviceId,
        startTime: "2026-06-15T14:00:00.000Z",
      },
    });
    expect(res.statusCode).toBe(403);
  });

  it("permite auto-agendamento quando allowCustomerBooking=true (201)", async () => {
    await app.inject({
      method: "PATCH",
      url: "/settings",
      headers: { authorization: `Bearer ${ownerToken}` },
      payload: { allowCustomerBooking: true },
    });

    const res = await app.inject({
      method: "POST",
      url: `/public/${slug}/appointments`,
      payload: {
        customerName: "Cliente Web",
        customerPhone: "551111111111",
        serviceId,
        startTime: "2026-06-15T14:00:00.000Z",
      },
    });
    expect(res.statusCode).toBe(201);
    expect(res.json().userId).toBeNull();
  });
});
