import type { FastifyPluginAsync } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { SettingsUpdateSchema, SettingsResponseSchema, ErrorResponseSchema } from "../schemas/index.js";
import * as settingsService from "../services/settings.js";
import { requireAuth, requireRole } from "../utils/guards.js";

export const settingsRoutes: FastifyPluginAsync = async (app) => {
  const zApp = app.withTypeProvider<ZodTypeProvider>();

  // GET /settings - Configurações do tenant (OWNER/STAFF)
  zApp.get(
    "/settings",
    {
      schema: {
        tags: ["Settings"],
        description: "Retorna as configurações do tenant (modo de agendamento, fuso, granularidade).",
        response: { 200: SettingsResponseSchema },
      },
    },
    async (req, reply) => {
      const auth = requireAuth(req);
      const settings = await settingsService.getSettings(app.prisma, auth.tenantId);
      return reply.send(settings);
    }
  );

  // PATCH /settings - Atualiza configurações (OWNER)
  zApp.patch(
    "/settings",
    {
      preHandler: requireRole("OWNER"),
      schema: {
        tags: ["Settings"],
        body: SettingsUpdateSchema,
        description: "Atualiza as configurações do tenant (apenas OWNER).",
        response: { 200: SettingsResponseSchema, 403: ErrorResponseSchema },
      },
    },
    async (req, reply) => {
      const auth = requireAuth(req);
      const settings = await settingsService.updateSettings(app.prisma, auth.tenantId, req.body);
      return reply.send(settings);
    }
  );
};
