import type { FastifyPluginAsync } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import {
  BusinessHoursCreateSchema,
  BusinessHoursUpdateSchema,
  BusinessHoursParamsSchema,
} from "../schemas/index.js";
import * as hoursService from "../services/hours.js";

export const hoursRoutes: FastifyPluginAsync = async (app) => {
  const zApp = app.withTypeProvider<ZodTypeProvider>();

  // GET /hours - List all business hours
  zApp.get(
    "/hours",
    {
      schema: {
        tags: ["BusinessHours"],
      },
    },
    async (_req, reply) => {
    const hours = await hoursService.listBusinessHours(app.prisma);
    return reply.send(hours);
    }
  );

  // POST /hours - Create business hours
  zApp.post(
    "/hours",
    {
      schema: {
        tags: ["BusinessHours"],
        body: BusinessHoursCreateSchema,
      },
    },
    async (req, reply) => {
    const body = req.body;
    const data: {
      dayOfWeek: number;
      openTime: string;
      closeTime: string;
      isOff?: boolean;
    } = {
      dayOfWeek: body.dayOfWeek,
      openTime: body.openTime,
      closeTime: body.closeTime,
    };
    if (body.isOff !== undefined) data.isOff = body.isOff;
    
    const hours = await hoursService.createBusinessHours(app.prisma, data);
    return reply.status(201).send(hours);
    }
  );

  // PUT /hours/:id - Update business hours
  zApp.put(
    "/hours/:id",
    {
      schema: {
        tags: ["BusinessHours"],
        params: BusinessHoursParamsSchema,
        body: BusinessHoursUpdateSchema,
      },
    },
    async (req, reply) => {
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
    
    const hours = await hoursService.updateBusinessHours(app.prisma, params.id, data);
    return reply.send(hours);
    }
  );

  // DELETE /hours/:id - Delete business hours
  zApp.delete(
    "/hours/:id",
    {
      schema: {
        tags: ["BusinessHours"],
        params: BusinessHoursParamsSchema,
      },
    },
    async (req, reply) => {
    await hoursService.deleteBusinessHours(app.prisma, req.params.id);
    return reply.status(204).send();
    }
  );
};
