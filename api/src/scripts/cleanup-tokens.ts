import { pathToFileURL } from "node:url";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { config } from "../config.js";

/**
 * Limpeza de dados efêmeros (cron). Remove `AuthToken` expirados ou já usados e `IdempotencyKey`
 * antigas — evita crescimento indefinido das tabelas. Sem mudança de schema (ver data-model.md).
 *
 * Uso local:   pnpm -C api exec tsx src/scripts/cleanup-tokens.ts
 * Uso em prod: node dist/scripts/cleanup-tokens.js   (agendar por cron na VPS)
 */
const IDEMPOTENCY_RETENTION_DAYS = 7;

type EphemeralCleaner = Pick<PrismaClient, "authToken" | "idempotencyKey">;

/** Lógica pura/testável: recebe o client e o "agora", apaga e devolve as contagens. */
export async function cleanupEphemeral(
  prisma: EphemeralCleaner,
  now: Date = new Date()
): Promise<{ authTokens: number; idempotencyKeys: number }> {
  const idemCutoff = new Date(now.getTime() - IDEMPOTENCY_RETENTION_DAYS * 24 * 60 * 60 * 1000);
  const tokens = await prisma.authToken.deleteMany({
    where: { OR: [{ expiresAt: { lt: now } }, { usedAt: { not: null } }] },
  });
  const idem = await prisma.idempotencyKey.deleteMany({ where: { createdAt: { lt: idemCutoff } } });
  return { authTokens: tokens.count, idempotencyKeys: idem.count };
}

async function main(): Promise<void> {
  if (!config.databaseUrl) throw new Error("DATABASE_URL não definido");
  const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: config.databaseUrl }) });
  try {
    const res = await cleanupEphemeral(prisma);
    // eslint-disable-next-line no-console
    console.log(
      `[cleanup] AuthToken removidos: ${res.authTokens}; IdempotencyKey removidos: ${res.idempotencyKeys}`
    );
  } finally {
    await prisma.$disconnect();
  }
}

// Auto-executa só quando chamado diretamente (não ao ser importado por testes).
const isMain = import.meta.url === pathToFileURL(process.argv[1] ?? "").href;
if (isMain) {
  main().catch((err) => {
    // eslint-disable-next-line no-console
    console.error("[cleanup] falhou:", err);
    process.exit(1);
  });
}
