import { describe, expect, it, beforeAll, afterAll, beforeEach } from "vitest";
import { buildApp } from "../../src/app.js";

const hasDb = Boolean(process.env["DATABASE_URL"]);

describe.skipIf(!hasDb)("integration/reports", () => {
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
      payload: { email: "owner@example.com", password: "password123", tenantName: "Clinica", tenantSlug: "clinica" },
    });
    token = signup.json().token;
  });

  async function createService(name: string, priceInCents: number, durationInMinutes: number): Promise<number> {
    const res = await app.inject({
      method: "POST",
      url: "/services",
      headers: { authorization: `Bearer ${token}` },
      payload: { name, priceInCents, durationInMinutes },
    });
    return res.json().id as number;
  }

  async function createAppt(serviceId: number, startTime: string, phone: string, name = "Cliente"): Promise<number> {
    const res = await app.inject({
      method: "POST",
      url: "/appointments",
      headers: { authorization: `Bearer ${token}` },
      payload: { customerName: name, customerPhone: phone, serviceId, startTime },
    });
    expect(res.statusCode).toBe(201);
    return res.json().id as number;
  }

  async function setStatus(id: number, status: string): Promise<void> {
    const res = await app.inject({
      method: "PATCH",
      url: `/appointments/${id}`,
      headers: { authorization: `Bearer ${token}` },
      payload: { status },
    });
    expect(res.statusCode).toBe(200);
  }

  it("agrega receita, clientes, novos vs recorrentes e comparativo", async () => {
    const limpeza = await createService("Limpeza", 5000, 30);
    const canal = await createService("Canal", 20000, 60);

    // Período anterior (maio): cliente P2 já aparece -> recorrente em junho
    const may = await createAppt(limpeza, "2026-05-15T13:00:00.000Z", "5511000002");
    await setStatus(may, "COMPLETED");

    // Período atual (junho), horários sem sobreposição
    const a1 = await createAppt(limpeza, "2026-06-02T13:00:00.000Z", "5511000001");
    const a2 = await createAppt(limpeza, "2026-06-03T13:00:00.000Z", "5511000002"); // P2 recorrente
    const a3 = await createAppt(canal, "2026-06-04T13:00:00.000Z", "5511000001"); // P1 de novo
    const a4 = await createAppt(limpeza, "2026-06-05T13:00:00.000Z", "5511000003");
    const a5 = await createAppt(limpeza, "2026-06-06T13:00:00.000Z", "5511000004");
    const a6 = await createAppt(canal, "2026-06-09T13:00:00.000Z", "5511000001");

    await setStatus(a1, "COMPLETED"); // 5000 realizado
    await setStatus(a3, "CONFIRMED"); // esperado
    await setStatus(a4, "CANCELED");
    await setStatus(a5, "NO_SHOW");
    await setStatus(a6, "COMPLETED"); // 20000 realizado
    // a2 permanece SCHEDULED (esperado)
    void a2;

    const res = await app.inject({
      method: "GET",
      url: "/reports/summary?from=2026-06-01T00:00:00.000Z&to=2026-07-01T00:00:00.000Z&granularity=day",
      headers: { authorization: `Bearer ${token}` },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();

    expect(body.current.revenueRealizedInCents).toBe(25000); // a1 + a6
    expect(body.current.revenueExpectedInCents).toBe(50000); // a1 + a2 + a3 + a6
    expect(body.current.appointmentsTotal).toBe(6);
    expect(body.current.completed).toBe(2);
    expect(body.current.canceled).toBe(1);
    expect(body.current.noShow).toBe(1);
    expect(body.current.clients).toBe(4); // P1..P4
    expect(body.current.newClients).toBe(3); // P2 é recorrente (apareceu em maio)
    expect(body.current.ticketMedioInCents).toBe(12500);

    // Distribuição por status (alimenta o funil do dashboard)
    expect(body.current.byStatus).toEqual({
      SCHEDULED: 1, // a2
      CONFIRMED: 1, // a3
      COMPLETED: 2, // a1 + a6
      NO_SHOW: 1, // a5
      CANCELED: 1, // a4
    });

    // Comparativo (maio): 1 concluído de 5000
    expect(body.previous.revenueRealizedInCents).toBe(5000);

    // Top serviços traz os dois
    const names = (body.topServices as Array<{ name: string }>).map((s) => s.name).sort();
    expect(names).toEqual(["Canal", "Limpeza"]);
  });
});
