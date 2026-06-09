import { describe, expect, it, beforeAll, afterAll, beforeEach } from "vitest";
import { buildApp } from "../../src/app.js";

const hasDb = Boolean(process.env["DATABASE_URL"]);

describe.skipIf(!hasDb)("integration/appointments", () => {
  let app: Awaited<ReturnType<typeof buildApp>>;
  let token: string;

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
  });

  async function createService(name: string, durationInMinutes: number): Promise<number> {
    const res = await app.inject({
      method: "POST",
      url: "/services",
      headers: { authorization: `Bearer ${token}` },
      payload: { name, priceInCents: 5000, durationInMinutes },
    });
    return res.json().id as number;
  }

  it("bloqueia conflito tenant-wide mesmo entre serviços diferentes (409)", async () => {
    const limpeza = await createService("Limpeza", 30);
    const canal = await createService("Canal", 60);

    const first = await app.inject({
      method: "POST",
      url: "/appointments",
      headers: { authorization: `Bearer ${token}` },
      payload: {
        customerName: "Jose",
        customerPhone: "559999999999",
        serviceId: limpeza,
        startTime: "2026-06-15T14:00:00.000Z",
      },
    });
    expect(first.statusCode).toBe(201);

    // Outro serviço, horário sobreposto -> deve conflitar (1 profissional)
    const second = await app.inject({
      method: "POST",
      url: "/appointments",
      headers: { authorization: `Bearer ${token}` },
      payload: {
        customerName: "Maria",
        customerPhone: "558888888888",
        serviceId: canal,
        startTime: "2026-06-15T14:15:00.000Z",
      },
    });
    expect(second.statusCode).toBe(409);
  });

  it("valida transições de status (CANCELED -> COMPLETED é 400)", async () => {
    const limpeza = await createService("Limpeza", 30);

    const created = await app.inject({
      method: "POST",
      url: "/appointments",
      headers: { authorization: `Bearer ${token}` },
      payload: {
        customerName: "Ana",
        customerPhone: "557777777777",
        serviceId: limpeza,
        startTime: "2026-06-15T15:00:00.000Z",
      },
    });
    const id = created.json().id as number;

    // SCHEDULED -> CONFIRMED (ok)
    const confirm = await app.inject({
      method: "PATCH",
      url: `/appointments/${id}`,
      headers: { authorization: `Bearer ${token}` },
      payload: { status: "CONFIRMED" },
    });
    expect(confirm.statusCode).toBe(200);
    expect(confirm.json().status).toBe("CONFIRMED");

    // CONFIRMED -> CANCELED (ok)
    const cancel = await app.inject({
      method: "PATCH",
      url: `/appointments/${id}`,
      headers: { authorization: `Bearer ${token}` },
      payload: { status: "CANCELED" },
    });
    expect(cancel.statusCode).toBe(200);

    // CANCELED -> COMPLETED (inválido)
    const invalid = await app.inject({
      method: "PATCH",
      url: `/appointments/${id}`,
      headers: { authorization: `Bearer ${token}` },
      payload: { status: "COMPLETED" },
    });
    expect(invalid.statusCode).toBe(400);
  });

  it("filtra agendamentos por intervalo de data (from/to)", async () => {
    const limpeza = await createService("Limpeza", 30);

    await app.inject({
      method: "POST",
      url: "/appointments",
      headers: { authorization: `Bearer ${token}` },
      payload: {
        customerName: "Dia15",
        customerPhone: "551111111111",
        serviceId: limpeza,
        startTime: "2026-06-15T14:00:00.000Z",
      },
    });
    await app.inject({
      method: "POST",
      url: "/appointments",
      headers: { authorization: `Bearer ${token}` },
      payload: {
        customerName: "Dia20",
        customerPhone: "552222222222",
        serviceId: limpeza,
        startTime: "2026-06-20T14:00:00.000Z",
      },
    });

    const res = await app.inject({
      method: "GET",
      url: "/appointments?from=2026-06-15T00:00:00.000Z&to=2026-06-16T00:00:00.000Z",
      headers: { authorization: `Bearer ${token}` },
    });
    expect(res.statusCode).toBe(200);
    const list = res.json() as Array<{ customerName: string }>;
    expect(list).toHaveLength(1);
    expect(list[0].customerName).toBe("Dia15");
  });
});
