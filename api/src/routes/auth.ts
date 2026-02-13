import type { FastifyPluginAsync } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { SignupSchema, LoginSchema } from "../schemas/index.js";
import * as authService from "../services/auth.js";

export const authRoutes: FastifyPluginAsync = async (app) => {
  const zApp = app.withTypeProvider<ZodTypeProvider>();

  // POST /auth/signup - Create new tenant and owner user
  zApp.post(
    "/auth/signup",
    {
      schema: {
        tags: ["Auth"],
        body: SignupSchema,
        description: "Create a new tenant and owner user account",
      },
    },
    async (req, reply) => {
      const result = await authService.signup(app.prisma, req.body);

      // Generate JWT token
      const token = await reply.jwtSign({
        userId: result.user.id,
        tenantId: result.user.tenantId,
        role: result.user.role,
      });

      // Set cookie
      reply.setCookie("token", token, {
        httpOnly: true,
        secure: process.env["NODE_ENV"] === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60 * 24 * 7, // 7 days
      });

      return reply.status(201).send({
        user: result.user,
        tenant: result.tenant,
        token,
      });
    }
  );

  // POST /auth/login - Login to existing tenant
  zApp.post(
    "/auth/login",
    {
      schema: {
        tags: ["Auth"],
        body: LoginSchema,
        description: "Login to an existing tenant account",
      },
    },
    async (req, reply) => {
      const result = await authService.login(app.prisma, req.body);

      // Generate JWT token
      const token = await reply.jwtSign({
        userId: result.userId,
        tenantId: result.tenantId,
        role: result.role,
      });

      // Set cookie
      reply.setCookie("token", token, {
        httpOnly: true,
        secure: process.env["NODE_ENV"] === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60 * 24 * 7, // 7 days
      });

      return reply.send({
        user: result.user,
        token,
      });
    }
  );

  // POST /auth/logout - Logout (clear cookie)
  zApp.post(
    "/auth/logout",
    {
      schema: {
        tags: ["Auth"],
        description: "Logout and clear authentication token",
      },
    },
    async (_req, reply) => {
      reply.clearCookie("token", {
        path: "/",
      });

      return reply.send({ message: "Logout realizado com sucesso" });
    }
  );

  // GET /auth/me - Get current user info (requires authentication)
  zApp.get(
    "/auth/me",
    {
      schema: {
        tags: ["Auth"],
        description: "Get current authenticated user information",
      },
    },
    async (req, reply) => {
      if (!req.auth) {
        return reply.status(401).send({ message: "Não autenticado" });
      }

      const user = await app.prisma.user.findUnique({
        where: { id: req.auth.userId },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          tenantId: true,
          tenant: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
        },
      });

      if (!user) {
        return reply.status(404).send({ message: "Usuário não encontrado" });
      }

      return reply.send(user);
    }
  );
};
