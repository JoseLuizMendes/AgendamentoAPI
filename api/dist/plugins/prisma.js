import fp from "fastify-plugin";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
let prismaSingleton = null;
const prismaPlugin = async (app) => {
    const databaseUrl = process.env["DATABASE_URL"];
    if (!databaseUrl) {
        throw new Error("DATABASE_URL não está definido no ambiente (.env)");
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