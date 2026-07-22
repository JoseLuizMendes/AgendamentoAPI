import { describe, expect, it, beforeAll, afterAll, beforeEach } from "vitest";
import { buildApp } from "../../src/app.js";

const hasDb = Boolean(process.env["DATABASE_URL"]);

describe.skipIf(!hasDb)("integration/patients-routes", () => {
  let app: Awaited<ReturnType<typeof buildApp>>;
  let ownerToken: string;
  let customerToken: string;
  let tenantId: number;
  let serviceId: number;

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();

    await app.prisma.appointmentTooth.deleteMany();
    await app.prisma.appointment.deleteMany();
    await app.prisma.patient.deleteMany();
    await app.prisma.service.deleteMany();
    await app.prisma.user.deleteMany();
    await app.prisma.tenant.deleteMany();

    const signup = await app.inject({
      method: "POST",
      url: "/auth/signup",
      payload: { email: "owner@example.com", password: "password123", name: "Owner", tenantName: "Clinica", tenantSlug: "clinica" },
    });
    ownerToken = signup.cookies.find((c) => c.name === "token")?.value ?? "";
    tenantId = signup.json().user.tenantId as number;

    await app.inject({
      method: "POST",
      url: "/users",
      headers: { authorization: `Bearer ${ownerToken}` },
      payload: { email: "cust@example.com", password: "password123", role: "CUSTOMER" },
    });
    const loginCust = await app.inject({
      method: "POST",
      url: "/auth/login",
      payload: { email: "cust@example.com", password: "password123", tenantSlug: "clinica" },
    });
    customerToken = loginCust.cookies.find((c) => c.name === "token")?.value ?? "";
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    await app.prisma.appointmentTooth.deleteMany();
    await app.prisma.appointment.deleteMany();
    await app.prisma.patient.deleteMany();
    await app.prisma.service.deleteMany();
    await app.prisma.tenant.update({ where: { id: tenantId }, data: { businessType: "DENTAL" } });
    const svc = await app.inject({
      method: "POST",
      url: "/services",
      headers: { authorization: `Bearer ${ownerToken}` },
      payload: { name: "Consulta", priceInCents: 5000, durationInMinutes: 30 },
    });
    serviceId = svc.json().id as number;
  });

  async function createAppointment(name: string, phone: string, startISO: string): Promise<number> {
    const r = await app.inject({
      method: "POST",
      url: "/appointments",
      headers: { authorization: `Bearer ${ownerToken}` },
      payload: { customerName: name, customerPhone: phone, serviceId, startTime: startISO },
    });
    expect(r.statusCode).toBe(201);
    return r.json().id as number;
  }

  async function setTeeth(appointmentId: number, teeth: Array<{ toothFdi: number; procedure: string; note?: string }>): Promise<void> {
    const put = await app.inject({
      method: "PUT",
      url: `/appointments/${appointmentId}/teeth`,
      headers: { authorization: `Bearer ${ownerToken}` },
      payload: { teeth },
    });
    expect(put.statusCode).toBe(200);
  }

  it("GET /patients lista e busca por nome/telefone", async () => {
    await createAppointment("Ana Souza", "5511900000000", "2026-10-01T14:00:00.000Z");
    await createAppointment("Maria Lima", "5511988887777", "2026-10-01T16:00:00.000Z");

    const all = await app.inject({ method: "GET", url: "/patients", headers: { authorization: `Bearer ${ownerToken}` } });
    expect(all.statusCode).toBe(200);
    expect(all.json()).toHaveLength(2);

    const byName = await app.inject({ method: "GET", url: "/patients?search=ana", headers: { authorization: `Bearer ${ownerToken}` } });
    expect(byName.json()).toHaveLength(1);
    expect(byName.json()[0].name).toBe("Ana Souza");

    const byPhone = await app.inject({ method: "GET", url: "/patients?search=98888", headers: { authorization: `Bearer ${ownerToken}` } });
    expect(byPhone.json()).toHaveLength(1);
    expect(byPhone.json()[0].name).toBe("Maria Lima");
  });

  it("GET /patients/:id devolve ficha + histórico de consultas", async () => {
    await createAppointment("Ana", "5511900000000", "2026-10-01T14:00:00.000Z");
    const patient = await app.prisma.patient.findFirstOrThrow({ where: { phone: "5511900000000" } });

    const res = await app.inject({ method: "GET", url: `/patients/${patient.id}`, headers: { authorization: `Bearer ${ownerToken}` } });
    expect(res.statusCode).toBe(200);
    expect(res.json().id).toBe(patient.id);
    expect(res.json().appointments).toHaveLength(1);
  });

  it("PATCH /patients/:id enriquece a ficha", async () => {
    await createAppointment("Ana", "5511900000000", "2026-10-01T14:00:00.000Z");
    const patient = await app.prisma.patient.findFirstOrThrow({ where: { phone: "5511900000000" } });

    const res = await app.inject({
      method: "PATCH",
      url: `/patients/${patient.id}`,
      headers: { authorization: `Bearer ${ownerToken}` },
      payload: { notes: "Alérgico a penicilina", birthDate: "1990-05-20T00:00:00.000Z" },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().notes).toBe("Alérgico a penicilina");
    expect(res.json().birthDate).not.toBeNull();
  });

  it("GET /patients/:id/odontogram agrega o último procedimento por dente", async () => {
    const a1 = await createAppointment("Ana", "5511900000000", "2026-10-01T14:00:00.000Z");
    const a2 = await createAppointment("Ana", "5511900000000", "2026-10-05T14:00:00.000Z");
    await setTeeth(a1, [{ toothFdi: 11, procedure: "RESTAURACAO" }]);
    await setTeeth(a2, [{ toothFdi: 11, procedure: "ENDODONTIA" }, { toothFdi: 21, procedure: "AVALIACAO" }]);
    const patient = await app.prisma.patient.findFirstOrThrow({ where: { phone: "5511900000000" } });

    const res = await app.inject({ method: "GET", url: `/patients/${patient.id}/odontogram`, headers: { authorization: `Bearer ${ownerToken}` } });
    expect(res.statusCode).toBe(200);
    const chart = res.json() as Array<{ toothFdi: number; procedure: string }>;
    expect(chart).toHaveLength(2);
    const tooth11 = chart.find((c) => c.toothFdi === 11);
    expect(tooth11?.procedure).toBe("ENDODONTIA"); // consulta mais recente vence
    expect(chart.find((c) => c.toothFdi === 21)?.procedure).toBe("AVALIACAO");
  });

  it("CUSTOMER não lista pacientes → 403", async () => {
    const res = await app.inject({ method: "GET", url: "/patients", headers: { authorization: `Bearer ${customerToken}` } });
    expect(res.statusCode).toBe(403);
  });

  it("paciente inexistente → 404", async () => {
    const res = await app.inject({ method: "GET", url: "/patients/999999", headers: { authorization: `Bearer ${ownerToken}` } });
    expect(res.statusCode).toBe(404);
  });
});
