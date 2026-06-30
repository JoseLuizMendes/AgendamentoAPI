import { describe, expect, it, vi } from "vitest";
import { cleanupEphemeral } from "../../src/scripts/cleanup-tokens.js";

/**
 * Limpeza de efêmeros: AuthToken expirados/usados e IdempotencyKey antigas (> 7 dias).
 * Testa a lógica de seleção (where) e o retorno das contagens, com um Prisma fake.
 */
describe("cleanupEphemeral", () => {
  it("apaga tokens expirados/usados e idempotency antigas; devolve contagens", async () => {
    const now = new Date("2026-06-29T12:00:00.000Z");
    const authDelete = vi.fn().mockResolvedValue({ count: 3 });
    const idemDelete = vi.fn().mockResolvedValue({ count: 5 });
    const prisma = {
      authToken: { deleteMany: authDelete },
      idempotencyKey: { deleteMany: idemDelete },
    } as unknown as Parameters<typeof cleanupEphemeral>[0];

    const res = await cleanupEphemeral(prisma, now);

    expect(res).toEqual({ authTokens: 3, idempotencyKeys: 5 });
    // AuthToken: expirados (expiresAt < now) OU usados (usedAt != null)
    expect(authDelete).toHaveBeenCalledWith({
      where: { OR: [{ expiresAt: { lt: now } }, { usedAt: { not: null } }] },
    });
    // IdempotencyKey: criadas há mais de 7 dias
    const idemCutoff = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    expect(idemDelete).toHaveBeenCalledWith({ where: { createdAt: { lt: idemCutoff } } });
  });
});
