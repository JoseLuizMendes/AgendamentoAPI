import type { FastifyPluginAsync } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import {
  PublicParamsSchema,
  PublicAvailabilityQuerySchema,
  PublicAppointmentCreateSchema,
} from "../schemas/index.js";
import { getTenantBySlug, listPublicServices, assertBookingAllowed } from "../services/public.js";
import { getAvailableSlots } from "../services/availability.js";
import { createAppointment } from "../services/appointments.js";

/**
 * Rotas públicas (sem JWT) para auto-agendamento pelo cliente final.
 * O tenant é resolvido pelo slug na URL. Criação de agendamento só é
 * permitida quando o tenant ativa `allowCustomerBooking`.
 */
export const publicRoutes: FastifyPluginAsync = async (app) => {
  const zApp = app.withTypeProvider<ZodTypeProvider>();

  // GET /public/:slug/services
  zApp.get(
    "/public/:slug/services",
    {
      schema: {
        tags: ["Public"],
        params: PublicParamsSchema,
        description: "Lista pública de serviços do estabelecimento.",
      },
    },
    async (req, reply) => {
      const services = await listPublicServices(app.prisma, req.params.slug);
      return reply.send(services);
    }
  );

  // GET /public/:slug/availability?serviceId=&date=
  zApp.get(
    "/public/:slug/availability",
    {
      schema: {
        tags: ["Public"],
        params: PublicParamsSchema,
        querystring: PublicAvailabilityQuerySchema,
        description: "Horários disponíveis para um serviço numa data.",
      },
    },
    async (req, reply) => {
      const tenant = await getTenantBySlug(app.prisma, req.params.slug);
      const slots = await getAvailableSlots(
        app.prisma,
        tenant.id,
        req.query.serviceId,
        req.query.date
      );
      return reply.send(slots);
    }
  );

  // POST /public/:slug/appointments (gated por allowCustomerBooking)
  zApp.post(
    "/public/:slug/appointments",
    {
      config: {
        // Rate limit reforçado em rota pública de escrita
        rateLimit: { max: 10, timeWindow: "1 minute" },
      },
      schema: {
        tags: ["Public"],
        params: PublicParamsSchema,
        body: PublicAppointmentCreateSchema,
        description: "Cria um agendamento (auto-agendamento). Requer allowCustomerBooking ativado.",
      },
    },
    async (req, reply) => {
      const tenant = await assertBookingAllowed(app.prisma, req.params.slug);
      const body = req.body;
      const appointment = await createAppointment(app.prisma, tenant.id, undefined, {
        customerName: body.customerName,
        customerPhone: body.customerPhone,
        customerEmail: body.customerEmail,
        notes: body.notes,
        serviceId: body.serviceId,
        startTime: new Date(body.startTime),
      });
      return reply.status(201).send(appointment);
    }
  );
};
