import { describe, it, expect, vi } from "vitest";
import { hashToken, createAuthToken, consumeAuthToken } from "../../src/services/auth-tokens.js";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function fakePrisma(token?: unknown): any {
  return {
    authToken: {
      create: vi.fn().mockResolvedValue({}),
      findUnique: vi.fn().mockResolvedValue(token ?? null),
      update: vi.fn().mockResolvedValue({}),
    },
  };
}

describe("hashToken", () => {
  it("é determinístico e de 64 hex (sha256)", () => {
    expect(hashToken("abc")).toBe(hashToken("abc"));
    expect(hashToken("abc")).toMatch(/^[a-f0-9]{64}$/);
    expect(hashToken("abc")).not.toBe(hashToken("abd"));
  });
});

describe("createAuthToken", () => {
  it("guarda só o HASH (não o cru) + expiração futura; devolve o token cru", async () => {
    const prisma = fakePrisma();
    const raw = await createAuthToken(prisma, 7, "PASSWORD_RESET");

    expect(raw).toMatch(/^[a-f0-9]{64}$/); // 32 bytes em hex
    const arg = prisma.authToken.create.mock.calls[0][0].data;
    expect(arg.tokenHash).toBe(hashToken(raw)); // banco guarda o hash do cru
    expect(arg.tokenHash).not.toBe(raw); // nunca o cru
    expect(arg.type).toBe("PASSWORD_RESET");
    expect(arg.userId).toBe(7);
    expect(arg.expiresAt.getTime()).toBeGreaterThan(Date.now());
  });
});

describe("consumeAuthToken", () => {
  const valid = {
    id: 1,
    userId: 7,
    type: "PASSWORD_RESET",
    usedAt: null,
    expiresAt: new Date(Date.now() + 60_000),
  };

  it("token válido → devolve userId e marca usedAt", async () => {
    const prisma = fakePrisma(valid);
    const userId = await consumeAuthToken(prisma, "raw", "PASSWORD_RESET");
    expect(userId).toBe(7);
    expect(prisma.authToken.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: { usedAt: expect.any(Date) },
    });
  });

  it("tipo errado → null, sem consumir", async () => {
    const prisma = fakePrisma(valid);
    expect(await consumeAuthToken(prisma, "raw", "EMAIL_VERIFICATION")).toBeNull();
    expect(prisma.authToken.update).not.toHaveBeenCalled();
  });

  it("já usado → null", async () => {
    const prisma = fakePrisma({ ...valid, usedAt: new Date() });
    expect(await consumeAuthToken(prisma, "raw", "PASSWORD_RESET")).toBeNull();
  });

  it("expirado → null", async () => {
    const prisma = fakePrisma({ ...valid, expiresAt: new Date(Date.now() - 1000) });
    expect(await consumeAuthToken(prisma, "raw", "PASSWORD_RESET")).toBeNull();
  });

  it("inexistente → null", async () => {
    const prisma = fakePrisma(null);
    expect(await consumeAuthToken(prisma, "raw", "PASSWORD_RESET")).toBeNull();
  });
});
