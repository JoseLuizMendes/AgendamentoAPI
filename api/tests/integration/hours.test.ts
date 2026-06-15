import { describe, expect, it, beforeAll, afterAll, beforeEach } from "vitest";
import { buildApp } from "../../src/app.js";

const hasDb = Boolean(process.env["DATABASE_URL"]);

describe.skipIf(!hasDb)("integration/hours", () => {
  let app: Awaited<ReturnType<typeof buildApp>>;
  let ownerToken: string;

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
        tenantName: "Studio",
        tenantSlug: "studio",
      },
    });
    ownerToken = signup.json().token;
  });

  async function createDay() {
    const res = await app.inject({
      method: "POST",
      url: "/hours",
      headers: { authorization: `Bearer ${ownerToken}` },
      payload: { dayOfWeek: 1, openTime: "09:00", closeTime: "18:00" },
    });
    expect(res.statusCode).toBe(201);
    return res.json();
  }

  it("OWNER cria intervalo com label e ele volta no GET /hours", async () => {
    const day = await createDay();

    const brk = await app.inject({
      method: "POST",
      url: `/hours/${day.id}/breaks`,
      headers: { authorization: `Bearer ${ownerToken}` },
      payload: { startTime: "12:00", endTime: "13:00", label: "Almoço" },
    });
    expect(brk.statusCode).toBe(201);
    expect(brk.json().label).toBe("Almoço");

    const list = await app.inject({
      method: "GET",
      url: "/hours",
      headers: { authorization: `Bearer ${ownerToken}` },
    });
    expect(list.statusCode).toBe(200);
    const monday = list.json().find((h: { dayOfWeek: number }) => h.dayOfWeek === 1);
    expect(monday.breaks).toHaveLength(1);
    expect(monday.breaks[0].label).toBe("Almoço");
    expect(monday.breaks[0].startTime).toBe("12:00");
  });

  it("intervalo sem label funciona (label é opcional)", async () => {
    const day = await createDay();
    const brk = await app.inject({
      method: "POST",
      url: `/hours/${day.id}/breaks`,
      headers: { authorization: `Bearer ${ownerToken}` },
      payload: { startTime: "15:00", endTime: "15:30" },
    });
    expect(brk.statusCode).toBe(201);
    expect(brk.json().label ?? null).toBeNull();
  });

  it("PUT edita o horário do dia", async () => {
    const day = await createDay();
    const res = await app.inject({
      method: "PUT",
      url: `/hours/${day.id}`,
      headers: { authorization: `Bearer ${ownerToken}` },
      payload: { openTime: "10:00" },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().openTime).toBe("10:00");
  });

  it("DELETE remove o dia", async () => {
    const day = await createDay();
    const del = await app.inject({
      method: "DELETE",
      url: `/hours/${day.id}`,
      headers: { authorization: `Bearer ${ownerToken}` },
    });
    expect(del.statusCode).toBe(204);

    const list = await app.inject({
      method: "GET",
      url: "/hours",
      headers: { authorization: `Bearer ${ownerToken}` },
    });
    expect(list.json()).toHaveLength(0);
  });
});
