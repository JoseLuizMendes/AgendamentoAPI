import type { FastifyPluginAsync } from "fastify";
import {
  ServiceCreateSchema,
  ServiceUpdateSchema,
  ServiceParamsSchema,
} from "../schemas/index.js";
import * as serviceService from "../services/services.js";

export const servicesRoutes: FastifyPluginAsync = async (app) => {
  // GET /services - List all services
  app.get("/services", async (req, reply) => {
    const services = await serviceService.listServices(app.prisma);
    return reply.send(services);
  });

  // POST /services - Create service
  app.post("/services", async (req, reply) => {
    const body = ServiceCreateSchema.parse(req.body);
    const service = await serviceService.createService(app.prisma, body);
    return reply.status(201).send(service);
  });

  // PUT /services/:id - Update service
  app.put("/services/:id", async (req, reply) => {
    const params = ServiceParamsSchema.parse(req.params);
    const body = ServiceUpdateSchema.parse(req.body);
    const service = await serviceService.updateService(app.prisma, params.id, body);
    return reply.send(service);
  });

  // DELETE /services/:id - Delete service
  app.delete("/services/:id", async (req, reply) => {
    const params = ServiceParamsSchema.parse(req.params);
    await serviceService.deleteService(app.prisma, params.id);
    return reply.status(204).send();
  });
};
