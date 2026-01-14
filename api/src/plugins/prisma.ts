import type { FastifyPluginAsync } from "fastify";
import fp from "fastify-plugin";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

declare module "fastify" {
  interface FastifyInstance {
    prisma: PrismaClient;
  }
}

let prismaSingleton: PrismaClient | null = null;

const prismaPlugin: FastifyPluginAsync = async (app) => {
  const databaseUrl = process.env["DATABASE_URL"];

  if (!databaseUrl) {
    throw new Error("DATABASE_URL não está definido no ambiente (.env)");
  }

  if (!prismaSingleton) {
    prismaSingleton = new PrismaClient({
      adapter: new PrismaPg({ connectionString: databaseUrl }),
    });
  }

  app.decorate("prisma", prismaSingleton);

  app.addHook("onClose", async (instance) => {
    await instance.prisma.$disconnect();
  });
};

export default fp(prismaPlugin, {
  name: "prisma",
});
