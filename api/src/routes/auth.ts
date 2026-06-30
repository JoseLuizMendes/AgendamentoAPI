import type { FastifyPluginAsync } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import {
  SignupSchema,
  LoginSchema,
  ForgotPasswordSchema,
  ResetPasswordSchema,
  VerifyEmailSchema,
  RequestVerificationSchema,
  ErrorResponseSchema,
} from "../schemas/index.js";
import * as authService from "../services/auth.js";
import { config } from "../config.js";
import { requireAuth } from "../utils/guards.js";

export const authRoutes: FastifyPluginAsync = async (app) => {
  const zApp = app.withTypeProvider<ZodTypeProvider>();

  // POST /auth/signup - Create new tenant and owner user
  zApp.post(
    "/auth/signup",
    {
      schema: {
        tags: ["Auth"],
        security: [], // pública
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
        secure: config.cookieSecure,
        sameSite: config.cookieSameSite,
        ...(config.cookieDomain ? { domain: config.cookieDomain } : {}),
        path: "/",
        maxAge: 60 * 60 * 24 * 2, // 2 days (casa com JWT_EXPIRES_IN)
      });

      // Sessão entregue só pelo cookie httpOnly (o token NÃO vai no corpo — evita que XSS leia
      // a resposta). O JWT segue assinado e usado no Set-Cookie acima.
      return reply.status(201).send({
        user: result.user,
        tenant: result.tenant,
      });
    }
  );

  // POST /auth/login - Login to existing tenant
  zApp.post(
    "/auth/login",
    {
      config: {
        // Rate limit reforçado contra brute force de senha (espelha o booking público).
        rateLimit: { max: 10, timeWindow: "1 minute" },
      },
      schema: {
        tags: ["Auth"],
        security: [], // pública
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
        secure: config.cookieSecure,
        sameSite: config.cookieSameSite,
        ...(config.cookieDomain ? { domain: config.cookieDomain } : {}),
        path: "/",
        maxAge: 60 * 60 * 24 * 2, // 2 days (casa com JWT_EXPIRES_IN)
      });

      // Sessão entregue só pelo cookie httpOnly (o token NÃO vai no corpo).
      return reply.send({
        user: result.user,
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
        ...(config.cookieDomain ? { domain: config.cookieDomain } : {}),
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
      const auth = requireAuth(req);

      const user = await app.prisma.user.findUnique({
        where: { id: auth.userId },
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
              allowCustomerBooking: true,
              timezone: true,
              slotIntervalMinutes: true,
              minLeadTimeMinutes: true,
              maxAdvanceDays: true,
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

  // POST /auth/verify-email - Confirma o email a partir do token do link
  zApp.post(
    "/auth/verify-email",
    {
      config: { rateLimit: { max: 10, timeWindow: "1 minute" } },
      schema: {
        tags: ["Auth"],
        security: [], // pública
        body: VerifyEmailSchema,
        description: "Confirma o email a partir do token enviado por email.",
        response: { 200: ErrorResponseSchema, 400: ErrorResponseSchema },
      },
    },
    async (req, reply) => {
      await authService.verifyEmail(app.prisma, req.body.token);
      return reply.send({ message: "Email verificado com sucesso" });
    }
  );

  // POST /auth/verify-email/request - (Re)envia o email de verificação (silencioso)
  zApp.post(
    "/auth/verify-email/request",
    {
      config: { rateLimit: { max: 5, timeWindow: "1 minute" } },
      schema: {
        tags: ["Auth"],
        security: [], // pública
        body: RequestVerificationSchema,
        description: "Reenvia o email de verificação. Responde 204 sem revelar se o email existe.",
      },
    },
    async (req, reply) => {
      await authService.requestEmailVerification(app.prisma, req.body.email, req.body.tenantSlug);
      return reply.status(204).send();
    }
  );

  // POST /auth/forgot-password - Solicita redefinição de senha (silencioso)
  zApp.post(
    "/auth/forgot-password",
    {
      config: { rateLimit: { max: 5, timeWindow: "1 minute" } },
      schema: {
        tags: ["Auth"],
        security: [], // pública
        body: ForgotPasswordSchema,
        description: "Envia um link de redefinição de senha. Responde 204 sem revelar se o email existe.",
      },
    },
    async (req, reply) => {
      await authService.requestPasswordReset(app.prisma, req.body.email, req.body.tenantSlug);
      return reply.status(204).send();
    }
  );

  // POST /auth/reset-password - Conclui a redefinição com o token + nova senha
  zApp.post(
    "/auth/reset-password",
    {
      config: { rateLimit: { max: 10, timeWindow: "1 minute" } },
      schema: {
        tags: ["Auth"],
        security: [], // pública
        body: ResetPasswordSchema,
        description: "Define uma nova senha a partir do token de redefinição (uso único, com expiração).",
        response: { 200: ErrorResponseSchema, 400: ErrorResponseSchema },
      },
    },
    async (req, reply) => {
      await authService.resetPassword(app.prisma, req.body.token, req.body.password);
      return reply.send({ message: "Senha redefinida com sucesso" });
    }
  );
};
