import { describe, expect, it, afterAll } from "vitest";
import Fastify from "fastify";
import authPlugin from "../../src/plugins/auth.js";

/**
 * Garante que o JWT emitido tem expiração (claim `exp`). Não precisa de banco:
 * registra só o `authPlugin` (JWT/cookie, sem Prisma) e usa `app.jwt.sign`,
 * que aplica o `sign.expiresIn` configurado.
 */
describe("auth token expiry", () => {
  const app = Fastify();

  afterAll(async () => {
    await app.close();
  });

  it("emite token com exp ~7 dias após iat", async () => {
    await app.register(authPlugin);
    await app.ready();

    const token = app.jwt.sign({ userId: 1, tenantId: 1, role: "OWNER" });
    const decoded = app.jwt.decode<{ iat: number; exp: number }>(token);

    expect(decoded?.exp).toBeTypeOf("number");
    expect(decoded?.iat).toBeTypeOf("number");
    // 7 dias em segundos (default JWT_EXPIRES_IN)
    expect((decoded as { exp: number }).exp - (decoded as { iat: number }).iat).toBe(60 * 60 * 24 * 7);
  });
});
