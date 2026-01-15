import "dotenv/config";
import Fastify from "fastify";
import { healthRoutes } from "./routes/health.js";
import prismaPlugin from "./plugins/prisma.js";
import { dbRoutes } from "./routes/db.js";
import swaggerPlugin from "./plugins/swagger.js";
import { servicesRoutes } from "./routes/services.js";
import { businessHoursRoutes } from "./routes/businessHours.js";
import { businessDaysRoutes } from "./routes/businessDays.js";
import { slotsRoutes } from "./routes/slots.js";
import { appointmentsRoutes } from "./routes/appointments.js";

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

const port = Number(process.env["PORT"] ?? 3000);
const host = process.env["HOST"] ?? "0.0.0.0";

try {
  await app.listen({ port, host });
} catch (err) {
  app.log.error(err);
  process.exit(1);
}
