// Vercel Serverless Function (Node.js)
// - Mantém a API em /api/*
// - Permite rewrite /services -> /api/services

export const config = {
  api: {
    bodyParser: false,
  },
};

let appPromise = null;

async function getApp() {
  if (!appPromise) {
    appPromise = (async () => {
      // Preferir dist (build), com fallback para src (quando o bundler suportar)
      let buildApp;
      try {
        ({ buildApp } = await import("../dist/app.js"));
      } catch {
        ({ buildApp } = await import("../src/app.js"));
      }

      const app = await buildApp();
      await app.ready();
      return app;
    })();
  }

  return appPromise;
}

export default async function handler(req, res) {
  try {
    const app = await getApp();

    if (typeof req.url === "string" && req.url.startsWith("/api")) {
      req.url = req.url.replace(/^\/api(?=\/|\?|$)/, "") || "/";
    }

    await new Promise((resolve, reject) => {
      const done = () => resolve();
      res.once("finish", done);
      res.once("close", done);
      res.once("error", reject);

      try {
        app.server.emit("request", req, res);
      } catch (err) {
        reject(err);
      }
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("Vercel handler failed", err);

    res.statusCode = 500;
    res.setHeader("content-type", "application/json; charset=utf-8");
    res.end(JSON.stringify({ message: "Internal Server Error" }));
  }
}
