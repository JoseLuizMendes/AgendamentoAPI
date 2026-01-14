import type { FastifyPluginAsync } from "fastify";

export const dbRoutes: FastifyPluginAsync = async (app) => {
  app.get("/db/health", async () => {
    const users = await app.prisma.user.count();

    return {
      status: "ok",
      db: "connected",
      users,
    };
  });
};
