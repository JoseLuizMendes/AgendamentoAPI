import type { IncomingMessage, ServerResponse } from "node:http";
import type { FastifyInstance } from "fastify";
import { buildApp } from "../dist/app.js";

let appPromise: Promise<FastifyInstance> | undefined;

async function getApp(): Promise<FastifyInstance> {
  if (!appPromise) {
    appPromise = (async () => {
      const app = await buildApp();
      await app.ready();
      return app;
    })();
  }

  return appPromise;
}

export default async function handler(req: IncomingMessage, res: ServerResponse): Promise<void> {
  const app = await getApp();

  // Encaminha a requisição HTTP da Vercel para o servidor do Fastify
  app.server.emit("request", req, res);
}
