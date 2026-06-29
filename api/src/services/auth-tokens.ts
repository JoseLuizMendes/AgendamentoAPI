import crypto from "node:crypto";
import type { PrismaClient, AuthTokenType } from "@prisma/client";

const VERIFY_TTL_MS = 24 * 60 * 60_000; // 24h
const RESET_TTL_MS = 60 * 60_000; // 1h

/** Hash determinístico do token (SHA-256). O banco guarda só o hash; o valor cru vai no link. */
export function hashToken(raw: string): string {
  return crypto.createHash("sha256").update(raw).digest("hex");
}

/**
 * Gera um token cru de alta entropia (vai no link do email) e persiste apenas o seu HASH, com
 * expiração conforme o tipo. Retorna o token cru (que NÃO é guardado em lugar nenhum).
 */
export async function createAuthToken(
  prisma: PrismaClient,
  userId: number,
  type: AuthTokenType
): Promise<string> {
  const raw = crypto.randomBytes(32).toString("hex");
  const ttl = type === "PASSWORD_RESET" ? RESET_TTL_MS : VERIFY_TTL_MS;
  await prisma.authToken.create({
    data: {
      tokenHash: hashToken(raw),
      type,
      userId,
      expiresAt: new Date(Date.now() + ttl),
    },
  });
  return raw;
}

/**
 * Valida e **consome** (uso único) um token: confere hash, tipo, não-usado e não-expirado.
 * Devolve o `userId` se válido; `null` caso contrário. Marca `usedAt` ao consumir.
 */
export async function consumeAuthToken(
  prisma: PrismaClient,
  raw: string,
  type: AuthTokenType
): Promise<number | null> {
  const token = await prisma.authToken.findUnique({ where: { tokenHash: hashToken(raw) } });
  if (!token || token.type !== type || token.usedAt || token.expiresAt < new Date()) {
    return null;
  }
  await prisma.authToken.update({ where: { id: token.id }, data: { usedAt: new Date() } });
  return token.userId;
}
