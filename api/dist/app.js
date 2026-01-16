import Fastify, {} from "fastify";
import prismaPlugin from "./plugins/prisma.js";
import swaggerPlugin from "./plugins/swagger.js";
import { healthRoutes } from "./routes/health.js";
import { dbRoutes } from "./routes/db.js";
import { servicesRoutes } from "./routes/services.js";
import { businessHoursRoutes } from "./routes/businessHours.js";
import { businessDaysRoutes } from "./routes/businessDays.js";
import { slotsRoutes } from "./routes/slots.js";
import { appointmentsRoutes } from "./routes/appointments.js";
export async function buildApp() {
    const app = Fastify({
        logger: true,
    });
    await app.register(prismaPlugin);
    await app.register(swaggerPlugin);
    await app.register(healthRoutes);
    await app.register(dbRoutes);
    await app.register(servicesRoutes);
    await app.register(businessHoursRoutes);
    await app.register(businessDaysRoutes);
    await app.register(slotsRoutes);
    await app.register(appointmentsRoutes);
    return app;
}
//# sourceMappingURL=app.js.map