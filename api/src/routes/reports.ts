import type { FastifyPluginAsync } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { ReportQuerySchema, ReportSummaryResponseSchema, ErrorResponseSchema } from "../schemas/index.js";
import * as reportsService from "../services/reports.js";
import { requireAuth, requireRole } from "../utils/guards.js";

export const reportsRoutes: FastifyPluginAsync = async (app) => {
  const zApp = app.withTypeProvider<ZodTypeProvider>();

  // GET /reports/summary - Indicadores agregados do período (OWNER/STAFF)
  zApp.get(
    "/reports/summary",
    {
      preHandler: requireRole("OWNER", "STAFF"),
      schema: {
        tags: ["Reports"],
        description:
          "Indicadores agregados (receita, clientes, ocupação, no-show), série temporal e comparativo com o período anterior.",
        querystring: ReportQuerySchema,
        response: { 200: ReportSummaryResponseSchema, 403: ErrorResponseSchema },
      },
    },
    async (req, reply) => {
      const auth = requireAuth(req);
      const summary = await reportsService.getSummary(
        app.prisma,
        auth.tenantId,
        new Date(req.query.from),
        new Date(req.query.to),
        req.query.granularity,
      );
      return reply.send(summary);
    },
  );
};
