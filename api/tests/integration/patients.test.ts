import { describe, expect, it, beforeAll, afterAll, beforeEach } from "vitest";
import { buildApp } from "../../src/app.js";
import { upsertPatient } from "../../src/services/patients.js";

const hasDb = Boolean(process.env["DATABASE_URL"]);

describe.skipIf(!hasDb)("integration/patients", () => {
  let app: Awaited<ReturnType<typeof buildApp>>;
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
    const t = await app.prisma.tenant.create({ data: { name: "Clinica", slug: "clinica" } });
    tenantId = t.id;
  });

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
});
