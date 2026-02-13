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
    async (req, reply) => {
      if (!req.auth) {
        return reply.status(401).send({ message: "Não autenticado" });
      }
      const services = await serviceService.listServices(app.prisma, req.auth.tenantId);
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
      if (!req.auth) {
        return reply.status(401).send({ message: "Não autenticado" });
      }
      
      // Only OWNER and STAFF can create services
      if (req.auth.role !== "OWNER" && req.auth.role !== "STAFF") {
        return reply.status(403).send({ message: "Sem permissão para criar serviços" });
      }

      const service = await serviceService.createService(app.prisma, req.auth.tenantId, req.body);
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
      if (!req.auth) {
        return reply.status(401).send({ message: "Não autenticado" });
      }
      
      // Only OWNER can update services
      if (req.auth.role !== "OWNER") {
        return reply.status(403).send({ message: "Sem permissão para atualizar serviços" });
      }

      const data: {
        name?: string;
        priceInCents?: number;
        durationInMinutes?: number;
      } = {};
      if (req.body.name !== undefined) data.name = req.body.name;
      if (req.body.priceInCents !== undefined) data.priceInCents = req.body.priceInCents;
      if (req.body.durationInMinutes !== undefined) data.durationInMinutes = req.body.durationInMinutes;
    
      const service = await serviceService.updateService(app.prisma, req.params.id, req.auth.tenantId, data);
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
      if (!req.auth) {
        return reply.status(401).send({ message: "Não autenticado" });
      }
      
      // Only OWNER can delete services
      if (req.auth.role !== "OWNER") {
        return reply.status(403).send({ message: "Sem permissão para deletar serviços" });
      }

      await serviceService.deleteService(app.prisma, req.params.id, req.auth.tenantId);
      return reply.status(204).send();
    }
  );
};
