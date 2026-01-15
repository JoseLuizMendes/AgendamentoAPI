import type { FastifyInstance, FastifyPluginAsync } from "fastify";
import { Type, type Static } from "@sinclair/typebox";
import { Prisma, type Appointment } from "@prisma/client";
import { addMinutes, assertIsoDate, toDayOfWeekUtc } from "../lib/time.js";
import { isSlotWithinBusinessHours } from "../lib/slots.js";
import { getNotificationsQueue } from "../queues/notifications.js";
import { ErrorResponse } from "../schemas/http.js";

const AppointmentCreateBody = Type.Object({
  customerName: Type.String({ minLength: 1, maxLength: 200 }),
  customerPhone: Type.String({ minLength: 6, maxLength: 30 }),
  serviceId: Type.Integer({ minimum: 1 }),
  startTime: Type.String({ minLength: 10, maxLength: 40 }),
});

const AppointmentResponse = Type.Object({
  id: Type.Integer(),
  customerName: Type.String(),
  customerPhone: Type.String(),
  serviceId: Type.Integer(),
  startTime: Type.String(),
  endTime: Type.String(),
  status: Type.String(),
  version: Type.Integer(),
  createdAt: Type.String(),
  updatedAt: Type.String(),
});

const AppointmentParams = Type.Object({
  id: Type.Integer({ minimum: 1 }),
});

const AppointmentCancelBody = Type.Object({
  version: Type.Integer({ minimum: 0 }),
});

type AppointmentCreateBodyT = Static<typeof AppointmentCreateBody>;
type AppointmentParamsT = Static<typeof AppointmentParams>;
type AppointmentCancelBodyT = Static<typeof AppointmentCancelBody>;

function isRetryableTxError(err: unknown): boolean {
  return err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2034";
}

async function createAppointmentWithRetry(args: {
  app: FastifyInstance;
  customerName: string;
  customerPhone: string;
  serviceId: number;
  startTime: Date;
}): Promise<Appointment> {
  const { app, customerName, customerPhone, serviceId, startTime } = args;

  const maxAttempts = 3;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await app.prisma.$transaction(
        async (tx) => {
          const service = await tx.service.findUnique({ where: { id: serviceId } });
          if (!service) {
            throw new Error("Serviço não encontrado");
          }

          const endTime = addMinutes(startTime, service.durationInMinutes);

          // Verifica regras de agenda
          const date = startTime.toISOString().slice(0, 10);
          assertIsoDate(date);
          const dayOfWeek = toDayOfWeekUtc(date);

          const business = await tx.businessHours.findUnique({
            where: { dayOfWeek },
            include: { breaks: true },
          });

          const override = await tx.businessDateOverride.findUnique({ where: { date } });
          if (override?.isOff) {
            throw new Error("Dia indisponível (fechado)");
          }

          const okBusiness = isSlotWithinBusinessHours({
            date,
            business: business
              ? {
                  openTime: override?.openTime ?? business.openTime,
                  closeTime: override?.closeTime ?? business.closeTime,
                  isOff: override?.isOff ?? business.isOff,
                  breaks: business.breaks.map((b) => ({ startTime: b.startTime, endTime: b.endTime })),
                }
              : null,
            startTime,
            endTime,
          });

          if (!okBusiness) {
            throw new Error("Horário fora da agenda configurada");
          }

          // Prevenção de conflito (overlap) - transação SERIALIZABLE + retry
          const conflict = await tx.appointment.findFirst({
            where: {
              status: "SCHEDULED",
              startTime: { lt: endTime },
              endTime: { gt: startTime },
            },
            select: { id: true },
          });

          if (conflict) {
            throw new Error("Conflito: horário já ocupado");
          }

          return tx.appointment.create({
            data: {
              customerName,
              customerPhone,
              serviceId,
              startTime,
              endTime,
            },
          });
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
      );
    } catch (err) {
      if (attempt < maxAttempts && isRetryableTxError(err)) {
        await new Promise((r) => setTimeout(r, 30 * attempt));
        continue;
      }
      throw err;
    }
  }

  throw new Error("Falha ao criar agendamento");
}

export const appointmentsRoutes: FastifyPluginAsync = async (app) => {
  app.post(
    "/appointments",
    {
      schema: {
        tags: ["appointments"],
        body: AppointmentCreateBody,
        response: {
          201: AppointmentResponse,
          400: ErrorResponse,
          404: ErrorResponse,
          409: ErrorResponse,
        },
        description: "Cria um novo agendamento",
      },
    },
    async (req, reply) => {
      const body = req.body as AppointmentCreateBodyT;

      const startTime = new Date(body.startTime);
      if (Number.isNaN(startTime.getTime())) {
        return reply.status(400).send({ message: "startTime inválido" });
      }

      let created;
      try {
        created = await createAppointmentWithRetry({
          app,
          customerName: body.customerName,
          customerPhone: body.customerPhone,
          serviceId: body.serviceId,
          startTime,
        });
      } catch (e) {
        const message = e instanceof Error ? e.message : "Erro ao criar agendamento";
        const status =
          message.includes("startTime") || message.includes("inválid") || message.includes("agenda")
            ? 400
            : message.includes("não encontrado")
              ? 404
              : 409;
        return reply.status(status).send({ message });
      }

      // Notificação assíncrona (best-effort)
      try {
        const queue = getNotificationsQueue();
        await queue.add("appointment.created", {
          appointmentId: created.id,
          customerName: created.customerName,
          customerPhone: created.customerPhone,
          serviceId: created.serviceId,
          startTime: created.startTime.toISOString(),
          endTime: created.endTime.toISOString(),
        });
      } catch (err) {
        app.log.error({ err }, "Falha ao enfileirar notificação");
      }

      return reply.status(201).send(created);
    }
  );

  // Exemplo de optimistic locking via version (evita updates concorrentes)
  app.patch(
    "/appointments/:id/cancel",
    {
      schema: {
        tags: ["appointments"],
        params: AppointmentParams,
        body: AppointmentCancelBody,
        response: {
          200: AppointmentResponse,
          404: ErrorResponse,
          409: ErrorResponse,
        },
        description: "Cancela um agendamento",
      },
    },
    async (req, reply) => {
      const params = req.params as AppointmentParamsT;
      const body = req.body as AppointmentCancelBodyT;
      const updated = await app.prisma.appointment.updateMany({
        where: {
          id: params.id,
          version: body.version,
          status: "SCHEDULED",
        },
        data: {
          status: "CANCELED",
          version: { increment: 1 },
        },
      });

      if (updated.count === 0) {
        return reply.status(409).send({
          message: "Conflito de versão ou agendamento não encontrado/já cancelado",
        });
      }

      const appointment = await app.prisma.appointment.findUnique({ where: { id: params.id } });
      if (!appointment) {
        return reply.status(404).send({ message: "Agendamento não encontrado" });
      }

      return appointment;
    }
  );
};
