import type { FastifyPluginAsync } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import {
  OverrideCreateSchema,
  OverrideUpdateSchema,
  OverrideParamsSchema,
} from "../schemas/index.js";
import * as overrideService from "../services/overrides.js";
import { requireAuth, requireRole } from "../utils/guards.js";

export const overridesRoutes: FastifyPluginAsync = async (app) => {
  const zApp = app.withTypeProvider<ZodTypeProvider>();

  // GET /overrides - List all overrides
  zApp.get(
    "/overrides",
    {
      schema: {
        tags: ["Overrides"],
      },
    },
    async (req, reply) => {
      const auth = requireAuth(req);
      const overrides = await overrideService.listOverrides(app.prisma, auth.tenantId);
      return reply.send(overrides);
    }
  );

  // POST /overrides - Create override (OWNER)
  zApp.post(
    "/overrides",
    {
      preHandler: requireRole("OWNER"),
      schema: {
        tags: ["Overrides"],
        body: OverrideCreateSchema,
      },
    },
    async (req, reply) => {
      const auth = requireAuth(req);
      const body = req.body;
      const data: {
        date: string;
        openTime?: string;
        closeTime?: string;
        isOff?: boolean;
      } = {
        date: body.date,
      };
      if (body.openTime !== undefined) data.openTime = body.openTime;
      if (body.closeTime !== undefined) data.closeTime = body.closeTime;
      if (body.isOff !== undefined) data.isOff = body.isOff;

      const override = await overrideService.createOverride(app.prisma, auth.tenantId, data);
      return reply.status(201).send(override);
    }
  );

  // PUT /overrides/:id - Update override (OWNER)
  zApp.put(
    "/overrides/:id",
    {
      preHandler: requireRole("OWNER"),
      schema: {
        tags: ["Overrides"],
        params: OverrideParamsSchema,
        body: OverrideUpdateSchema,
      },
    },
    async (req, reply) => {
      const auth = requireAuth(req);
      const params = req.params;
      const body = req.body;
      const data: {
        openTime?: string;
        closeTime?: string;
        isOff?: boolean;
      } = {};
      if (body.openTime !== undefined) data.openTime = body.openTime;
      if (body.closeTime !== undefined) data.closeTime = body.closeTime;
      if (body.isOff !== undefined) data.isOff = body.isOff;

      const override = await overrideService.updateOverride(app.prisma, params.id, auth.tenantId, data);
      return reply.send(override);
    }
  );

  // DELETE /overrides/:id - Delete override (OWNER)
  zApp.delete(
    "/overrides/:id",
    {
      preHandler: requireRole("OWNER"),
      schema: {
        tags: ["Overrides"],
        params: OverrideParamsSchema,
      },
    },
    async (req, reply) => {
      const auth = requireAuth(req);
      await overrideService.deleteOverride(app.prisma, req.params.id, auth.tenantId);
      return reply.status(204).send();
    }
  );
};
