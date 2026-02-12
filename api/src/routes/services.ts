import type { FastifyPluginAsync } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import {
  ServiceCreateSchema,
  ServiceUpdateSchema,
  ServiceParamsSchema,
} from "../schemas/index.js";
import * as serviceService from "../services/services.js";

export const servicesRoutes: FastifyPluginAsync = async (app) => {
  const zApp = app.withTypeProvider<ZodTypeProvider>();

  // GET /services - List all services
  zApp.get(
    "/services",
    {
      schema: {
        tags: ["Services"],
      },
    },
    async (_req, reply) => {
    const services = await serviceService.listServices(app.prisma);
    return reply.send(services);
    }
  );

  // POST /services - Create service
  zApp.post(
    "/services",
    {
      schema: {
        tags: ["Services"],
        body: ServiceCreateSchema,
      },
    },
    async (req, reply) => {
      const service = await serviceService.createService(app.prisma, req.body);
    return reply.status(201).send(service);
    }
  );

  // PUT /services/:id - Update service
  zApp.put(
    "/services/:id",
    {
      schema: {
        tags: ["Services"],
        params: ServiceParamsSchema,
        body: ServiceUpdateSchema,
      },
    },
    async (req, reply) => {
    const data: {
      name?: string;
      priceInCents?: number;
      durationInMinutes?: number;
    } = {};
    if (req.body.name !== undefined) data.name = req.body.name;
    if (req.body.priceInCents !== undefined) data.priceInCents = req.body.priceInCents;
    if (req.body.durationInMinutes !== undefined) data.durationInMinutes = req.body.durationInMinutes;
    
    const service = await serviceService.updateService(app.prisma, req.params.id, data);
    return reply.send(service);
    }
  );

  // DELETE /services/:id - Delete service
  zApp.delete(
    "/services/:id",
    {
      schema: {
        tags: ["Services"],
        params: ServiceParamsSchema,
      },
    },
    async (req, reply) => {
      await serviceService.deleteService(app.prisma, req.params.id);
    return reply.status(204).send();
    }
  );
};
