import { describe, it, expect, vi } from "vitest";
import { verifyEmail, resetPassword, requestPasswordReset } from "../../src/services/auth.js";
import { ValidationError } from "../../src/utils/errors.js";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function fakePrisma(opts: { tenant?: unknown; user?: unknown; token?: unknown } = {}): any {
  return {
    tenant: { findUnique: vi.fn().mockResolvedValue(opts.tenant ?? null) },
    user: {
      findUnique: vi.fn().mockResolvedValue(opts.user ?? null),
      update: vi.fn().mockResolvedValue({}),
    },
    authToken: {
      create: vi.fn().mockResolvedValue({}),
      findUnique: vi.fn().mockResolvedValue(opts.token ?? null),
      update: vi.fn().mockResolvedValue({}),
    },
  };
}

const future = () => new Date(Date.now() + 60_000);

describe("verifyEmail", () => {
  it("token válido → marca emailVerifiedAt", async () => {
    const prisma = fakePrisma({
      token: { id: 1, userId: 7, type: "EMAIL_VERIFICATION", usedAt: null, expiresAt: future() },
    });
    await verifyEmail(prisma, "raw");
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: 7 },
      data: { emailVerifiedAt: expect.any(Date) },
    });
  });

  it("token inválido → ValidationError", async () => {
    const prisma = fakePrisma({ token: null });
    await expect(verifyEmail(prisma, "raw")).rejects.toBeInstanceOf(ValidationError);
  });
});

describe("resetPassword", () => {
  it("token válido → grava nova senha (hasheada) e zera o lockout", async () => {
    const prisma = fakePrisma({
      token: { id: 1, userId: 7, type: "PASSWORD_RESET", usedAt: null, expiresAt: future() },
    });
    await resetPassword(prisma, "raw", "novaSenha12");
    const call = prisma.user.update.mock.calls[0][0];
    expect(call.where).toEqual({ id: 7 });
    expect(call.data.failedLoginAttempts).toBe(0);
    expect(call.data.lockedUntil).toBeNull();
    expect(call.data.passwordHash).toEqual(expect.any(String));
    expect(call.data.passwordHash).not.toBe("novaSenha12"); // nunca em texto plano
  });

  it("token inválido → ValidationError, sem trocar senha", async () => {
    const prisma = fakePrisma({ token: null });
    await expect(resetPassword(prisma, "raw", "novaSenha12")).rejects.toBeInstanceOf(ValidationError);
    expect(prisma.user.update).not.toHaveBeenCalled();
  });
});

describe("requestPasswordReset (anti-enumeração)", () => {
  it("usuário existe → cria token de reset", async () => {
    const prisma = fakePrisma({ tenant: { id: 1 }, user: { id: 7, email: "a@x.com" } });
    await expect(requestPasswordReset(prisma, "a@x.com", "t")).resolves.toBeUndefined();
    expect(prisma.authToken.create).toHaveBeenCalledTimes(1);
  });

  it("usuário não existe → resolve sem criar token (não vaza existência)", async () => {
    const prisma = fakePrisma({ tenant: null });
    await expect(requestPasswordReset(prisma, "no@x.com", "t")).resolves.toBeUndefined();
    expect(prisma.authToken.create).not.toHaveBeenCalled();
  });
});
