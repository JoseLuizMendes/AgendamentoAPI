import { describe, expect, it, beforeAll, afterAll, vi } from "vitest";
import type { FastifyInstance } from "fastify";

/**
 * Smoke das rotas do ciclo de conta por email: confirma que estão registradas, são PÚBLICAS
 * (não 401) e validam o body (400 com corpo inválido — a validação roda antes de tocar o banco,
 * então funciona com DATABASE_URL bogus via `app.inject`).
 */
describe("rotas de email (registro + público + validação)", () => {
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

  const cases = [
    "/auth/forgot-password",
    "/auth/reset-password",
    "/auth/verify-email",
    "/auth/verify-email/request",
  ];

  for (const url of cases) {
    it(`${url} → 400 com body inválido (público, registrado, validado)`, async () => {
      const res = await app.inject({ method: "POST", url, payload: {} });
      expect(res.statusCode).toBe(400); // não 401 (público) nem 404 (registrado)
    });
  }
});
