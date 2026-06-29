import { describe, it, expect, vi, beforeEach } from "vitest";
import bcrypt from "bcryptjs";
import { login } from "../../src/services/auth.js";
import { UnauthorizedError } from "../../src/utils/errors.js";

/**
 * Anti-enumeração por timing: o login deve executar **sempre exatamente um** `bcrypt.compare`,
 * inclusive quando o tenant/usuário não existe (comparando contra um hash dummy). Sem isso, o
 * tempo de resposta revela se o email está cadastrado. Testado com Prisma mockado (sem DB).
 */
type FakeOpts = { tenant?: unknown; user?: unknown };
function fakePrisma(opts: FakeOpts) {
  return {
    tenant: { findUnique: vi.fn().mockResolvedValue(opts.tenant ?? null) },
    user: { findUnique: vi.fn().mockResolvedValue(opts.user ?? null) },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;
}

describe("login timing (anti-enumeração)", () => {
  beforeEach(() => vi.restoreAllMocks());

  it("usuário inexistente → 401 genérico E bcrypt.compare é chamado (trabalho constante)", async () => {
    const compareSpy = vi.spyOn(bcrypt, "compare");
    const prisma = fakePrisma({ tenant: { id: 1, slug: "t" }, user: null });

    await expect(
      login(prisma, { email: "no@x.com", password: "whatever1", tenantSlug: "t" })
    ).rejects.toBeInstanceOf(UnauthorizedError);

    expect(compareSpy).toHaveBeenCalledTimes(1);
  });

  it("tenant inexistente → 401 genérico E bcrypt.compare é chamado", async () => {
    const compareSpy = vi.spyOn(bcrypt, "compare");
    const prisma = fakePrisma({ tenant: null });

    await expect(
      login(prisma, { email: "a@x.com", password: "whatever1", tenantSlug: "nope" })
    ).rejects.toBeInstanceOf(UnauthorizedError);

    expect(compareSpy).toHaveBeenCalledTimes(1);
  });
});
