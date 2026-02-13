import type { FastifyPluginAsync, FastifyRequest, FastifyReply } from "fastify";
import fp from "fastify-plugin";
import fastifyJwt from "@fastify/jwt";
import fastifyCookie from "@fastify/cookie";
import type { Role } from "@prisma/client";

export interface JWTPayload {
  userId: number;
  tenantId: number;
  role: Role;
}

declare module "fastify" {
  interface FastifyInstance {
    authenticate(request: FastifyRequest, reply: FastifyReply): Promise<void>;
  }
  
  interface FastifyRequest {
    auth?: JWTPayload;
  }
}

declare module "@fastify/jwt" {
  interface FastifyJWT {
    payload: JWTPayload;
    user: JWTPayload;
  }
}

function getRequestPath(url: string | undefined): string {
  const raw = url ?? "/";
  try {
    return new URL(raw, "http://localhost").pathname;
  } catch {
    return raw.split("?")[0] ?? "/";
  }
}

const authPlugin: FastifyPluginAsync = async (app) => {
  const jwtSecret = process.env["JWT_SECRET"] ?? "development-secret-change-in-production";
  const publicHealth = process.env["PUBLIC_HEALTH"] ?? "true";

  // Register JWT
  await app.register(fastifyJwt, {
    secret: jwtSecret,
    cookie: {
      cookieName: "token",
      signed: false,
    },
  });

  // Register Cookie support
  await app.register(fastifyCookie);

  // Authentication decorator
  app.decorate("authenticate", async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      // Try to get token from cookie first, then from Authorization header
      let token = request.cookies.token;
      
      if (!token) {
        const authHeader = request.headers.authorization;
        if (authHeader && authHeader.startsWith("Bearer ")) {
          token = authHeader.substring(7);
        }
      }

      if (!token) {
        return reply.status(401).send({ message: "Token não fornecido" });
      }

      const decoded = await request.jwtVerify<JWTPayload>();
      request.auth = decoded;
    } catch (err) {
      return reply.status(401).send({ message: "Token inválido ou expirado" });
    }
  });

  // Public routes that don't require authentication
  const publicRoutes = [
    "/health/live",
    "/health/ready",
    "/",
    "/docs",
    "/documentation",
    "/auth/signup",
    "/auth/login",
  ];

  app.addHook("onRequest", async (req, reply) => {
    const path = getRequestPath(req.url);

    // Check if route is public
    const isPublic = publicRoutes.some(route => path === route || path.startsWith(route + "/"));
    
    if (isPublic) {
      return;
    }

    // For protected routes, authenticate
    await app.authenticate(req, reply);
  });
};

export default fp(authPlugin, { name: "auth" });
