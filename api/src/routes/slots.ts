import type { FastifyPluginAsync } from "fastify";
import { Type, type Static } from "@sinclair/typebox";
import { calculateAvailableSlots } from "../lib/slots.js";
import { assertIsoDate, toDayOfWeekUtc } from "../lib/time.js";
import { ErrorResponse } from "../schemas/http.js";

const SlotsQuery = Type.Object({
  serviceId: Type.Integer({ minimum: 1 }),
  date: Type.String({ pattern: "^\\d{4}-\\d{2}-\\d{2}$" }),
  intervalMinutes: Type.Optional(Type.Integer({ minimum: 1, maximum: 240 })),
});

const SlotResponse = Type.Object({
  startTime: Type.String(),
  endTime: Type.String(),
});

type SlotsQueryT = Static<typeof SlotsQuery>;

export const slotsRoutes: FastifyPluginAsync = async (app) => {
  app.get(
    "/slots",
    {
      schema: {
        tags: ["appointments"],
        querystring: SlotsQuery,
        response: {
          200: Type.Array(SlotResponse),
          400: ErrorResponse,
          404: ErrorResponse,
        },
      },
    },
    async (req, reply) => {
      const query = req.query as SlotsQueryT;
      try {
        assertIsoDate(query.date);
      } catch (e) {
        return reply.status(400).send({ message: (e as Error).message });
      }

      const service = await app.prisma.service.findUnique({ where: { id: query.serviceId } });
      if (!service) {
        return reply.status(404).send({ message: "Serviço não encontrado" });
      }

      const dayOfWeek = toDayOfWeekUtc(query.date);
      const business = await app.prisma.businessHours.findUnique({
        where: { dayOfWeek },
        include: { breaks: true },
      });

      const intervalMinutes = query.intervalMinutes ?? Number(process.env["SLOT_INTERVAL_MINUTES"] ?? 15);

      const appointments = await app.prisma.appointment.findMany({
        where: {
          status: "SCHEDULED",
          startTime: {
            gte: new Date(`${query.date}T00:00:00.000Z`),
            lt: new Date(`${query.date}T23:59:59.999Z`),
          },
        },
        select: { startTime: true, endTime: true },
      });

      return calculateAvailableSlots({
        date: query.date,
        serviceDurationMinutes: service.durationInMinutes,
        intervalMinutes,
        business: business
          ? {
              openTime: business.openTime,
              closeTime: business.closeTime,
              isOff: business.isOff,
              breaks: business.breaks.map((b) => ({ startTime: b.startTime, endTime: b.endTime })),
            }
          : null,
        appointments: appointments.map((a) => ({ startTime: a.startTime, endTime: a.endTime })),
      });
    }
  );
};
