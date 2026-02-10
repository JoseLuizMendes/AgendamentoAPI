import type { FastifyPluginAsync } from "fastify";
import { Type, type Static } from "@sinclair/typebox";
import { getNotificationsQueue } from "../queues/notifications.js";
import { ErrorResponse } from "../schemas/http.js";
import { createTransactionManager } from "../infra/prisma/transactionManager.js";
import { createAppointment } from "../application/usecases/appointments/createAppointment.js";
import { cancelAppointment } from "../application/usecases/appointments/cancelAppointment.js";
import { createRepositories } from "../infra/prisma/repositories.js";

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

      const tx = createTransactionManager(app.prisma);
      const created = await createAppointment(tx, {
        customerName: body.customerName,
        customerPhone: body.customerPhone,
        serviceId: body.serviceId,
        startTime,
      });

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

      const repos = createRepositories(app.prisma);
      const appointment = await cancelAppointment(repos, { id: params.id, version: body.version });
      return reply.send(appointment);
    }
  );
};
