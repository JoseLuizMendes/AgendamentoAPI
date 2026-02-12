import type { FastifyPluginAsync } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";

export const healthRoutes: FastifyPluginAsync = async (app) => {
  const zApp = app.withTypeProvider<ZodTypeProvider>();
  zApp.get("/health/live", 
    {
      schema:{
        tags:["Raiz"]
      }
    }, async () => {
    return { status: "ok" };
  });

  zApp.get("/health/ready",
    {
      schema:{
        tags:["Raiz"]
      }
    },
     async () => {
    try {
      await app.prisma.$queryRaw`SELECT 1`;
      return { status: "ok", database: "connected" };
    } catch (error) {
      return { status: "error", database: "disconnected" };
    }
  });
};

