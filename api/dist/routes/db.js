export const dbRoutes = async (app) => {
    app.get("/db/health", async () => {
        const users = await app.prisma.user.count();
        return {
            status: "ok",
            db: "connected",
            users,
        };
    });
};
//# sourceMappingURL=db.js.map