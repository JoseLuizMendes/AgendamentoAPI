import fp from "fastify-plugin";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
let prismaSingleton = null;
function createMissingPrismaClient() {
    return new Proxy({}, {
        get() {
            throw new Error("DATABASE_URL não está definido no ambiente (.env)");
        },
    });
}
const prismaPlugin = async (app) => {
    const databaseUrl = process.env["DATABASE_URL"];
    if (!databaseUrl) {
        // Não derruba o app no boot (útil para health/live e para diagnosticar env vars em deploy).
        // As rotas que precisarem de DB vão falhar ao acessar app.prisma e cair no error handler.
        app.decorate("prisma", createMissingPrismaClient());
        return;
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
//# sourceMappingURL=prisma.js.map