import type { FastifyPluginAsync } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { SettingsUpdateSchema } from "../schemas/index.js";
import * as settingsService from "../services/settings.js";

export const settingsRoutes: FastifyPluginAsync = async (app) => {
  const zApp = app.withTypeProvider<ZodTypeProvider>();

  // GET /settings - Configurações do tenant (OWNER/STAFF)
  zApp.get(
    "/settings",
    {
      schema: {
        tags: ["Settings"],
        description: "Retorna as configurações do tenant (modo de agendamento, fuso, granularidade).",
      },
    },
    async (req, reply) => {
      if (!req.auth) {
        return reply.status(401).send({ message: "Não autenticado" });
      }
      const settings = await settingsService.getSettings(app.prisma, req.auth.tenantId);
      return reply.send(settings);
    }
  );

  // PATCH /settings - Atualiza configurações (OWNER)
  zApp.patch(
    "/settings",
    {
      schema: {
        tags: ["Settings"],
        body: SettingsUpdateSchema,
        description: "Atualiza as configurações do tenant (apenas OWNER).",
      },
    },
    async (req, reply) => {
      if (!req.auth) {
        return reply.status(401).send({ message: "Não autenticado" });
      }
      if (req.auth.role !== "OWNER") {
        return reply.status(403).send({ message: "Sem permissão para alterar configurações" });
      }
      const settings = await settingsService.updateSettings(app.prisma, req.auth.tenantId, req.body);
      return reply.send(settings);
    }
  );
};
