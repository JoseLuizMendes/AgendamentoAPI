import type { FastifyInstance } from "fastify";

// Deixa o Fastify parsear o body (evita o bodyParser default da Vercel)
export const config = {
  api: {
    bodyParser: false,
  },
};

let appPromise: Promise<FastifyInstance> | null = null;

async function loadBuildApp(): Promise<() => Promise<FastifyInstance>> {
  // Preferir dist (quando existir), mas funcionar também sem build (fallback para src).
  try {
    const mod = (await import("./dist/app.js")) as unknown as { buildApp: () => Promise<FastifyInstance> };
    return mod.buildApp;
  } catch {
    const mod = (await import("./src/app.js")) as unknown as { buildApp: () => Promise<FastifyInstance> };
    return mod.buildApp;
  }
}

async function getApp(): Promise<FastifyInstance> {
  if (!appPromise) {
    appPromise = (async () => {
      const buildApp = await loadBuildApp();
      const app = await buildApp();
      await app.ready();
      return app;
    })();
  }

  return appPromise;
}

export default async function handler(req: any, res: any) {
  try {
    const app = await getApp();

    // Quando reescrevemos /services -> /api/services, o Fastify não tem rotas com prefixo /api.
    // Então removemos o prefixo antes de encaminhar a requisição.
    if (typeof req.url === "string" && req.url.startsWith("/api")) {
      req.url = req.url.replace(/^\/api(?=\/|\?|$)/, "") || "/";
    }

    app.server.emit("request", req, res);
  } catch (err) {
    // Evita "Function has crashed" sem detalhe. Pelo menos retorna 500 e loga o erro.
    // eslint-disable-next-line no-console
    console.error("Vercel handler failed", err);

    try {
      res.statusCode = 500;
      res.setHeader("content-type", "application/json; charset=utf-8");
      res.end(JSON.stringify({ message: "Internal Server Error" }));
    } catch {
      // se até isso falhar, rethrow
      throw err;
    }
  }
}
