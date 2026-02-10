import { Prisma } from "@prisma/client";
import type { PrismaClient } from "@prisma/client";
import type { Repositories, TransactionManager } from "../../application/ports/index.js";
import { createRepositories, isRetryableSerializableError } from "./repositories.js";

export function createTransactionManager(prisma: PrismaClient): TransactionManager {
  return {
    async runSerializable<T>(fn: (repos: Repositories) => Promise<T>): Promise<T> {
      const maxAttempts = 3;

      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
          return await prisma.$transaction(
            async (tx: Prisma.TransactionClient) => {
              const repos = createRepositories(tx);
              return fn(repos);
            },
            { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
          );
        } catch (err) {
          if (attempt < maxAttempts && isRetryableSerializableError(err)) {
            await new Promise((r) => setTimeout(r, 30 * attempt));
            continue;
          }
          throw err;
        }
      }

      throw new Error("Falha ao executar transação");
    },
  };
}
