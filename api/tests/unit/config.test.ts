import { describe, expect, it } from "vitest";
import { loadConfig } from "../../src/config.js";

const base = {
  DATABASE_URL: "postgresql://user:pass@localhost:5432/db",
};

describe("config/loadConfig", () => {
  it("aplica defaults em ambiente de desenvolvimento", () => {
    const cfg = loadConfig({ ...base, NODE_ENV: "development" });
    expect(cfg.nodeEnv).toBe("development");
    expect(cfg.isProduction).toBe(false);
    expect(cfg.port).toBe(3000);
    expect(cfg.host).toBe("0.0.0.0");
    expect(cfg.corsOrigin).toBe("http://localhost:3001");
    expect(cfg.rateLimitMax).toBe(120);
    expect(cfg.rateLimitWindow).toBe("1 minute");
    expect(cfg.publicHealth).toBe(true);
  });

  it("não exige JWT_SECRET fora de produção (usa fallback de dev)", () => {
    const cfg = loadConfig({ ...base, NODE_ENV: "development" });
    expect(cfg.jwtSecret.length).toBeGreaterThanOrEqual(16);
  });

  it("exige JWT_SECRET >= 32 chars em produção", () => {
    expect(() =>
      loadConfig({ ...base, NODE_ENV: "production" })
    ).toThrow(/JWT_SECRET/);

    expect(() =>
      loadConfig({ ...base, NODE_ENV: "production", JWT_SECRET: "curto" })
    ).toThrow(/JWT_SECRET/);
  });

  it("aceita produção com JWT_SECRET válido", () => {
    const secret = "x".repeat(32);
    const cfg = loadConfig({
      ...base,
      NODE_ENV: "production",
      JWT_SECRET: secret,
      CORS_ORIGIN: "https://app.exemplo.com",
    });
    expect(cfg.isProduction).toBe(true);
    expect(cfg.jwtSecret).toBe(secret);
    expect(cfg.corsOrigin).toBe("https://app.exemplo.com");
  });

  it("converte números e booleanos de strings", () => {
    const cfg = loadConfig({
      ...base,
      NODE_ENV: "development",
      PORT: "8080",
      RATE_LIMIT_MAX: "50",
      PUBLIC_HEALTH: "false",
    });
    expect(cfg.port).toBe(8080);
    expect(cfg.rateLimitMax).toBe(50);
    expect(cfg.publicHealth).toBe(false);
  });

  it("permite DATABASE_URL ausente (não derruba em dev)", () => {
    const cfg = loadConfig({ NODE_ENV: "development" });
    expect(cfg.databaseUrl).toBeUndefined();
  });

  it("rejeita NODE_ENV inválido", () => {
    expect(() => loadConfig({ ...base, NODE_ENV: "staging" })).toThrow();
  });
});
