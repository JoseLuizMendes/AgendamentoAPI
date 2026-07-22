import { describe, expect, it, beforeAll, afterAll, beforeEach } from "vitest";
import { buildApp } from "../../src/app.js";

const hasDb = Boolean(process.env["DATABASE_URL"]);

describe.skipIf(!hasDb)("integration/appointment-teeth-routes", () => {
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

  async function createAppointment(startISO = "2026-10-01T14:00:00.000Z"): Promise<number> {
    const r = await app.inject({
      method: "POST",
      url: "/appointments",
      headers: { authorization: `Bearer ${ownerToken}` },
      payload: { customerName: "Ana", customerPhone: "5511900000000", serviceId, startTime: startISO },
    });
    expect(r.statusCode).toBe(201);
    return r.json().id as number;
  }

  it("PUT /appointments/:id/teeth grava e retorna os dentes; GET inclui teeth", async () => {
    const id = await createAppointment();
    const put = await app.inject({
      method: "PUT",
      url: `/appointments/${id}/teeth`,
      headers: { authorization: `Bearer ${ownerToken}` },
      payload: { teeth: [{ toothFdi: 11, procedure: "RESTAURACAO" }, { toothFdi: 21, procedure: "AVALIACAO", note: "ok" }] },
    });
    expect(put.statusCode).toBe(200);
    expect(put.json()).toHaveLength(2);
    expect(put.json()[0].toothFdi).toBe(11);

    const get = await app.inject({ method: "GET", url: `/appointments/${id}`, headers: { authorization: `Bearer ${ownerToken}` } });
    expect(get.statusCode).toBe(200);
    expect(get.json().teeth).toHaveLength(2);
  });

  it("PUT teeth substitui o conjunto (replace-on-edit)", async () => {
    const id = await createAppointment();
    await app.inject({
      method: "PUT",
      url: `/appointments/${id}/teeth`,
      headers: { authorization: `Bearer ${ownerToken}` },
      payload: { teeth: [{ toothFdi: 11, procedure: "RESTAURACAO" }, { toothFdi: 21, procedure: "AVALIACAO" }] },
    });
    const put2 = await app.inject({
      method: "PUT",
      url: `/appointments/${id}/teeth`,
      headers: { authorization: `Bearer ${ownerToken}` },
      payload: { teeth: [{ toothFdi: 11, procedure: "ENDODONTIA" }] },
    });
    expect(put2.statusCode).toBe(200);
    expect(put2.json()).toHaveLength(1);
    expect(put2.json()[0].procedure).toBe("ENDODONTIA");
  });

  it("FDI inválido → 400", async () => {
    const id = await createAppointment();
    const put = await app.inject({
      method: "PUT",
      url: `/appointments/${id}/teeth`,
      headers: { authorization: `Bearer ${ownerToken}` },
      payload: { teeth: [{ toothFdi: 99, procedure: "RESTAURACAO" }] },
    });
    expect(put.statusCode).toBe(400);
  });

  it("tenant GENERIC → 400 (gating por vertical)", async () => {
    const id = await createAppointment();
    await app.prisma.tenant.update({ where: { id: tenantId }, data: { businessType: "GENERIC" } });
    const put = await app.inject({
      method: "PUT",
      url: `/appointments/${id}/teeth`,
      headers: { authorization: `Bearer ${ownerToken}` },
      payload: { teeth: [{ toothFdi: 11, procedure: "RESTAURACAO" }] },
    });
    expect(put.statusCode).toBe(400);
  });

  it("CUSTOMER → 403 (RBAC)", async () => {
    const id = await createAppointment();
    const put = await app.inject({
      method: "PUT",
      url: `/appointments/${id}/teeth`,
      headers: { authorization: `Bearer ${customerToken}` },
      payload: { teeth: [{ toothFdi: 11, procedure: "RESTAURACAO" }] },
    });
    expect(put.statusCode).toBe(403);
  });
});
