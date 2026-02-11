import type { FastifyPluginAsync } from "fastify";
import {
  OverrideCreateSchema,
  OverrideUpdateSchema,
  OverrideParamsSchema,
} from "../schemas/index.js";
import * as overrideService from "../services/overrides.js";

export const overridesRoutes: FastifyPluginAsync = async (app) => {
  // GET /overrides - List all overrides
  app.get("/overrides", async (req, reply) => {
    const overrides = await overrideService.listOverrides(app.prisma);
    return reply.send(overrides);
  });

  // POST /overrides - Create override
  app.post("/overrides", async (req, reply) => {
    const body = OverrideCreateSchema.parse(req.body);
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
    
    const override = await overrideService.createOverride(app.prisma, data);
    return reply.status(201).send(override);
  });

  // PUT /overrides/:id - Update override
  app.put("/overrides/:id", async (req, reply) => {
    const params = OverrideParamsSchema.parse(req.params);
    const body = OverrideUpdateSchema.parse(req.body);
    const data: {
      openTime?: string;
      closeTime?: string;
      isOff?: boolean;
    } = {};
    if (body.openTime !== undefined) data.openTime = body.openTime;
    if (body.closeTime !== undefined) data.closeTime = body.closeTime;
    if (body.isOff !== undefined) data.isOff = body.isOff;
    
    const override = await overrideService.updateOverride(app.prisma, params.id, data);
    return reply.send(override);
  });

  // DELETE /overrides/:id - Delete override
  app.delete("/overrides/:id", async (req, reply) => {
    const params = OverrideParamsSchema.parse(req.params);
    await overrideService.deleteOverride(app.prisma, params.id);
    return reply.status(204).send();
  });
};
