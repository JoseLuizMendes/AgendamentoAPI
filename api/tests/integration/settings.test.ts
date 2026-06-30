import { describe, expect, it, beforeAll, afterAll, beforeEach } from "vitest";
import { buildApp } from "../../src/app.js";

const hasDb = Boolean(process.env["DATABASE_URL"]);

describe.skipIf(!hasDb)("integration/settings", () => {
  let app: Awaited<ReturnType<typeof buildApp>>;
  let ownerToken: string;
  let staffToken: string;

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
    ownerToken = signup.cookies.find((c) => c.name === "token")?.value ?? "";

    await app.inject({
      method: "POST",
      url: "/users",
      headers: { authorization: `Bearer ${ownerToken}` },
      payload: { email: "staff@example.com", password: "password123", role: "STAFF" },
    });
    const login = await app.inject({
      method: "POST",
      url: "/auth/login",
      payload: { email: "staff@example.com", password: "password123", tenantSlug: "clinica" },
    });
    staffToken = login.cookies.find((c) => c.name === "token")?.value ?? "";
  });

  it("GET /settings retorna defaults", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/settings",
      headers: { authorization: `Bearer ${ownerToken}` },
    });
    expect(res.statusCode).toBe(200);
    const s = res.json();
    expect(s.allowCustomerBooking).toBe(false);
    expect(s.timezone).toBe("America/Sao_Paulo");
    expect(s.slotIntervalMinutes).toBe(15);
    // Defaults dos limiares de triagem
    expect(s.statusPromptAfterStartMin).toBe(0);
    expect(s.overdueAfterEndMin).toBe(60);
  });

  it("OWNER atualiza configurações via PATCH", async () => {
    const res = await app.inject({
      method: "PATCH",
      url: "/settings",
      headers: { authorization: `Bearer ${ownerToken}` },
      payload: { allowCustomerBooking: true, slotIntervalMinutes: 30 },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().allowCustomerBooking).toBe(true);
    expect(res.json().slotIntervalMinutes).toBe(30);
  });

  it("OWNER atualiza os limiares de triagem", async () => {
    const res = await app.inject({
      method: "PATCH",
      url: "/settings",
      headers: { authorization: `Bearer ${ownerToken}` },
      payload: { statusPromptAfterStartMin: 15, overdueAfterEndMin: 90 },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().statusPromptAfterStartMin).toBe(15);
    expect(res.json().overdueAfterEndMin).toBe(90);
  });

  it("STAFF não pode alterar configurações (403)", async () => {
    const res = await app.inject({
      method: "PATCH",
      url: "/settings",
      headers: { authorization: `Bearer ${staffToken}` },
      payload: { allowCustomerBooking: true },
    });
    expect(res.statusCode).toBe(403);
  });

  it("rejeita fuso horário inválido (400)", async () => {
    const res = await app.inject({
      method: "PATCH",
      url: "/settings",
      headers: { authorization: `Bearer ${ownerToken}` },
      payload: { timezone: "Marte/Olympus" },
    });
    expect(res.statusCode).toBe(400);
  });
});
