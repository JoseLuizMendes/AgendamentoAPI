import type { FastifyPluginAsync } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { ClientErrorSchema } from "../schemas/index.js";

/**
 * POST /client-errors — recebe relatórios de erro do navegador (observabilidade caseira).
 * Rota fina e **pública** (erros podem ocorrer antes do login), com rate limit reforçado
 * por IP. Só valida (Zod) e loga via pino (o `redact` global protege headers); **não** toca
 * no banco. Fire-and-forget do lado do cliente → responde 204 sem corpo.
 */
export const clientErrorsRoutes: FastifyPluginAsync = async (app) => {
  const zApp = app.withTypeProvider<ZodTypeProvider>();

  zApp.post(
    "/client-errors",
    {
      config: {
        rateLimit: { max: 30, timeWindow: "1 minute" },
      },
      schema: {
        tags: ["Observability"],
        security: [], // pública (erros podem ocorrer antes do login)
        body: ClientErrorSchema,
        description:
          "Recebe um relatório de erro do navegador (render/global/rejeição). Loga via pino; sem persistência.",
      },
    },
    async (req, reply) => {
      req.log.error({ clientError: req.body, ip: req.ip }, "client error");
      return reply.status(204).send();
    }
  );
};
