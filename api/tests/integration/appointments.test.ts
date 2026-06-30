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
    token = signup.cookies.find((c) => c.name === "token")?.value ?? "";
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

  it("cria com duração custom (endTime) sobrepondo a do serviço", async () => {
    const limpeza = await createService("Limpeza", 30);

    const created = await app.inject({
      method: "POST",
      url: "/appointments",
      headers: { authorization: `Bearer ${token}` },
      payload: {
        customerName: "Custom",
        customerPhone: "551234567890",
        serviceId: limpeza,
        startTime: "2026-06-15T14:00:00.000Z",
        endTime: "2026-06-15T15:30:00.000Z", // 90min, ignora os 30min do serviço
      },
    });
    expect(created.statusCode).toBe(201);
    expect(new Date(created.json().endTime).toISOString()).toBe("2026-06-15T15:30:00.000Z");
  });

  it("sem endTime usa a duração do serviço (fallback)", async () => {
    const limpeza = await createService("Limpeza", 30);

    const created = await app.inject({
      method: "POST",
      url: "/appointments",
      headers: { authorization: `Bearer ${token}` },
      payload: {
        customerName: "Fallback",
        customerPhone: "551234567890",
        serviceId: limpeza,
        startTime: "2026-06-15T14:00:00.000Z",
      },
    });
    expect(created.statusCode).toBe(201);
    expect(new Date(created.json().endTime).toISOString()).toBe("2026-06-15T14:30:00.000Z");
  });

  it("rejeita endTime menor ou igual ao início (400)", async () => {
    const limpeza = await createService("Limpeza", 30);

    const created = await app.inject({
      method: "POST",
      url: "/appointments",
      headers: { authorization: `Bearer ${token}` },
      payload: {
        customerName: "Invalido",
        customerPhone: "551234567890",
        serviceId: limpeza,
        startTime: "2026-06-15T14:00:00.000Z",
        endTime: "2026-06-15T13:30:00.000Z",
      },
    });
    expect(created.statusCode).toBe(400);
  });

  it("mover (PATCH startTime) preserva a duração custom", async () => {
    const limpeza = await createService("Limpeza", 30);

    const created = await app.inject({
      method: "POST",
      url: "/appointments",
      headers: { authorization: `Bearer ${token}` },
      payload: {
        customerName: "Mover",
        customerPhone: "551234567890",
        serviceId: limpeza,
        startTime: "2026-06-15T14:00:00.000Z",
        endTime: "2026-06-15T15:30:00.000Z", // 90min
      },
    });
    const id = created.json().id as number;

    const moved = await app.inject({
      method: "PATCH",
      url: `/appointments/${id}`,
      headers: { authorization: `Bearer ${token}` },
      payload: { startTime: "2026-06-15T16:00:00.000Z" },
    });
    expect(moved.statusCode).toBe(200);
    // 90min preservados => fim 17:30
    expect(new Date(moved.json().endTime).toISOString()).toBe("2026-06-15T17:30:00.000Z");
  });

  it("redimensionar (PATCH endTime) muda o término e checa conflito (409)", async () => {
    const limpeza = await createService("Limpeza", 30);

    const a = await app.inject({
      method: "POST",
      url: "/appointments",
      headers: { authorization: `Bearer ${token}` },
      payload: {
        customerName: "A",
        customerPhone: "551234567890",
        serviceId: limpeza,
        startTime: "2026-06-15T14:00:00.000Z", // 14:00–14:30
      },
    });
    const idA = a.json().id as number;

    const b = await app.inject({
      method: "POST",
      url: "/appointments",
      headers: { authorization: `Bearer ${token}` },
      payload: {
        customerName: "B",
        customerPhone: "558888888888",
        serviceId: limpeza,
        startTime: "2026-06-15T14:30:00.000Z", // 14:30–15:00 (sem overlap)
      },
    });
    expect(b.statusCode).toBe(201);

    // Redimensiona A para 14:45 -> invade B -> 409
    const resize = await app.inject({
      method: "PATCH",
      url: `/appointments/${idA}`,
      headers: { authorization: `Bearer ${token}` },
      payload: { endTime: "2026-06-15T14:45:00.000Z" },
    });
    expect(resize.statusCode).toBe(409);

    // Redimensiona A para 14:40 (sem invadir) -> ok
    const ok = await app.inject({
      method: "PATCH",
      url: `/appointments/${idA}`,
      headers: { authorization: `Bearer ${token}` },
      payload: { endTime: "2026-06-15T14:25:00.000Z" },
    });
    expect(ok.statusCode).toBe(200);
    expect(new Date(ok.json().endTime).toISOString()).toBe("2026-06-15T14:25:00.000Z");
  });
});
