import { describe, expect, it, beforeAll, afterAll, vi } from "vitest";
import type { FastifyInstance } from "fastify";

/**
 * Contrato de POST /client-errors (sem DB — `app.inject`). O endpoint só valida (Zod) e
 * loga via pino; não toca no banco. Com DATABASE_URL bogus o handler ainda responde 204
 * porque não consulta o Prisma. O rate limit reforçado (30/min) é por IP — usamos IPs
 * distintos por caso para não contaminar entre testes. Espelha `login-rate-limit.test.ts`.
 */
describe("POST /client-errors", () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    vi.stubEnv("DATABASE_URL", "postgresql://u:p@127.0.0.1:5/db");
    const { buildApp } = await import("../../src/app.js");
    app = await buildApp();
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
    vi.unstubAllEnvs();
  });

  it("204 quando o payload é válido", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/client-errors",
      remoteAddress: "198.51.100.1",
      payload: { message: "boom", kind: "render" },
    });

    expect(res.statusCode).toBe(204);
    expect(res.body).toBe("");
  });

  it("400 quando falta `message`", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/client-errors",
      remoteAddress: "198.51.100.2",
      payload: { kind: "unhandled" },
    });

    expect(res.statusCode).toBe(400);
  });

  it("429 ao cruzar 30 requisições na janela (mesmo IP)", async () => {
    const statuses: number[] = [];
    for (let i = 0; i < 31; i++) {
      const res = await app.inject({
        method: "POST",
        url: "/client-errors",
        remoteAddress: "198.51.100.3",
        payload: { message: "flood" },
      });
      statuses.push(res.statusCode);
    }

    // As 30 primeiras passam (204); a 31ª é barrada pelo rate limit.
    expect(statuses.slice(0, 30).every((s) => s !== 429)).toBe(true);
    expect(statuses[30]).toBe(429);
  });
});
