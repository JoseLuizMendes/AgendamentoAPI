import type { FastifyPluginAsync } from "fastify";

export const healthRoutes: FastifyPluginAsync = async (app) => {
  app.get("/health/live", async () => {
    return { status: "ok" };
  });

  app.get("/health/ready", async () => {
    try {
      await app.prisma.$queryRaw`SELECT 1`;
      return { status: "ok", database: "connected" };
    } catch (error) {
      return { status: "error", database: "disconnected" };
    }
  });
};
