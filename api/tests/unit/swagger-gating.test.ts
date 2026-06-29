import { describe, expect, it, afterEach, vi } from "vitest";

/**
 * Hardening: a documentação interativa (Swagger UI em /docs) NÃO deve existir em produção —
 * não expor a superfície completa da API. Fora de produção, segue disponível.
 *
 * `config` é um singleton avaliado no import; cada caso reseta os módulos e re-importa a app
 * com o NODE_ENV desejado.
 */
describe("Swagger gating por ambiente", () => {
  afterEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
  });

  it("produção: GET /docs responde 404 (UI não registrada)", async () => {
    vi.resetModules();
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("JWT_SECRET", "x".repeat(40)); // prod exige segredo >= 32
    vi.stubEnv("DATABASE_URL", "postgresql://u:p@127.0.0.1:5/db");
    const { buildApp } = await import("../../src/app.js");
    const app = await buildApp();
    await app.ready();
    const res = await app.inject({ method: "GET", url: "/docs" });
    expect(res.statusCode).toBe(404);
    // A raiz segue respondendo (discovery), sem expor docs.
    const root = await app.inject({ method: "GET", url: "/" });
    expect(root.statusCode).toBe(200);
    await app.close();
  });

  it("desenvolvimento: GET /docs disponível (200 ou redirect)", async () => {
    vi.resetModules();
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("DATABASE_URL", "postgresql://u:p@127.0.0.1:5/db");
    const { buildApp } = await import("../../src/app.js");
    const app = await buildApp();
    await app.ready();
    const res = await app.inject({ method: "GET", url: "/docs" });
    expect([200, 301, 302]).toContain(res.statusCode);
    await app.close();
  });
});
