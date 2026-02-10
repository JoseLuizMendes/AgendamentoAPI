import type { FastifyPluginAsync } from "fastify";
import { Type, type Static } from "@sinclair/typebox";
import { ErrorResponse } from "../schemas/http.js";
import { createRepositories } from "../infra/prisma/repositories.js";
import { createService } from "../application/usecases/services/createService.js";
import { deleteService } from "../application/usecases/services/deleteService.js";
import { getService } from "../application/usecases/services/getService.js";
import { listServices } from "../application/usecases/services/listServices.js";
import { updateService } from "../application/usecases/services/updateService.js";

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
      const repos = createRepositories(app.prisma);
      return listServices(repos);
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
    async (req) => {
      const params = req.params as ServiceParamsT;
      const repos = createRepositories(app.prisma);
      return getService(repos, params.id);
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
      const repos = createRepositories(app.prisma);
      const created = await createService(repos, {
        name: body.name,
        priceInCents: body.priceInCents,
        durationInMinutes: body.durationInMinutes,
      });
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
      const repos = createRepositories(app.prisma);
      return updateService(repos, {
        id: params.id,
        name: body.name,
        priceInCents: body.priceInCents,
        durationInMinutes: body.durationInMinutes,
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
      const repos = createRepositories(app.prisma);
      await deleteService(repos, params.id);
      return reply.status(204).send(null);
    }
  );
};
