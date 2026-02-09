import fp from "fastify-plugin";
import crypto from "node:crypto";
function safeEqual(a, b) {
    const aBuf = Buffer.from(a);
    const bBuf = Buffer.from(b);
    if (aBuf.length !== bBuf.length) {
        // compara com um buffer de mesmo tamanho para reduzir diferenças de tempo
        const padded = Buffer.alloc(aBuf.length, 0);
        crypto.timingSafeEqual(aBuf, padded);
        return false;
    }
    return crypto.timingSafeEqual(aBuf, bBuf);
}
function getRequestPath(url) {
    const raw = url ?? "/";
    try {
        return new URL(raw, "http://localhost").pathname;
    }
    catch {
        return raw.split("?")[0] ?? "/";
    }
}
function extractApiKey(headers) {
    const xApiKey = headers["x-api-key"];
    if (typeof xApiKey === "string" && xApiKey.length > 0) {
        return xApiKey;
    }
    const auth = headers["authorization"];
    if (typeof auth === "string") {
        const prefix = "Bearer ";
        if (auth.startsWith(prefix) && auth.length > prefix.length) {
            return auth.slice(prefix.length);
        }
    }
    return null;
}
const authPlugin = async (app) => {
    const enforce = (process.env["API_KEY_ENFORCE"] ?? (process.env["NODE_ENV"] === "production" ? "true" : "false")) === "true";
    const apiKey = process.env["API_KEY"];
    const enableSwagger = process.env["ENABLE_SWAGGER"] === "true";
    const publicHealth = process.env["PUBLIC_HEALTH"] ?? "true";
    if (enforce && (!apiKey || apiKey.length < 16)) {
        throw new Error("API_KEY não está definido (ou é muito curto). Defina um segredo forte (>=16 chars). ");
    }
    app.addHook("onRequest", async (req, reply) => {
        if (!enforce) {
            return;
        }
        const path = getRequestPath(req.url);
        const isHealth = path === "/health/live" || path === "/health/ready";
        if (publicHealth === "true" && isHealth) {
            return;
        }
        if (enableSwagger && (path === "/docs" || path.startsWith("/docs/"))) {
            return;
        }
        const presented = extractApiKey(req.headers);
        if (!presented || !apiKey || !safeEqual(presented, apiKey)) {
            return reply.status(401).send({ message: "Não autorizado" });
        }
    });
};
export default fp(authPlugin, { name: "auth" });
//# sourceMappingURL=auth.js.map