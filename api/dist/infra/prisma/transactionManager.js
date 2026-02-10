import { Prisma } from "@prisma/client";
import { createRepositories, isRetryableSerializableError } from "./repositories.js";
export function createTransactionManager(prisma) {
    return {
        async runSerializable(fn) {
            const maxAttempts = 3;
            for (let attempt = 1; attempt <= maxAttempts; attempt++) {
                try {
                    return await prisma.$transaction(async (tx) => {
                        const repos = createRepositories(tx);
                        return fn(repos);
                    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
                }
                catch (err) {
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
//# sourceMappingURL=transactionManager.js.map