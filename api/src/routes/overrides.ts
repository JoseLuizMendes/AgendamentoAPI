import type { FastifyPluginAsync } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import {
  OverrideCreateSchema,
  OverrideUpdateSchema,
  OverrideParamsSchema,
} from "../schemas/index.js";
import * as overrideService from "../services/overrides.js";

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
      if (!req.auth) {
        return reply.status(401).send({ message: "Não autenticado" });
      }
      const overrides = await overrideService.listOverrides(app.prisma, req.auth.tenantId);
      return reply.send(overrides);
    }
  );

  // POST /overrides - Create override
  zApp.post(
    "/overrides",
    {
      schema: {
        tags: ["Overrides"],
        body: OverrideCreateSchema,
      },
    },
    async (req, reply) => {
      if (!req.auth) {
        return reply.status(401).send({ message: "Não autenticado" });
      }
      
      // Only OWNER can create overrides
      if (req.auth.role !== "OWNER") {
        return reply.status(403).send({ message: "Sem permissão para criar overrides" });
      }

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
    
      const override = await overrideService.createOverride(app.prisma, req.auth.tenantId, data);
      return reply.status(201).send(override);
    }
  );

  // PUT /overrides/:id - Update override
  zApp.put(
    "/overrides/:id",
    {
      schema: {
        tags: ["Overrides"],
        params: OverrideParamsSchema,
        body: OverrideUpdateSchema,
      },
    },
    async (req, reply) => {
      if (!req.auth) {
        return reply.status(401).send({ message: "Não autenticado" });
      }
      
      // Only OWNER can update overrides
      if (req.auth.role !== "OWNER") {
        return reply.status(403).send({ message: "Sem permissão para atualizar overrides" });
      }

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
    
      const override = await overrideService.updateOverride(app.prisma, params.id, req.auth.tenantId, data);
      return reply.send(override);
    }
  );

  // DELETE /overrides/:id - Delete override
  zApp.delete(
    "/overrides/:id",
    {
      schema: {
        tags: ["Overrides"],
        params: OverrideParamsSchema,
      },
    },
    async (req, reply) => {
      if (!req.auth) {
        return reply.status(401).send({ message: "Não autenticado" });
      }
      
      // Only OWNER can delete overrides
      if (req.auth.role !== "OWNER") {
        return reply.status(403).send({ message: "Sem permissão para deletar overrides" });
      }

      await overrideService.deleteOverride(app.prisma, req.params.id, req.auth.tenantId);
      return reply.status(204).send();
    }
  );
};
