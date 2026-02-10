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
    const { buildApp } = await import("../dist/app.js");
    appInstance = await buildApp();
    await appInstance.ready();
  }
  return appInstance;
}

export default async function handler(req, res) {
  try {
    const app = await getApp();
    
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
