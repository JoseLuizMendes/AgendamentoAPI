import { describe, it, expect, vi, beforeEach } from "vitest";
import bcrypt from "bcryptjs";
import { login, computeLockout } from "../../src/services/auth.js";
import { UnauthorizedError, TooManyRequestsError } from "../../src/utils/errors.js";
import { config } from "../../src/config.js";

/**
 * Lockout de conta (anti-brute-force) testado com Prisma mockado (sem DB):
 * - conta bloqueada → 429 sem checar senha;
 * - falha → incrementa o contador; ao atingir o limite, seta `lockedUntil`;
 * - sucesso → zera os contadores.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function fakePrisma(opts: { tenant?: unknown; user?: unknown; update?: any }): any {
  return {
    tenant: { findUnique: vi.fn().mockResolvedValue(opts.tenant ?? null) },
    user: {
      findUnique: vi.fn().mockResolvedValue(opts.user ?? null),
      update: opts.update ?? vi.fn().mockResolvedValue({}),
    },
  };
}

const baseUser = {
  id: 7,
  email: "a@x.com",
  name: null,
  role: "OWNER",
  tenantId: 1,
  passwordHash: "$2a$10$abcdefghijklmnopqrstuv",
  failedLoginAttempts: 0,
  lockedUntil: null as Date | null,
};

const creds = { email: "a@x.com", password: "secret12", tenantSlug: "t" };

describe("computeLockout", () => {
  it("abaixo do limite → sem bloqueio", () => {
    expect(computeLockout(config.loginMaxAttempts - 1, config.loginMaxAttempts, 15, new Date()).lockedUntil).toBeNull();
  });

  it("no limite → lockedUntil = now + janela", () => {
    const now = new Date("2026-06-28T12:00:00.000Z");
    const { lockedUntil } = computeLockout(config.loginMaxAttempts, config.loginMaxAttempts, 15, now);
    expect(lockedUntil?.getTime()).toBe(now.getTime() + 15 * 60_000);
  });
});

describe("login lockout", () => {
  beforeEach(() => vi.restoreAllMocks());

  it("conta bloqueada (lockedUntil no futuro) → 429 sem checar a senha", async () => {
    const compareSpy = vi.spyOn(bcrypt, "compare");
    const future = new Date(Date.now() + 10 * 60_000);
    const prisma = fakePrisma({ tenant: { id: 1 }, user: { ...baseUser, lockedUntil: future } });

    await expect(login(prisma, creds)).rejects.toBeInstanceOf(TooManyRequestsError);
    expect(compareSpy).not.toHaveBeenCalled();
  });

  it("senha errada → incrementa failedLoginAttempts e 401", async () => {
    vi.spyOn(bcrypt, "compare").mockResolvedValue(false as never);
    const update = vi.fn().mockResolvedValue({});
    const prisma = fakePrisma({ tenant: { id: 1 }, user: { ...baseUser, failedLoginAttempts: 1 }, update });

    await expect(login(prisma, creds)).rejects.toBeInstanceOf(UnauthorizedError);
    expect(update).toHaveBeenCalledTimes(1);
    expect(update.mock.calls[0][0].data.failedLoginAttempts).toBe(2);
    expect(update.mock.calls[0][0].data.lockedUntil).toBeNull();
  });

  it("senha errada atingindo o limite → seta lockedUntil", async () => {
    vi.spyOn(bcrypt, "compare").mockResolvedValue(false as never);
    const update = vi.fn().mockResolvedValue({});
    const prisma = fakePrisma({
      tenant: { id: 1 },
      user: { ...baseUser, failedLoginAttempts: config.loginMaxAttempts - 1 },
      update,
    });

    await expect(login(prisma, creds)).rejects.toBeInstanceOf(UnauthorizedError);
    expect(update.mock.calls[0][0].data.lockedUntil).toBeInstanceOf(Date);
  });

  it("sucesso com falhas anteriores → zera os contadores", async () => {
    vi.spyOn(bcrypt, "compare").mockResolvedValue(true as never);
    const update = vi.fn().mockResolvedValue({});
    const prisma = fakePrisma({ tenant: { id: 1 }, user: { ...baseUser, failedLoginAttempts: 3 }, update });

    const result = await login(prisma, creds);

    expect(result.userId).toBe(7);
    expect(update).toHaveBeenCalledWith({ where: { id: 7 }, data: { failedLoginAttempts: 0, lockedUntil: null } });
  });
});
