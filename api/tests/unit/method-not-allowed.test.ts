import { describe, expect, it, beforeAll, afterAll, vi } from "vitest";
import type { FastifyInstance } from "fastify";

/**
 * 405 Method Not Allowed: quando o caminho existe mas o método HTTP não bate, a API
 * responde 405 + header `Allow` (em vez do 404 padrão do Fastify). Caminho realmente
 * inexistente continua 404. Testado em rotas públicas (sem auth/DB) via `app.inject`
 * (DATABASE_URL bogus — esses caminhos não tocam o banco).
 */
describe("405 Method Not Allowed", () => {
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

  it("GET numa rota POST-only (/auth/signup) → 405 + Allow: POST", async () => {
    const res = await app.inject({ method: "GET", url: "/auth/signup" });
    expect(res.statusCode).toBe(405);
    expect(res.headers["allow"]).toContain("POST");
    const body = res.json();
    expect(body.statusCode).toBe(405);
    expect(body.error).toBe("Method Not Allowed");
  });

  it("DELETE /auth/login (login é POST) → 405 + Allow: POST", async () => {
    const res = await app.inject({ method: "DELETE", url: "/auth/login" });
    expect(res.statusCode).toBe(405);
    expect(res.headers["allow"]).toContain("POST");
  });

  it("POST numa rota GET-only (/health/live) → 405 + Allow inclui GET", async () => {
    const res = await app.inject({ method: "POST", url: "/health/live" });
    expect(res.statusCode).toBe(405);
    expect(res.headers["allow"]).toContain("GET");
  });

  it("caminho público porém inexistente → continua 404", async () => {
    // `/public/...` está na allowlist pública (auth não barra antes); sem rota casando → 404.
    const res = await app.inject({ method: "GET", url: "/public/inexistente" });
    expect(res.statusCode).toBe(404);
    const body = res.json();
    expect(body.statusCode).toBe(404);
    expect(body.error).toBe("Not Found");
  });
});
