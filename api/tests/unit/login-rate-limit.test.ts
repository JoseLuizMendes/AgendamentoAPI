import { describe, expect, it, beforeAll, afterAll, vi } from "vitest";
import type { FastifyInstance } from "fastify";

/**
 * Verifica o rate limit reforçado em POST /auth/login sem precisar de banco real:
 * com DATABASE_URL bogus o handler falha (500), mas o rate limit dispara ANTES do
 * handler — então a requisição que cruza o teto vira 429. Isola o módulo (vitest
 * isola por arquivo) e injeta a env antes do primeiro import de config/buildApp.
 */
describe("login rate limit (10/min)", () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    vi.stubEnv("DATABASE_URL", "postgresql://u:p@127.0.0.1:5/db"); // recusa rápido
    const { buildApp } = await import("../../src/app.js");
    app = await buildApp();
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
    vi.unstubAllEnvs();
  });

  it("retorna 429 ao cruzar 10 tentativas na janela", async () => {
    const statuses: number[] = [];
    for (let i = 0; i < 11; i++) {
      const res = await app.inject({
        method: "POST",
        url: "/auth/login",
        remoteAddress: "203.0.113.5", // mesmo IP em todas → mesma chave de rate limit
        payload: { email: "a@b.com", password: "x".repeat(8), tenantSlug: "t" },
      });
      statuses.push(res.statusCode);
    }

    // Nenhum dos 10 primeiros é 429; o 11º é barrado pelo rate limit.
    expect(statuses.slice(0, 10).every((s) => s !== 429)).toBe(true);
    expect(statuses[10]).toBe(429);
  });
});
