import { Prisma } from "@prisma/client";
import type { PrismaClient } from "@prisma/client";
import type { Repositories } from "../../application/ports/index.js";
export declare function createRepositories(db: PrismaClient | Prisma.TransactionClient): Repositories;
export declare function isRetryableSerializableError(err: unknown): boolean;
//# sourceMappingURL=repositories.d.ts.map