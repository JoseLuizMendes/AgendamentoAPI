import fp from "fastify-plugin";
import swagger from "@fastify/swagger";
const swaggerPlugin = async (app) => {
    await app.register(swagger, {
        openapi: {
            openapi: "3.1.0",
            info: {
                title: "Agendamento API",
                version: "1.0.0",
                description: "API para gerenciamento de agendamentos",
            },
            components: {
                securitySchemes: {
                    apiKey: {
                        type: "apiKey",
                        name: "x-api-key",
                        in: "header",
                    },
                },
            },
            security: [{ apiKey: [] }],
        },
    });
    // Expõe o OpenAPI JSON
    app.get("/documentation/json", async () => {
        return app.swagger();
    });
};
export default fp(swaggerPlugin, {
    name: "swagger",
});
//# sourceMappingURL=swagger.js.map