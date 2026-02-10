import fp from "fastify-plugin";
import swagger from "@fastify/swagger";
import swaggerUi from "@fastify/swagger-ui";
const swaggerPlugin = async (app) => {
    app.log.info("Registering Swagger plugin...");
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
    await app.register(swaggerUi, {
        routePrefix: "/docs",
        uiConfig: {
            docExpansion: "list",
            deepLinking: true,
        },
        staticCSP: false,
    });
    app.log.info("✓ Swagger UI registered at /docs");
};
export default fp(swaggerPlugin, {
    name: "swagger",
});
//# sourceMappingURL=swagger.js.map