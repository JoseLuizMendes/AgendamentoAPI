import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import type { FastifyInstance } from "fastify";

/**
 * Proteção anti-payload gigante: corpo acima do `bodyLimit` é rejeitado com 413 já no parsing,
 * antes da validação Zod. Testado em rota pública (sem DB) via `app.inject`.
 */
describe("bodyLimit", () => {
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

  it("corpo acima do limite → 413", async () => {
    const huge = "x".repeat(600 * 1024); // ~600 KB, acima do limite (512 KB)
    const res = await app.inject({
      method: "POST",
      url: "/client-errors",
      headers: { "content-type": "application/json" },
      payload: JSON.stringify({ message: huge }),
    });
    expect(res.statusCode).toBe(413);
  });
});
