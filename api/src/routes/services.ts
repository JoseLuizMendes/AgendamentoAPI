import type { FastifyPluginAsync } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import {
  ServiceCreateSchema,
  ServiceUpdateSchema,
  ServiceParamsSchema,
  ServiceResponseSchema,
  ServiceListResponseSchema,
  ErrorResponseSchema,
} from "../schemas/index.js";
import * as serviceService from "../services/services.js";
import { requireAuth, requireRole } from "../utils/guards.js";

export const servicesRoutes: FastifyPluginAsync = async (app) => {
  const zApp = app.withTypeProvider<ZodTypeProvider>();

  // GET /services - List all services
  zApp.get(
    "/services",
    {
      schema: {
        tags: ["Services"],
        response: { 200: ServiceListResponseSchema },
      },
    },
    async (req, reply) => {
      const auth = requireAuth(req);
      const services = await serviceService.listServices(app.prisma, auth.tenantId);
      return reply.send(services);
    }
  );

  // GET /services/:id - Get a single service
  zApp.get(
    "/services/:id",
    {
      schema: {
        tags: ["Services"],
        params: ServiceParamsSchema,
        response: { 200: ServiceResponseSchema, 404: ErrorResponseSchema },
      },
    },
    async (req, reply) => {
      const auth = requireAuth(req);
      const service = await serviceService.getService(app.prisma, req.params.id, auth.tenantId);
      return reply.send(service);
    }
  );

  // POST /services - Create service (OWNER/STAFF)
  zApp.post(
    "/services",
    {
      preHandler: requireRole("OWNER", "STAFF"),
      schema: {
        tags: ["Services"],
        body: ServiceCreateSchema,
        response: { 201: ServiceResponseSchema },
      },
    },
    async (req, reply) => {
      const auth = requireAuth(req);
      const data: {
        name: string;
        description?: string | null;
        imageUrl?: string | null;
        priceInCents: number;
        durationInMinutes: number;
      } = {
        name: req.body.name,
        priceInCents: req.body.priceInCents,
        durationInMinutes: req.body.durationInMinutes,
      };
      if (req.body.description !== undefined) data.description = req.body.description;
      if (req.body.imageUrl !== undefined) data.imageUrl = req.body.imageUrl;

      const service = await serviceService.createService(app.prisma, auth.tenantId, data);
      return reply.status(201).send(service);
    }
  );

  // PUT /services/:id - Update service (OWNER)
  zApp.put(
    "/services/:id",
    {
      preHandler: requireRole("OWNER"),
      schema: {
        tags: ["Services"],
        params: ServiceParamsSchema,
        body: ServiceUpdateSchema,
        response: { 200: ServiceResponseSchema, 404: ErrorResponseSchema },
      },
    },
    async (req, reply) => {
      const auth = requireAuth(req);
      const data: {
        name?: string;
        description?: string | null;
        imageUrl?: string | null;
        priceInCents?: number;
        durationInMinutes?: number;
      } = {};
      if (req.body.name !== undefined) data.name = req.body.name;
      if (req.body.description !== undefined) data.description = req.body.description;
      if (req.body.imageUrl !== undefined) data.imageUrl = req.body.imageUrl;
      if (req.body.priceInCents !== undefined) data.priceInCents = req.body.priceInCents;
      if (req.body.durationInMinutes !== undefined) data.durationInMinutes = req.body.durationInMinutes;

      const service = await serviceService.updateService(app.prisma, req.params.id, auth.tenantId, data);
      return reply.send(service);
    }
  );

  // DELETE /services/:id - Delete service (OWNER)
  zApp.delete(
    "/services/:id",
    {
      preHandler: requireRole("OWNER"),
      schema: {
        tags: ["Services"],
        params: ServiceParamsSchema,
      },
    },
    async (req, reply) => {
      const auth = requireAuth(req);
      await serviceService.deleteService(app.prisma, req.params.id, auth.tenantId);
      return reply.status(204).send();
    }
  );
};
