export const healthRoutes = async (app) => {
    app.get("/health/live", async () => {
        return { status: "ok" };
    });
    app.get("/health/ready", async () => {
        try {
            await app.prisma.$queryRaw `SELECT 1`;
            return { status: "ok", database: "connected" };
        }
        catch (error) {
            return { status: "error", database: "disconnected" };
        }
    });
};
//# sourceMappingURL=health.js.map