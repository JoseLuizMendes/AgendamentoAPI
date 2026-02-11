import type { FastifyPluginAsync } from "fastify";
import {
  AppointmentCreateSchema,
  AppointmentUpdateSchema,
  AppointmentParamsSchema,
  AppointmentQuerySchema,
} from "../schemas/index.js";
import * as appointmentService from "../services/appointments.js";

export const appointmentsRoutes: FastifyPluginAsync = async (app) => {
  // GET /appointments - List appointments with optional filters
  app.get("/appointments", async (req, reply) => {
    const query = AppointmentQuerySchema.parse(req.query);
    const appointments = await appointmentService.listAppointments(app.prisma, {
      serviceId: query.serviceId,
      status: query.status,
    });
    return reply.send(appointments);
  });

  // GET /appointments/:id - Get appointment details
  app.get("/appointments/:id", async (req, reply) => {
    const params = AppointmentParamsSchema.parse(req.params);
    const appointment = await appointmentService.getAppointment(app.prisma, params.id);
    return reply.send(appointment);
  });

  // POST /appointments - Create new appointment
  app.post("/appointments", async (req, reply) => {
    const body = AppointmentCreateSchema.parse(req.body);
    const appointment = await appointmentService.createAppointment(app.prisma, {
      customerName: body.customerName,
      customerPhone: body.customerPhone,
      serviceId: body.serviceId,
      startTime: new Date(body.startTime),
    });
    return reply.status(201).send(appointment);
  });

  // PATCH /appointments/:id - Update appointment
  app.patch("/appointments/:id", async (req, reply) => {
    const params = AppointmentParamsSchema.parse(req.params);
    const body = AppointmentUpdateSchema.parse(req.body);
    
    const updateData: any = {};
    if (body.status) updateData.status = body.status;
    if (body.startTime) updateData.startTime = new Date(body.startTime);

    const appointment = await appointmentService.updateAppointment(
      app.prisma,
      params.id,
      updateData
    );
    return reply.send(appointment);
  });

  // DELETE /appointments/:id - Cancel/delete appointment
  app.delete("/appointments/:id", async (req, reply) => {
    const params = AppointmentParamsSchema.parse(req.params);
    await appointmentService.deleteAppointment(app.prisma, params.id);
    return reply.status(204).send();
  });
};
