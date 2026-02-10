import type { FastifyPluginAsync } from "fastify";
import { Type, type Static } from "@sinclair/typebox";
import { ErrorResponse } from "../schemas/http.js";
import { createRepositories } from "../infra/prisma/repositories.js";
import { deleteBusinessDateOverride } from "../application/usecases/business/deleteBusinessDateOverride.js";
import { listBusinessDateOverrides } from "../application/usecases/business/listBusinessDateOverrides.js";
import { upsertBusinessDateOverride } from "../application/usecases/business/upsertBusinessDateOverride.js";

const TimeString = Type.String({ pattern: "^\\d{2}:\\d{2}$" });

const DateParams = Type.Object({
  date: Type.String({ pattern: "^\\d{4}-\\d{2}-\\d{2}$" }),
});

const BusinessDayOverrideBody = Type.Object({
  isOff: Type.Boolean(),
  openTime: Type.Optional(TimeString),
  closeTime: Type.Optional(TimeString),
});

const BusinessDayOverrideResponse = Type.Object({
  id: Type.Integer(),
  date: Type.String(),
  openTime: Type.Union([TimeString, Type.Null()]),
  closeTime: Type.Union([TimeString, Type.Null()]),
  isOff: Type.Boolean(),
  createdAt: Type.String(),
  updatedAt: Type.String(),
});

type DateParamsT = Static<typeof DateParams>;
type BusinessDayOverrideBodyT = Static<typeof BusinessDayOverrideBody>;

export const businessDaysRoutes: FastifyPluginAsync = async (app) => {
  app.get(
    "/business-days",
    {
      schema: {
        tags: ["business"],
        description: "Lista exceções de funcionamento por data (YYYY-MM-DD)",
        response: {
          200: Type.Array(BusinessDayOverrideResponse),
        },
      },
    },
    async () => {
      const repos = createRepositories(app.prisma);
      return listBusinessDateOverrides(repos);
    }
  );

  app.put(
    "/business-days/:date",
    {
      schema: {
        tags: ["business"],
        description: "Define exceção de funcionamento (abrir/fechar) para uma data específica",
        params: DateParams,
        body: BusinessDayOverrideBody,
        response: {
          200: BusinessDayOverrideResponse,
          400: ErrorResponse,
        },
      },
    },
    async (req) => {
      const params = req.params as DateParamsT;
      const body = req.body as BusinessDayOverrideBodyT;

      const repos = createRepositories(app.prisma);
      return upsertBusinessDateOverride(repos, {
        date: params.date,
        isOff: body.isOff,
        ...(typeof body.openTime === "string" ? { openTime: body.openTime } : {}),
        ...(typeof body.closeTime === "string" ? { closeTime: body.closeTime } : {}),
      });
    }
  );

  app.delete(
    "/business-days/:date",
    {
      schema: {
        tags: ["business"],
        description: "Remove a exceção de funcionamento de uma data",
        params: DateParams,
        response: {
          204: Type.Null(),
          404: ErrorResponse,
        },
      },
    },
    async (req, reply) => {
      const params = req.params as DateParamsT;

      const repos = createRepositories(app.prisma);
      await deleteBusinessDateOverride(repos, params.date);
      return reply.status(204).send(null);
    }
  );
};
