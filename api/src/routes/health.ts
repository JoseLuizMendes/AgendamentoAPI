import type { FastifyPluginAsync } from "fastify";

export const healthRoutes: FastifyPluginAsync = async (app) => {
  app.get("/health/live", async () => {
    return { status: "ok" };
  });

  app.get("/health/ready", async (req, reply) => {
    try {
      await app.prisma.user.count();
      return { status: "ok", db: "connected" };
    } catch (err) {
      req.log.error({ err }, "Readiness failed");
      return reply.code(503).send({ status: "fail", db: "disconnected" });
    }
  });
};
