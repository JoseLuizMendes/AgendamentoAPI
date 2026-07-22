import type { FastifyPluginAsync } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import {
  PatientParamsSchema,
  PatientQuerySchema,
  PatientUpdateSchema,
  PatientResponseSchema,
  PatientListResponseSchema,
  PatientDetailResponseSchema,
  OdontogramResponseSchema,
  ErrorResponseSchema,
} from "../schemas/index.js";
import * as patientService from "../services/patients.js";
import { requireAuth, requireRole } from "../utils/guards.js";

export const patientsRoutes: FastifyPluginAsync = async (app) => {
  const zApp = app.withTypeProvider<ZodTypeProvider>();

  // GET /patients - Lista/busca pacientes (OWNER/STAFF)
  zApp.get(
    "/patients",
    {
      preHandler: requireRole("OWNER", "STAFF"),
      schema: {
        tags: ["Patients"],
        querystring: PatientQuerySchema,
        response: { 200: PatientListResponseSchema },
      },
    },
    async (req, reply) => {
      const auth = requireAuth(req);
      const patients = await patientService.listPatients(app.prisma, auth.tenantId, req.query.search);
      return reply.send(patients);
    }
  );

  // GET /patients/:id - Ficha + histórico (OWNER/STAFF)
  zApp.get(
    "/patients/:id",
    {
      preHandler: requireRole("OWNER", "STAFF"),
      schema: {
        tags: ["Patients"],
        params: PatientParamsSchema,
        response: { 200: PatientDetailResponseSchema, 404: ErrorResponseSchema },
      },
    },
    async (req, reply) => {
      const auth = requireAuth(req);
      const patient = await patientService.getPatient(app.prisma, auth.tenantId, req.params.id);
      return reply.send(patient);
    }
  );

  // PATCH /patients/:id - Enriquecer ficha (OWNER/STAFF)
  zApp.patch(
    "/patients/:id",
    {
      preHandler: requireRole("OWNER", "STAFF"),
      schema: {
        tags: ["Patients"],
        params: PatientParamsSchema,
        body: PatientUpdateSchema,
        response: { 200: PatientResponseSchema, 404: ErrorResponseSchema },
      },
    },
    async (req, reply) => {
      const auth = requireAuth(req);
      const body = req.body;
      const data: { name?: string; email?: string | null; birthDate?: Date | null; notes?: string | null } = {};
      if (body.name !== undefined) data.name = body.name;
      if (body.email !== undefined) data.email = body.email;
      if (body.birthDate !== undefined) data.birthDate = body.birthDate === null ? null : new Date(body.birthDate);
      if (body.notes !== undefined) data.notes = body.notes;
      const patient = await patientService.updatePatient(app.prisma, auth.tenantId, req.params.id, data);
      return reply.send(patient);
    }
  );

  // GET /patients/:id/odontogram - Odontograma consolidado (último procedimento por dente)
  zApp.get(
    "/patients/:id/odontogram",
    {
      preHandler: requireRole("OWNER", "STAFF"),
      schema: {
        tags: ["Patients"],
        params: PatientParamsSchema,
        response: { 200: OdontogramResponseSchema, 404: ErrorResponseSchema },
      },
    },
    async (req, reply) => {
      const auth = requireAuth(req);
      const odontogram = await patientService.getPatientOdontogram(app.prisma, auth.tenantId, req.params.id);
      return reply.send(odontogram);
    }
  );
};
