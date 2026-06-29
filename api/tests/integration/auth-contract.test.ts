import { describe, expect, it, beforeAll, afterAll, beforeEach } from "vitest";
import { buildApp } from "../../src/app.js";

const hasDb = Boolean(process.env["DATABASE_URL"]);

/**
 * Contrato de auth (hardening US3): o token de sessão NÃO trafega no corpo das respostas de
 * login/signup — só no cookie httpOnly. Garante que um XSS não consiga ler o token pela resposta.
 */
describe.skipIf(!hasDb)("integration/auth-contract", () => {
  let app: Awaited<ReturnType<typeof buildApp>>;

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    await app.prisma.appointment.deleteMany();
    await app.prisma.service.deleteMany();
    await app.prisma.user.deleteMany();
    await app.prisma.tenant.deleteMany();
  });

  function tokenCookie(res: Awaited<ReturnType<typeof app.inject>>) {
    return res.cookies.find((c) => c.name === "token");
  }

  it("POST /auth/signup: sem token no corpo, com cookie httpOnly", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/auth/signup",
      payload: { email: "owner@example.com", password: "password123", tenantName: "Clinica", tenantSlug: "clinica" },
    });

    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(body.user).toBeTruthy();
    expect(body.tenant).toBeTruthy();
    expect(body).not.toHaveProperty("token"); // token NÃO vai no corpo

    const cookie = tokenCookie(res);
    expect(cookie?.value).toBeTruthy();
    expect(cookie?.httpOnly).toBe(true);
  });

  it("POST /auth/login: sem token no corpo, com cookie httpOnly", async () => {
    await app.inject({
      method: "POST",
      url: "/auth/signup",
      payload: { email: "owner@example.com", password: "password123", tenantName: "Clinica", tenantSlug: "clinica" },
    });

    const res = await app.inject({
      method: "POST",
      url: "/auth/login",
      payload: { email: "owner@example.com", password: "password123", tenantSlug: "clinica" },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.user).toBeTruthy();
    expect(body).not.toHaveProperty("token"); // token NÃO vai no corpo

    const cookie = tokenCookie(res);
    expect(cookie?.value).toBeTruthy();
    expect(cookie?.httpOnly).toBe(true);
  });
});
