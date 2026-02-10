import type { FastifyInstance } from "fastify";
import { buildApp } from "../src/app.js";

// Deixa o Fastify parsear o body (evita o bodyParser default da Vercel)
export const config = {
  api: {
    bodyParser: false,
  },
};

let appPromise: Promise<FastifyInstance> | null = null;

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

export default async function handler(req: any, res: any) {
  const app = await getApp();

  // Quando reescrevemos /services -> /api/services, o Fastify não tem rotas com prefixo /api.
  // Então removemos o prefixo antes de encaminhar a requisição.
  if (typeof req.url === "string" && req.url.startsWith("/api")) {
    req.url = req.url.replace(/^\/api(?=\/|\?|$)/, "") || "/";
  }

  app.server.emit("request", req, res);
}
