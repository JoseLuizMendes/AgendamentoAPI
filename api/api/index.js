// Vercel Serverless Function handler
// Processa todas as requests através do Fastify

export const config = {
  api: {
    bodyParser: false,
  },
};

let appInstance = null;

async function getApp() {
  if (!appInstance) {
    try {
      const { buildApp } = await import("../dist/app.js");
      appInstance = await buildApp();
      await appInstance.ready();
      console.log("✓ Fastify app initialized");
    } catch (err) {
      console.error("Failed to initialize app:", err);
      throw err;
    }
  }
  return appInstance;
}

export default async function handler(req, res) {
  try {
    const app = await getApp();
    
    // Remove /api prefix para o Fastify
    if (req.url && req.url.startsWith("/api")) {
      req.url = req.url.replace(/^\/api/, "") || "/";
    }
    
    await new Promise((resolve, reject) => {
      const cleanup = () => {
        res.off("finish", cleanup);
        res.off("close", cleanup);
        res.off("error", reject);
        resolve();
      };
      
      res.once("finish", cleanup);
      res.once("close", cleanup);
      res.once("error", reject);
      
      app.server.emit("request", req, res);
    });
  } catch (err) {
    console.error("Handler error:", err);
    
    if (!res.headersSent) {
      res.statusCode = 500;
      res.setHeader("Content-Type", "application/json");
      res.end(JSON.stringify({ message: "Internal Server Error" }));
    }
  }
}
