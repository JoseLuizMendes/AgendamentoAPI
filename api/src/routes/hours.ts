import type { FastifyPluginAsync } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import {
  BusinessHoursCreateSchema,
  BusinessHoursUpdateSchema,
  BusinessHoursParamsSchema,
  BreakCreateSchema,
  BreakParamsSchema,
  HoursIdParamsSchema,
} from "../schemas/index.js";
import * as hoursService from "../services/hours.js";
import { requireAuth, requireRole } from "../utils/guards.js";

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
    async (req, reply) => {
      const auth = requireAuth(req);
      const hours = await hoursService.listBusinessHours(app.prisma, auth.tenantId);
      return reply.send(hours);
    }
  );

  // POST /hours - Create business hours (OWNER)
  zApp.post(
    "/hours",
    {
      preHandler: requireRole("OWNER"),
      schema: {
        tags: ["BusinessHours"],
        body: BusinessHoursCreateSchema,
      },
    },
    async (req, reply) => {
      const auth = requireAuth(req);
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

      const hours = await hoursService.createBusinessHours(app.prisma, auth.tenantId, data);
      return reply.status(201).send(hours);
    }
  );

  // PUT /hours/:id - Update business hours (OWNER)
  zApp.put(
    "/hours/:id",
    {
      preHandler: requireRole("OWNER"),
      schema: {
        tags: ["BusinessHours"],
        params: BusinessHoursParamsSchema,
        body: BusinessHoursUpdateSchema,
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

      const hours = await hoursService.updateBusinessHours(app.prisma, params.id, auth.tenantId, data);
      return reply.send(hours);
    }
  );

  // DELETE /hours/:id - Delete business hours (OWNER)
  zApp.delete(
    "/hours/:id",
    {
      preHandler: requireRole("OWNER"),
      schema: {
        tags: ["BusinessHours"],
        params: BusinessHoursParamsSchema,
      },
    },
    async (req, reply) => {
      const auth = requireAuth(req);
      await hoursService.deleteBusinessHours(app.prisma, req.params.id, auth.tenantId);
      return reply.status(204).send();
    }
  );

  // POST /hours/:id/breaks - Adiciona um intervalo ao dia (OWNER)
  zApp.post(
    "/hours/:id/breaks",
    {
      preHandler: requireRole("OWNER"),
      schema: {
        tags: ["BusinessHours"],
        params: HoursIdParamsSchema,
        body: BreakCreateSchema,
      },
    },
    async (req, reply) => {
      const auth = requireAuth(req);
      const brk = await hoursService.createBreak(app.prisma, req.params.id, auth.tenantId, {
        startTime: req.body.startTime,
        endTime: req.body.endTime,
      });
      return reply.status(201).send(brk);
    }
  );

  // DELETE /hours/:hoursId/breaks/:breakId - Remove um intervalo (OWNER)
  zApp.delete(
    "/hours/:hoursId/breaks/:breakId",
    {
      preHandler: requireRole("OWNER"),
      schema: {
        tags: ["BusinessHours"],
        params: BreakParamsSchema,
      },
    },
    async (req, reply) => {
      const auth = requireAuth(req);
      await hoursService.deleteBreak(app.prisma, req.params.hoursId, req.params.breakId, auth.tenantId);
      return reply.status(204).send();
    }
  );
};
