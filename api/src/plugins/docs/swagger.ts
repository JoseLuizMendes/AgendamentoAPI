import type { FastifyPluginAsync } from "fastify";
import fp from "fastify-plugin";
import swagger from "@fastify/swagger";
import swaggerUi from "@fastify/swagger-ui";
import { jsonSchemaTransform } from "fastify-type-provider-zod";
import { config } from "../../config.js";

// Descrições das tags (devem casar EXATAMENTE com as strings usadas no `schema.tags` das rotas).
const tags = [
  { name: "Auth", description: "Cadastro, login, logout e usuário atual (JWT em cookie httpOnly)." },
  { name: "Users", description: "Gestão de usuários da tenant (restrito a OWNER)." },
  { name: "Services", description: "Serviços oferecidos (preço, duração, imagem)." },
  { name: "Appointments", description: "Agendamentos, disponibilidade e transições de status." },
  { name: "BusinessHours", description: "Horário de funcionamento semanal e intervalos." },
  { name: "Overrides", description: "Exceções de data (feriados, horários especiais)." },
  { name: "Settings", description: "Configurações/limiares da tenant." },
  { name: "Reports", description: "KPIs e séries do dashboard por período." },
  { name: "Uploads", description: "Assinatura de upload Cloudinary." },
  { name: "Public", description: "Endpoints públicos de auto-agendamento (sem auth)." },
  { name: "Observability", description: "Recebe relatórios de erro do navegador (sem auth, sem banco)." },
  { name: "Raiz", description: "Health checks e descoberta." },
];

const swaggerPlugin: FastifyPluginAsync = async (app) => {
  await app.register(swagger, {
    openapi: {
      openapi: "3.1.0",
      info: {
        title: "Agendamento API - Multi-Tenant",
        version: "2.0.0",
        description:
          "API multi-tenant para gerenciamento de agendamentos.\n\n" +
          "Autenticação por **JWT** (cookie httpOnly `token` ou header `Authorization: Bearer`). " +
          "A maioria das rotas exige auth; as marcadas sem cadeado são públicas " +
          "(login, signup, `/public/*`, `/client-errors`, health).\n\n" +
          "Use **Authorize** para colar um token obtido em `/auth/login` ou `/auth/signup`.",
      },
      // URL base de dev (derivada do config). Em prod, adicionar a URL pública do servidor.
      servers: [{ url: `http://localhost:${config.port}`, description: "Desenvolvimento local" }],
      tags,
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
      // Segurança global (herdada por todas as rotas). Rotas públicas sobrescrevem com `security: []`.
      security: [{ bearerAuth: [] }, { cookieAuth: [] }],
    },
    transform: jsonSchemaTransform,
  });

  await app.register(swaggerUi, {
    routePrefix: "/docs",
    uiConfig: {
      docExpansion: "list",
      deepLinking: true,
      persistAuthorization: true,
      tagsSorter: "alpha",
      operationsSorter: "alpha",
    },
  });

  // Raiz → documentação. `hide: true` mantém o redirect fora da própria spec.
  app.get("/", { schema: { hide: true } }, (_req, reply) => reply.redirect("/docs"));
};

export default fp(swaggerPlugin, {
  name: "swagger",
});
