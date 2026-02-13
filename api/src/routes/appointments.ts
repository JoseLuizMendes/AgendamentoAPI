import type { FastifyPluginAsync } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import {
  AppointmentCreateSchema,
  AppointmentUpdateSchema,
  AppointmentParamsSchema,
  AppointmentQuerySchema,
} from "../schemas/index.js";
import * as appointmentService from "../services/appointments.js";

export const appointmentsRoutes: FastifyPluginAsync = async (app) => {
  const zApp = app.withTypeProvider<ZodTypeProvider>();

  // GET /appointments - List appointments with optional filters
  zApp.get(
    "/appointments",
    {
      schema: {
        tags: ["Appointments"],
        querystring: AppointmentQuerySchema,
      },
    },
    async (req, reply) => {
      if (!req.auth) {
        return reply.status(401).send({ message: "Não autenticado" });
      }

      const query = req.query;
      const filters: { serviceId?: number; status?: string } = {};
      if (query.serviceId !== undefined) filters.serviceId = query.serviceId;
      if (query.status !== undefined) filters.status = query.status;
    
      const appointments = await appointmentService.listAppointments(
        app.prisma,
        req.auth.tenantId,
        req.auth.userId,
        req.auth.role,
        filters
      );
      return reply.send(appointments);
    }
  );

  // GET /appointments/:id - Get appointment details
  zApp.get(
    "/appointments/:id",
    {
      schema: {
        tags: ["Appointments"],
        params: AppointmentParamsSchema,
      },
    },
    async (req, reply) => {
      if (!req.auth) {
        return reply.status(401).send({ message: "Não autenticado" });
      }

      const appointment = await appointmentService.getAppointment(
        app.prisma,
        req.params.id,
        req.auth.tenantId,
        req.auth.userId,
        req.auth.role
      );
      return reply.send(appointment);
    }
  );

  // POST /appointments - Create new appointment
  zApp.post(
    "/appointments",
    {
      schema: {
        tags: ["Appointments"],
        body: AppointmentCreateSchema,
      },
    },
    async (req, reply) => {
      if (!req.auth) {
        return reply.status(401).send({ message: "Não autenticado" });
      }

      const body = req.body;
      const appointment = await appointmentService.createAppointment(
        app.prisma,
        req.auth.tenantId,
        req.auth.userId,
        {
          customerName: body.customerName,
          customerPhone: body.customerPhone,
          serviceId: body.serviceId,
          startTime: new Date(body.startTime),
        }
      );
      return reply.status(201).send(appointment);
    }
  );

  // PATCH /appointments/:id - Update appointment
  zApp.patch(
    "/appointments/:id",
    {
      schema: {
        tags: ["Appointments"],
        params: AppointmentParamsSchema,
        body: AppointmentUpdateSchema,
      },
    },
    async (req, reply) => {
      if (!req.auth) {
        return reply.status(401).send({ message: "Não autenticado" });
      }

      const params = req.params;
      const body = req.body;
    
      const updateData: any = {};
      if (body.status) updateData.status = body.status;
      if (body.startTime) updateData.startTime = new Date(body.startTime);

      const appointment = await appointmentService.updateAppointment(
        app.prisma,
        params.id,
        req.auth.tenantId,
        req.auth.userId,
        req.auth.role,
        updateData
      );
      return reply.send(appointment);
    }
  );

  // DELETE /appointments/:id - Cancel/delete appointment
  zApp.delete(
    "/appointments/:id",
    {
      schema: {
        tags: ["Appointments"],
        params: AppointmentParamsSchema,
      },
    },
    async (req, reply) => {
      if (!req.auth) {
        return reply.status(401).send({ message: "Não autenticado" });
      }

      await appointmentService.deleteAppointment(
        app.prisma,
        req.params.id,
        req.auth.tenantId,
        req.auth.userId,
        req.auth.role
      );
      return reply.status(204).send();
    }
  );
};
