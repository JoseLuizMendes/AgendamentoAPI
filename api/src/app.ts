import Fastify, { type FastifyInstance } from "fastify";
import { Prisma } from "@prisma/client";
import { ZodError } from "zod";
import helmet from "@fastify/helmet";
import rateLimit from "@fastify/rate-limit";
import prismaPlugin from "./plugins/prisma.js";
import swaggerPlugin from "./plugins/docs/swagger.js";
import authPlugin from "./plugins/auth.js";
import { AppError } from "./utils/errors.js";
import { healthRoutes } from "./routes/health.js";
import { usersRoutes } from "./routes/users.js";
import { servicesRoutes } from "./routes/services.js";
import { hoursRoutes } from "./routes/hours.js";
import { overridesRoutes } from "./routes/overrides.js";
import { appointmentsRoutes } from "./routes/appointments.js";

export async function buildApp(): Promise<FastifyInstance> {
  const app = Fastify({
    logger: true,
  });

  app.setErrorHandler((err, req, reply) => {
    // Handle custom app errors
    if (err instanceof AppError) {
      return reply.status(err.statusCode).send({ message: err.message });
    }

    // Handle Zod validation errors
    if (err instanceof ZodError) {
      const errors = err.errors.map((e) => `${e.path.join(".")}: ${e.message}`).join(", ");
      return reply.status(400).send({ message: `Validation error: ${errors}` });
    }

    // Erros de validação (AJV/Fastify)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const anyErr = err as any;
    if (anyErr?.validation) {
      const detail = Array.isArray(anyErr.validation)
        ? anyErr.validation.map((v: { instancePath?: string; message?: string }) => {
            const path = v.instancePath ? v.instancePath.replace(/^\//, "") : "body";
            return `${path}: ${v.message ?? "inválido"}`;
          })
        : [];
      const message = detail.length > 0 ? `Requisição inválida: ${detail.join(", ")}` : "Requisição inválida";
      return reply.status(400).send({ message });
    }

    // Erros do Prisma
    if (err instanceof Prisma.PrismaClientKnownRequestError) {
      if (err.code === "P2002") {
        return reply.status(409).send({ message: "Conflito: registro já existe" });
      }
      if (err.code === "P2025") {
        return reply.status(404).send({ message: "Registro não encontrado" });
      }
      req.log.error({ err }, "Prisma error");
      return reply.status(500).send({ message: "Internal Server Error" });
    }

    req.log.error({ err }, "Unhandled error");
    return reply.status(500).send({ message: "Internal Server Error" });
  });

  await app.register(helmet, {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: [
          "'self'",
          "'unsafe-inline'",
          "https://unpkg.com",
          "https://cdn.jsdelivr.net",
          "https://vercel.live",
        ],
        styleSrc: ["'self'", "'unsafe-inline'", "https://unpkg.com", "https://cdn.jsdelivr.net"],
        imgSrc: ["'self'", "data:", "https:"],
      },
    },
  });

  await app.register(rateLimit, {
    max: Number(process.env["RATE_LIMIT_MAX"] ?? 120),
    timeWindow: process.env["RATE_LIMIT_WINDOW"] ?? "1 minute",
    allowList: (req) => {
      const url = req.url ?? "/";
      return url.startsWith("/health/") || url.startsWith("/documentation/");
    },
  });

  await app.register(swaggerPlugin);
  await app.register(prismaPlugin);
  await app.register(authPlugin);

  await app.register(healthRoutes);
  await app.register(usersRoutes);
  await app.register(servicesRoutes);
  await app.register(hoursRoutes);
  await app.register(overridesRoutes);
  await app.register(appointmentsRoutes);

  return app;
}
