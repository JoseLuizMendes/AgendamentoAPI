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
      if (!req.auth) {
        return reply.status(401).send({ message: "Não autenticado" });
      }
      const hours = await hoursService.listBusinessHours(app.prisma, req.auth.tenantId);
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
      if (!req.auth) {
        return reply.status(401).send({ message: "Não autenticado" });
      }
      
      // Only OWNER can create business hours
      if (req.auth.role !== "OWNER") {
        return reply.status(403).send({ message: "Sem permissão para criar horários de funcionamento" });
      }

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
    
      const hours = await hoursService.createBusinessHours(app.prisma, req.auth.tenantId, data);
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
      if (!req.auth) {
        return reply.status(401).send({ message: "Não autenticado" });
      }
      
      // Only OWNER can update business hours
      if (req.auth.role !== "OWNER") {
        return reply.status(403).send({ message: "Sem permissão para atualizar horários de funcionamento" });
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
    
      const hours = await hoursService.updateBusinessHours(app.prisma, params.id, req.auth.tenantId, data);
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
      if (!req.auth) {
        return reply.status(401).send({ message: "Não autenticado" });
      }
      
      // Only OWNER can delete business hours
      if (req.auth.role !== "OWNER") {
        return reply.status(403).send({ message: "Sem permissão para deletar horários de funcionamento" });
      }

      await hoursService.deleteBusinessHours(app.prisma, req.params.id, req.auth.tenantId);
      return reply.status(204).send();
    }
  );

  // POST /hours/:id/breaks - Adiciona um intervalo ao dia (OWNER)
  zApp.post(
    "/hours/:id/breaks",
    {
      schema: {
        tags: ["BusinessHours"],
        params: HoursIdParamsSchema,
        body: BreakCreateSchema,
      },
    },
    async (req, reply) => {
      if (!req.auth) {
        return reply.status(401).send({ message: "Não autenticado" });
      }
      if (req.auth.role !== "OWNER") {
        return reply.status(403).send({ message: "Sem permissão para criar intervalos" });
      }
      const brk = await hoursService.createBreak(app.prisma, req.params.id, req.auth.tenantId, {
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
      schema: {
        tags: ["BusinessHours"],
        params: BreakParamsSchema,
      },
    },
    async (req, reply) => {
      if (!req.auth) {
        return reply.status(401).send({ message: "Não autenticado" });
      }
      if (req.auth.role !== "OWNER") {
        return reply.status(403).send({ message: "Sem permissão para deletar intervalos" });
      }
      await hoursService.deleteBreak(app.prisma, req.params.hoursId, req.params.breakId, req.auth.tenantId);
      return reply.status(204).send();
    }
  );
};
