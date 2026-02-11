import type { FastifyPluginAsync } from "fastify";
import {
  BusinessHoursCreateSchema,
  BusinessHoursUpdateSchema,
  BusinessHoursParamsSchema,
} from "../schemas/index.js";
import * as hoursService from "../services/hours.js";

export const hoursRoutes: FastifyPluginAsync = async (app) => {
  // GET /hours - List all business hours
  app.get("/hours", async (req, reply) => {
    const hours = await hoursService.listBusinessHours(app.prisma);
    return reply.send(hours);
  });

  // POST /hours - Create business hours
  app.post("/hours", async (req, reply) => {
    const body = BusinessHoursCreateSchema.parse(req.body);
    const hours = await hoursService.createBusinessHours(app.prisma, body);
    return reply.status(201).send(hours);
  });

  // PUT /hours/:id - Update business hours
  app.put("/hours/:id", async (req, reply) => {
    const params = BusinessHoursParamsSchema.parse(req.params);
    const body = BusinessHoursUpdateSchema.parse(req.body);
    const hours = await hoursService.updateBusinessHours(app.prisma, params.id, body);
    return reply.send(hours);
  });

  // DELETE /hours/:id - Delete business hours
  app.delete("/hours/:id", async (req, reply) => {
    const params = BusinessHoursParamsSchema.parse(req.params);
    await hoursService.deleteBusinessHours(app.prisma, params.id);
    return reply.status(204).send();
  });
};
