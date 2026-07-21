import { describe, expect, it, beforeAll, afterAll, beforeEach } from "vitest";
import { buildApp } from "../../src/app.js";
import { upsertPatient } from "../../src/services/patients.js";

const hasDb = Boolean(process.env["DATABASE_URL"]);

describe.skipIf(!hasDb)("integration/patients", () => {
  let app: Awaited<ReturnType<typeof buildApp>>;
  let token: string;
  let tenantId: number;

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    await app.prisma.appointment.deleteMany();
    await app.prisma.patient.deleteMany();
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
    token = signup.cookies.find((c) => c.name === "token")?.value ?? "";
    const owner = await app.prisma.user.findFirst({ where: { email: "owner@example.com" } });
    tenantId = owner!.tenantId;
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

  describe("upsertPatient", () => {
    it("cria na 1ª vez e reaproveita (mesmo telefone) na 2ª, atualizando o nome", async () => {
      const a = await upsertPatient(app.prisma, tenantId, "5511999991234", "Jose");
      const b = await upsertPatient(app.prisma, tenantId, "5511999991234", "Jose Silva");
      expect(b.id).toBe(a.id);
      expect(b.name).toBe("Jose Silva");
      expect(await app.prisma.patient.count()).toBe(1);
    });

    it("telefones diferentes = pacientes diferentes", async () => {
      await upsertPatient(app.prisma, tenantId, "5511999991234", "Jose");
      await upsertPatient(app.prisma, tenantId, "5511888882222", "Maria");
      expect(await app.prisma.patient.count()).toBe(2);
    });
  });

  describe("booking → linka o paciente por telefone", () => {
    it("cria e linka o paciente; telefone formatado diferente = o mesmo paciente", async () => {
      const serviceId = await createService("Limpeza", 30);

      const r1 = await app.inject({
        method: "POST",
        url: "/appointments",
        headers: { authorization: `Bearer ${token}` },
        payload: { customerName: "Ana", customerPhone: "+55 11 90000-0000", serviceId, startTime: "2026-09-01T14:00:00.000Z" },
      });
      expect(r1.statusCode).toBe(201);

      const r2 = await app.inject({
        method: "POST",
        url: "/appointments",
        headers: { authorization: `Bearer ${token}` },
        payload: { customerName: "Ana", customerPhone: "5511900000000", serviceId, startTime: "2026-09-01T16:00:00.000Z" },
      });
      expect(r2.statusCode).toBe(201);

      const a1 = await app.prisma.appointment.findUnique({ where: { id: r1.json().id as number }, select: { patientId: true } });
      const a2 = await app.prisma.appointment.findUnique({ where: { id: r2.json().id as number }, select: { patientId: true } });
      expect(typeof a1?.patientId).toBe("number");
      expect(a2?.patientId).toBe(a1?.patientId);
      expect(await app.prisma.patient.count()).toBe(1);
    });

    it("PATCH trocando o telefone re-linka para outro paciente", async () => {
      const serviceId = await createService("Limpeza", 30);
      const created = await app.inject({
        method: "POST",
        url: "/appointments",
        headers: { authorization: `Bearer ${token}` },
        payload: { customerName: "Bia", customerPhone: "5511111112222", serviceId, startTime: "2026-09-02T14:00:00.000Z" },
      });
      const id = created.json().id as number;
      const before = await app.prisma.appointment.findUnique({ where: { id }, select: { patientId: true } });

      const patch = await app.inject({
        method: "PATCH",
        url: `/appointments/${id}`,
        headers: { authorization: `Bearer ${token}` },
        payload: { customerName: "Bianca", customerPhone: "5511333334444" },
      });
      expect(patch.statusCode).toBe(200);

      const after = await app.prisma.appointment.findUnique({ where: { id }, select: { patientId: true } });
      expect(typeof after?.patientId).toBe("number");
      expect(after?.patientId).not.toBe(before?.patientId);
      expect(await app.prisma.patient.count()).toBe(2);
    });
  });

  describe("exposição na API", () => {
    it("POST /appointments retorna patientId no corpo da resposta", async () => {
      const serviceId = await createService("Limpeza", 30);
      const r = await app.inject({
        method: "POST",
        url: "/appointments",
        headers: { authorization: `Bearer ${token}` },
        payload: { customerName: "Ana", customerPhone: "5511900000000", serviceId, startTime: "2026-09-03T14:00:00.000Z" },
      });
      expect(r.statusCode).toBe(201);
      expect(typeof r.json().patientId).toBe("number");
    });

    it("/auth/me expõe tenant.businessType (default GENERIC)", async () => {
      const me = await app.inject({
        method: "GET",
        url: "/auth/me",
        headers: { authorization: `Bearer ${token}` },
      });
      expect(me.statusCode).toBe(200);
      expect(me.json().tenant.businessType).toBe("GENERIC");
    });
  });
});
