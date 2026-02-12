import type { FastifyPluginAsync } from "fastify";
import fp from "fastify-plugin";
import swagger from "@fastify/swagger";
import swaggerUi from "@fastify/swagger-ui";
import { jsonSchemaTransform } from "fastify-type-provider-zod";

const swaggerPlugin: FastifyPluginAsync = async (app) => {
  await app.register(swagger, {
    openapi: {
      openapi: "3.1.0",
      info: {
        title: "Agendamento API - Multi-Tenant",
        version: "2.0.0",
        description: "API multi-tenant para gerenciamento de agendamentos com autenticação JWT",
      },
      components: {
        securitySchemes: {
          bearerAuth: {
            type: "http",
            scheme: "bearer",
            bearerFormat: "JWT",
            description: "JWT token obtido via /auth/login ou /auth/signup",
          },
          cookieAuth: {
            type: "apiKey",
            in: "cookie",
            name: "token",
            description: "JWT token armazenado em cookie httpOnly",
          },
        },
      },
      security: [
        { bearerAuth: [] },
        { cookieAuth: [] },
      ],
    },
    transform: jsonSchemaTransform,
  });

  await app.register(swaggerUi, {
    routePrefix: "/documentation",
    uiConfig: {
      docExpansion: "list",
      deepLinking: true,
    },
  });
};

export default fp(swaggerPlugin, {
  name: "swagger",
});
