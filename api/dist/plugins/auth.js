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
    const publicHealth = process.env["PUBLIC_HEALTH"] ?? "true";
    if (enforce && (!apiKey || apiKey.length < 16)) {
        app.log.error({ enforce, hasApiKey: Boolean(apiKey), apiKeyLength: apiKey?.length ?? 0 }, "API_KEY_ENFORCE=true mas API_KEY ausente/curta; negando requests (exceto health público)");
        app.addHook("onRequest", async (req, reply) => {
            const path = getRequestPath(req.url);
            const isHealth = path === "/health/live" || path === "/health/ready";
            if (publicHealth === "true" && isHealth) {
                return;
            }
            return reply.status(500).send({ message: "Internal Server Error" });
        });
        return;
    }
    app.addHook("onRequest", async (req, reply) => {
        if (!enforce) {
            return;
        }
        const path = getRequestPath(req.url);
        // Rotas públicas
        const isHealth = path === "/health/live" || path === "/health/ready";
        const isDocs = path.startsWith("/documentation/");
        if (isDocs) {
            return;
        }
        if (publicHealth === "true" && isHealth) {
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