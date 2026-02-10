import type { IncomingMessage, ServerResponse } from "node:http";
import type { buildApp as buildAppFn } from "../src/app.js";

let appPromise: Promise<Awaited<ReturnType<typeof buildAppFn>>> | null = null;

type BuildApp = typeof buildAppFn;

async function loadBuildApp(): Promise<BuildApp> {
  // Na Vercel, o build normalmente gera dist/. Em ambientes sem build, cai no src.
  try {
    const mod = (await import("../dist/app.js")) as unknown as { buildApp: BuildApp };
    return mod.buildApp;
  } catch {
    const mod = (await import("../src/app.js")) as unknown as { buildApp: BuildApp };
    return mod.buildApp;
  }
}

async function getApp() {
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

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  try {
    const app = await getApp();

    const originalUrl = req.url ?? "/";
    // Requests chegam como /api/<rota> (por convenção do Vercel). As rotas do Fastify são /<rota>.
    if (originalUrl === "/api" || originalUrl.startsWith("/api/")) {
      req.url = originalUrl.slice(4) || "/";
    }

    app.server.emit("request", req, res);
  } catch (err) {
    // Evita "Function crashed" por erro no cold start (ex.: DATABASE_URL ausente)
    // eslint-disable-next-line no-console
    console.error(err);

    if (!res.headersSent) {
      res.statusCode = 500;
      res.setHeader("content-type", "application/json; charset=utf-8");
    }

    const isProd = process.env["NODE_ENV"] === "production";
    const message = isProd ? "Internal Server Error" : err instanceof Error ? err.message : "Internal Server Error";
    res.end(JSON.stringify({ message }));
  }
}
