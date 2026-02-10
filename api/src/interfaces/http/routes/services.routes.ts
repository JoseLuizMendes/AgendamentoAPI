import type { FastifyPluginAsync } from "fastify";
import { Type, type Static } from "@sinclair/typebox";
import { ErrorResponse } from "../../../schemas/http.js";
import { PrismaServiceRepository } from "../../../infra/prisma/repositories/prismaServiceRepository.js";
import { createService, deleteService, getService, listServices, updateService } from "../../../application/usecases/services.js";

const ServiceBody = Type.Object(
  {
    name: Type.String({ minLength: 1, maxLength: 200 }),
    priceInCents: Type.Integer({ minimum: 0 }),
    durationInMinutes: Type.Integer({ minimum: 1, maximum: 24 * 60 }),
  },
  { additionalProperties: false }
);

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
  const repo = new PrismaServiceRepository(app.prisma);

  app.get(
    "/services",
    {
      schema: {
        tags: ["services"],
        response: { 200: Type.Array(ServiceResponse) },
      },
    },
    async () => listServices(repo)
  );

  app.get(
    "/services/:id",
    {
      schema: {
        tags: ["services"],
        params: ServiceParams,
        response: { 200: ServiceResponse, 404: ErrorResponse },
      },
    },
    async (req) => {
      const params = req.params as ServiceParamsT;
      return getService(repo, params.id);
    }
  );

  app.post(
    "/services",
    {
      schema: {
        tags: ["services"],
        body: ServiceBody,
        response: { 201: ServiceResponse },
      },
    },
    async (req, reply) => {
      const body = req.body as ServiceBodyT;
      const created = await createService(repo, body);
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
        response: { 200: ServiceResponse, 404: ErrorResponse },
      },
    },
    async (req) => {
      const params = req.params as ServiceParamsT;
      const body = req.body as ServiceBodyT;
      return updateService(repo, params.id, body);
    }
  );

  app.delete(
    "/services/:id",
    {
      schema: {
        tags: ["services"],
        params: ServiceParams,
        response: { 204: Type.Null(), 404: ErrorResponse },
      },
    },
    async (req, reply) => {
      const params = req.params as ServiceParamsT;
      await deleteService(repo, params.id);
      return reply.status(204).send(null);
    }
  );
};
