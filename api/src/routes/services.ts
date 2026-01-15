import type { FastifyPluginAsync } from "fastify";
import { Type, type Static } from "@sinclair/typebox";
import { ErrorResponse } from "../schemas/http.js";

const ServiceBody = Type.Object({
  name: Type.String({ minLength: 1, maxLength: 200 }),
  priceInCents: Type.Integer({ minimum: 0 }),
  durationInMinutes: Type.Integer({ minimum: 1, maximum: 24 * 60 }),
});

const ServiceParams = Type.Object({
  id: Type.Integer({ minimum: 1 }),
});

const ServiceResponse = Type.Object({
  id: Type.Integer(),
  name: Type.String(),
  priceInCents: Type.Integer(),
  durationInMinutes: Type.Integer(),
  createdAt: Type.String(),
  updatedAt: Type.String(),
});

type ServiceBodyT = Static<typeof ServiceBody>;
type ServiceParamsT = Static<typeof ServiceParams>;

export const servicesRoutes: FastifyPluginAsync = async (app) => {
  app.get(
    "/services",
    {
      schema: {
        tags: ["services"],
        response: {
          200: Type.Array(ServiceResponse),
        },
      },
    },
    async () => {
      return app.prisma.service.findMany({ orderBy: { id: "asc" } });
    }
  );
  app.get(
    "/services/:id",
    {
      schema: {
        tags: ["services"],
        params: ServiceParams,
        response: {
          200: ServiceResponse,
          404: ErrorResponse,
        },
      },
    },
    async (req, reply) => {
      const params = req.params as ServiceParamsT;

      const service = await app.prisma.service.findUnique({ where: { id: params.id } });
      if (!service) {
        return reply.status(404).send({ message: "Serviço não encontrado" });
      }

      return service;
    }
  );

  app.post(
    "/services",
    {
      schema: {
        tags: ["services"],
        body: ServiceBody,
        response: {
          201: ServiceResponse,
        },
      },
    },
    async (req, reply) => {
      const body = req.body as ServiceBodyT;
      const created = await app.prisma.service.create({ data: body });
      return reply.status(201).send(created);
    }
  );

  app.put(
    "/services/:id",
    {
      schema: {
        tags: ["services"],
        params: ServiceParams,
        body: ServiceBody,
        response: {
          200: ServiceResponse,
        },
      },
    },
    async (req) => {
      const params = req.params as ServiceParamsT;
      const body = req.body as ServiceBodyT;
      return app.prisma.service.update({
        where: { id: params.id },
        data: body,
      });
    }
  );

  app.delete(
    "/services/:id",
    {
      schema: {
        tags: ["services"],
        params: ServiceParams,
        response: {
          204: Type.Null(),
        },
      },
    },
    async (req, reply) => {
      const params = req.params as ServiceParamsT;
      await app.prisma.service.delete({ where: { id: params.id } });
      return reply.status(204).send(null);
    }
  );
};
