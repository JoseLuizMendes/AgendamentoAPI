import type { FastifyPluginAsync } from "fastify";
import fp from "fastify-plugin";
import swagger from "@fastify/swagger";
import swaggerUi from "@fastify/swagger-ui";

const swaggerPlugin: FastifyPluginAsync = async (app) => {
  await app.register(swagger, {
    openapi: {
      info: {
        title: "Scheduler-Fastify-Pro",
        version: "1.0.0",
        description: "API de agendamento (MVP)",
      },
    },
  });

  await app.register(swaggerUi, {
    routePrefix: "/docs",
  });
};

export default fp(swaggerPlugin, {
  name: "swagger",
});
