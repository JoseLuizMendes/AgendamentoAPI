import type { FastifyReply, FastifyRequest } from "fastify";
import type { Role } from "@prisma/client";
import type { JWTPayload } from "../plugins/auth.js";
import { UnauthorizedError } from "./errors.js";

/**
 * Narrowing tipado da autenticação dentro de um handler.
 *
 * O hook global em `plugins/auth.ts` já autentica todas as rotas protegidas,
 * então `req.auth` está presente. Este helper remove o `if (!req.auth)` repetido
 * e devolve o payload já tipado (não-nulo).
 */
export function requireAuth(req: FastifyRequest): JWTPayload {
  if (!req.auth) {
    throw new UnauthorizedError("Não autenticado");
  }
  return req.auth;
}

/**
 * Factory de `preHandler` que restringe a rota aos papéis informados.
 * Sem auth → 401; papel fora da lista → 403. Caso contrário, segue o fluxo.
 */
export function requireRole(...roles: Role[]) {
  return async (req: FastifyRequest, reply: FastifyReply): Promise<void> => {
    if (!req.auth) {
      await reply.status(401).send({ message: "Não autenticado" });
      return;
    }
    if (!roles.includes(req.auth.role)) {
      await reply.status(403).send({ message: "Sem permissão para esta operação" });
      return;
    }
  };
}
